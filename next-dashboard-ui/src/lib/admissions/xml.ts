export type AdmissionParentXmlEntry = {
  email: string;
  name: string;
  phone?: string;
  address?: string;
  occupation?: string;
};

export type AdmissionStudentXmlEntry = {
  parentEmail: string;
  name: string;
  classId: string;
  academicYear: string;
  roll: string;
};

function escapeXml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function buildParentsXml(entries: AdmissionParentXmlEntry[]) {
  const lines = ['<parents>'];

  for (const entry of entries) {
    lines.push('  <parent>');
    lines.push(`    <email>${escapeXml(entry.email)}</email>`);
    lines.push(`    <name>${escapeXml(entry.name)}</name>`);
    lines.push(`    <phone>${escapeXml(entry.phone || '')}</phone>`);
    lines.push(`    <address>${escapeXml(entry.address || '')}</address>`);
    lines.push(`    <occupation>${escapeXml(entry.occupation || '')}</occupation>`);
    lines.push('  </parent>');
  }

  lines.push('</parents>');
  return lines.join('\n');
}

export function buildStudentsXml(entries: AdmissionStudentXmlEntry[]) {
  const lines = ['<students>'];

  for (const entry of entries) {
    lines.push('  <student>');
    lines.push(`    <parentemail>${escapeXml(entry.parentEmail)}</parentemail>`);
    lines.push(`    <name>${escapeXml(entry.name)}</name>`);
    lines.push(`    <classid>${escapeXml(entry.classId)}</classid>`);
    lines.push(`    <academicyear>${escapeXml(entry.academicYear)}</academicyear>`);
    lines.push(`    <roll>${escapeXml(entry.roll)}</roll>`);
    lines.push('  </student>');
  }

  lines.push('</students>');
  return lines.join('\n');
}
