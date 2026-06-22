import React, { useState } from "react";
import { FocusTrap } from "@voxply/ui";

interface Props {
  isCategory: boolean;
  parentId: string | null;
  parentName?: string | null;
  loading: boolean;
  error: string | null;
  onSubmit: (name: string, channelType: string, description: string) => void;
  onClose: () => void;
}

export function CreateChannelModal({ isCategory, parentId, parentName, loading, error, onSubmit, onClose }: Props) {
  const [name, setName] = useState("");
  const [channelType, setChannelType] = useState("text");
  const [description, setDescription] = useState("");

  function handleSubmit() {
    if (!name.trim()) return;
    onSubmit(name.trim(), channelType, description.trim());
  }

  const title = isCategory ? "Create Category" : "Create Channel";

  return (
    <div className="modal-overlay" onClick={onClose}>
      <FocusTrap>
        <div
          className="modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-channel-title"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 id="create-channel-title">{title}</h3>

          {parentName && (
            <p className="muted" style={{ marginBottom: "var(--space-3)", fontSize: "var(--text-sm)" }}>
              Under <strong>{parentName}</strong>
            </p>
          )}

          <label style={{ display: "block", marginBottom: "var(--space-2)" }}>
            <span className="label-text">Name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit();
                if (e.key === "Escape") onClose();
              }}
              placeholder={isCategory ? "e.g. General" : "e.g. announcements"}
              autoFocus
              style={{ display: "block", width: "100%", marginTop: 4 }}
            />
          </label>

          {!isCategory && (
            <label style={{ display: "block", marginBottom: "var(--space-2)" }}>
              <span className="label-text">Type</span>
              <select
                value={channelType}
                onChange={(e) => setChannelType(e.target.value)}
                style={{ display: "block", width: "100%", marginTop: 4 }}
              >
                <option value="text">Text</option>
                <option value="forum">Forum</option>
              </select>
            </label>
          )}

          <label style={{ display: "block", marginBottom: "var(--space-3)" }}>
            <span className="label-text">Description (optional)</span>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit();
                if (e.key === "Escape") onClose();
              }}
              placeholder="What's this channel for?"
              style={{ display: "block", width: "100%", marginTop: 4 }}
            />
          </label>

          <div className="modal-actions">
            <button onClick={onClose} className="btn-secondary">Cancel</button>
            <button onClick={handleSubmit} disabled={loading || !name.trim()}>
              {loading ? "Creating…" : "Create"}
            </button>
          </div>

          {error && <div className="error" style={{ marginTop: 8 }}>{error}</div>}
        </div>
      </FocusTrap>
    </div>
  );
}
