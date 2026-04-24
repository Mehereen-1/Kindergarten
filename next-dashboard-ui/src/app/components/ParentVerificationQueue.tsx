"use client";

import { useEffect, useState } from "react";
import {
  BadgeCheck,
  CheckCircle2,
  Clock3,
  Loader2,
  RefreshCw,
  ShieldCheck,
  XCircle,
  ChevronRight,
} from "lucide-react";

type VerificationRecord = {
  _id: string;
  parentName?: string;
  childName?: string;
  status: "pending" | "auto_verified" | "needs_review" | "approved" | "rejected";
  overallConfidence?: number;
  submittedAt?: string;
  updatedAt?: string;
  notes?: string[];
  userId?: {
    name?: string;
    email?: string;
  };
  reviewedBy?: {
    name?: string;
    email?: string;
  };
  documents?: Array<{
    docType: "parent_nid" | "birth_certificate";
    filename: string;
    fileUrl: string;
    ocrConfidence?: number;
    matchScore?: number;
    matchStatus?: "matched" | "partial" | "mismatch";
    authenticityStatus?: "official" | "suspicious" | "invalid";
    authenticityScore?: number;
    visualMarkerStatus?: "present" | "missing" | "unsupported";
    visualMarkerScore?: number;
    barcodeCount?: number;
    qrCount?: number;
    barcodeKinds?: string[];
    sealLikeScore?: number;
    reasons?: string[];
  }>;
};

function badgeTone(status: string) {
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

export default function ParentVerificationQueue() {
  const [records, setRecords] = useState<VerificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    void loadRecords();
  }, []);

  async function loadRecords() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/parent-verifications", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Failed to load verification queue");
      }
      setRecords(Array.isArray(data.verifications) ? data.verifications : []);
    } catch (loadError: any) {
      setError(loadError?.message || "Failed to load verification queue");
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(verificationId: string, status: "approved" | "rejected" | "needs_review") {
    setSavingId(verificationId);
    setError("");

    try {
      const response = await fetch("/api/admin/parent-verifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verificationId, status }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Failed to update verification");
      }

      setRecords((current) =>
        current.map((record) => (record._id === verificationId ? data.verification : record))
      );
    } catch (updateError: any) {
      setError(updateError?.message || "Failed to update verification");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-[#d6d2b5] bg-[#fffdf6] shadow-sm p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#d9a777]/25 flex items-center justify-center text-[#4f6b4a]">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#6d7750]">Review queue</p>
              <h2 className="text-2xl font-black text-[#3a3927] mt-1">Parent verification records</h2>
              <p className="text-sm text-[#5b6146] mt-1">
                Auto-verified records should stay approved. Anything with low OCR confidence appears here for review.
              </p>
            </div>
          </div>

          <button
            onClick={() => void loadRecords()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-[#5f6843] text-white font-semibold hover:bg-[#4f5838] transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-2xl border border-[#e6b7a9] bg-[#f8e4df] text-[#a14a2f] px-4 py-3 text-sm">
            {error}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-[#676551]">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Loading queue...
        </div>
      ) : records.length === 0 ? (
        <div className="rounded-[28px] border border-[#d6d2b5] bg-[#fffdf6] shadow-sm p-8 text-center">
          <CheckCircle2 className="w-12 h-12 text-[#4f6b4a] mx-auto mb-3" />
          <p className="text-lg font-semibold text-[#3a3927]">No verification records yet.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {records.map((record) => (
            <div key={record._id} className="rounded-[28px] border border-[#d6d2b5] bg-[#fffdf6] shadow-sm p-5">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-black text-[#3a3927]">{record.parentName || record.userId?.name || "Parent"}</h3>
                    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${badgeTone(record.status)}`}>
                      {record.status}
                    </span>
                  </div>
                  <p className="text-sm text-[#5b6146]">
                    Child: <span className="font-semibold text-[#3a3927]">{record.childName || "-"}</span>
                  </p>
                  <p className="text-sm text-[#5b6146]">
                    Account: {record.userId?.email || "-"}
                  </p>
                  <p className="text-sm text-[#5b6146]">
                    Confidence: <span className="font-semibold text-[#3a3927]">{Math.round(record.overallConfidence || 0)}%</span>
                  </p>
                  <p className="text-sm text-[#5b6146]">
                    Submitted: {record.submittedAt ? new Date(record.submittedAt).toLocaleString() : "-"}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => void updateStatus(record._id, "approved")}
                    disabled={savingId === record._id}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#5f6843] text-white font-semibold hover:bg-[#4f5838] transition-colors disabled:opacity-60"
                  >
                    <BadgeCheck className="w-4 h-4" />
                    Approve
                  </button>
                  <button
                    onClick={() => void updateStatus(record._id, "needs_review")}
                    disabled={savingId === record._id}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#ebd28d] bg-[#fbf1d4] text-[#8a6500] font-semibold hover:bg-[#f5e7b4] transition-colors disabled:opacity-60"
                  >
                    <Clock3 className="w-4 h-4" />
                    Review
                  </button>
                  <button
                    onClick={() => void updateStatus(record._id, "rejected")}
                    disabled={savingId === record._id}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#e6b7a9] bg-[#f8e4df] text-[#a14a2f] font-semibold hover:bg-[#f1d0c7] transition-colors disabled:opacity-60"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject
                  </button>
                </div>
              </div>

              {record.notes?.length ? (
                <div className="mt-4 rounded-2xl border border-[#ebd28d] bg-[#fbf1d4] p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#8a6500]">Notes</p>
                  <ul className="mt-2 space-y-1 text-sm text-[#6f5600]">
                    {record.notes.map((note) => (
                      <li key={note}>- {note}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {record.documents?.map((doc) => (
                  <div key={`${record._id}-${doc.docType}`} className="rounded-2xl border border-[#d6d2b5] bg-white p-4 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-[#3a3927] capitalize">
                        {doc.docType === "parent_nid" ? "Parent NID" : "Birth certificate"}
                      </p>
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${badgeTone(doc.matchStatus || "partial")}`}>
                        {doc.matchStatus || "partial"}
                      </span>
                    </div>
                    <p className="text-xs text-[#676551] break-all">{doc.filename}</p>
                    <p className="text-xs text-[#676551]">
                      OCR confidence: {Math.round(doc.ocrConfidence || 0)}% | Match: {Math.round(doc.matchScore || 0)}%
                    </p>
                    <p className="text-xs text-[#676551]">
                      Authenticity: <span className="font-semibold text-[#3a3927]">{doc.authenticityStatus || "suspicious"}</span>
                    </p>
                    <p className="text-xs text-[#676551]">
                      Visual: <span className="font-semibold text-[#3a3927]">{doc.visualMarkerStatus || "missing"}</span>
                      {" "} | Score: {Math.round(doc.visualMarkerScore || 0)}%
                      {" "} | QR/Barcode: {doc.barcodeCount || 0}
                      {" "} | Seal: {Math.round(doc.sealLikeScore || 0)}%
                    </p>
                    {doc.fileUrl ? (
                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-sm font-semibold text-[#5f6843] hover:text-[#4f5838]"
                      >
                        Open file
                        <ChevronRight className="w-4 h-4" />
                      </a>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
