import { NextRequest, NextResponse } from 'next/server';
import { storeWebFileAsset } from '@/lib/serverStorage';

export const runtime = 'nodejs';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB per file
const MAX_FILES = 5;

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

      const storedAsset = await storeWebFileAsset(entry, {
        purpose: 'chat-attachment',
        source: 'chat-upload-route',
      });

      uploadedFiles.push({
        name: entry.name || storedAsset.filename,
        url: storedAsset.url,
        mimeType: entry.type || storedAsset.mimeType,
        size: entry.size || storedAsset.size,
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
