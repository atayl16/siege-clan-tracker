import React, { createContext, useContext } from "react";
import { useGroup } from "../hooks/useGroup";
import { usePlayer } from "../hooks/usePlayer";
import { useCompetitions } from "../hooks/useCompetitions";
import { useGroupAchievements } from "../hooks/useGroupAchievements";
import { useGroupStats } from "../hooks/useGroupStats";
import { useMembers } from "../hooks/useMembers";
import { useClaimRequests } from "../hooks/useClaimRequests";
import { useEvents } from "../hooks/useEvents";
import { useRaces } from "../hooks/useRaces";
import { useUsers } from "../hooks/useUsers";
import { useUserGoals } from "../hooks/useUserGoals";

const DataContext = createContext({});

export function DataProvider({ children }) {
  return (
    <DataContext.Provider
      value={{
        ...useGroup(),
        ...useCompetitions(),
        ...useGroupAchievements(),
        ...useGroupStats(),
        ...useMembers(),
        ...useClaimRequests(),
        ...useEvents(),
        ...useRaces(),
        ...useUserGoals(),
        ...useUsers(),
        usePlayer, // you'll call usePlayer(id) in components
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => useContext(DataContext);
