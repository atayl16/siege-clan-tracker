import React, { createContext, useContext } from "react";
import { useGroupAchievements } from "../hooks/useGroupAchievements";

const GroupAchievementsContext = createContext();

export function GroupAchievementsProvider({ children }) {
  const { data, error, isLoading, mutate } = useGroupAchievements(100);
  return (
    <GroupAchievementsContext.Provider
      value={{
        achievements: data,
        error,
        isLoading,
        refresh: mutate,
      }}
    >
      {children}
    </GroupAchievementsContext.Provider>
  );
}

export function useGroupAchievementsData() {
  const context = useContext(GroupAchievementsContext);
  if (!context) {
    throw new Error(
      "useGroupAchievementsData must be used within GroupAchievementsProvider"
    );
  }
  return context;
}
