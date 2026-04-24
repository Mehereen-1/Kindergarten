import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

import { buildAdmissionTemplateWorkbook } from '@/lib/admissions/workbook';

export const runtime = 'nodejs';

function getSessionUser(request: Request) {
  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.match(/(?:^|;\s*)user=([^;]+)/);
  if (!match) return null;

  try {
    return JSON.parse(decodeURIComponent(match[1]));
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  try {
    const sessionUser = getSessionUser(request);
    if (!sessionUser?.id || String(sessionUser.role || '').toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workbook = buildAdmissionTemplateWorkbook();
    const buffer = XLSX.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx',
    }) as Buffer;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="admission_intake_template.xlsx"',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to build template' }, { status: 500 });
  }
}
