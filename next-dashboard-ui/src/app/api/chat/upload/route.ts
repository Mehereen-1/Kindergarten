import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { mkdir, writeFile } from 'fs/promises';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB per file
const MAX_FILES = 5;

const sanitizeBaseName = (name: string) =>
  name.replace(/[^a-zA-Z0-9._-]/g, '_');

/**
 * Upload chat attachments and return public URLs for persisted files.
 * POST /api/chat/upload
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const fileEntries = formData.getAll('files');

    if (!fileEntries.length) {
      return NextResponse.json({ error: 'No files were uploaded' }, { status: 400 });
    }

    if (fileEntries.length > MAX_FILES) {
      return NextResponse.json(
        { error: `You can upload up to ${MAX_FILES} files at once` },
        { status: 400 }
      );
    }

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'chat');
    await mkdir(uploadDir, { recursive: true });

    const uploadedFiles: Array<{ name: string; url: string; mimeType: string; size: number }> = [];

    for (const entry of fileEntries) {
      if (!(entry instanceof File)) {
        continue;
      }

      if (entry.size <= 0) {
        continue;
      }

      if (entry.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `${entry.name} exceeds the 10MB limit` },
          { status: 400 }
        );
      }

      const ext = path.extname(entry.name || '').slice(0, 10);
      const safeBase = sanitizeBaseName(path.basename(entry.name || 'file', ext));
      const storedName = `${Date.now()}-${randomUUID()}-${safeBase}${ext}`;
      const absolutePath = path.join(uploadDir, storedName);

      const arrayBuffer = await entry.arrayBuffer();
      await writeFile(absolutePath, new Uint8Array(arrayBuffer));

      uploadedFiles.push({
        name: entry.name || storedName,
        url: `/uploads/chat/${storedName}`,
        mimeType: entry.type || 'application/octet-stream',
        size: entry.size,
      });
    }

    if (!uploadedFiles.length) {
      return NextResponse.json({ error: 'No valid files found' }, { status: 400 });
    }

    return NextResponse.json({ files: uploadedFiles }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
