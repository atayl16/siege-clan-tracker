import useSWR from "swr";
import { useState } from "react";

const fetcher = (url) => fetch(url).then((res) => res.json());

export function useUserGoals() {
  const [mutationLoading, setMutationLoading] = useState(false);
  const [mutationError, setMutationError] = useState(null);

  const { data, error, mutate } = useSWR("/api/user-goals", fetcher, {
    refreshInterval: 60000,
    dedupingInterval: 30000,
    revalidateOnMount: true,
    revalidateOnFocus: false,
  });

  // Create a new user goal
  const createGoal = async (goalData) => {
    setMutationLoading(true);
    setMutationError(null);

    try {
      const user = JSON.parse(localStorage.getItem("user"));
      if (!user || !user.id) {
        throw new Error("You must be logged in to create a goal");
      }

      const response = await fetch("/api/user-goals-mutation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.id}`,
        },
        body: JSON.stringify({
          action: "create",
          userId: user.id,
          goalData,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to create goal");
      }

      // Refresh goals data
      await mutate();

      return result.data;
    } catch (err) {
      setMutationError(err.message);
      throw err;
    } finally {
      setMutationLoading(false);
    }
  };

  // Update an existing goal
  const updateGoal = async (goalData) => {
    setMutationLoading(true);
    setMutationError(null);
    
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      if (!user || !user.id) {
        throw new Error("You must be logged in to update a goal");
      }
      
      const response = await fetch("/api/user-goals-mutation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${user.id}`
        },
        body: JSON.stringify({
          action: "update",
          userId: user.id,
          goalData
        })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || "Failed to update goal");
      }
      
      // Refresh goals data
      await mutate();
      
      return result.data;
    } catch (err) {
      setMutationError(err.message);
      throw err;
    } finally {
      setMutationLoading(false);
    }
  };

  // Delete a goal
  const deleteGoal = async (goalId) => {
    setMutationLoading(true);
    setMutationError(null);
    
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      if (!user || !user.id) {
        throw new Error("You must be logged in to delete a goal");
      }
      
      const response = await fetch("/api/user-goals-mutation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${user.id}`
        },
        body: JSON.stringify({
          action: "delete",
          userId: user.id,
          goalData: { goalId }
        })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || "Failed to delete goal");
      }
      
      // Refresh goals data
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
    userGoals: data,
    loading: !data && !error || mutationLoading,
    error: error || mutationError,
    refresh: mutate,
    createGoal,
    updateGoal,
    deleteGoal
  };
}
