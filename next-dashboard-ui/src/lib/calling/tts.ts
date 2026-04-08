import hf from "@/lib/calling/hfClient";
import { storeBufferAsset } from "@/lib/serverStorage";

const TTS_MODEL = "facebook/mms-tts-ben"; // Bangla TTS model

export type TtsResult =
  | { mode: "say"; text: string }
  | { mode: "play"; audioUrl: string };

export async function textToSpeech(text: string): Promise<TtsResult> {
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
      const asset = await storeBufferAsset({
        buffer,
        filename: `reply-${Date.now()}.wav`,
        mimeType: "audio/wav",
        metadata: {
          purpose: "tts-audio",
        },
      });

      console.log(`[TTS] Audio saved to Mongo storage: ${asset.id} (${buffer.length} bytes)`);
      return { mode: "play", audioUrl: asset.url };
    }
  } catch (error) {
    console.error("[TTS] HF TTS failed:", error);
  }

  // Fallback: Twilio Say (works but robotic)
  console.log("[TTS] Falling back to Twilio Say");
  return { mode: "say", text };
}
