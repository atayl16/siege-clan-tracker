import useSWR from "swr";
import { useState, useCallback } from "react";

const fetcher = (url) => fetch(url).then((res) => res.json());

export function useRaces(userId) {
  const [mutationLoading, setMutationLoading] = useState(false);
  const [mutationError, setMutationError] = useState(null);

  // Use userId in the fetcher key if provided
  const endpoint = userId ? `/api/races?userId=${userId}` : "/api/races";
  const { data, error, mutate } = useSWR(endpoint, fetcher, {
    refreshInterval: 60000,
    dedupingInterval: 30000,
    revalidateOnMount: true,
    revalidateOnFocus: false,
  });

  // Add refreshRaces function for compatibility with ProfilePage
  const refreshRaces = useCallback(() => {
    return mutate();
  }, [mutate]);

  // Create a new race
  const createRace = async (raceData) => {
    setMutationLoading(true);
    setMutationError(null);
    
    try {
      // Get user ID from localStorage for authentication
      const user = JSON.parse(localStorage.getItem("user"));
      if (!user || !user.id) {
        throw new Error("You must be logged in to create a race");
      }
      
      const response = await fetch("/api/races-mutation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${user.id}`
        },
        body: JSON.stringify({
          action: "create",
          raceData
        })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || "Failed to create race");
      }
      
      // Refresh the races data
      await mutate();
      
      return result.data;
    } catch (err) {
      setMutationError(err.message);
      throw err;
    } finally {
      setMutationLoading(false);
    }
  };

  // Update an existing race
  const updateRace = async (raceData) => {
    setMutationLoading(true);
    setMutationError(null);
    
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      if (!user || !user.id) {
        throw new Error("You must be logged in to update a race");
      }
      
      const response = await fetch("/api/races-mutation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${user.id}`
        },
        body: JSON.stringify({
          action: "update",
          raceData
        })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || "Failed to update race");
      }
      
      // Refresh the races data
      await mutate();
      
      return result.data;
    } catch (err) {
      setMutationError(err.message);
      throw err;
    } finally {
      setMutationLoading(false);
    }
  };

  // Delete a race
  const deleteRace = async (raceId) => {
    setMutationLoading(true);
    setMutationError(null);
    
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      if (!user || !user.id) {
        throw new Error("You must be logged in to delete a race");
      }
      
      const response = await fetch("/api/races-mutation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${user.id}`
        },
        body: JSON.stringify({
          action: "delete",
          raceData: { id: raceId }
        })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || "Failed to delete race");
      }
      
      // Refresh the races data
      await mutate();
      
      return true;
    } catch (err) {
      setMutationError(err.message);
      throw err;
    } finally {
      setMutationLoading(false);
    }
  };

  return {
    races: data,
    activeRaces: data, // Add activeRaces as an alias for compatibility
    loading: !data && !error || mutationLoading,
    error: error || mutationError,
    refresh: mutate,
    refreshRaces, // Add this function
    createRace,
    updateRace,
    deleteRace
  };
}
