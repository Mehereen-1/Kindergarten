import { mkdir, writeFile } from "fs/promises";
import path from "path";
import hf from "@/lib/calling/hfClient";

const TTS_MODEL = "facebook/mms-tts-ben"; // Bangla TTS model
const AUDIO_DIR = path.join(process.cwd(), "public", "audio");

export type TtsResult =
  | { mode: "say"; text: string }
  | { mode: "play"; audioUrl: string };

export async function textToSpeech(text: string): Promise<TtsResult> {
  await mkdir(AUDIO_DIR, { recursive: true });

  // Primary: HuggingFace TTS (online, works well)
  try {
    console.log("[TTS] Using HuggingFace mms-tts-ben...");
    const audioBlob = await hf.textToSpeech({
      model: TTS_MODEL,
      inputs: text,
    });

    const arrayBuffer = await audioBlob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length > 100) {
      const filename = `reply-${Date.now()}.wav`;
      const filePath = path.join(AUDIO_DIR, filename);
      await writeFile(filePath, new Uint8Array(buffer));
      console.log(`[TTS] Audio saved: ${filename} (${buffer.length} bytes)`);
      return { mode: "play", audioUrl: `/audio/${filename}` };
    }
  } catch (error) {
    console.error("[TTS] HF TTS failed:", error);
  }

  // Fallback: Twilio Say (works but robotic)
  console.log("[TTS] Falling back to Twilio Say");
  return { mode: "say", text };
}
