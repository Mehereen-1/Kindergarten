import { mkdir, unlink, writeFile } from "fs/promises";
import os from "os";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { speechToText } from "@/lib/calling/stt";
import { generateReply, FALLBACK_BN } from "@/lib/calling/llm";
import { textToSpeech } from "@/lib/calling/tts";

const TMP_DIR = path.join(os.tmpdir(), "kindergarten-calling");
const baseUrl = (process.env.BASE_URL || "").replace(/\/$/, "");

async function downloadTwilioRecording(recordingUrl: string): Promise<Buffer> {
  const wavUrl = recordingUrl.endsWith(".wav") ? recordingUrl : `${recordingUrl}.wav`;
  const sid = process.env.TWILIO_ACCOUNT_SID || process.env.TWILIO_SID;
  const token = process.env.TWILIO_AUTH_TOKEN || process.env.TWILIO_TOKEN;
  const auth = Buffer.from(`${sid}:${token}`).toString("base64");

  const response = await fetch(wavUrl, {
    headers: { Authorization: `Basic ${auth}` },
  });

  if (!response.ok) {
    throw new Error(`Recording download failed: ${response.status}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

function toAbsoluteUrl(publicPath: string): string {
  if (publicPath.startsWith("http")) return publicPath;
  if (!baseUrl) return publicPath;
  return `${baseUrl}${publicPath.startsWith("/") ? "" : "/"}${publicPath}`;
}

function buildTwimlPlayAndRecord(audioUrl: string): string {
  const VoiceResponse = twilio.twiml.VoiceResponse;
  const vr = new VoiceResponse();
  vr.play(audioUrl);
  vr.record({
    action: `${baseUrl}/api/processSpeech`,
    method: "POST",
    playBeep: true,
    maxLength: 30,
    timeout: 4,
  });
  return vr.toString();
}

function buildTwimlSayAndRecord(text: string): string {
  const VoiceResponse = twilio.twiml.VoiceResponse;
  const vr = new VoiceResponse();
  vr.say(text);
  vr.record({
    action: `${baseUrl}/api/processSpeech`,
    method: "POST",
    playBeep: true,
    maxLength: 30,
    timeout: 4,
  });
  return vr.toString();
}

export async function POST(req: NextRequest) {
  let inputPath: string | null = null;
  try {
    await mkdir(TMP_DIR, { recursive: true });

    const form = await req.formData();
    const recordingUrl = form.get("RecordingUrl")?.toString();

    if (!recordingUrl) {
      throw new Error("RecordingUrl missing from Twilio webhook payload");
    }

    inputPath = path.join(TMP_DIR, `input-${Date.now()}.wav`);
    const audioBuffer = await downloadTwilioRecording(recordingUrl);
    await writeFile(inputPath, new Uint8Array(audioBuffer));

    let parentText = "";
    try {
      parentText = await speechToText(inputPath);
      console.log("[STT] parent text:", parentText);
    } catch (error) {
      console.error("[STT] failure:", error);
    }

    let replyText = FALLBACK_BN;
    try {
      replyText = parentText ? await generateReply(parentText) : FALLBACK_BN;
    } catch (error) {
      console.error("[LLM] timeout/failure:", error);
      replyText = FALLBACK_BN;
    }

    let ttsResult: Awaited<ReturnType<typeof textToSpeech>> | null = null;
    try {
      ttsResult = await textToSpeech(replyText);
    } catch (error) {
      console.error("[TTS] failure:", error);
      const twimlSay = buildTwimlSayAndRecord(replyText || FALLBACK_BN);
      return new NextResponse(twimlSay, {
        headers: { "Content-Type": "text/xml" },
        status: 200,
      });
    }

    const twiml =
      ttsResult.mode === "play"
        ? buildTwimlPlayAndRecord(toAbsoluteUrl(ttsResult.audioUrl))
        : buildTwimlSayAndRecord(ttsResult.text || FALLBACK_BN);
    return new NextResponse(twiml, {
      headers: { "Content-Type": "text/xml" },
      status: 200,
    });
  } catch (error) {
    console.error("[processSpeech] pipeline error:", error);

    const twimlSay = buildTwimlSayAndRecord(FALLBACK_BN);
    return new NextResponse(twimlSay, {
      headers: { "Content-Type": "text/xml" },
      status: 200,
    });
  } finally {
    if (inputPath) {
      await unlink(inputPath).catch(() => undefined);
    }
  }
}
