import { useState, useEffect, useCallback } from "react";
import { open } from "@tauri-apps/plugin-shell";
import { MISSIONS_SERVICE_URL } from "../constants";
import { CosmeticsSection } from "./CosmeticsSection";

interface Mission {
  id: string;
  sponsor: string;
  title: string;
  description: string;
  reward_sparks: number;
  attestation_url: string;
  expires_at?: number;
  max_completions_per_user: number;
}

async function findPow(missionId: string, pubkey: string, difficulty: number): Promise<string> {
  const encoder = new TextEncoder();
  let nonce = 0;
  while (true) {
    const nonceStr = nonce.toString(16);
    const input = encoder.encode(`${nonceStr}:${missionId}:${pubkey}`);
    const hashBuf = await crypto.subtle.digest("SHA-256", input);
    const hash = new Uint8Array(hashBuf);
    let bits = 0;
    for (const byte of hash) {
      if (byte === 0) {
        bits += 8;
      } else {
        bits += Math.clz32(byte) - 24;
        break;
      }
    }
    if (bits >= difficulty) return nonceStr;
    nonce++;
    if (nonce % 1000 === 0) await new Promise<void>((r) => setTimeout(r, 0));
  }
}

export function MissionsSection({ publicKey }: { publicKey: string | null }) {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState<Record<string, "computing" | "submitting" | "done" | "error">>({});
  const [claimResults, setClaimResults] = useState<Record<string, { sparks: number } | { error: string }>>({});

  const loadMissions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${MISSIONS_SERVICE_URL}/api/missions`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (Array.isArray(data.missions)) setMissions(data.missions);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMissions();
  }, [loadMissions]);

  async function handleOpen(mission: Mission) {
    try {
      await open(mission.attestation_url);
    } catch {
      window.open(mission.attestation_url, "_blank");
    }
  }

  async function handleClaim(mission: Mission) {
    if (!publicKey) return;
    setClaiming((prev) => ({ ...prev, [mission.id]: "computing" }));
    try {
      const difficulty = Math.max(8, Math.min(24, Math.floor(mission.reward_sparks / 10)));
      const nonce = await findPow(mission.id, publicKey, difficulty);
      setClaiming((prev) => ({ ...prev, [mission.id]: "submitting" }));
      const res = await fetch(`${MISSIONS_SERVICE_URL}/api/missions/${mission.id}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_pubkey: publicKey, attestation_token: "manual", pow_nonce: nonce }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setClaiming((prev) => ({ ...prev, [mission.id]: "done" }));
      setClaimResults((prev) => ({ ...prev, [mission.id]: { sparks: data.sparks_earned } }));
    } catch (e) {
      setClaiming((prev) => ({ ...prev, [mission.id]: "error" }));
      setClaimResults((prev) => ({ ...prev, [mission.id]: { error: String(e) } }));
    }
  }

  if (loading) return <div className="missions-loading">Loading missions…</div>;
  if (error)
    return (
      <div className="missions-error">
        <p>Failed to load missions: {error}</p>
        <button onClick={loadMissions}>Retry</button>
      </div>
    );
  if (missions.length === 0)
    return <div className="missions-empty">No active missions right now. Check back later.</div>;

  return (
    <div className="missions-panel">
      <CosmeticsSection publicKey={publicKey} />
      <p className="missions-intro">
        Complete voluntary missions to earn <strong>Sparks</strong> — redeemable for cosmetic items.
        Missions never affect your experience or capabilities.
      </p>
      <ul className="missions-list">
        {missions.map((m) => {
          const state = claiming[m.id];
          const result = claimResults[m.id];
          return (
            <li key={m.id} className="mission-card">
              <div className="mission-header">
                <span className="mission-sponsor">{m.sponsor}</span>
                <span className="mission-sparks">✨ {m.reward_sparks} Sparks</span>
              </div>
              <div className="mission-title">{m.title}</div>
              <div className="mission-desc">{m.description}</div>
              {state === "done" && result && "sparks" in result ? (
                <div className="mission-claimed">
                  Claimed! +{(result as { sparks: number }).sparks} Sparks ✓
                </div>
              ) : (
                <div className="mission-actions">
                  <button className="mission-btn-open" onClick={() => handleOpen(m)} disabled={!!state}>
                    Open mission
                  </button>
                  <button
                    className="mission-btn-claim"
                    onClick={() => handleClaim(m)}
                    disabled={!!state || !publicKey}
                    title={!publicKey ? "Connect to a hub first" : undefined}
                  >
                    {state === "computing"
                      ? "Computing proof…"
                      : state === "submitting"
                        ? "Claiming…"
                        : "Claim Sparks"}
                  </button>
                </div>
              )}
              {state === "error" && result && "error" in result && (
                <div className="mission-error">{(result as { error: string }).error}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
