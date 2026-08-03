import type { InventoryItem, SaleRecord, Note, User, AppSettings } from '@/types';

// Keys are namespaced per-username so each account keeps its own
// inventory / sales / notes instead of sharing one global data set.
const keyFor = (username: string, bucket: string) => `wholesale-${bucket}-${username}`;

export function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function saveJSON(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage can throw in private-browsing / quota-exceeded cases.
    // Failing silently here is preferable to crashing the whole app.
  }
}

export function getUsers(): User[] {
  return loadJSON<User[]>('wholesale-users', []);
}

export function saveUsers(users: User[]) {
  saveJSON('wholesale-users', users);
}

export function loadUserInventory(username: string, fallback: InventoryItem[]): InventoryItem[] {
  return loadJSON(keyFor(username, 'inventory'), fallback);
}

export function saveUserInventory(username: string, inventory: InventoryItem[]) {
  saveJSON(keyFor(username, 'inventory'), inventory);
}

export function loadUserSales(username: string, fallback: SaleRecord[]): SaleRecord[] {
  return loadJSON(keyFor(username, 'sales'), fallback);
}

export function saveUserSales(username: string, sales: SaleRecord[]) {
  saveJSON(keyFor(username, 'sales'), sales);
}

export function loadUserNotes(username: string): Note[] {
  return loadJSON(keyFor(username, 'notes'), []);
}

export function saveUserNotes(username: string, notes: Note[]) {
  saveJSON(keyFor(username, 'notes'), notes);
}

const DEFAULT_SETTINGS: AppSettings = { businessName: 'Kikuubo Wholesale Tracker', currency: 'UGX' };

export function loadUserSettings(username: string): AppSettings {
  return loadJSON(keyFor(username, 'settings'), DEFAULT_SETTINGS);
}

export function saveUserSettings(username: string, settings: AppSettings) {
  saveJSON(keyFor(username, 'settings'), settings);
}

export function hasSeededData(username: string): boolean {
  return localStorage.getItem(keyFor(username, 'seeded')) === 'true';
}

export function markSeeded(username: string) {
  localStorage.setItem(keyFor(username, 'seeded'), 'true');
}
