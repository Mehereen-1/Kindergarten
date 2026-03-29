import { NextRequest, NextResponse } from "next/server";
import { textToSpeech } from "@/lib/calling/tts";
import { placeCall, placeCallWithSay } from "@/lib/calling/twilioService";

const FALLBACK_BN = "দুঃখিত, প্রযুক্তিগত সমস্যার কারণে আবার বলছি।";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const phoneNumber = body?.phoneNumber as string | undefined;

    if (!phoneNumber) {
      return NextResponse.json({ error: "phoneNumber is required" }, { status: 400 });
    }

    const greeting = "আসসালামু আলাইকুম। আমি স্কুল থেকে বলছি।";
    let callSid = "";
    try {
      const tts = await textToSpeech(greeting);
      if (tts.mode === "play") {
        callSid = await placeCall(phoneNumber, tts.audioUrl);
      } else {
        callSid = await placeCallWithSay(phoneNumber, tts.text);
      }
    } catch (ttsError) {
      console.error("[startCall] TTS unavailable, falling back to Twilio Say:", ttsError);
      callSid = await placeCallWithSay(phoneNumber, greeting);
    }

    return NextResponse.json({ success: true, callSid });
  } catch (error) {
    console.error("[startCall] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to place call", fallback: FALLBACK_BN },
      { status: 500 }
    );
  }
}
