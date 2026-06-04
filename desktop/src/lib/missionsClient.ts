import { invoke } from "@tauri-apps/api/core";
import { MISSIONS_SERVICE_URL } from "../constants";

export interface Entitlement {
  user_pubkey: string;
  item_id: string;
  granted_at: number;
  expires_at: number | null;
  service_sig: string;
}

export interface CatalogItem {
  item_id: string;
  name: string;
  type: "profile_flair" | "avatar_frame" | "color_theme" | string;
  description: string;
  cost_sparks: number;
  asset_url: string;
}

async function buildAuthHeader(publicKey: string): Promise<string> {
  const ts = Math.floor(Date.now() / 1000);
  const message = `${publicKey}:${ts}`;
  const sig = await invoke<string>("sign_message", { message });
  return btoa(JSON.stringify({ pubkey: publicKey, sig, ts }));
}

export async function fetchBalance(publicKey: string): Promise<number> {
  const auth = await buildAuthHeader(publicKey);
  const res = await fetch(`${MISSIONS_SERVICE_URL}/api/account/balance`, {
    headers: { "X-Voxply-Auth": auth },
  });
  if (!res.ok) return 0;
  const data = await res.json();
  return data.balance ?? 0;
}

export async function fetchCosmetics(publicKey: string): Promise<Entitlement[]> {
  const auth = await buildAuthHeader(publicKey);
  const res = await fetch(`${MISSIONS_SERVICE_URL}/api/account/cosmetics`, {
    headers: { "X-Voxply-Auth": auth },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.cosmetics ?? [];
}

export async function fetchCatalog(): Promise<CatalogItem[]> {
  const res = await fetch(`${MISSIONS_SERVICE_URL}/api/catalog`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.catalog ?? [];
}

export async function redeemItem(
  publicKey: string,
  itemId: string,
): Promise<Entitlement | null> {
  const auth = await buildAuthHeader(publicKey);
  const res = await fetch(`${MISSIONS_SERVICE_URL}/api/account/redeem`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Voxply-Auth": auth },
    body: JSON.stringify({ item_id: itemId }),
  });
  if (!res.ok) return null;
  return res.json();
}
