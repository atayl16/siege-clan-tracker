import React from "react";
import { FaFlagCheckered, FaTrophy, FaBullseye } from "react-icons/fa";
import Tabs from "../components/ui/Tabs";
import Competitions from "../components/events/Competitions";
import RacesBoard from "../components/events/RacesBoard";
import GoalsBoard from "../components/events/GoalsBoard";
import { useTabParam } from "../hooks/useTabParam";
import "./EventsPage.css";

// Tab ids a link can open with ?tab=, e.g. /events?tab=races.
export const EVENTS_TABS = ["competitions", "races", "goals"];

/**
 * Everything to take part in: the clan's competitions, members' public races,
 * and members' public goals for clan mates to cheer on. Only the open tab is
 * mounted, so each tab loads its own data when it is opened.
 */
export default function EventsPage() {
  const [tab, setTab] = useTabParam(EVENTS_TABS);

  return (
    <div className="ui-page-container">
      <Tabs
        heading="Clan Events"
        activeTab={tab}
        onChange={setTab}
        className="events-tabs"
      >
        <Tabs.Tab tabId="competitions" label="Competitions" icon={<FaFlagCheckered />}>
          <Competitions />
        </Tabs.Tab>
        <Tabs.Tab tabId="races" label="Races" icon={<FaTrophy />}>
          <RacesBoard />
        </Tabs.Tab>
        <Tabs.Tab tabId="goals" label="Goals" icon={<FaBullseye />}>
          <GoalsBoard />
        </Tabs.Tab>
      </Tabs>
    </div>
  );
}
