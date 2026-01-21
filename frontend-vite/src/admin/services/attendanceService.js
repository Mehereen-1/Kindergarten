const KEY = "kg_attendance_v1";

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("attendanceService: read error", e);
    return [];
  }
}

function write(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

export async function getAll() {
  return read();
}

export async function add(payload) {
  const items = read();
  items.unshift(payload);
  write(items);
  return payload;
}

export default { getAll, add };
