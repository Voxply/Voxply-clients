import { useState, useEffect } from "react";
import {
  fetchBalance,
  fetchCosmetics,
  fetchCatalog,
  redeemItem,
  type Entitlement,
  type CatalogItem,
} from "../lib/missionsClient";
import { saveEntitlements } from "../lib/cosmeticsState";

export function CosmeticsSection({ publicKey }: { publicKey: string | null }) {
  const [balance, setBalance] = useState<number | null>(null);
  const [entitlements, setEntitlements] = useState<Entitlement[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!publicKey) return;
    setError(null);
    try {
      const [bal, ents, cat] = await Promise.all([
        fetchBalance(publicKey),
        fetchCosmetics(publicKey),
        fetchCatalog(),
      ]);
      setBalance(bal);
      setEntitlements(ents);
      saveEntitlements(ents);
      setCatalog(cat);
    } catch (e) {
      setError(String(e));
    }
  }

  useEffect(() => {
    load();
  }, [publicKey]);

  async function handleRedeem(item: CatalogItem) {
    if (!publicKey) return;
    setRedeeming(item.item_id);
    setError(null);
    try {
      const result = await redeemItem(publicKey, item.item_id);
      if (result) {
        const next = [
          ...entitlements.filter((e) => e.item_id !== item.item_id),
          result,
        ];
        setEntitlements(next);
        saveEntitlements(next);
        setBalance((prev) => (prev ?? 0) - item.cost_sparks);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setRedeeming(null);
    }
  }

  const owned = new Set(entitlements.map((e) => e.item_id));

  return (
    <div className="cosmetics-section">
      <div className="cosmetics-balance">
        <span>✨ {balance ?? "—"} Sparks</span>
        <button className="cosmetics-refresh" onClick={load} title="Refresh">
          ↻
        </button>
      </div>
      {error && <div className="cosmetics-error">{error}</div>}
      {catalog.length > 0 && (
        <div className="cosmetics-catalog">
          <h4 className="cosmetics-catalog-title">Cosmetic catalog</h4>
          <ul className="cosmetics-catalog-list">
            {catalog.map((item) => (
              <li
                key={item.item_id}
                className={`cosmetics-item${owned.has(item.item_id) ? " owned" : ""}`}
              >
                <div className="cosmetics-item-name">{item.name}</div>
                <div className="cosmetics-item-desc">{item.description}</div>
                <div className="cosmetics-item-footer">
                  <span className="cosmetics-item-cost">
                    ✨ {item.cost_sparks}
                  </span>
                  {owned.has(item.item_id) ? (
                    <span className="cosmetics-item-owned">Owned ✓</span>
                  ) : (
                    <button
                      className="cosmetics-item-redeem"
                      disabled={
                        redeeming === item.item_id ||
                        (balance ?? 0) < item.cost_sparks
                      }
                      onClick={() => handleRedeem(item)}
                    >
                      {redeeming === item.item_id ? "Redeeming…" : "Redeem"}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
