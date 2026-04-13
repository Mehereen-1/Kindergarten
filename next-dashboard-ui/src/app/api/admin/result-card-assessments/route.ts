import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import ResultCardAssessment from '@/lib/models/ResultCardAssessment';
import ExamCycle from '@/lib/models/ExamCycle';
import StudentClassHistory from '@/lib/models/StudentClassHistory';
import MarksheetBatch from '@/lib/models/MarksheetBatch';
import MarkEntry from '@/lib/models/MarkEntry';
import '@/lib/models/Student';
import { extractSessionUser } from '@/lib/auth';
import { getResolvedResultCardTemplate } from '@/lib/result-card';
import { getCandidateAcademicYears } from '@/lib/subjectAssignment';

const BYPASS_ADMIN_AUTH = true;

function mapToPlainObject(values: unknown) {
  if (values instanceof Map) {
    return Object.fromEntries(values.entries());
  }

  if (!values || typeof values !== 'object') {
    return {} as Record<string, string>;
  }

  return values as Record<string, string>;
}

function sanitizeAssessmentValues(
  values: unknown,
  allowedKeys: Set<string>
) {
  if (!values || typeof values !== 'object') {
    return {} as Record<string, string>;
  }

  return Object.entries(values as Record<string, unknown>).reduce<Record<string, string>>(
    (accumulator, [key, rawValue]) => {
      if (!allowedKeys.has(key)) {
        return accumulator;
      }

      const value = String(rawValue || '').trim();
      if (!value) {
        return accumulator;
      }

      accumulator[key] = value.slice(0, 60);
      return accumulator;
    },
    {}
  );
}

async function resolveStudents(examCycleId: string, classId: string) {
  const examCycle = await ExamCycle.findById(examCycleId).lean();
  if (!examCycle) {
    throw new Error('Exam cycle not found');
  }

  const candidateYears = getCandidateAcademicYears(String(examCycle.academicYear || ''));
  let histories: any[] = [];

  for (const academicYear of candidateYears) {
    histories = await StudentClassHistory.find({
      classId,
      academicYear,
      status: 'active',
    })
      .populate('studentId', 'name')
      .lean();

    if (histories.length > 0) {
      break;
    }
  }

  if (histories.length === 0) {
    const batchIds = await MarksheetBatch.find({ examCycleId, classId }).distinct('_id');

    if (batchIds.length > 0) {
      const entries = await MarkEntry.find({
        examCycleId,
        batchId: { $in: batchIds },
      })
        .select('studentId')
        .populate('studentId', 'name')
        .lean();

      const seen = new Set<string>();
      const fallbackStudents: Array<{ studentId: string; name: string; rollNo: string }> = [];

      for (const entry of entries as any[]) {
        const studentId = entry.studentId?._id || entry.studentId;
        const studentName = entry.studentId?.name;

        if (!studentId || !studentName) continue;

        const sid = String(studentId);
        if (seen.has(sid)) continue;

        seen.add(sid);
        fallbackStudents.push({
          studentId: sid,
          name: studentName,
          rollNo: '',
        });
      }

      if (fallbackStudents.length > 0) {
        return fallbackStudents.sort((left, right) => left.name.localeCompare(right.name));
      }
    }
  }

  return histories
    .map((history: any) => {
      const studentId = history.studentId?._id || history.studentId;
      if (!studentId || !history.studentId?.name) {
        return null;
      }

      return {
        studentId: String(studentId),
        name: history.studentId.name,
        rollNo: history.rollNo || '',
      };
    })
    .filter(Boolean)
    .sort((left, right) => String(left.rollNo || '').localeCompare(String(right.rollNo || '')));
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const sessionUser = extractSessionUser(request.cookies.get('user')?.value);
    const userRole = sessionUser?.role || request.cookies.get('userRole')?.value;
    if (!BYPASS_ADMIN_AUTH && (!sessionUser?.id || userRole !== 'admin')) {
      return NextResponse.json(
        { success: false, error: 'Only admins can view result card assessments' },
        { status: 403 }
      );
    }

    const examCycleId = String(request.nextUrl.searchParams.get('examCycleId') || '').trim();
    const classId = String(request.nextUrl.searchParams.get('classId') || '').trim();

    if (!examCycleId || !classId) {
      return NextResponse.json(
        { success: false, error: 'examCycleId and classId are required' },
        { status: 400 }
      );
    }

    const [template, students] = await Promise.all([
      getResolvedResultCardTemplate(examCycleId),
      resolveStudents(examCycleId, classId),
    ]);

    const assessments = await ResultCardAssessment.find({
      examCycleId,
      classId,
      studentId: { $in: students.map((student) => student.studentId) },
    }).lean();

    const assessmentByStudentId = new Map(
      assessments.map((assessment: any) => [String(assessment.studentId), assessment])
    );

    return NextResponse.json({
      success: true,
      data: {
        template: {
          coScholasticRows: template.coScholasticRows || [],
          disciplineRows: template.disciplineRows || [],
        },
        students: students.map((student) => {
          const assessment = assessmentByStudentId.get(student.studentId);

          return {
            studentId: student.studentId,
            name: student.name,
            rollNo: student.rollNo,
            coScholasticValues: mapToPlainObject(assessment?.coScholasticValues),
            disciplineValues: mapToPlainObject(assessment?.disciplineValues),
          };
        }),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectDB();

    const sessionUser = extractSessionUser(request.cookies.get('user')?.value);
    const userRole = sessionUser?.role || request.cookies.get('userRole')?.value;
    if (!BYPASS_ADMIN_AUTH && (!sessionUser?.id || userRole !== 'admin')) {
      return NextResponse.json(
        { success: false, error: 'Only admins can update result card assessments' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const examCycleId = String(body?.examCycleId || '').trim();
    const classId = String(body?.classId || '').trim();
    const assessments = Array.isArray(body?.assessments) ? body.assessments : [];

    if (!examCycleId || !classId) {
      return NextResponse.json(
        { success: false, error: 'examCycleId and classId are required' },
        { status: 400 }
      );
    }

    const [template, students] = await Promise.all([
      getResolvedResultCardTemplate(examCycleId),
      resolveStudents(examCycleId, classId),
    ]);

    const validStudentIds = new Set(students.map((student) => student.studentId));
    const allowedCoKeys = new Set((template.coScholasticRows || []).map((row: any) => String(row.key)));
    const allowedDisciplineKeys = new Set((template.disciplineRows || []).map((row: any) => String(row.key)));

    for (const assessment of assessments) {
      const studentId = String(assessment?.studentId || '').trim();
      if (!studentId || !validStudentIds.has(studentId)) {
        continue;
      }

      const coScholasticValues = sanitizeAssessmentValues(
        assessment?.coScholasticValues,
        allowedCoKeys
      );
      const disciplineValues = sanitizeAssessmentValues(
        assessment?.disciplineValues,
        allowedDisciplineKeys
      );

      const hasValues =
        Object.keys(coScholasticValues).length > 0 || Object.keys(disciplineValues).length > 0;

      if (!hasValues) {
        await ResultCardAssessment.deleteOne({ examCycleId, classId, studentId });
        continue;
      }

      await ResultCardAssessment.findOneAndUpdate(
        { examCycleId, classId, studentId },
        {
          $set: {
            examCycleId,
            classId,
            studentId,
            coScholasticValues,
            disciplineValues,
            updatedBy: sessionUser.id,
          },
          $setOnInsert: {
            createdBy: sessionUser.id,
          },
        },
        {
          upsert: true,
          new: true,
        }
      );
    }

    const refreshed = await ResultCardAssessment.find({ examCycleId, classId }).lean();
    const refreshedByStudentId = new Map(
      refreshed.map((assessment: any) => [String(assessment.studentId), assessment])
    );

    return NextResponse.json({
      success: true,
      data: students.map((student) => {
        const assessment = refreshedByStudentId.get(student.studentId);
        return {
          studentId: student.studentId,
          name: student.name,
          rollNo: student.rollNo,
          coScholasticValues: mapToPlainObject(assessment?.coScholasticValues),
          disciplineValues: mapToPlainObject(assessment?.disciplineValues),
        };
      }),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
