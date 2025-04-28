import { useState, useEffect } from 'react';

export function useWomPlayerData(playerName, options = {}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const { refreshInterval = 300000 } = options; // Default refresh every 5 minutes
  
  useEffect(() => {
    if (!playerName) {
      setLoading(false);
      return;
    }
    
    let isMounted = true;
    
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/wom/player?name=${encodeURIComponent(playerName)}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error ${response.status}`);
        }
        
        const result = await response.json();
        
        if (isMounted) {
          setData(result);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Error fetching WOM player data:', err);
          setError(err.message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    fetchData();
    
    // Set up refresh interval
    const intervalId = setInterval(fetchData, refreshInterval);
    
    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [playerName, refreshInterval]);
  
  return { data, error, loading };
}

export function useWomGroupData(options = {}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const { refreshInterval = 900000 } = options; // Default refresh every 15 minutes
  
  useEffect(() => {
    let isMounted = true;
    
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/wom/group`);
        
        if (!response.ok) {
          throw new Error(`HTTP error ${response.status}`);
        }
        
        const result = await response.json();
        
        if (isMounted) {
          setData(result);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Error fetching WOM group data:', err);
          setError(err.message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    fetchData();
    
    // Set up refresh interval
    const intervalId = setInterval(fetchData, refreshInterval);
    
    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [refreshInterval]);
  
  return { data, error, loading };
}

export function useWomCompetitions(options = {}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const { refreshInterval = 1800000 } = options; // Default refresh every 30 minutes
  
  useEffect(() => {
    let isMounted = true;
    
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/wom/competitions`);
        
        if (!response.ok) {
          throw new Error(`HTTP error ${response.status}`);
        }
        
        const result = await response.json();
        
        if (isMounted) {
          setData(result);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Error fetching WOM competitions data:', err);
          setError(err.message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    fetchData();
    
    // Set up refresh interval
    const intervalId = setInterval(fetchData, refreshInterval);
    
    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [refreshInterval]);
  
  return { data, error, loading };
}
