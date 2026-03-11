import { NextRequest, NextResponse } from "next/server";
import { textToSpeech } from "@/lib/calling/tts";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const text = (body?.text || "").toString().trim();

    if (!text) {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }

    const tts = await textToSpeech(text);
    if (tts.mode === "play") {
      return NextResponse.json({ success: true, text, mode: "play", audioUrl: tts.audioUrl });
    }
    return NextResponse.json({ success: true, text, mode: "say", spokenText: tts.text });
  } catch (error) {
    console.error("[test-tts] error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
