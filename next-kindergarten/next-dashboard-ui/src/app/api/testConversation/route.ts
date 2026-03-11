import { NextResponse } from "next/server";
import { runConversationTest } from "@/lib/calling/llm";

export async function GET() {
  try {
    const result = await runConversationTest();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("[testConversation] error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
