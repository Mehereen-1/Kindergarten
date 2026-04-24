import mongoose from 'mongoose';

import StudentClassHistory from '@/lib/models/StudentClassHistory';

export async function resolveNextRollNo(
  classObjectId: mongoose.Types.ObjectId,
  academicYear: string
) {
  const histories = await StudentClassHistory.find({
    classId: classObjectId,
    academicYear,
  })
    .select('rollNo')
    .lean();

  const maxRoll = histories.reduce((max, item: any) => {
    const parsed = Number.parseInt(String(item?.rollNo || ''), 10);
    if (Number.isFinite(parsed) && parsed > max) return parsed;
    return max;
  }, 0);

  return String(maxRoll + 1).padStart(3, '0');
}
