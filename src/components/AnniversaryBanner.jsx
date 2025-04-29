import React from "react";
import { useAnniversaries } from "../context/DataContext";
import { FaBirthdayCake } from "react-icons/fa";
import Card from "./ui/Card";
import "./AnniversaryBanner.css";

export default function AnniversaryBanner() {
  const { anniversaries, loading } = useAnniversaries();

  // Don't render if no anniversaries or still loading
  if (loading) {
    return null; // Or return a loading indicator if preferred
  }

  if (!anniversaries || anniversaries.length === 0) {
    return null;
  }

  return (
    <div className="ui-anniversary-banners">
      {anniversaries.map((member) => (
        <Card key={member.wom_id} className="ui-anniversary-banner">
          <div className="ui-anniversary-icon">
            <FaBirthdayCake />
          </div>
          <div className="ui-anniversary-content">
            <h3 className="ui-anniversary-title">Clan Anniversary!</h3>
            <p className="ui-anniversary-text">
              Congratulations to{" "}
              <strong>{member.name || member.wom_name}</strong>!
              <br />
              {member.years > 1 ? `${member.years} years` : "1 year"} in the
              clan today!
            </p>
          </div>
        </Card>
      ))}
    </div>
  );
}
