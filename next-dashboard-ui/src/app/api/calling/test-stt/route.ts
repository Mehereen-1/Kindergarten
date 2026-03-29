import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { speechToText } from "@/lib/calling/stt";

const TMP_DIR = path.join(process.cwd(), "tmp");

export async function POST(req: NextRequest) {
  try {
    await mkdir(TMP_DIR, { recursive: true });

    const form = await req.formData();
    const file = form.get("audio") as File | null;

    if (!file) {
      return NextResponse.json({ error: "audio file is required" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const inputPath = path.join(TMP_DIR, `stt-test-${Date.now()}.wav`);
    await writeFile(inputPath, new Uint8Array(buffer));

    const text = await speechToText(inputPath);
    return NextResponse.json({ success: true, text, filename: file.name });
  } catch (error) {
    console.error("[test-stt] error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
