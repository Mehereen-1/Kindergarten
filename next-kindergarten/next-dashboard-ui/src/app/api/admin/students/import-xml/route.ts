import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Student from "@/lib/models/Student";
import User from "@/lib/models/User";
import ParentProfile from "@/lib/models/ParentProfile";

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

    const results = {
      success: [],
      failed: [],
      total: records.length,
    };

    for (let i = 0; i < records.length; i++) {
      const row = records[i];

      try {
        const studentName = row.name;
        const parentEmail = row.parentemail;
        
        if (!studentName) {
          throw new Error('Student name is required');
        }
        
        if (!parentEmail) {
          throw new Error('Parent email is required');
        }

        // Find parent by email
        let parent = await User.findOne({ email: parentEmail, role: 'parent' });
        
        if (!parent) {
          throw new Error(`Parent with email ${parentEmail} not found`);
        }

        // Create student profile only (no user account)
        const student = new Student({
          name: studentName,
          parentId: parent._id,
          email: row.email || undefined,
          phone: row.phone || undefined,
          grade: row.grade || undefined,
          roll: row.roll || undefined,
          address: row.address || undefined,
          bloodGroup: row.bloodgroup || undefined,
          birthday: row.birthday ? new Date(row.birthday) : undefined,
          sex: row.sex || undefined,
        });

        await student.save();

        results.success.push({
          studentName,
          studentEmail: row.email || 'N/A',
          parentEmail,
          parentName: parent.name,
          grade: row.grade || 'N/A',
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
