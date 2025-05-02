import React, { useMemo } from "react";
import { useMembers } from "../hooks/useMembers"; // Updated to use new hook
import { FaBirthdayCake } from "react-icons/fa";
import Card from "./ui/Card";
import "./AnniversaryBanner.css";

export default function AnniversaryBanner() {
  const { members, loading } = useMembers();

  // Calculate today's date (month and day)
  const today = useMemo(() => {
    const now = new Date();
    return { month: now.getMonth() + 1, day: now.getDate() };
  }, []);

  // Filter members with anniversaries today
  const anniversaries = useMemo(() => {
    if (!members) return [];
    
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    
    return members
      .filter((member) => {
        if (!member.join_date) return false;
        
        const joinDate = new Date(member.join_date);
        const joinYear = joinDate.getFullYear();
        
        // Check if it's the same month and day (anniversary)
        const isSameMonthAndDay = 
          joinDate.getMonth() + 1 === today.month &&
          joinDate.getDate() === today.day;
          
        // Exclude members who joined today (same year, month, and day)
        const isNotToday = !(isSameMonthAndDay && joinYear === currentYear);
        
        return isSameMonthAndDay && isNotToday;
      })
      .map((member) => {
        const joinDate = new Date(member.join_date);
        const years = currentDate.getFullYear() - joinDate.getFullYear();
        return { ...member, years };
      });
  }, [members, today]);

  // Don't render if no anniversaries or still loading
  if (loading || anniversaries.length === 0) {
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
            <span className="ui-anniversary-title">Clan Anniversary!</span>
            <p className="ui-anniversary-text">
              <strong>{member.name || member.wom_name}</strong> -{" "}
              {member.years} {member.years === 1 ? "year" : "years"} in the clan today!
            </p>
          </div>
        </Card>
      ))}
    </div>
  );
}
