import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { createTeacher } from "@/lib/controllers/teacherController";
import Teacher from "@/models/Teacher";

export async function GET() {
  await connectDB();
  const teachers = await Teacher.find().populate("u_id", "email");
  return NextResponse.json(teachers);
}


export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();

    const result = await createTeacher(body);

    return NextResponse.json(
      {
        message: "Teacher created successfully",
        data: result,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message },
      { status: 400 }
    );
  }
}
