import hashlib
import hmac
import os
import re
import secrets
import time
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional
from urllib.parse import quote

import numpy as np

try:
    from azure.storage.blob import BlobServiceClient, generate_blob_sas, BlobSasPermissions
except Exception:
    BlobServiceClient = None
    generate_blob_sas = None
    BlobSasPermissions = None


def _parse_bool(value: Optional[str], default: bool = False) -> bool:
    if value is None:
        return default
    return str(value).strip().lower() in {"1", "true", "yes", "on"}


def _sanitize_segment(value: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9_.-]", "_", str(value or ""))
    return cleaned.strip("._") or "unknown"


def _parse_connection_string_value(connection_string: str, key: str) -> Optional[str]:
    key_l = key.lower()
    for part in str(connection_string or "").split(";"):
        if "=" not in part:
            continue
        k, v = part.split("=", 1)
        if k.strip().lower() == key_l:
            return v.strip()
    return None


@dataclass
class StorageConfig:
    backend: str
    url_ttl_seconds: int
    local_root: Path
    proxy_prefix: str
    signing_key: bytes
    azure_connection_string: Optional[str]
    azure_container: str
    azure_public_base_url: Optional[str]


class AttendanceStorage:
    def __init__(self):
        backend = (os.getenv("ATTENDANCE_STORAGE_BACKEND") or "azure").strip().lower()
        if backend not in {"azure", "filesystem"}:
            backend = "filesystem"

        local_root = Path(
            os.getenv("ATTENDANCE_FACE_STORAGE_DIR") or (Path(__file__).resolve().parent / "secure_facial_store")
        ).resolve()

        cfg = StorageConfig(
            backend=backend,
            url_ttl_seconds=max(60, int(os.getenv("ATTENDANCE_FACE_URL_TTL_SECONDS") or "600")),
            local_root=local_root,
            proxy_prefix=(os.getenv("ATTENDANCE_FACE_PROXY_PREFIX") or "/api/attendance/backend").rstrip("/"),
            signing_key=(
                os.getenv("ATTENDANCE_FACE_SIGNING_KEY")
                or os.getenv("NEXTAUTH_SECRET")
                or os.getenv("MONGODB_URI")
                or "dev-attendance-face-signing-key"
            ).encode("utf-8"),
            azure_connection_string=os.getenv("AZURE_STORAGE_CONNECTION_STRING"),
            azure_container=(os.getenv("AZURE_ATTENDANCE_CONTAINER") or "attendance-private").strip(),
            azure_public_base_url=(os.getenv("AZURE_BLOB_PUBLIC_BASE_URL") or "").strip() or None,
        )
        self.cfg = cfg

        self._blob_client = None
        self._azure_account_name = None
        self._azure_account_key = None
        if cfg.backend == "azure":
            self._init_azure_client()

    def _init_azure_client(self):
        if BlobServiceClient is None:
            raise RuntimeError("azure-storage-blob is not installed")
        if not self.cfg.azure_connection_string:
            raise RuntimeError("AZURE_STORAGE_CONNECTION_STRING is required for Azure backend")

        self._blob_client = BlobServiceClient.from_connection_string(self.cfg.azure_connection_string)
        self._azure_account_name = _parse_connection_string_value(self.cfg.azure_connection_string, "AccountName")
        self._azure_account_key = _parse_connection_string_value(self.cfg.azure_connection_string, "AccountKey")
        if not self._azure_account_name:
            raise RuntimeError("Azure connection string missing AccountName")

        container = self._blob_client.get_container_client(self.cfg.azure_container)
        if not container.exists():
            container.create_container()

    def _safe_local_root(self) -> Path:
        self.cfg.local_root.mkdir(parents=True, exist_ok=True)
        try:
            os.chmod(self.cfg.local_root, 0o700)
        except Exception:
            pass
        return self.cfg.local_root

    def _resolve_local_path(self, rel_path: str) -> Path:
        root = self._safe_local_root()
        candidate = (root / rel_path).resolve()
        if root not in candidate.parents and candidate != root:
            raise ValueError("Invalid local storage path")
        return candidate

    def _sign_local_path(self, rel_path: str, expires_at: int) -> str:
        payload = f"{rel_path}:{expires_at}".encode("utf-8")
        return hmac.new(self.cfg.signing_key, payload, hashlib.sha256).hexdigest()

    def _build_local_signed_url(self, rel_path: str, ttl_seconds: Optional[int] = None) -> str:
        ttl = ttl_seconds if ttl_seconds is not None else self.cfg.url_ttl_seconds
        expires_at = int(time.time()) + max(60, int(ttl))
        token = self._sign_local_path(rel_path, expires_at)
        path_q = quote(rel_path, safe="")
        return f"{self.cfg.proxy_prefix}/secure-face-image?path={path_q}&exp={expires_at}&sig={token}"

    def verify_local_signature(self, path: str, exp: int, sig: str) -> bool:
        expected_sig = self._sign_local_path(path, int(exp))
        if not hmac.compare_digest(expected_sig, str(sig)):
            return False
        return int(exp) >= int(time.time())

    def resolve_local_file(self, rel_path: str) -> Path:
        return self._resolve_local_path(rel_path)

    def _blob_name(self, student_id: str, filename: str, extension: str) -> str:
        stem = f"{datetime.utcnow().strftime('%Y%m%dT%H%M%S')}_{secrets.token_hex(8)}"
        safe_sid = _sanitize_segment(student_id)
        safe_file = _sanitize_segment(Path(filename or "sample").stem)
        return f"students/{safe_sid}/{safe_file}_{stem}{extension}"

    def _ref_azure(self, blob_name: str) -> str:
        return f"az://{self.cfg.azure_container}/{blob_name}"

    def _parse_ref(self, ref_value: Optional[str]):
        ref = str(ref_value or "").strip()
        if ref.startswith("az://"):
            payload = ref[len("az://"):]
            if "/" not in payload:
                return None
            container, blob_name = payload.split("/", 1)
            return {"type": "azure", "container": container, "blob_name": blob_name}
        if ref.startswith("local://"):
            return {"type": "local", "path": ref[len("local://"):]} 
        if ref:
            # Backward-compatible local relative path.
            return {"type": "local", "path": ref}
        return None

    def _build_azure_signed_url(self, container: str, blob_name: str) -> str:
        if generate_blob_sas is None or BlobSasPermissions is None:
            raise RuntimeError("azure-storage-blob SAS helpers unavailable")

        if self._azure_account_key:
            sas = generate_blob_sas(
                account_name=self._azure_account_name,
                container_name=container,
                blob_name=blob_name,
                account_key=self._azure_account_key,
                permission=BlobSasPermissions(read=True),
                expiry=datetime.utcnow() + timedelta(seconds=self.cfg.url_ttl_seconds),
            )
        else:
            raise RuntimeError("Azure SAS generation requires account key in connection string")

        if self.cfg.azure_public_base_url:
            base = self.cfg.azure_public_base_url.rstrip("/")
        else:
            base = f"https://{self._azure_account_name}.blob.core.windows.net"
        return f"{base}/{container}/{quote(blob_name, safe='/')}?{sas}"

    def save_sample(self, student_id: str, filename: str, image_bytes: bytes, embedding: np.ndarray):
        ext = Path(filename or "sample.jpg").suffix.lower()
        if ext not in {".jpg", ".jpeg", ".png", ".webp"}:
            ext = ".jpg"

        embedding_array = np.array(embedding, dtype=np.float32)
        image_sha256 = hashlib.sha256(image_bytes).hexdigest()

        if self.cfg.backend == "azure":
            image_blob = self._blob_name(student_id, filename or "sample", ext)
            embedding_blob = self._blob_name(student_id, filename or "sample", ".npy")

            image_client = self._blob_client.get_blob_client(container=self.cfg.azure_container, blob=image_blob)
            image_client.upload_blob(image_bytes, overwrite=False, metadata={"student_id": str(student_id), "kind": "image"})

            emb_bytes = embedding_array.tobytes(order="C")
            emb_client = self._blob_client.get_blob_client(container=self.cfg.azure_container, blob=embedding_blob)
            emb_client.upload_blob(emb_bytes, overwrite=False, metadata={"student_id": str(student_id), "kind": "embedding", "shape": "512", "dtype": "float32"})

            image_ref = self._ref_azure(image_blob)
            embedding_ref = self._ref_azure(embedding_blob)
            image_url = self._build_azure_signed_url(self.cfg.azure_container, image_blob)
            return {
                "image_ref": image_ref,
                "embedding_ref": embedding_ref,
                "image_url": image_url,
                "image_sha256": image_sha256,
            }

        # Filesystem fallback
        root = self._safe_local_root()
        student_dir = root / _sanitize_segment(student_id)
        student_dir.mkdir(parents=True, exist_ok=True)
        try:
            os.chmod(student_dir, 0o700)
        except Exception:
            pass

        suffix = secrets.token_hex(8)
        stem = f"{datetime.utcnow().strftime('%Y%m%dT%H%M%S')}_{suffix}"
        image_rel = f"{_sanitize_segment(student_id)}/{stem}{ext}"
        emb_rel = f"{_sanitize_segment(student_id)}/{stem}.npy"

        image_path = self._resolve_local_path(image_rel)
        emb_path = self._resolve_local_path(emb_rel)

        with open(image_path, "wb") as f:
            f.write(image_bytes)
        np.save(str(emb_path), embedding_array)

        return {
            "image_ref": f"local://{image_rel}",
            "embedding_ref": f"local://{emb_rel}",
            "image_url": self._build_local_signed_url(image_rel),
            "image_sha256": image_sha256,
        }

    def build_image_url_from_ref(self, image_ref: Optional[str]) -> Optional[str]:
        parsed = self._parse_ref(image_ref)
        if not parsed:
            return None
        if parsed["type"] == "azure":
            return self._build_azure_signed_url(parsed["container"], parsed["blob_name"])
        return self._build_local_signed_url(parsed["path"])

    def delete_ref(self, ref_value: Optional[str]) -> bool:
        parsed = self._parse_ref(ref_value)
        if not parsed:
            return False
        try:
            if parsed["type"] == "azure":
                client = self._blob_client.get_blob_client(container=parsed["container"], blob=parsed["blob_name"])
                client.delete_blob(delete_snapshots="include")
                return True
            file_path = self._resolve_local_path(parsed["path"])
            if file_path.exists():
                file_path.unlink()
            return True
        except Exception:
            return False

    def load_embedding(self, ref_value: Optional[str]):
        parsed = self._parse_ref(ref_value)
        if not parsed:
            return None
        try:
            if parsed["type"] == "azure":
                client = self._blob_client.get_blob_client(container=parsed["container"], blob=parsed["blob_name"])
                blob_bytes = client.download_blob().readall()
                arr = np.frombuffer(blob_bytes, dtype=np.float32)
                if arr.size == 0:
                    return None
                return arr.tolist()

            local_file = self._resolve_local_path(parsed["path"])
            if local_file.exists() and local_file.is_file():
                return np.load(str(local_file), allow_pickle=False).tolist()
            return None
        except Exception:
            return None


def is_azure_backend_enabled() -> bool:
    return (os.getenv("ATTENDANCE_STORAGE_BACKEND") or "azure").strip().lower() == "azure"


def allow_azure_public_container(default: bool = False) -> bool:
    return _parse_bool(os.getenv("AZURE_ALLOW_PUBLIC_CONTAINER"), default=default)
