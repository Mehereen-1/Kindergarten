const KEY = "kg_fees_v1";

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("feesService: read error", e);
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
  const id = `F${String(items.length + 1).padStart(3, "0")}`;
  const item = { id, ...payload };
  items.unshift(item);
  write(items);
  return item;
}

export default { getAll, add };
