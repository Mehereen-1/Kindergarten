type DateBoundary = 'start' | 'end';

function toValidDate(value: string | Date | null | undefined) {
  if (!value) return null;
  const parsed = value instanceof Date ? new Date(value) : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function normalizeExamCycleDate(value: string | Date | null | undefined, boundary: DateBoundary) {
  const parsed = toValidDate(value);
  if (!parsed) return null;

  if (boundary === 'start') {
    parsed.setUTCHours(0, 0, 0, 0);
  } else {
    parsed.setUTCHours(23, 59, 59, 999);
  }

  return parsed;
}

export function getMarksEntryWindowState(
  examCycle: {
    status?: string | null;
    marksEntryStartDate?: string | Date | null;
    marksEntryEndDate?: string | Date | null;
  } | null | undefined,
  now = new Date()
) {
  if (!examCycle) {
    return {
      isOpen: false,
      message: 'Exam cycle is unavailable.',
    };
  }

  if (examCycle.status !== 'open') {
    return {
      isOpen: false,
      message:
        examCycle.status === 'published'
          ? 'Marks entry is closed because this exam cycle is already published.'
          : `Marks entry is unavailable because this exam cycle is ${examCycle.status || 'not open'}.`,
    };
  }

  const start = normalizeExamCycleDate(examCycle.marksEntryStartDate, 'start');
  const end = normalizeExamCycleDate(examCycle.marksEntryEndDate, 'end');

  if (!start || !end) {
    return {
      isOpen: false,
      message: 'Marks entry dates are not configured correctly.',
    };
  }

  if (now < start) {
    return {
      isOpen: false,
      message: `Marks entry opens on ${start.toLocaleDateString()}.`,
    };
  }

  if (now > end) {
    return {
      isOpen: false,
      message: `Marks entry closed on ${end.toLocaleDateString()}.`,
    };
  }

  return {
    isOpen: true,
    message: '',
  };
}
