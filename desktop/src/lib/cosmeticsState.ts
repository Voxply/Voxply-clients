import type { Entitlement } from "./missionsClient";

const STORAGE_KEY = "voxply.entitlements";

export function saveEntitlements(ents: Entitlement[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ents));
}

export function loadEntitlements(): Entitlement[] {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    return s ? (JSON.parse(s) as Entitlement[]) : [];
  } catch {
    return [];
  }
}

export function getFlairItemId(): string | null {
  const ents = loadEntitlements();
  return ents.find((e) => e.item_id.startsWith("flair_"))?.item_id ?? null;
}
