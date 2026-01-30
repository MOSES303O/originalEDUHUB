// lib/selected-courses-local.ts
const STORAGE_KEY = "selected_courses_codes";

export function getLocalSelectedCodes(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function addToLocalSelected(code: string) {
  const codes = getLocalSelectedCodes();
  if (!codes.includes(code)) {
    codes.push(code);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(codes));
  }
}

export function removeFromLocalSelected(code: string) {
  const codes = getLocalSelectedCodes();
  const updated = codes.filter(c => c !== code);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export function isLocallySelected(code: string): boolean {
  return getLocalSelectedCodes().includes(code);
}

export function clearLocalSelections() {
  localStorage.removeItem(STORAGE_KEY);
}