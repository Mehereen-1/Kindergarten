"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  BadgeCheck,
  ChevronRight,
  Clock3,
  FileText,
  Loader2,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { useRequireAuth } from "@/hooks/useAuth";
import { runDocumentOcr } from "@/lib/verification/documentOcr";
import { scanDocumentVisualMarkers, type VisualMarkerSummary } from "@/lib/verification/documentVisualMarkers";
import { evaluateVerificationDocument } from "@/lib/verification/verificationMatch";

type OcrScanResult = {
  text: string;
  confidence: number;
  source: string;
  psm: number;
  candidates: Array<{
    text: string;
    confidence: number;
    source: string;
    psm: number;
    lang: string;
  }>;
};

type ScanState = {
  status: "idle" | "scanning" | "done" | "error";
  error?: string;
  progress?: string;
  result?: OcrScanResult;
  visual?: VisualMarkerSummary;
};

type VerificationRecord = {
  _id: string;
  status: "pending" | "auto_verified" | "needs_review" | "approved" | "rejected";
  overallConfidence?: number;
  parentName?: string;
  childName?: string;
  notes?: string[];
  submittedAt?: string;
  updatedAt?: string;
  documents?: Array<{
    docType: "parent_nid" | "birth_certificate";
    filename: string;
    fileUrl: string;
    ocrConfidence?: number;
    matchScore?: number;
    matchStatus?: "matched" | "partial" | "mismatch";
    ocrText?: string;
    visualMarkerStatus?: "present" | "missing" | "unsupported";
    visualMarkerScore?: number;
    barcodeCount?: number;
    qrCount?: number;
    barcodeKinds?: string[];
    sealLikeScore?: number;
    reasons?: string[];
  }>;
};

function statusTone(status: VerificationRecord["status"] | string) {
  switch (status) {
    case "auto_verified":
    case "approved":
      return "bg-[#e7f5e7] text-[#3f6b41] border-[#b9d8bb]";
    case "needs_review":
      return "bg-[#fbf1d4] text-[#8a6500] border-[#ebd28d]";
    case "rejected":
      return "bg-[#f8e4df] text-[#a14a2f] border-[#e6b7a9]";
    default:
      return "bg-[#edf0e5] text-[#676551] border-[#d6d2b5]";
  }
}

function matchTone(status?: string) {
  switch (status) {
    case "matched":
      return "bg-[#e7f5e7] text-[#3f6b41] border-[#b9d8bb]";
    case "partial":
      return "bg-[#fbf1d4] text-[#8a6500] border-[#ebd28d]";
    default:
      return "bg-[#f8e4df] text-[#a14a2f] border-[#e6b7a9]";
  }
}

function formatDate(value?: string | Date | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString();
}

function scoreToLabel(score?: number) {
  if (score === undefined || score === null) return "-";
  return `${Math.max(0, Math.min(100, Math.round(score)))}%`;
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#d6d2b5] bg-white p-3">
      <p className="text-[11px] uppercase tracking-[0.14em] text-[#6d7750] font-bold">{label}</p>
      <p className="text-lg font-black text-[#3a3927] mt-1">{value}</p>
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-semibold text-[#3a3927]">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="rounded-2xl border border-[#d6d2b5] bg-white px-4 py-3 text-sm text-[#3a3927] outline-none transition focus:border-[#8a6500] focus:ring-2 focus:ring-[#8a6500]/15"
      />
    </label>
  );
}

function DocPanel({
  title,
  description,
  file,
  onFileChange,
  scanState,
  assessment,
  extraHelper,
}: {
  title: string;
  description: string;
  file: File | null;
  onFileChange: (file: File | null) => void;
  scanState: ScanState;
  assessment: ReturnType<typeof evaluateVerificationDocument> | null;
  extraHelper: string;
}) {
  const inputId = title === "Step 1" ? "parent-nid-file" : "birth-cert-file";

  return (
    <div className="rounded-[28px] border border-[#d6d2b5] bg-[#fffdf6] shadow-sm p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#6d7750]">{title}</p>
          <h3 className="text-xl font-black text-[#3a3927] mt-1">{description}</h3>
          <p className="text-sm text-[#5b6146] mt-1">{extraHelper}</p>
        </div>
        <div className="w-11 h-11 rounded-2xl bg-[#f3ead2] flex items-center justify-center text-[#5f6843]">
          <Upload className="w-5 h-5" />
        </div>
      </div>

      <div className="border-2 border-dashed border-[#d6d2b5] rounded-2xl bg-white p-4">
        <label htmlFor={inputId} className="cursor-pointer flex flex-col items-center gap-3 text-center">
          <FileText className="w-8 h-8 text-[#8a6500]" />
          <div>
            <p className="font-semibold text-[#3a3927]">
              {file ? file.name : "Choose a clear document photo"}
            </p>
            <p className="text-xs text-[#676551] mt-1">
              JPG, PNG, or WEBP only. Straight, bright photos work best.
            </p>
          </div>
        </label>
        <input
          id={inputId}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(event) => onFileChange(event.target.files?.[0] || null)}
        />
      </div>

      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-semibold text-[#676551]">OCR status</span>
        {scanState.status === "scanning" ? (
          <span className="inline-flex items-center gap-2 rounded-full border border-[#ebd28d] bg-[#fbf1d4] px-3 py-1 text-[#8a6500]">
            <Loader2 className="w-4 h-4 animate-spin" />
            Scanning
          </span>
        ) : scanState.status === "done" && assessment ? (
          <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 ${matchTone(assessment.matchStatus)}`}>
            <BadgeCheck className="w-4 h-4" />
            {assessment.authenticityStatus === "invalid"
              ? "Invalid"
              : assessment.authenticityStatus === "suspicious"
                ? "Suspicious"
                : assessment.matchStatus === "matched"
                  ? "Auto-verified"
                  : assessment.matchStatus === "partial"
                    ? "Needs review"
                    : "Mismatch"}
          </span>
        ) : scanState.status === "error" ? (
          <span className="inline-flex items-center gap-2 rounded-full border border-[#e6b7a9] bg-[#f8e4df] px-3 py-1 text-[#a14a2f]">
            <AlertTriangle className="w-4 h-4" />
            Error
          </span>
        ) : (
          <span className="inline-flex items-center gap-2 rounded-full border border-[#d6d2b5] bg-[#edf0e5] px-3 py-1 text-[#676551]">
            <Clock3 className="w-4 h-4" />
            Waiting
          </span>
        )}
      </div>

      {scanState.status === "error" && scanState.error && (
        <p className="text-sm text-[#a14a2f]">{scanState.error}</p>
      )}

      {scanState.status === "scanning" && scanState.progress && (
        <p className="text-sm text-[#8a6500]">{scanState.progress}</p>
      )}

      {scanState.status === "done" && scanState.result && assessment && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <StatBox label="OCR confidence" value={scoreToLabel(scanState.result.confidence)} />
            <StatBox label="Match score" value={scoreToLabel(assessment.matchScore)} />
          </div>

          {scanState.visual && (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <StatBox
                label="QR / barcode"
                value={
                  scanState.visual.supportStatus === "supported"
                    ? scanState.visual.barcodeCount > 0
                      ? `${scanState.visual.barcodeCount} found`
                      : "Not found"
                    : scanState.visual.supportStatus === "unsupported"
                      ? "Unsupported"
                      : "Scan error"
                }
              />
              <StatBox
                label="Seal hint"
                value={scanState.visual.sealLikeScore >= 18 ? `${scanState.visual.sealLikeScore}%` : "Low"}
              />
            </div>
          )}

          <div className="rounded-2xl border border-[#d6d2b5] bg-[#fdfbf4] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#6d7750]">Read text</p>
            <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-xs leading-5 text-[#3a3927]">
              {scanState.result.text || "No readable text was detected."}
            </pre>
          </div>

          {scanState.visual?.notes?.length ? (
            <div className="rounded-2xl border border-[#d6d2b5] bg-white p-4">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#6d7750]">Visual checks</p>
              <ul className="mt-2 space-y-1 text-sm text-[#5b6146]">
                {scanState.visual.notes.map((note) => (
                  <li key={note}>- {note}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {assessment.reasons?.length > 0 && (
            <div className="rounded-2xl border border-[#ebd28d] bg-[#fbf1d4] p-4">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#8a6500]">Verification notes</p>
              <ul className="mt-2 space-y-1 text-sm text-[#6f5600]">
                {assessment.reasons.map((reason) => (
                  <li key={reason}>- {reason}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ParentVerificationForm() {
  const { user, loading: authLoading } = useRequireAuth("parent");
  const [parentName, setParentName] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [childName, setChildName] = useState("");
  const [childDateOfBirth, setChildDateOfBirth] = useState("");
  const [parentNidNumber, setParentNidNumber] = useState("");
  const [birthCertificateNumber, setBirthCertificateNumber] = useState("");

  const [parentNidFile, setParentNidFile] = useState<File | null>(null);
  const [birthCertificateFile, setBirthCertificateFile] = useState<File | null>(null);

  const [parentNidScan, setParentNidScan] = useState<ScanState>({ status: "idle" });
  const [birthCertificateScan, setBirthCertificateScan] = useState<ScanState>({ status: "idle" });
  const [currentVerification, setCurrentVerification] = useState<VerificationRecord | null>(null);
  const [loadingVerification, setLoadingVerification] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");
  const [submitError, setSubmitError] = useState("");

  const parentScanToken = useRef(0);
  const birthScanToken = useRef(0);

  useEffect(() => {
    if (user?.name) {
      setParentName(user.name);
    }
  }, [user?.name]);

  useEffect(() => {
    let isMounted = true;

    const loadVerification = async () => {
      if (authLoading || !user?.id) return;

      try {
        setLoadingVerification(true);
        const response = await fetch("/api/parent/verification", { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error || "Failed to load verification status");
        }
        if (isMounted) {
          setCurrentVerification(data?.verification || null);
        }
      } catch (error: any) {
        if (isMounted) {
          setSubmitError(error?.message || "Failed to load verification status");
        }
      } finally {
        if (isMounted) {
          setLoadingVerification(false);
        }
      }
    };

    void loadVerification();

    return () => {
      isMounted = false;
    };
  }, [authLoading, user?.id]);

  const parentAssessment = useMemo(() => {
    if (parentNidScan.status !== "done" || !parentNidScan.result) return null;
    return evaluateVerificationDocument({
      docType: "parent_nid",
      ocrText: parentNidScan.result.text,
      ocrConfidence: parentNidScan.result.confidence,
      expectedParentName: parentName,
      expectedDocumentNumber: parentNidNumber || undefined,
      visualEvidence: parentNidScan.visual,
    });
  }, [parentNidScan, parentName, parentNidNumber]);

  const birthAssessment = useMemo(() => {
    if (birthCertificateScan.status !== "done" || !birthCertificateScan.result) return null;
    return evaluateVerificationDocument({
      docType: "birth_certificate",
      ocrText: birthCertificateScan.result.text,
      ocrConfidence: birthCertificateScan.result.confidence,
      expectedParentName: parentName,
      expectedChildName: childName,
      expectedChildDateOfBirth: childDateOfBirth,
      expectedDocumentNumber: birthCertificateNumber || undefined,
      visualEvidence: birthCertificateScan.visual,
    });
  }, [birthCertificateScan, parentName, childName, childDateOfBirth, birthCertificateNumber]);

  const combinedStatus = useMemo(() => {
    if (!parentAssessment || !birthAssessment) return "pending";
    if (parentAssessment.matchStatus === "matched" && birthAssessment.matchStatus === "matched") {
      return "auto_verified";
    }
    if (parentAssessment.matchStatus === "mismatch" || birthAssessment.matchStatus === "mismatch") {
      return "needs_review";
    }
    return "pending";
  }, [parentAssessment, birthAssessment]);

  const overallConfidence = useMemo(() => {
    if (!parentNidScan.result || !birthCertificateScan.result || !parentAssessment || !birthAssessment) {
      return 0;
    }

    return Math.max(
      0,
      Math.min(
        100,
        Math.round(
          parentNidScan.result.confidence * 0.35 +
            birthCertificateScan.result.confidence * 0.35 +
            parentAssessment.matchScore * 0.15 +
            birthAssessment.matchScore * 0.15
        )
      )
    );
  }, [parentNidScan.result, birthCertificateScan.result, parentAssessment, birthAssessment]);

  useEffect(() => {
    if (parentNidFile) {
      void scanDocument("parent_nid", parentNidFile);
    } else {
      setParentNidScan({ status: "idle" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parentNidFile]);

  useEffect(() => {
    if (birthCertificateFile) {
      void scanDocument("birth_certificate", birthCertificateFile);
    } else {
      setBirthCertificateScan({ status: "idle" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [birthCertificateFile]);

  async function scanDocument(docType: "parent_nid" | "birth_certificate", file: File) {
    const token = docType === "parent_nid" ? ++parentScanToken.current : ++birthScanToken.current;

    const setState = docType === "parent_nid" ? setParentNidScan : setBirthCertificateScan;
    setState({ status: "scanning", progress: "Loading verification checks..." });
    setSubmitError("");
    setSubmitMessage("");

    try {
      const [result, visual] = await Promise.all([
        runDocumentOcr(file, {
          onProgress: (message) => {
            setState((current) => (current.status === "scanning" ? { ...current, progress: message } : current));
          },
        }),
        scanDocumentVisualMarkers(file),
      ]);

      const latestToken = docType === "parent_nid" ? parentScanToken.current : birthScanToken.current;
      if (token !== latestToken) {
        return;
      }

      setState({
        status: "done",
        progress: "OCR and visual checks completed",
        result,
        visual,
      });
    } catch (error: any) {
      const latestToken = docType === "parent_nid" ? parentScanToken.current : birthScanToken.current;
      if (token !== latestToken) {
        return;
      }

      setState({
        status: "error",
        error: error?.message || "OCR failed",
      });
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError("");
    setSubmitMessage("");

    if (!parentNidFile || !birthCertificateFile) {
      setSubmitError("Please upload both documents first.");
      return;
    }

    if (parentNidScan.status !== "done" || birthCertificateScan.status !== "done") {
      setSubmitError("Please wait for OCR to finish before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("parentName", parentName.trim());
      formData.append("parentPhone", parentPhone.trim());
      formData.append("childName", childName.trim());
      formData.append("childDateOfBirth", childDateOfBirth);
      formData.append("parentNidNumber", parentNidNumber.trim());
      formData.append("birthCertificateNumber", birthCertificateNumber.trim());
      formData.append("parentNidFile", parentNidFile);
      formData.append("birthCertificateFile", birthCertificateFile);
      formData.append("parentNidOcrText", parentNidScan.result?.text || "");
      formData.append("parentNidOcrConfidence", String(parentNidScan.result?.confidence || 0));
      formData.append("birthCertificateOcrText", birthCertificateScan.result?.text || "");
      formData.append("birthCertificateOcrConfidence", String(birthCertificateScan.result?.confidence || 0));
      formData.append("parentNidVisualReport", JSON.stringify(parentNidScan.visual || null));
      formData.append("birthCertificateVisualReport", JSON.stringify(birthCertificateScan.visual || null));

      const response = await fetch("/api/parent/verification", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Failed to submit verification");
      }

      setCurrentVerification(data.verification || null);
      setSubmitMessage(
        data.status === "auto_verified"
          ? "Your documents were verified automatically."
          : "Your documents were saved and sent for review."
      );
    } catch (error: any) {
      setSubmitError(error?.message || "Failed to submit verification");
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading || loadingVerification) {
    return (
      <div className="flex items-center justify-center py-16 text-[#676551]">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading verification...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="rounded-[28px] border border-[#d6d2b5] bg-gradient-to-r from-[#f9f5de] to-[#eef5e7] shadow-sm p-6 lg:p-7">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#d9a777]/25 flex items-center justify-center text-[#4f6b4a]">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#6d7750]">Document Verification</p>
              <h1 className="text-3xl lg:text-4xl font-black text-[#3a3927] mt-1">Parent NID and birth certificate OCR</h1>
              <p className="text-sm text-[#5b6146] mt-2 max-w-3xl">
                Upload clear document photos, let OCR scan them automatically, and the system will compare the text with the details you enter.
                If both scans match strongly, the record becomes auto-verified.
              </p>
            </div>
          </div>

          <Link
            href="/parent/child"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-[#5f6843] text-white font-semibold shadow-md hover:bg-[#4f5838] transition-colors"
          >
            Back to children
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
          <StatBox label="Current status" value={currentVerification?.status || "pending"} />
          <StatBox label="Confidence" value={scoreToLabel(currentVerification?.overallConfidence)} />
          <StatBox label="Last submitted" value={formatDate(currentVerification?.submittedAt)} />
        </div>

        {currentVerification?.notes?.length ? (
          <div className="mt-4 rounded-2xl border border-[#ebd28d] bg-[#fbf1d4] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#8a6500]">Review notes</p>
            <ul className="mt-2 space-y-1 text-sm text-[#6f5600]">
              {currentVerification.notes.map((note) => (
                <li key={note}>- {note}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-[28px] border border-[#d6d2b5] bg-[#fffdf6] shadow-sm p-5 space-y-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#6d7750]">Parent details</p>
              <h2 className="text-xl font-black text-[#3a3927] mt-1">Use the name on the parent account</h2>
            </div>

            <InputField
              label="Parent name"
              value={parentName}
              onChange={setParentName}
              placeholder="Parent full name"
            />
            <InputField
              label="Parent phone"
              value={parentPhone}
              onChange={setParentPhone}
              placeholder="Optional phone number"
            />
            <InputField
              label="Parent NID number (optional)"
              value={parentNidNumber}
              onChange={setParentNidNumber}
              placeholder="Only if you want tighter matching"
            />
          </div>

          <div className="rounded-[28px] border border-[#d6d2b5] bg-[#fffdf6] shadow-sm p-5 space-y-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#6d7750]">Child details</p>
              <h2 className="text-xl font-black text-[#3a3927] mt-1">Match the birth certificate</h2>
            </div>

            <InputField
              label="Child name"
              value={childName}
              onChange={setChildName}
              placeholder="Child full name"
            />
            <InputField
              label="Date of birth"
              value={childDateOfBirth}
              onChange={setChildDateOfBirth}
              type="date"
            />
            <InputField
              label="Birth certificate number (optional)"
              value={birthCertificateNumber}
              onChange={setBirthCertificateNumber}
              placeholder="Only if visible on the document"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <DocPanel
            title="Step 1"
            description="Parent NID"
            file={parentNidFile}
            onFileChange={setParentNidFile}
            scanState={parentNidScan}
            assessment={parentAssessment}
            extraHelper="Upload a clear NID photo. The scanner checks the title, issuer, ID number, and looks for a QR/barcode or seal-like mark."
          />
          <DocPanel
            title="Step 2"
            description="Child birth certificate"
            file={birthCertificateFile}
            onFileChange={setBirthCertificateFile}
            scanState={birthCertificateScan}
            assessment={birthAssessment}
            extraHelper="Upload a clear birth certificate photo. The scanner checks the title, issuer, 17-digit registration number, date of birth, and visual markers."
          />
        </div>

        <div className="rounded-[28px] border border-[#d6d2b5] bg-[#fffdf6] shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#6d7750]">Auto verification preview</p>
              <h2 className="text-xl font-black text-[#3a3927] mt-1">What the system expects to do</h2>
            </div>
            <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold ${statusTone(combinedStatus)}`}>
              {combinedStatus === "auto_verified" ? (
                <BadgeCheck className="w-4 h-4" />
              ) : combinedStatus === "needs_review" ? (
                <AlertTriangle className="w-4 h-4" />
              ) : (
                <Clock3 className="w-4 h-4" />
              )}
              {combinedStatus === "auto_verified"
                ? "Likely auto-verified"
                : combinedStatus === "needs_review"
                  ? "Likely needs review"
                  : "Waiting on OCR"}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <StatBox label="Parent NID score" value={parentAssessment ? scoreToLabel(parentAssessment.matchScore) : "-"} />
            <StatBox label="Birth cert score" value={birthAssessment ? scoreToLabel(birthAssessment.matchScore) : "-"} />
            <StatBox label="Combined confidence" value={scoreToLabel(overallConfidence)} />
          </div>
        </div>

        {submitError && (
          <div className="rounded-2xl border border-[#e6b7a9] bg-[#f8e4df] text-[#a14a2f] px-4 py-3 text-sm">
            {submitError}
          </div>
        )}

        {submitMessage && (
          <div className="rounded-2xl border border-[#b9d8bb] bg-[#e7f5e7] text-[#3f6b41] px-4 py-3 text-sm">
            {submitMessage}
          </div>
        )}

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <p className="text-sm text-[#5b6146]">
            OCR uses English + Bangla first, then falls back to English. Clear, straight photos give the best result.
          </p>

          <button
            type="submit"
            disabled={submitting || parentNidScan.status !== "done" || birthCertificateScan.status !== "done"}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#5f6843] text-white font-semibold shadow-md hover:bg-[#4f5838] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving
              </>
            ) : (
              <>
                Submit for verification
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
