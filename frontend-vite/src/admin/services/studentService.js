const KEY = "kg_students_v1";

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("studentService: read error", e);
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
  const id = `S${String(items.length + 1).padStart(3, "0")}`;
  const item = { id, ...payload };
  items.unshift(item);
  write(items);
  return item;
}

export async function remove(id) {
  let items = read();
  items = items.filter((i) => i.id !== id);
  write(items);
  return true;
}

export async function update(id, payload) {
  const items = read();
  const idx = items.findIndex((i) => i.id === id);
  if (idx === -1) throw new Error("Not found");
  items[idx] = { ...items[idx], ...payload };
  write(items);
  return items[idx];
}

export async function resetWithSample() {
  const sample = [
    { id: "S001", firstName: "Aisha", lastName: "Khan", class: "Nursery", age: 4, parent: "Sara Khan" },
    { id: "S002", firstName: "Omar", lastName: "Ali", class: "LKG", age: 5, parent: "Imran Ali" },
    { id: "S003", firstName: "Zara", lastName: "Hussain", class: "UKG", age: 6, parent: "Rafia Hussain" },
  ];
  write(sample);
  return sample;
}

export default { getAll, add, remove, update, resetWithSample };
