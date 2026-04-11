import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Student from "@/lib/models/Student";
import User from "@/lib/models/User";
import Class from "@/lib/models/Class";
import StudentClassHistory from "@/lib/models/StudentClassHistory";
import mongoose from "mongoose";

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const { records } = await request.json();

    if (!Array.isArray(records) || records.length === 0) {
      return NextResponse.json(
        { error: 'Records are required' },
        { status: 400 }
      );
    }

    const results: {
      success: Array<Record<string, unknown>>;
      failed: Array<Record<string, unknown>>;
      total: number;
    } = {
      success: [],
      failed: [],
      total: records.length,
    };

    for (let i = 0; i < records.length; i++) {
      const row = records[i];

      try {
        const studentName = row.name;
        const parentEmail = row.parentemail;
        const classIdValue = row.classid || row.class_id || row.classidvalue || row.class;
        const academicYear = row.academicyear || row.academic_year || row.year;
        
        if (!studentName) {
          throw new Error('Student name is required');
        }
        
        if (!parentEmail) {
          throw new Error('Parent email is required');
        }

        if (!classIdValue) {
          throw new Error('Class ID is required');
        }

        if (!academicYear) {
          throw new Error('Academic year is required');
        }

        // Find parent by email
        let parent = await User.findOne({ email: parentEmail, role: 'parent' });
        
        if (!parent) {
          throw new Error(`Parent with email ${parentEmail} not found`);
        }

        const classDocById = mongoose.Types.ObjectId.isValid(String(classIdValue))
          ? await Class.findById(classIdValue).lean()
          : null;
        const classDocByCode = await Class.findOne({ classId: classIdValue }).lean();
        const classDoc = classDocById || classDocByCode;

        if (!classDoc) {
          throw new Error(`Class not found for Class ID: ${classIdValue}`);
        }

        // Create student profile only (no user account)
        const student = new Student({
          name: studentName,
          parentId: parent._id,
          email: row.email || undefined,
          phone: row.phone || undefined,
          address: row.address || undefined,
          bloodGroup: row.bloodgroup || undefined,
          birthday: row.birthday ? new Date(row.birthday) : undefined,
          sex: row.sex || undefined,
        });

        await student.save();

        await StudentClassHistory.findOneAndUpdate(
          { studentId: student._id, academicYear: String(academicYear) },
          {
            studentId: student._id,
            classId: classDoc._id,
            academicYear: String(academicYear),
            rollNo: row.roll ? String(row.roll) : undefined,
            status: 'active'
          },
          { upsert: true, new: true }
        );

        results.success.push({
          studentName,
          studentEmail: row.email || 'N/A',
          parentEmail,
          parentName: parent.name,
          classId: classDoc._id,
          academicYear: String(academicYear),
          roll: row.roll || 'N/A',
          studentId: student._id,
          parentId: parent._id,
        });

      } catch (err: any) {
        results.failed.push({
          row: i + 1,
          data: row,
          error: err.message,
        });
      }
    }

    return NextResponse.json({ results });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
