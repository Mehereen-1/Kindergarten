from __future__ import annotations

import re
from typing import Dict, Iterable, List, Sequence, Tuple

from document_intake_lab.schemas import ExtractedField, OcrLine


PHONE_PATTERN = re.compile(r"(?:\+?88)?01[3-9]\d{8}")
DATE_PATTERN = re.compile(
    r"\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2}|\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4})\b",
    re.IGNORECASE,
)
LONG_NUMBER_PATTERN = re.compile(r"\b\d{10,18}\b")


DOCUMENT_KEYWORDS: Dict[str, Sequence[str]] = {
    "birth_certificate": (
        "birth certificate",
        "birth registration",
        "date of birth",
        "registration no",
        "\u099c\u09a8\u09cd\u09ae \u09a8\u09bf\u09ac\u09a8\u09cd\u09a7\u09a8",
        "\u099c\u09a8\u09cd\u09ae \u09a4\u09be\u09b0\u09bf\u0996",
    ),
    "national_id": (
        "national id",
        "nid",
        "smart card",
        "\u099c\u09be\u09a4\u09c0\u09df \u09aa\u09b0\u09bf\u099a\u09df\u09aa\u09a4\u09cd\u09b0",
    ),
    "admission_form": (
        "admission form",
        "student name",
        "guardian",
        "father name",
        "mother name",
        "class applied",
        "\u09ad\u09b0\u09cd\u09a4\u09bf\u09b0 \u0986\u09ac\u09c7\u09a6\u09a8",
    ),
}


FIELD_ALIASES: Dict[str, Dict[str, Sequence[str]]] = {
    "birth_certificate": {
        "child_name": ("name", "child name", "\u09a8\u09be\u09ae"),
        "father_name": ("father", "father's name", "\u09aa\u09bf\u09a4\u09be\u09b0 \u09a8\u09be\u09ae"),
        "mother_name": ("mother", "mother's name", "\u09ae\u09be\u09a4\u09be\u09b0 \u09a8\u09be\u09ae"),
        "date_of_birth": ("date of birth", "dob", "\u099c\u09a8\u09cd\u09ae \u09a4\u09be\u09b0\u09bf\u0996"),
        "registration_date": ("date of registration", "registration date"),
        "date_of_issue": ("date of issuance", "issuance date"),
        "registration_no": ("birth registration number", "registration no", "birth registration"),
        "sex": ("sex", "gender"),
        "place_of_birth": ("place of birth",),
        "permanent_address": ("permanent address",),
    },
    "national_id": {
        "full_name": ("name", "full name", "\u09a8\u09be\u09ae"),
        "date_of_birth": ("date of birth", "dob", "\u099c\u09a8\u09cd\u09ae \u09a4\u09be\u09b0\u09bf\u0996"),
        "nid_number": ("nid no", "id no", "national id"),
        "father_name": ("father", "father's name", "\u09aa\u09bf\u09a4\u09be"),
        "mother_name": ("mother", "mother's name", "\u09ae\u09be\u09a4\u09be"),
        "address": ("address", "\u09a0\u09bf\u0995\u09be\u09a8\u09be"),
    },
    "admission_form": {
        "student_name": ("student name", "name of student", "\u09b6\u09bf\u0995\u09cd\u09b7\u09be\u09b0\u09cd\u09a5\u09c0\u09b0 \u09a8\u09be\u09ae"),
        "father_name": ("father name", "\u09aa\u09bf\u09a4\u09be\u09b0 \u09a8\u09be\u09ae"),
        "mother_name": ("mother name", "\u09ae\u09be\u09a4\u09be\u09b0 \u09a8\u09be\u09ae"),
        "date_of_birth": ("date of birth", "\u099c\u09a8\u09cd\u09ae \u09a4\u09be\u09b0\u09bf\u0996"),
        "phone": ("phone", "mobile", "guardian mobile", "\u09ae\u09cb\u09ac\u09be\u0987\u09b2"),
        "address": ("address", "present address", "\u09a0\u09bf\u0995\u09be\u09a8\u09be"),
        "class_name": ("class", "class applied", "\u09b6\u09cd\u09b0\u09c7\u09a3\u09bf"),
    },
}


NID_NUMBER_PATTERN = re.compile(r"\b\d{10,17}\b")


def _normalize(text: str) -> str:
    return " ".join(text.lower().strip().split())


def _flatten_text(text: str) -> str:
    return " ".join(part.strip() for part in text.splitlines() if part.strip())


def _build_field(key: str, label: str, value: str, confidence: float, source_text: str) -> ExtractedField | None:
    cleaned = value.strip(" :,-")
    if not cleaned:
        return None
    return ExtractedField(
        key=key,
        label=label,
        value=cleaned,
        confidence=max(0.0, min(1.0, confidence)),
        source_text=source_text or None,
    )


def _upsert_field(
    fields: List[ExtractedField],
    key: str,
    label: str,
    value: str,
    confidence: float,
    source_text: str,
) -> None:
    field = _build_field(key, label, value, confidence, source_text)
    if field is None:
        return
    for index, existing in enumerate(fields):
        if existing.key == key:
            if field.confidence >= existing.confidence:
                fields[index] = field
            return
    fields.append(field)


def _get_field(fields: Sequence[ExtractedField], key: str) -> ExtractedField | None:
    for field in fields:
        if field.key == key:
            return field
    return None


def _has_valid_date(value: str) -> bool:
    return bool(DATE_PATTERN.search(value))


def _has_valid_long_number(value: str) -> bool:
    digits = "".join(character for character in value if character.isdigit())
    return 10 <= len(digits) <= 18


def detect_document_type(
    raw_text: str,
    requested_type: str | None = None,
) -> Tuple[str, float]:
    if requested_type and requested_type != "auto":
        return requested_type, 1.0

    normalized = _normalize(raw_text)
    best_type = "unknown"
    best_score = 0
    for doc_type, keywords in DOCUMENT_KEYWORDS.items():
        score = sum(1 for keyword in keywords if keyword in normalized)
        if score > best_score:
            best_type = doc_type
            best_score = score
    confidence = min(1.0, best_score / 3.0) if best_type != "unknown" else 0.0
    return best_type, confidence


def _find_line_value(lines: Sequence[OcrLine], aliases: Iterable[str]) -> Tuple[str, float, str]:
    normalized_aliases = [_normalize(alias) for alias in aliases]
    normalized_lines = [_normalize(line.text) for line in lines]
    for index, normalized_line in enumerate(normalized_lines):
        for alias in normalized_aliases:
            if alias not in normalized_line:
                continue
            raw_line = lines[index].text.strip()
            parts = re.split(r"[:\-]", raw_line, maxsplit=1)
            if len(parts) == 2 and parts[1].strip():
                return parts[1].strip(), min(1.0, lines[index].confidence + 0.1), raw_line
            if index + 1 < len(lines) and len(lines[index + 1].text.strip()) > 1:
                return lines[index + 1].text.strip(), max(0.35, lines[index + 1].confidence), lines[index + 1].text
    return "", 0.0, ""


def _match_pattern(raw_text: str, pattern: re.Pattern[str], label: str) -> Tuple[str, float, str]:
    match = pattern.search(raw_text)
    if not match:
        return "", 0.0, ""
    return match.group(0), 0.75, f"{label}: {match.group(0)}"


def _match_labeled_pattern(
    lines: Sequence[OcrLine],
    raw_text: str,
    aliases: Iterable[str],
    pattern: re.Pattern[str],
    field_name: str,
) -> Tuple[str, float, str]:
    normalized_aliases = [_normalize(alias) for alias in aliases]

    for index, line in enumerate(lines):
        normalized_line = _normalize(line.text)
        if not any(alias in normalized_line for alias in normalized_aliases):
            continue

        same_line_match = pattern.search(line.text)
        if same_line_match:
            return same_line_match.group(0), min(1.0, line.confidence + 0.12), line.text

        for offset in (1, 2):
            next_index = index + offset
            if next_index >= len(lines):
                break
            next_line = lines[next_index]
            next_match = pattern.search(next_line.text)
            if next_match:
                return next_match.group(0), max(0.45, next_line.confidence), next_line.text

    normalized_flattened = _normalize(_flatten_text(raw_text))
    for alias in normalized_aliases:
        label_pattern = re.compile(
            rf"{re.escape(alias)}\s*[:\-]?\s*({pattern.pattern})",
            re.IGNORECASE,
        )
        match = label_pattern.search(normalized_flattened)
        if match:
            return match.group(1), 0.82, f"{field_name}: {match.group(1)}"

    return "", 0.0, ""


def _normalize_alpha(text: str) -> str:
    return re.sub(r"[^a-z]+", "", text.lower())


def _looks_like_header_noise(value: str) -> bool:
    normalized = _normalize(value)
    return any(
        token in normalized
        for token in (
            "government",
            "republic",
            "bangladesh",
            "national id",
            "card",
            "registrar",
            "certificate",
        )
    )


def _clean_nid_name(value: str) -> str:
    cleaned = re.sub(r"\s+", " ", value).strip(" :|-")
    cleaned = re.sub(r"^[^\w\u0980-\u09ff]+", "", cleaned)
    cleaned = re.sub(r"[^\w\u0980-\u09ff .,'()-]+$", "", cleaned)
    return cleaned.strip()


def _find_following_line_value(
    raw_text: str,
    label_checks: Sequence[str],
    value_pattern: re.Pattern[str],
    *,
    max_lookahead: int = 4,
) -> Tuple[str, float, str]:
    lines = [line.strip() for line in raw_text.splitlines() if line.strip()]
    normalized_checks = [check.lower() for check in label_checks]
    alpha_checks = [_normalize_alpha(check) for check in label_checks]

    for index, line in enumerate(lines):
        lower_line = line.lower()
        alpha_line = _normalize_alpha(line)
        if not any(check in lower_line or alpha_check in alpha_line for check, alpha_check in zip(normalized_checks, alpha_checks)):
            continue

        same_line_match = value_pattern.search(line)
        if same_line_match:
            return same_line_match.group(0), 0.93, line

        for offset in range(1, max_lookahead + 1):
            next_index = index + offset
            if next_index >= len(lines):
                break
            candidate = lines[next_index]
            candidate_match = value_pattern.search(candidate)
            if candidate_match:
                return candidate_match.group(0), 0.9 - (offset * 0.06), candidate

    return "", 0.0, ""


def _find_following_block_text(
    raw_text: str,
    label_checks: Sequence[str],
    stop_checks: Sequence[str],
    *,
    max_lines: int = 4,
) -> Tuple[str, float, str]:
    lines = [line.strip() for line in raw_text.splitlines() if line.strip()]
    normalized_labels = [item.lower() for item in label_checks]
    normalized_stops = [item.lower() for item in stop_checks]
    alpha_labels = [_normalize_alpha(item) for item in label_checks]
    alpha_stops = [_normalize_alpha(item) for item in stop_checks]

    for index, line in enumerate(lines):
        lower_line = line.lower()
        alpha_line = _normalize_alpha(line)
        if not any(label in lower_line or alpha_label in alpha_line for label, alpha_label in zip(normalized_labels, alpha_labels)):
            continue

        chunks: List[str] = []
        source_lines: List[str] = []
        for offset in range(1, max_lines + 1):
            next_index = index + offset
            if next_index >= len(lines):
                break
            candidate = lines[next_index]
            lower_candidate = candidate.lower()
            alpha_candidate = _normalize_alpha(candidate)
            if any(stop in lower_candidate or alpha_stop in alpha_candidate for stop, alpha_stop in zip(normalized_stops, alpha_stops)):
                break
            if DATE_PATTERN.search(candidate) or LONG_NUMBER_PATTERN.search(candidate):
                break
            chunks.append(candidate)
            source_lines.append(candidate)
        if chunks:
            return " ".join(chunks).strip(), 0.78, " | ".join(source_lines)

    return "", 0.0, ""


def _extract_birth_certificate_template_fields(raw_text: str) -> List[ExtractedField]:
    text = _flatten_text(raw_text)
    normalized = _normalize(text)
    fields: List[ExtractedField] = []

    def capture(key: str, label: str, pattern: str, confidence: float = 0.9) -> None:
        match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
        if not match:
            match = re.search(pattern, normalized, re.IGNORECASE | re.DOTALL)
        if match:
            value = match.group(1).strip()
            _upsert_field(fields, key, label, value, confidence, match.group(0))

    capture("registration_date", "Registration Date", r"Date\s+of\s+Registration\s*:?\s*(" + DATE_PATTERN.pattern + r")")
    capture("registration_no", "Registration No", r"Birth\s+Registration\s+Number\s*:?\s*([0-9]{10,20})")
    capture("date_of_issue", "Date Of Issue", r"Date\s+of\s+Issuance\s*:?\s*(" + DATE_PATTERN.pattern + r")")
    capture("date_of_birth", "Date Of Birth", r"Date\s+of\s+Birth\s*:?\s*(" + DATE_PATTERN.pattern + r")")
    capture("sex", "Sex", r"Sex\s*:?\s*([A-Za-z]+)")
    capture("date_of_birth_words", "Date Of Birth In Words", r"In\s+Word\s*:?\s*(.*?)\s+Name\s*:")
    capture("child_name", "Child Name", r"Name\s*:?\s*(.*?)\s+Mother\s*:")
    capture("mother_name", "Mother Name", r"Mother\s*:?\s*(.*?)\s+Nationality\s*:")
    capture("mother_nationality", "Mother Nationality", r"Mother\s*:?.*?\s+Nationality\s*:?\s*(.*?)\s+Father\s*:")
    capture("father_name", "Father Name", r"Father\s*:?\s*(.*?)\s+Nationality\s*:")
    capture("father_nationality", "Father Nationality", r"Father\s*:?.*?\s+Nationality\s*:?\s*(.*?)\s+Place\s+of\s+Birth\s*:")
    capture("place_of_birth", "Place Of Birth", r"Place\s+of\s+Birth\s*:?\s*(.*?)\s+Permanent\s+Address\s*:")
    capture("permanent_address", "Permanent Address", r"Permanent\s+Address\s*:?\s*(.*?)(?:Seal\s*&\s*Signature|$)")

    registration_date, conf, source = _find_following_line_value(
        raw_text,
        ["date of registration", "dateofreglstiation", "dateofregistration"],
        DATE_PATTERN,
    )
    _upsert_field(fields, "registration_date", "Registration Date", registration_date, conf, source)

    registration_no, conf, source = _find_following_line_value(
        raw_text,
        ["birth registration number", "birh registration number", "birthreglstrationnumber"],
        LONG_NUMBER_PATTERN,
    )
    _upsert_field(fields, "registration_no", "Registration No", registration_no, conf, source)

    issue_date, conf, source = _find_following_line_value(
        raw_text,
        ["date of issuance", "dateafissuance", "dateofissuance"],
        DATE_PATTERN,
    )
    _upsert_field(fields, "date_of_issue", "Date Of Issue", issue_date, conf, source)

    dob, conf, source = _find_following_line_value(
        raw_text,
        ["date of birth", "dateofbirth", "dateofeirth", "date of eirth"],
        DATE_PATTERN,
    )
    _upsert_field(fields, "date_of_birth", "Date Of Birth", dob, conf, source)

    sex_value, conf, source = _find_following_line_value(
        raw_text,
        ["sex", "gender"],
        re.compile(r"\b(?:male|female)\b", re.IGNORECASE),
        max_lookahead=2,
    )
    _upsert_field(fields, "sex", "Sex", sex_value, conf, source)

    dob_words, conf, source = _find_following_block_text(
        raw_text,
        ["in word", "inword"],
        ["name", "mother", "father", "sex"],
        max_lines=2,
    )
    _upsert_field(fields, "date_of_birth_words", "Date Of Birth In Words", dob_words, conf, source)

    return fields


def _extract_national_id_template_fields(raw_text: str) -> List[ExtractedField]:
    text = _flatten_text(raw_text)
    normalized = _normalize(text)
    fields: List[ExtractedField] = []

    def capture(key: str, label: str, pattern: str, confidence: float = 0.88) -> None:
        match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
        if not match:
            match = re.search(pattern, normalized, re.IGNORECASE | re.DOTALL)
        if match:
            value = match.group(1).strip()
            _upsert_field(fields, key, label, value, confidence, match.group(0))

    capture("full_name", "Full Name", r"Name\s*:?\s*(.*?)\s+(?:Date\s*of\s*Birth|ID\s*N[O0]|পিতা|Father)")
    capture("date_of_birth", "Date Of Birth", r"Date\s*of\s*Birth\s*:?\s*(" + DATE_PATTERN.pattern + r")")
    capture("nid_number", "NID Number", r"(?:ID|1D)\s*N[O0]\s*:?\s*([0-9]{10,17})")
    capture("father_name", "Father Name", r"(?:Father|পিতা)\s*:?\s*(.*?)\s+(?:Mother|মাতা|Date\s*of\s*Birth|ID\s*N[O0])")
    capture("mother_name", "Mother Name", r"(?:Mother|মাতা)\s*:?\s*(.*?)\s+(?:Date\s*of\s*Birth|ID\s*N[O0]|$)")

    full_name, conf, source = _find_following_block_text(
        raw_text,
        ["name", "নাম"],
        ["date of birth", "id no", "1d no", "পিতা", "father", "মাতা", "mother"],
        max_lines=2,
    )
    _upsert_field(fields, "full_name", "Full Name", full_name, conf, source)

    father_name, conf, source = _find_following_block_text(
        raw_text,
        ["father", "পিতা"],
        ["mother", "মাতা", "date of birth", "id no", "1d no"],
        max_lines=2,
    )
    _upsert_field(fields, "father_name", "Father Name", father_name, conf, source)

    mother_name, conf, source = _find_following_block_text(
        raw_text,
        ["mother", "মাতা"],
        ["date of birth", "id no", "1d no"],
        max_lines=2,
    )
    _upsert_field(fields, "mother_name", "Mother Name", mother_name, conf, source)

    dob, conf, source = _find_following_line_value(
        raw_text,
        ["date of birth", "dateofbirth", "জন্ম তারিখ"],
        DATE_PATTERN,
        max_lookahead=2,
    )
    _upsert_field(fields, "date_of_birth", "Date Of Birth", dob, conf, source)

    nid_number, conf, source = _find_following_line_value(
        raw_text,
        ["id no", "idno", "1d no", "national id", "জাতীয় পরিচয়পত্র"],
        NID_NUMBER_PATTERN,
        max_lookahead=2,
    )
    _upsert_field(fields, "nid_number", "NID Number", nid_number, conf, source)

    return fields


def _extract_national_id_template_fields_v2(raw_text: str) -> List[ExtractedField]:
    text = _flatten_text(raw_text)
    normalized = _normalize(text)
    fields: List[ExtractedField] = []

    def capture(key: str, label: str, pattern: str, confidence: float = 0.88) -> None:
        match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
        if not match:
            match = re.search(pattern, normalized, re.IGNORECASE | re.DOTALL)
        if match:
            _upsert_field(fields, key, label, match.group(1).strip(), confidence, match.group(0))

    capture("date_of_birth", "Date Of Birth", r"Date\s*o[fli]?\s*Birth\s*:?\s*(" + DATE_PATTERN.pattern + r")")
    capture("nid_number", "NID Number", r"(?:ID|1D|!D)\s*N[O0]\s*:?\s*([0-9]{10,17})")

    lines = [line.strip() for line in raw_text.splitlines() if line.strip()]
    for index, line in enumerate(lines):
        alpha_line = _normalize_alpha(line)
        if "name" not in line.lower() and "narne" not in alpha_line and "narrie" not in alpha_line and "narnc" not in alpha_line:
            continue

        candidate = ""
        parts = re.split(r"[:\-]", line, maxsplit=1)
        if len(parts) == 2 and parts[1].strip():
            candidate = parts[1].strip()
        elif index + 1 < len(lines):
            candidate = lines[index + 1].strip()

        candidate = _clean_nid_name(candidate)
        if candidate and not _looks_like_header_noise(candidate):
            _upsert_field(fields, "full_name", "Full Name", candidate, 0.88, candidate)
            break

    dob, conf, source = _find_following_line_value(
        raw_text,
        ["date of birth", "dateoi birth", "dateoibirth", "dateofbirth", "জন্ম তারিখ"],
        DATE_PATTERN,
        max_lookahead=2,
    )
    _upsert_field(fields, "date_of_birth", "Date Of Birth", dob, conf, source)

    nid_number, conf, source = _find_following_line_value(
        raw_text,
        ["id no", "idno", "1d no", "!d no", "জাতীয় পরিচয়পত্র"],
        NID_NUMBER_PATTERN,
        max_lookahead=2,
    )
    _upsert_field(fields, "nid_number", "NID Number", nid_number, conf, source)

    normalized_raw = _normalize(raw_text)
    if "father" in normalized_raw or "পিতা" in raw_text:
        father_name, conf, source = _find_following_block_text(
            raw_text,
            ["father", "পিতা"],
            ["mother", "মাতা", "date of birth", "id no", "1d no", "!d no"],
            max_lines=1,
        )
        father_name = _clean_nid_name(father_name)
        if father_name and not _looks_like_header_noise(father_name):
            _upsert_field(fields, "father_name", "Father Name", father_name, conf, source)

    if "mother" in normalized_raw or "মাতা" in raw_text:
        mother_name, conf, source = _find_following_block_text(
            raw_text,
            ["mother", "মাতা"],
            ["date of birth", "id no", "1d no", "!d no"],
            max_lines=1,
        )
        mother_name = _clean_nid_name(mother_name)
        if mother_name and not _looks_like_header_noise(mother_name):
            _upsert_field(fields, "mother_name", "Mother Name", mother_name, conf, source)

    return fields


def extract_fields(document_type: str, raw_text: str, lines: Sequence[OcrLine]) -> List[ExtractedField]:
    fields: List[ExtractedField] = []
    aliases = FIELD_ALIASES.get(document_type, {})

    locked_birth_certificate_fields = {
        "date_of_birth",
        "registration_date",
        "date_of_issue",
        "registration_no",
        "sex",
        "child_name",
        "mother_name",
        "mother_nationality",
        "father_name",
        "father_nationality",
        "place_of_birth",
        "permanent_address",
        "date_of_birth_words",
    }
    locked_national_id_fields = {
        "full_name",
        "date_of_birth",
        "nid_number",
        "father_name",
        "mother_name",
    }

    if document_type == "birth_certificate":
        for field in _extract_birth_certificate_template_fields(raw_text):
            _upsert_field(fields, field.key, field.label, field.value, field.confidence, field.source_text or "")
    elif document_type == "national_id":
        for field in _extract_national_id_template_fields_v2(raw_text):
            _upsert_field(fields, field.key, field.label, field.value, field.confidence, field.source_text or "")

    for key, field_aliases in aliases.items():
        if document_type == "birth_certificate":
            if key in locked_birth_certificate_fields and any(existing.key == key for existing in fields):
                continue
        if document_type == "national_id":
            if key in {"full_name", "father_name", "mother_name"}:
                continue
            if key in locked_national_id_fields and any(existing.key == key for existing in fields):
                continue
        value, confidence, source = _find_line_value(lines, field_aliases)
        _upsert_field(fields, key, key.replace("_", " ").title(), value, confidence, source)

    existing_keys = {field.key for field in fields}

    if document_type == "birth_certificate":
        for field_key, field_label in (
            ("date_of_birth", "Date Of Birth"),
            ("registration_date", "Registration Date"),
            ("date_of_issue", "Date Of Issue"),
        ):
            if field_key in existing_keys:
                continue
            value, confidence, source = _match_labeled_pattern(
                lines,
                raw_text,
                aliases.get(field_key, ()),
                DATE_PATTERN,
                field_key,
            )
            _upsert_field(fields, field_key, field_label, value, confidence, source)
            existing_keys = {field.key for field in fields}

        registration_no_field = _get_field(fields, "registration_no")
        if registration_no_field is None or not _has_valid_long_number(registration_no_field.value):
            value, confidence, source = _find_following_line_value(
                raw_text,
                ["birth registration number", "birh registration number", "birthreglstrationnumber"],
                LONG_NUMBER_PATTERN,
            )
            if not value:
                value, confidence, source = _match_pattern(raw_text, LONG_NUMBER_PATTERN, "registration_no")
            _upsert_field(fields, "registration_no", "Registration No", value, confidence, source)

        for field_key, field_label, aliases_for_field in (
            ("registration_date", "Registration Date", aliases.get("registration_date", ())),
            ("date_of_issue", "Date Of Issue", aliases.get("date_of_issue", ())),
            ("date_of_birth", "Date Of Birth", aliases.get("date_of_birth", ())),
        ):
            existing = _get_field(fields, field_key)
            if existing is not None and _has_valid_date(existing.value):
                continue
            value, confidence, source = _match_labeled_pattern(
                lines,
                raw_text,
                aliases_for_field,
                DATE_PATTERN,
                field_key,
            )
            if not value:
                value, confidence, source = _match_pattern(raw_text, DATE_PATTERN, field_key)
            _upsert_field(fields, field_key, field_label, value, confidence, source)

    if document_type == "national_id":
        for field_key, field_label, aliases_for_field in (
            ("date_of_birth", "Date Of Birth", aliases.get("date_of_birth", ())),
        ):
            existing = _get_field(fields, field_key)
            if existing is not None and _has_valid_date(existing.value):
                continue
            value, confidence, source = _match_labeled_pattern(
                lines,
                raw_text,
                aliases_for_field,
                DATE_PATTERN,
                field_key,
            )
            if not value:
                value, confidence, source = _match_pattern(raw_text, DATE_PATTERN, field_key)
            _upsert_field(fields, field_key, field_label, value, confidence, source)

        nid_field = _get_field(fields, "nid_number")
        if nid_field is None or not _has_valid_long_number(nid_field.value):
            value, confidence, source = _find_following_line_value(
                raw_text,
                ["id no", "idno", "1d no", "national id", "জাতীয় পরিচয়পত্র"],
                NID_NUMBER_PATTERN,
                max_lookahead=2,
            )
            if not value:
                value, confidence, source = _match_pattern(raw_text, NID_NUMBER_PATTERN, "nid_number")
            _upsert_field(fields, "nid_number", "NID Number", value, confidence, source)

    if "phone" not in existing_keys:
        value, confidence, source = _match_pattern(raw_text, PHONE_PATTERN, "phone")
        _upsert_field(fields, "phone", "Phone", value, confidence, source)
        existing_keys = {field.key for field in fields}

    if "date_of_birth" not in existing_keys and document_type != "birth_certificate":
        value, confidence, source = _match_pattern(raw_text, DATE_PATTERN, "date_of_birth")
        _upsert_field(fields, "date_of_birth", "Date Of Birth", value, confidence, source)
        existing_keys = {field.key for field in fields}

    if document_type == "birth_certificate":
        if "registration_no" not in existing_keys:
            value, confidence, source = _match_pattern(raw_text, LONG_NUMBER_PATTERN, "registration_no")
            _upsert_field(fields, "registration_no", "Registration No", value, confidence, source)
    elif document_type == "national_id":
        if "nid_number" not in existing_keys:
            value, confidence, source = _match_pattern(raw_text, NID_NUMBER_PATTERN, "nid_number")
            _upsert_field(fields, "nid_number", "NID Number", value, confidence, source)

    return fields
