import { NextResponse } from "next/server";
import { loginUser } from "@/lib/controllers/userController";
import { connectDB } from "@/lib/db";

export async function POST(req: Request) {
  try {
    await connectDB();
    const { email, password } = await req.json();

    const user = await loginUser(email, password);

    const response = NextResponse.json(user);

    response.cookies.set({
      name: "token",
      value: user.id, // ✅ FIXED
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (err: any) {
    return NextResponse.json(
      { message: err.message },
      { status: 401 }
    );
  }
}