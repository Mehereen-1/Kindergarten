import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Event from '@/lib/models/Event';

const XLSX = require('xlsx');
const pdfParse = require('pdf-parse');

type ParsedEventRow = {
  title: string;
  description?: string;
  date: Date;
  targetRole?: 'all' | 'teacher' | 'parent' | 'student';
  location?: string;
};

function normalizeRole(roleValue: string | null): 'all' | 'teacher' | 'parent' | 'student' {
  const role = String(roleValue || 'all').toLowerCase();
  if (role === 'teacher' || role === 'parent' || role === 'student') return role;
  return 'all';
}

function parseDateValue(raw: any): Date | null {
  if (!raw) return null;

  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    return raw;
  }

  if (typeof raw === 'number') {
    const excelDate = XLSX.SSF.parse_date_code(raw);
    if (excelDate) {
      const d = new Date(excelDate.y, excelDate.m - 1, excelDate.d, 9, 0, 0, 0);
      if (!Number.isNaN(d.getTime())) return d;
    }
  }

  const asDate = new Date(String(raw));
  if (!Number.isNaN(asDate.getTime())) {
    return asDate;
  }

  const m = String(raw).match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})/);
  if (m) {
    const d = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const y = Number(m[3].length === 2 ? `20${m[3]}` : m[3]);
    const parsed = new Date(y, mo, d, 9, 0, 0, 0);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  return null;
}

function parseCsv(content: string, role: 'all' | 'teacher' | 'parent' | 'student'): ParsedEventRow[] {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) return [];

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const dateIdx = headers.findIndex((h) => ['date', 'event_date', 'start_date'].includes(h));
  const titleIdx = headers.findIndex((h) => ['title', 'event', 'event_title', 'name'].includes(h));
  const descIdx = headers.findIndex((h) => ['description', 'details', 'note'].includes(h));
  const locationIdx = headers.findIndex((h) => ['location', 'venue', 'place'].includes(h));

  if (dateIdx === -1 || titleIdx === -1) return [];

  return lines.slice(1).map((line) => {
    const cells = line.split(',').map((c) => c.trim());
    const date = parseDateValue(cells[dateIdx]);
    if (!date) return null;

    return {
      title: cells[titleIdx] || 'Untitled Event',
      description: descIdx >= 0 ? cells[descIdx] : '',
      date,
      targetRole: role,
      location: locationIdx >= 0 ? cells[locationIdx] : '',
    };
  }).filter((row): row is ParsedEventRow => Boolean(row));
}

function parseXlsx(buffer: Buffer, role: 'all' | 'teacher' | 'parent' | 'student'): ParsedEventRow[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const firstSheet = workbook.SheetNames[0];
  if (!firstSheet) return [];

  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], { defval: '' }) as Record<string, any>[];
  const parsed: ParsedEventRow[] = [];

  for (const row of rows) {
    const keys = Object.keys(row);
    const get = (candidates: string[]) => {
      const key = keys.find((k) => candidates.includes(k.toLowerCase().trim()));
      return key ? row[key] : '';
    };

    const date = parseDateValue(get(['date', 'event_date', 'start_date']));
    const title = String(get(['title', 'event', 'event_title', 'name']) || '').trim();
    const description = String(get(['description', 'details', 'note']) || '').trim();
    const location = String(get(['location', 'venue', 'place']) || '').trim();

    if (!date || !title) continue;

    parsed.push({
      title,
      description,
      date,
      targetRole: role,
      location,
    });
  }

  return parsed;
}

async function parsePdf(buffer: Buffer, role: 'all' | 'teacher' | 'parent' | 'student'): Promise<ParsedEventRow[]> {
  const data = await pdfParse(buffer);
  const lines = String(data?.text || '')
    .split(/\r?\n/)
    .map((line: string) => line.trim())
    .filter(Boolean);

  const parsed: ParsedEventRow[] = [];
  for (const line of lines) {
    const m = line.match(/(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})(.*)/);
    if (!m) continue;

    const date = parseDateValue(m[1]);
    if (!date) continue;

    const title = String(m[2] || '').trim().replace(/^[-:]/, '').trim();
    if (!title) continue;

    parsed.push({
      title,
      description: '',
      date,
      targetRole: role,
    });
  }

  return parsed;
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const form = await request.formData();
    const file = form.get('file') as File | null;
    const createdBy = String(form.get('createdBy') || '').trim();
    const createdByRole = String(form.get('createdByRole') || '').trim();
    const targetRole = normalizeRole(String(form.get('targetRole') || 'all'));

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (!['admin', 'teacher'].includes(createdByRole)) {
      return NextResponse.json({ error: 'Only admin or teacher can import events' }, { status: 403 });
    }

    const lowerName = file.name.toLowerCase();
    const buffer = Buffer.from(await file.arrayBuffer());

    let parsedRows: ParsedEventRow[] = [];

    if (lowerName.endsWith('.csv')) {
      parsedRows = parseCsv(buffer.toString('utf-8'), targetRole);
    } else if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')) {
      parsedRows = parseXlsx(buffer, targetRole);
    } else if (lowerName.endsWith('.pdf')) {
      parsedRows = await parsePdf(buffer, targetRole);
    } else {
      return NextResponse.json({ error: 'Unsupported file type. Use CSV, XLSX/XLS, or PDF.' }, { status: 400 });
    }

    if (!parsedRows.length) {
      return NextResponse.json({
        error: 'No valid events found in file. Ensure columns include title and date.',
      }, { status: 400 });
    }

    const docs = parsedRows.map((row) => ({
      title: row.title,
      description: row.description || '',
      startDate: row.date,
      endDate: row.date,
      allDay: true,
      location: row.location || '',
      targetRole: row.targetRole || targetRole,
      createdBy: createdBy || undefined,
      createdByRole,
      sourceType: 'import',
      sourceFileName: file.name,
    }));

    const created = await Event.insertMany(docs, { ordered: false });

    return NextResponse.json({
      createdCount: created.length,
      totalParsed: parsedRows.length,
      message: `Imported ${created.length} events from ${file.name}`,
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to import events' }, { status: 500 });
  }
}
