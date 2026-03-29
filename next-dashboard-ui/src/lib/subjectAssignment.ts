import ClassSubjectAssignment from '@/lib/models/ClassSubjectAssignment';

function toIdString(value: any): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value._id) return String(value._id);
  try {
    return String(value);
  } catch {
    return null;
  }
}

export function getCandidateAcademicYears(examCycleYear?: string): string[] {
  const currentYear = String(new Date().getFullYear());
  const candidates: string[] = [];

  if (!examCycleYear) return [currentYear];

  candidates.push(examCycleYear);

  if (examCycleYear.includes('-')) {
    for (const part of examCycleYear.split('-')) {
      const normalized = part.trim();
      if (normalized && !candidates.includes(normalized)) {
        candidates.push(normalized);
      }
    }
  }

  if (!candidates.includes(currentYear)) {
    candidates.push(currentYear);
  }

  return candidates;
}

export async function findClassSubjectAssignment(params: {
  classId: any;
  subjectId: any;
  academicYear?: string;
}) {
  const classId = toIdString(params.classId);
  const subjectId = toIdString(params.subjectId);
  if (!classId || !subjectId) return null;

  const years = getCandidateAcademicYears(params.academicYear);
  for (const year of years) {
    const assignment = await ClassSubjectAssignment.findOne({
      classId,
      subjectId,
      academicYear: year,
      status: 'active',
    });
    if (assignment) {
      return assignment;
    }
  }

  return null;
}

export async function resolveTeacherIdForSetup(params: {
  explicitTeacherId?: any;
  classId: any;
  subjectId: any;
  academicYear?: string;
}) {
  const explicitTeacherId = toIdString(params.explicitTeacherId);
  if (explicitTeacherId) {
    return explicitTeacherId;
  }

  const assignment = await findClassSubjectAssignment({
    classId: params.classId,
    subjectId: params.subjectId,
    academicYear: params.academicYear,
  });

  return assignment ? toIdString(assignment.teacherId) : null;
}
