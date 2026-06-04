import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { EventCard, type HubEvent } from "./EventCard";

interface Props {
  onClose: () => void;
}

export function EventsPanel({ onClose }: Props) {
  const [events, setEvents] = useState<HubEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    invoke<HubEvent[]>("list_events", { upcoming: true })
      .then(setEvents)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  function handleRsvpChange(eventId: string, _status: string) {
    // Re-fetch to get fresh RSVP counts after a vote.
    invoke<HubEvent[]>("list_events", { upcoming: true })
      .then(setEvents)
      .catch(() => {});
  }

  return (
    <div className="events-panel-overlay" onClick={onClose}>
      <div
        className="events-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Upcoming events"
      >
        <div className="events-panel-header">
          <span className="events-panel-title">Upcoming Events</span>
          <button
            className="events-panel-close"
            onClick={onClose}
            aria-label="Close events panel"
          >
            ✕
          </button>
        </div>
        <div className="events-panel-body">
          {loading && (
            <div className="events-panel-empty">Loading…</div>
          )}
          {error && (
            <div className="events-panel-empty events-panel-error">{error}</div>
          )}
          {!loading && !error && events.length === 0 && (
            <div className="events-panel-empty">No upcoming events.</div>
          )}
          {events.map((ev) => (
            <EventCard
              key={ev.id}
              event={ev}
              onRsvpChange={handleRsvpChange}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
