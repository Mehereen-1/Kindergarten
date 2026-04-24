"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  Upload,
  XCircle,
} from "lucide-react";
import { ADMISSION_DEMO_ROWS } from "@/lib/admissions/demoSeed";

type ProcessedRow = {
  row: number;
  studentName: string;
  parentName: string;
  parentEmail: string;
  classId: string;
  academicYear: string;
  status: "auto_verified" | "needs_review" | "rejected";
  overallConfidence: number;
  roll?: string;
  xmlGenerated?: boolean;
};

type FailedRow = {
  row: number;
  error: string;
  data?: Record<string, unknown>;
};

type ImportResults = {
  processed: ProcessedRow[];
  failed: FailedRow[];
  total: number;
  autoVerified: number;
  needsReview: number;
  rejected: number;
};

function statusTone(status: ProcessedRow["status"]) {
  switch (status) {
    case "auto_verified":
      return "bg-[#e7f5e7] text-[#3f6b41] border-[#b9d8bb]";
    case "needs_review":
      return "bg-[#fbf1d4] text-[#8a6500] border-[#ebd28d]";
    default:
      return "bg-[#f8e4df] text-[#a14a2f] border-[#e6b7a9]";
  }
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#d6d2b5] bg-white p-3">
      <p className="text-[11px] uppercase tracking-[0.14em] text-[#6d7750] font-bold">{label}</p>
      <p className="text-lg font-black text-[#3a3927] mt-1">{value}</p>
    </div>
  );
}

function downloadTextFile(content: string, filename: string) {
  const blob = new Blob([content], { type: "application/xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

type DemoAdmissionRow = (typeof ADMISSION_DEMO_ROWS)[number];

function escapeSvgText(value: string) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildDemoSvg(docType: "parent_nid" | "birth_certificate", row: DemoAdmissionRow) {
  const isParent = docType === "parent_nid";
  const title = isParent ? "SYNTHETIC NID SAMPLE" : "SYNTHETIC BIRTH CERTIFICATE SAMPLE";
  const subtitle = isParent ? "TEST ONLY - NOT AN OFFICIAL DOCUMENT" : "TEST ONLY - NOT AN OFFICIAL CERTIFICATE";
  const fields = isParent
    ? [
        ["Name", row["Parent Name"]],
        ["NID Number", row["Parent NID Number"]],
        ["Phone", row["Parent Phone"]],
        ["Address", row.Address],
        ["Child", row["Student Name"]],
        ["Child DOB", row["Date of Birth"]],
      ]
    : [
        ["Child Name", row["Student Name"]],
        ["Registration Number", row["Birth Certificate Number"]],
        ["Date of Birth", row["Date of Birth"]],
        ["Parent Name", row["Parent Name"]],
        ["Parent Email", row["Parent Email"]],
        ["Class ID", row["Class ID"]],
      ];

  const fieldLines = fields
    .map(
      ([label, value], index) => `
        <text x="70" y="${260 + index * 90}" font-size="40" fill="#222222" font-family="Arial, Helvetica, sans-serif">
          ${escapeSvgText(label)}: ${escapeSvgText(value)}
        </text>`
    )
    .join("\n");

  const watermarkY = isParent ? 610 : 640;
  const accentColor = isParent ? "#7a8d55" : "#8b5e3c";

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000">
      <rect width="1600" height="1000" fill="#fffdf6" />
      <rect x="40" y="40" width="1520" height="920" rx="42" fill="#ffffff" stroke="#d6d2b5" stroke-width="10" />
      <rect x="40" y="40" width="1520" height="110" rx="42" fill="${accentColor}" opacity="0.15" />
      <text x="80" y="105" font-size="52" font-weight="800" fill="#2e2e2e" font-family="Arial, Helvetica, sans-serif">
        ${escapeSvgText(title)}
      </text>
      <text x="80" y="160" font-size="32" fill="#6b6b6b" font-family="Arial, Helvetica, sans-serif">
        ${escapeSvgText(subtitle)}
      </text>
      <text x="1050" y="155" font-size="24" fill="#6b6b6b" font-family="Arial, Helvetica, sans-serif">
        File: ${escapeSvgText(String(row[isParent ? "Parent NID File" : "Birth Certificate File"]))}
      </text>
      <line x1="80" y1="205" x2="1520" y2="205" stroke="#d6d2b5" stroke-width="4" />
      ${fieldLines}
      <text x="810" y="450" font-size="26" fill="#8a6500" font-family="Arial, Helvetica, sans-serif" transform="rotate(-18 810 450)">
        TEST ONLY
      </text>
      <text x="770" y="${watermarkY}" font-size="120" font-weight="900" fill="#c91f37" opacity="0.12" font-family="Arial, Helvetica, sans-serif" transform="rotate(-22 770 ${watermarkY})">
        TEST ONLY
      </text>
      <rect x="1180" y="280" width="220" height="280" rx="24" fill="#f3ead2" stroke="#cbbf9a" stroke-width="4" />
      <text x="1230" y="420" font-size="30" fill="#6b6b6b" font-family="Arial, Helvetica, sans-serif">
        PHOTO
      </text>
      <text x="1200" y="460" font-size="24" fill="#6b6b6b" font-family="Arial, Helvetica, sans-serif">
        PLACEHOLDER
      </text>
      <text x="70" y="920" font-size="24" fill="#6b6b6b" font-family="Arial, Helvetica, sans-serif">
        Synthetic test asset for OCR validation only.
      </text>
    </svg>
  `.trim();
}

async function svgToPngFile(svgText: string, fileName: string) {
  const svgBlob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });

  let source: ImageBitmap | HTMLImageElement;
  try {
    source = await createImageBitmap(svgBlob);
  } catch {
    source = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`Failed to load ${fileName}`));
      image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`;
    });
  }

  const canvas = document.createElement("canvas");
  canvas.width = 1600;
  canvas.height = 1000;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    throw new Error("Canvas context unavailable");
  }

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);

  if ("close" in source) {
    source.close();
  }

  return await new Promise<File>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error(`Failed to build demo image ${fileName}`));
        return;
      }

      resolve(new File([blob], fileName, { type: "image/png" }));
    }, "image/png");
  });
}

export default function AdmissionIntakeImport() {
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [documentFiles, setDocumentFiles] = useState<File[]>([]);
  const [demoMode, setDemoMode] = useState(false);
  const [loadingDemoDocs, setLoadingDemoDocs] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ImportResults | null>(null);
  const [generatedParentXml, setGeneratedParentXml] = useState("");
  const [generatedStudentXml, setGeneratedStudentXml] = useState("");
  const [error, setError] = useState("");

  const selectedDocumentCount = useMemo(() => documentFiles.length, [documentFiles]);

  async function downloadTemplate() {
    try {
      const response = await fetch("/api/admin/admissions/template", { cache: "no-store" });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Failed to download template");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "admission_intake_template.xlsx";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (templateError: any) {
      alert(templateError?.message || "Failed to download template");
    }
  }

  async function loadDemoDocuments() {
    setLoadingDemoDocs(true);
    setError("");
    setResults(null);
    setGeneratedParentXml("");
    setGeneratedStudentXml("");

    try {
      const files: File[] = [];

      for (const row of ADMISSION_DEMO_ROWS) {
        const nidSvg = buildDemoSvg("parent_nid", row);
        const birthSvg = buildDemoSvg("birth_certificate", row);
        files.push(await svgToPngFile(nidSvg, row["Parent NID File"]));
        files.push(await svgToPngFile(birthSvg, row["Birth Certificate File"]));
      }

      setDocumentFiles(files);
      setDemoMode(true);
    } catch (demoError: any) {
      setError(demoError?.message || "Failed to build demo documents");
    } finally {
      setLoadingDemoDocs(false);
    }
  }

  async function handleSubmit() {
    if (!excelFile) {
      setError("Please choose the admission Excel file first.");
      return;
    }

    if (!documentFiles.length) {
      setError("Please upload the NID and birth-certificate images that match the file names in the sheet.");
      return;
    }

    setLoading(true);
    setError("");
    setResults(null);
    setGeneratedParentXml("");
    setGeneratedStudentXml("");

    try {
      const formData = new FormData();
      formData.append("excelFile", excelFile);
      formData.append("demoMode", String(demoMode));
      documentFiles.forEach((file) => {
        formData.append("documentFiles", file);
      });

      const response = await fetch("/api/admin/admissions/import-xlsx", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Admission import failed");
      }

      setResults(data.results || null);
      setGeneratedParentXml(String(data.generatedParentXml || ""));
      setGeneratedStudentXml(String(data.generatedStudentXml || ""));
    } catch (submitError: any) {
      setError(submitError?.message || "Admission import failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold">Admission Intake Verification</h2>
            <p className="text-sm text-gray-500 mt-1">
              Upload one Excel sheet, attach the matching NID and birth-certificate images, verify them, and generate the existing XML formats for the normal XML import screens.
            </p>
          </div>

          <button
            onClick={downloadTemplate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            <Download size={16} />
            Download Excel Template
          </button>
        </div>

        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-amber-300 bg-amber-50 px-4 py-3">
          <label className="flex items-center gap-2 text-sm font-medium text-amber-900">
            <input
              type="checkbox"
              checked={demoMode}
              onChange={(event) => setDemoMode(event.target.checked)}
            />
            Demo mode
          </label>
          <span className="text-sm text-amber-800">
            Use synthetic test documents instead of real NID or birth-certificate scans.
          </span>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-dashed border-gray-300 p-5">
            <label className="flex cursor-pointer flex-col items-center gap-3 text-center">
              <FileSpreadsheet size={44} className="text-gray-400" />
              <div>
                <p className="font-semibold text-gray-700">
                  {excelFile ? excelFile.name : "Choose the admission Excel file"}
                </p>
                <p className="text-xs text-gray-500 mt-1">Upload the workbook with the admission rows.</p>
              </div>
              <input
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(event) => {
                  setExcelFile(event.target.files?.[0] || null);
                  setResults(null);
                  setGeneratedParentXml("");
                  setGeneratedStudentXml("");
                }}
              />
            </label>
          </div>

          <div className="rounded-lg border border-dashed border-gray-300 p-5">
            <label className="flex cursor-pointer flex-col items-center gap-3 text-center">
              <Upload size={44} className="text-gray-400" />
              <div>
                <p className="font-semibold text-gray-700">
                  {selectedDocumentCount > 0 ? `${selectedDocumentCount} document file(s) selected` : "Choose NID / birth-certificate images"}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  File names must match the `Parent NID File` and `Birth Certificate File` columns in the sheet.
                </p>
              </div>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={(event) => {
                  setDocumentFiles(Array.from(event.target.files || []));
                  setDemoMode(false);
                  setResults(null);
                  setGeneratedParentXml("");
                  setGeneratedStudentXml("");
                }}
              />
            </label>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={loadDemoDocuments}
            disabled={loadingDemoDocs}
            className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-amber-900 font-semibold hover:bg-amber-100 disabled:opacity-60"
          >
            {loadingDemoDocs ? <Loader2 size={16} className="animate-spin" /> : null}
            {loadingDemoDocs ? "Building demo docs..." : "Load demo documents"}
          </button>
          <span className="text-xs text-gray-500">
            This generates clearly synthetic test-only documents and enables demo mode.
          </span>
        </div>

        {documentFiles.length > 0 && (
          <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm font-semibold text-gray-700 mb-2">Selected documents</p>
            <div className="flex flex-wrap gap-2">
              {documentFiles.map((file) => (
                <span key={`${file.name}-${file.size}`} className="rounded-full bg-white border border-gray-200 px-3 py-1 text-xs text-gray-700">
                  {file.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-5 py-3 text-white font-semibold hover:bg-green-700 disabled:bg-gray-300"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
            {loading ? "Verifying..." : "Verify and Generate XML"}
          </button>
        </div>
      </div>

      {results && (
        <div className="bg-white p-6 rounded-lg shadow-md space-y-5">
          <div className="grid gap-4 md:grid-cols-4">
            <StatBox label="Total rows" value={String(results.total)} />
            <StatBox label="Auto verified" value={String(results.autoVerified)} />
            <StatBox label="Needs review" value={String(results.needsReview)} />
            <StatBox label="Rejected" value={String(results.rejected)} />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-[#d6d2b5] bg-[#fffdf6] p-4">
              <p className="text-sm font-semibold text-[#3a3927] mb-2">Generated Parent XML</p>
              <button
                onClick={() => generatedParentXml && downloadTextFile(generatedParentXml, "parents_generated.xml")}
                disabled={!generatedParentXml}
                className="inline-flex items-center gap-2 rounded-lg bg-[#5f6843] px-4 py-2 text-white font-semibold disabled:bg-gray-300"
              >
                Download parent XML
              </button>
            </div>
            <div className="rounded-2xl border border-[#d6d2b5] bg-[#fffdf6] p-4">
              <p className="text-sm font-semibold text-[#3a3927] mb-2">Generated Student XML</p>
              <button
                onClick={() => generatedStudentXml && downloadTextFile(generatedStudentXml, "students_generated.xml")}
                disabled={!generatedStudentXml}
                className="inline-flex items-center gap-2 rounded-lg bg-[#5f6843] px-4 py-2 text-white font-semibold disabled:bg-gray-300"
              >
                Download student XML
              </button>
            </div>
          </div>

          {results.processed.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-800">Processed rows</h3>
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-left text-gray-600">
                    <tr>
                      <th className="px-4 py-3">Row</th>
                      <th className="px-4 py-3">Student</th>
                      <th className="px-4 py-3">Parent</th>
                      <th className="px-4 py-3">Class</th>
                      <th className="px-4 py-3">Roll</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Confidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.processed.map((row) => (
                      <tr key={`${row.row}-${row.parentEmail}`} className="border-t border-gray-100">
                        <td className="px-4 py-3">{row.row}</td>
                        <td className="px-4 py-3 font-medium text-gray-800">{row.studentName}</td>
                        <td className="px-4 py-3 text-gray-700">{row.parentName}</td>
                        <td className="px-4 py-3 text-gray-700">{row.classId}</td>
                        <td className="px-4 py-3 text-gray-700">{row.roll || "-"}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${statusTone(row.status)}`}>
                            {row.status === "auto_verified" ? <CheckCircle2 size={14} /> : row.status === "needs_review" ? <AlertTriangle size={14} /> : <XCircle size={14} />}
                            {row.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{Math.round(row.overallConfidence)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {results.failed.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-800">Failed rows</h3>
              <div className="space-y-2">
                {results.failed.map((item) => (
                  <div key={`${item.row}-${item.error}`} className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <p className="font-semibold">Row {item.row}</p>
                    <p>{item.error}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
