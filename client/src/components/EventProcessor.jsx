import { useState } from "react";

export default function EventProcessor() {
  const [eventId, setEventId] = useState("");
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setProcessing(true);
    try {
      await fetch("/api/siege/process-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId }),
      });
      setEventId("");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="event-form">
      <input
        type="text"
        value={eventId}
        onChange={(e) => setEventId(e.target.value)}
        placeholder="Enter WOM Event ID"
        required
      />
      <button type="submit" disabled={processing} className="process-button">
        {processing ? "Processing..." : "Calculate Scores"}
      </button>
    </form>
  );
}
