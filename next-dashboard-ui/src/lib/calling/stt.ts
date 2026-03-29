import { readFile } from "fs/promises";
import hf from "@/lib/calling/hfClient";

const STT_MODEL = "facebook/wav2vec2-large-xlsr-53-bengali";

export async function speechToText(filePath: string): Promise<string> {
  const audioBuffer = await readFile(filePath);

  const result = await hf.automaticSpeechRecognition({
    model: STT_MODEL,
    data: audioBuffer,
  });

  return (result?.text || "").trim();
}
