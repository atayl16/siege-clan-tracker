import { useState } from "react";

export default function AddPointsButton({ memberId }) {
  const [lastClick, setLastClick] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (Date.now() - lastClick < 60000) return;

    setLoading(true);
    try {
      await fetch("/api/siege/points", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, amount: 2 }),
      });
      setLastClick(Date.now());
    } finally {
      setLoading(false);
    }
  };

  const cooldown = Math.ceil((60000 - (Date.now() - lastClick)) / 1000);

  return (
    <button
      onClick={handleClick}
      disabled={loading || cooldown > 0}
      className="add-points-button"
    >
      {loading ? "Adding..." : cooldown > 0 ? `${cooldown}s` : "+2 Points"}
    </button>
  );
}
