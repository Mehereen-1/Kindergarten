import { NextRequest, NextResponse } from 'next/server';

import { buildInlineAssetResponse, getStoredAsset } from '@/lib/serverStorage';

export const runtime = 'nodejs';

type RouteContext = {
  params: {
    assetId: string;
  };
};

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const asset = await getStoredAsset(params.assetId);

    if (!asset) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const download = request.nextUrl.searchParams.get('download');
    return buildInlineAssetResponse(asset.buffer, asset.file, download === '1');
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to load file' },
      { status: 500 }
    );
  }
}
