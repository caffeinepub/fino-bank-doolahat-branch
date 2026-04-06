export function loadItems<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveItems<T>(key: string, items: T[]): void {
  localStorage.setItem(key, JSON.stringify(items));
}

export function addItem<T extends { id: number }>(
  key: string,
  item: Omit<T, "id">,
): T {
  const items = loadItems<T>(key);
  const nextId = items.length > 0 ? Math.max(...items.map((i) => i.id)) + 1 : 1;
  const newItem = { ...item, id: nextId } as T;
  saveItems(key, [...items, newItem]);
  return newItem;
}

export function updateItem<T extends { id: number }>(
  key: string,
  id: number,
  updates: Partial<T>,
): void {
  const items = loadItems<T>(key);
  const updated = items.map((i) => (i.id === id ? { ...i, ...updates } : i));
  saveItems(key, updated);
}

export function removeItem<T extends { id: number }>(
  key: string,
  id: number,
): void {
  const items = loadItems<T>(key);
  saveItems(
    key,
    items.filter((i) => i.id !== id),
  );
}
