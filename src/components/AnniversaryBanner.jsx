import React, { useMemo } from "react";
import { useMembers } from "../hooks/useMembers"; // Updated to use new hook
import { FaBirthdayCake } from "react-icons/fa";
import Card from "./ui/Card";
import "./AnniversaryBanner.css";

export default function AnniversaryBanner() {
  const { members, loading } = useMembers();

  // Calculate today's date (month and day) using UTC for consistent timezone handling
  const today = useMemo(() => {
    const now = new Date();
    return { month: now.getUTCMonth() + 1, day: now.getUTCDate() };
  }, []);

  // Filter members with anniversaries today
  // Special handling: Feb 29 anniversaries are celebrated on Feb 28 in non-leap years
  const anniversaries = useMemo(() => {
    if (!members) return [];

    const currentDate = new Date();
    const currentYear = currentDate.getUTCFullYear();

    // Check if it's a leap year
    const isLeapYear = (year) => (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);

    return members
      .filter((member) => {
        if (!member.join_date) return false;

        const joinDate = new Date(member.join_date);

        // Validate date is not invalid
        if (isNaN(joinDate.getTime())) {
          console.warn(`Invalid join_date for member ${member.wom_id}: ${member.join_date}`);
          return false;
        }

        const joinYear = joinDate.getUTCFullYear();
        const joinMonth = joinDate.getUTCMonth() + 1;
        const joinDay = joinDate.getUTCDate();

        // Check if it's the same month and day (anniversary) using UTC
        const isSameMonthAndDay =
          joinMonth === today.month &&
          joinDay === today.day;

        // Special case: Feb 29 anniversaries on Feb 28 in non-leap years
        const isFeb29OnFeb28 =
          joinMonth === 2 && joinDay === 29 &&
          today.month === 2 && today.day === 28 &&
          !isLeapYear(currentYear);

        const isAnniversaryToday = isSameMonthAndDay || isFeb29OnFeb28;

        // Exclude members who joined today (same year, month, and day)
        const isNotToday = !(isSameMonthAndDay && joinYear === currentYear);

        return isAnniversaryToday && isNotToday;
      })
      .map((member) => {
        const joinDate = new Date(member.join_date);
        const years = currentDate.getUTCFullYear() - joinDate.getUTCFullYear();
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
