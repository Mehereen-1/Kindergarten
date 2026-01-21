import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Parent from "@/models/Parent";
import { createParent } from "@/lib/controllers/parentController";

export async function GET() {
  await connectDB();
  const parents = await Parent.find().populate("u_id", "email");
  return NextResponse.json(parents);
}


export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();

    const result = await createParent(body);

    return NextResponse.json(
      {
        message: "Parent created successfully",
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
