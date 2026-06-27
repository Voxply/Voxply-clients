import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { UserProfile } from "../types";
import { getUserProfile } from "@platform";
import { formatRelative } from "@wavvon/core";
import { Avatar } from "@wavvon/ui";

interface Props {
  pubkey: string;
  onClose: () => void;
}

export function UserProfileCard({ pubkey, onClose }: Props) {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getUserProfile(pubkey)
      .then(setProfile)
      .catch((e) => setError(String(e)));
  }, [pubkey]);

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t("user.profile.aria_label")}
    >
      <div
        className="modal-box"
        style={{ maxWidth: 360, padding: 24 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="modal-close"
          onClick={onClose}
          aria-label={t("user.profile.close")}
        >
          ×
        </button>

        {error && <p style={{ color: "var(--danger)" }}>{error}</p>}

        {!profile && !error && (
          <p className="muted" style={{ textAlign: "center", padding: 16 }}>
            {t("modal.loading")}
          </p>
        )}

        {profile && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Avatar src={profile.avatar} name={profile.display_name ?? pubkey} size={48} />
              <div>
                <div style={{ fontWeight: 600, fontSize: "var(--text-md)" }}>
                  {profile.display_name ?? <span className="muted">{t("profile.no_display_name")}</span>}
                </div>
                <div
                  className="muted"
                  style={{ fontFamily: "monospace", fontSize: "var(--text-sm)" }}
                >
                  {pubkey.slice(0, 16)}…{pubkey.slice(-8)}
                </div>
              </div>
            </div>

            <div style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
              {t("user.profile.joined", { date: formatRelative(profile.joined_at) })}
            </div>

            {profile.roles.length > 0 && (
              <div>
                <div
                  className="muted"
                  style={{ fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 4 }}
                >
                  {t("user.profile.roles")}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {profile.roles.map((r) => (
                    <span key={r.id} className="role-badge">
                      {r.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {profile.badges.length > 0 && (
              <div>
                <div
                  className="muted"
                  style={{ fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 4 }}
                >
                  {t("user.profile.badges")}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {profile.badges.map((b, i) => (
                    <span key={i} className="role-badge">
                      {b}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
