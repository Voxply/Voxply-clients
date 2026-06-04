import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";

export interface HubEvent {
  id: string;
  channel_id: string;
  creator_pubkey: string;
  title: string;
  description: string;
  starts_at: number;
  ends_at?: number;
  location?: string;
  created_at: number;
  rsvp_counts?: {
    going: number;
    maybe: number;
    not_going: number;
  };
}

interface Props {
  event: HubEvent;
  onRsvpChange?: (eventId: string, status: string) => void;
}

function formatTimestamp(ts: number): string {
  return new Date(ts * 1000).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function EventCard({ event, onRsvpChange }: Props) {
  const [busy, setBusy] = useState(false);

  async function rsvp(status: string) {
    if (busy) return;
    setBusy(true);
    try {
      await invoke("rsvp_event", { eventId: event.id, status });
      onRsvpChange?.(event.id, status);
    } catch (e) {
      console.error("RSVP failed:", e);
    } finally {
      setBusy(false);
    }
  }

  const counts = event.rsvp_counts ?? { going: 0, maybe: 0, not_going: 0 };

  return (
    <div className="event-card">
      <div className="event-card-header">
        <span className="event-card-icon">📅</span>
        <span className="event-card-title">{event.title}</span>
      </div>
      <div className="event-card-time">{formatTimestamp(event.starts_at)}</div>
      {event.ends_at && (
        <div className="event-card-time event-card-time-end">
          until {formatTimestamp(event.ends_at)}
        </div>
      )}
      {event.location && (
        <div className="event-card-location">📍 {event.location}</div>
      )}
      {event.description && (
        <div className="event-card-description">{event.description}</div>
      )}
      <div className="event-card-rsvp-counts">
        <span>{counts.going} going</span>
        <span> · </span>
        <span>{counts.maybe} maybe</span>
        <span> · </span>
        <span>{counts.not_going} can't go</span>
      </div>
      <div className="event-card-actions">
        <button
          className="event-card-btn event-card-btn-going"
          disabled={busy}
          onClick={() => rsvp("going")}
        >
          Going
        </button>
        <button
          className="event-card-btn event-card-btn-maybe"
          disabled={busy}
          onClick={() => rsvp("maybe")}
        >
          Maybe
        </button>
        <button
          className="event-card-btn event-card-btn-cantgo"
          disabled={busy}
          onClick={() => rsvp("not_going")}
        >
          Can't go
        </button>
      </div>
    </div>
  );
}
