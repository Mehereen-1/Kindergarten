'use client';

interface ResultCardViewProps {
  data: any;
  onPrint?: () => void;
  showActions?: boolean;
}

function formatDate(value?: string | Date | null) {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleDateString();
}

function getStatusLabel(result: { promotionStatus?: string | null }) {
  switch (result.promotionStatus) {
    case 'promoted':
      return 'Promoted';
    case 'failed':
      return 'Needs Review';
    default:
      return 'Published';
  }
}

export default function ResultCardView({
  data,
  onPrint,
  showActions = true,
}: ResultCardViewProps) {
  const { template, examCycle, student, result, subjectRows, coScholasticRows, disciplineRows } = data;
  const colors = template?.colors || {};

  const summaryTiles = [
    {
      label: template?.summaryFieldLabels?.totalMarks || 'Overall Marks',
      value: `${result?.totalObtained ?? '-'} / ${result?.totalFullMarks ?? '-'}`,
      color: colors.summaryOne,
    },
    {
      label: template?.summaryFieldLabels?.percentage || 'Percentage',
      value: result?.percentage !== undefined ? `${Number(result.percentage).toFixed(2)}%` : '-',
      color: colors.summaryTwo,
    },
    {
      label: template?.summaryFieldLabels?.grade || 'Grade',
      value: result?.overallGrade || '-',
      color: colors.summaryThree,
    },
    {
      label: template?.summaryFieldLabels?.rank || 'Rank',
      value:
        result?.classRank && result?.classTotal
          ? `${result.classRank} / ${result.classTotal}`
          : 'Not Ranked',
      color: colors.summaryFour,
    },
  ];

  return (
    <>
      <style jsx global>{`
        @page {
          size: A4 portrait;
          margin: 0;
        }

        @media print {
          html, body {
            width: 210mm;
            height: 297mm;
            margin: 0 !important;
            overflow: hidden !important;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          #__next,
          main {
            width: 210mm;
            height: 297mm;
            overflow: hidden !important;
          }

          .report-card-print-frame {
            width: 210mm !important;
            min-height: 297mm !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
          }

          .report-card-print-scale {
            transform: scale(0.62);
            transform-origin: top left;
            width: 338mm;
            max-width: none !important;
          }

          .report-card-print-tight {
            page-break-inside: avoid;
          }

          .report-card-print-hide {
            display: none !important;
          }

          .report-card-print-table {
            min-width: 0 !important;
          }

          .report-card-print-table > div,
          .report-card-print-table .print-row {
            min-width: 0 !important;
          }

          .report-card-print-two-col {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }

          .report-card-print-four-col {
            display: grid !important;
            grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
          }

          .report-card-print-no-break {
            break-inside: avoid;
            page-break-inside: avoid;
          }

        }
      `}</style>

    <div className="min-h-screen bg-[#efe8d8] px-3 py-5 print:bg-white print:p-0 report-card-print-frame">
      <div className="mx-auto max-w-6xl report-card-print-scale">
        {showActions && (
          <div className="mb-4 flex justify-end gap-3 print:hidden report-card-print-hide">
            <button
              type="button"
              onClick={onPrint}
              className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Print Result Card
            </button>
          </div>
        )}

        <div
          className="rounded-[28px] border-[10px] bg-[#fffdf5] p-3 shadow-2xl print:rounded-none print:border-[8px] print:shadow-none report-card-print-tight"
          style={{ borderColor: colors.frame }}
        >
          <div
            className="rounded-[22px] border bg-[#fffdf7] p-4 md:p-6"
            style={{
              borderColor: colors.frame,
              backgroundImage: `radial-gradient(circle at top left, ${colors.watermark} 0, transparent 30%), repeating-linear-gradient(0deg, transparent 0, transparent 18px, rgba(0,0,0,0.015) 19px, transparent 20px)`,
            }}
          >
            <div
              className="rounded-[24px] px-4 py-4 text-center text-white md:px-8"
              style={{
                background: `linear-gradient(135deg, ${colors.headerStart}, ${colors.headerEnd})`,
              }}
            >
              <p className="text-[11px] uppercase tracking-[0.35em] text-white/75">
                Official Report Card
              </p>
              <h1 className="mt-2 font-serif text-2xl font-bold uppercase md:text-4xl">
                {template?.schoolName || 'Your School Name'}
              </h1>
              {template?.affiliationLine ? (
                <p className="mt-2 text-xs text-white/90 md:text-sm">{template.affiliationLine}</p>
              ) : null}
              {template?.contactLine ? (
                <p className="mt-1 text-xs text-white/75 md:text-sm">{template.contactLine}</p>
              ) : null}
            </div>

            <div className="mt-5 text-center">
              <h2 className="font-serif text-2xl font-semibold text-slate-800 md:text-3xl">
                {template?.cardTitle || 'Academic Record'}
              </h2>
              <p className="mt-1 text-sm font-medium text-slate-500">
                Academic Session - {template?.sessionLabel || examCycle?.academicYear || '-'}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {examCycle?.examName} | {examCycle?.termName}
              </p>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-2 report-card-print-two-col report-card-print-no-break">
              <div className="rounded-2xl border border-[#eadfc1] bg-white/80 p-4 report-card-print-no-break">
                <div className="grid gap-3 text-sm md:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {template?.studentFieldLabels?.name || 'Student Name'}
                    </p>
                    <p className="mt-1 font-semibold text-slate-900">{student?.name || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {template?.studentFieldLabels?.rollNumber || 'Roll No.'}
                    </p>
                    <p className="mt-1 font-semibold text-slate-900">{student?.rollNo || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Class
                    </p>
                    <p className="mt-1 font-semibold text-slate-900">
                      {student?.className || '-'} {student?.classCode ? `(${student.classCode})` : ''}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {template?.studentFieldLabels?.dateOfBirth || 'Date of Birth'}
                    </p>
                    <p className="mt-1 font-semibold text-slate-900">
                      {formatDate(student?.dateOfBirth)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {template?.studentFieldLabels?.guardianPrimary || "Guardian's Name"}
                    </p>
                    <p className="mt-1 font-semibold text-slate-900">
                      {student?.guardianPrimaryName || '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {template?.studentFieldLabels?.admissionNo || 'Admission No.'}
                    </p>
                    <p className="mt-1 font-semibold text-slate-900">
                      {student?.admissionNo || '-'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-[#eadfc1] bg-white/80 p-4 report-card-print-no-break">
                <div className="grid gap-3 text-sm md:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Exam Type
                    </p>
                    <p className="mt-1 font-semibold capitalize text-slate-900">
                      {examCycle?.examType || '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Result Status
                    </p>
                    <p className="mt-1 font-semibold text-slate-900">{getStatusLabel(result)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Published On
                    </p>
                    <p className="mt-1 font-semibold text-slate-900">
                      {formatDate(result?.publishedAt)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      GPA
                    </p>
                    <p className="mt-1 font-semibold text-slate-900">
                      {result?.gpa !== null && result?.gpa !== undefined
                        ? Number(result.gpa).toFixed(2)
                        : '-'}
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Message
                    </p>
                    <p className="mt-1 font-medium text-slate-800">{result?.message || '-'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 overflow-x-auto rounded-[20px] border border-[#eadfc1] bg-white/90 report-card-print-table">
              <div
                className="grid min-w-[820px] grid-cols-[minmax(180px,2fr)_repeat(5,minmax(80px,1fr))] text-xs font-semibold uppercase tracking-wide text-slate-800 md:min-w-0 md:grid-cols-[minmax(190px,2fr)_repeat(5,minmax(86px,1fr))] print-row"
                style={{ backgroundColor: colors.tableHeader }}
              >
                <div className="border-r border-[#dfd0a3] px-3 py-3">Subject</div>
                <div className="border-r border-[#dfd0a3] px-2 py-3 text-center">Obtained</div>
                <div className="border-r border-[#dfd0a3] px-2 py-3 text-center">Full Marks</div>
                <div className="border-r border-[#dfd0a3] px-2 py-3 text-center">Percentage</div>
                <div className="border-r border-[#dfd0a3] px-2 py-3 text-center">Grade</div>
                <div className="px-2 py-3 text-center">Status</div>
              </div>

              {subjectRows?.map((row: any) => (
                <div
                  key={row.key}
                  className="grid min-w-[820px] grid-cols-[minmax(180px,2fr)_repeat(5,minmax(80px,1fr))] border-t border-[#efe5c7] text-sm text-slate-800 md:min-w-0 md:grid-cols-[minmax(190px,2fr)_repeat(5,minmax(86px,1fr))] print-row"
                >
                  <div className="border-r border-[#efe5c7] px-3 py-3 font-semibold break-words">{row.label}</div>
                  <div className="border-r border-[#efe5c7] px-2 py-3 text-center">
                    {row.hasResult ? row.obtained : '-'}
                  </div>
                  <div className="border-r border-[#efe5c7] px-2 py-3 text-center">
                    {row.hasResult ? row.fullMarks : '-'}
                  </div>
                  <div className="border-r border-[#efe5c7] px-2 py-3 text-center">
                    {row.hasResult ? `${Number(row.percentage).toFixed(2)}%` : '-'}
                  </div>
                  <div className="border-r border-[#efe5c7] px-2 py-3 text-center font-semibold">
                    {row.hasResult ? row.grade || '-' : '-'}
                  </div>
                  <div className="px-2 py-3 text-center text-xs md:text-sm break-words">
                    {row.hasResult ? (row.isPassed ? 'Pass' : 'Needs Review') : '-'}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-4 report-card-print-four-col report-card-print-no-break">
              {summaryTiles.map((tile) => (
                <div
                  key={tile.label}
                  className="rounded-2xl px-4 py-3 text-white shadow-lg report-card-print-no-break"
                  style={{ backgroundColor: tile.color }}
                >
                  <p className="text-xs uppercase tracking-wide text-white/75">{tile.label}</p>
                  <p className="mt-2 text-lg font-bold">{tile.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 report-card-print-two-col report-card-print-no-break">
              <div className="overflow-hidden rounded-[20px] border border-[#eadfc1] bg-white/90 report-card-print-no-break">
                <div
                  className="px-4 py-3 text-sm font-semibold uppercase tracking-wide text-white"
                  style={{ backgroundColor: colors.coScholastic }}
                >
                  Co-Scholastic Area
                </div>
                {coScholasticRows?.map((row: any) => (
                  <div
                    key={row.key}
                    className="grid grid-cols-[minmax(0,2.1fr)_minmax(88px,1fr)] border-t border-[#efe5c7] text-sm"
                  >
                    <div className="border-r border-[#efe5c7] px-4 py-2 text-slate-800 break-words leading-snug">
                      {row.label}
                    </div>
                    <div className={`px-3 py-2 text-center break-words leading-snug ${row.value ? 'font-semibold text-slate-800' : 'text-slate-400'}`}>
                      {row.value || '-'}
                    </div>
                  </div>
                ))}
              </div>

              <div className="overflow-hidden rounded-[20px] border border-[#eadfc1] bg-white/90 report-card-print-no-break">
                <div
                  className="px-4 py-3 text-sm font-semibold uppercase tracking-wide text-white"
                  style={{ backgroundColor: colors.discipline }}
                >
                  Discipline
                </div>
                {disciplineRows?.map((row: any) => (
                  <div
                    key={row.key}
                    className="grid grid-cols-[minmax(0,2.1fr)_minmax(88px,1fr)] border-t border-[#efe5c7] text-sm"
                  >
                    <div className="border-r border-[#efe5c7] px-4 py-2 text-slate-800 break-words leading-snug">
                      {row.label}
                    </div>
                    <div className={`px-3 py-2 text-center break-words leading-snug ${row.value ? 'font-semibold text-slate-800' : 'text-slate-400'}`}>
                      {row.value || '-'}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div
              className="mt-6 rounded-[20px] border px-5 py-4 text-center"
              style={{
                borderColor: colors.frame,
                background: `linear-gradient(135deg, ${colors.watermark}, #fff8e7)`,
              }}
            >
              <p className="text-lg font-semibold text-slate-900">{result?.message || '-'}</p>
            </div>

            <div className="mt-10 grid gap-8 md:grid-cols-2">
              <div className="text-center">
                <div className="mx-auto h-px w-40 bg-slate-400" />
                <p className="mt-3 text-sm font-semibold text-slate-700">
                  {template?.classTeacherSignatureLabel || "Class Teacher's Signature"}
                </p>
              </div>
              <div className="text-center">
                <div className="mx-auto h-px w-40 bg-slate-400" />
                <p className="mt-3 text-sm font-semibold text-slate-700">
                  {template?.principalSignatureLabel || "Principal's Signature"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
