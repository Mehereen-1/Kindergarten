import { NextResponse } from "next/server";
import { loginUser } from "@/lib/controllers/userController";
import { connectDB } from "@/lib/db";

export async function POST(req: Request) {
  try {
    await connectDB();
    const { email, password } = await req.json();

    const user = await loginUser(email, password);
    return NextResponse.json(user);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: 401 }
    );
  }
}
