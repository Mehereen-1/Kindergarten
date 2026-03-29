import { NextRequest, NextResponse } from "next/server";
import { generateReply } from "@/lib/calling/llm";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const text = (body?.text || "").toString().trim();

    if (!text) {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }

    const reply = await generateReply(text);
    return NextResponse.json({ success: true, input: text, reply });
  } catch (error) {
    console.error("[test-llm] error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
