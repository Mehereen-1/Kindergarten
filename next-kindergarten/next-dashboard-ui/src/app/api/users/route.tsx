import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { createUser, getUsers } from "@/lib/controllers/userController";

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const user = await createUser(body);
    return NextResponse.json(user, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message },
      { status: 400 }
    );
  }
}

export async function GET() {
  try {
    await connectDB();
    const users = await getUsers();
    return NextResponse.json(users);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message },
      { status: 500 }
    );
  }
}
