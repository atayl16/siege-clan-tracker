import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import "./WomSyncButton.css";

export default function WomSyncButton({ 
  type = "members",  // can be "members" or "events"
  buttonText,
  syncEndpoint, 
  onSyncComplete 
}) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [forceProduction, setForceProduction] = useState(false);

  // Set default button text based on type
  const displayButtonText = buttonText || (type === "members" ? "Sync Members" : "Sync WOM Competitions");
  
  // Set the correct Netlify function endpoint
  const endpoint = syncEndpoint || (type === "members" ? 
    "/.netlify/functions/sync-wom" : 
    "/.netlify/functions/sync-wom-events");

  const handleSync = async () => {
    if (isSyncing) return;
    
    try {
      setIsSyncing(true);
      setSyncStatus({ type: 'info', message: 'Syncing with Wise Old Man...' });
      
      // Determine if we're in development mode
      const isDev = !forceProduction && (
        process.env.NODE_ENV === 'development' || 
        window.location.hostname === 'localhost'
      );
      
      if (isDev) {
        // Simulation code for development mode
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Different dev mode behavior based on type
        if (type === "members") {
          // Existing dev mode member sync code
          console.log('Development mode: Simulating member sync');
          // ... existing member sync dev mode code
        } else {
          // Dev mode event sync code
          console.log('Development mode: Simulating event sync');
          // ... existing event sync dev mode code
        }
        
        setLastSyncTime(new Date());
        setSyncStatus({
          type: 'success',
          message: `DEV MODE: ${type === "members" ? "Member" : "Event"} sync completed!`
        });
      } else {
        // In production, call the appropriate Netlify function
        console.log(forceProduction ? 'Forcing production mode' : 'Production mode');
        console.log(`Calling Netlify function: ${endpoint}`);
        
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Error response:', errorText);
          
          let errorMessage;
          try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.message || `HTTP error ${response.status}`;
          } catch (e) {
            errorMessage = `HTTP error ${response.status}: ${errorText.substring(0, 100)}...`;
          }
          
          throw new Error(errorMessage);
        }
        
        const data = await response.json();
        console.log('Sync function response:', data);
        
        setLastSyncTime(new Date());
        setSyncStatus({
          type: 'success',
          message: `Sync completed! ${type === "members" ? 
            `Updated ${data.stats?.updated || 0} members` : 
            `Imported ${data.stats?.updated || 0} competitions`}`
        });
      }
      
      // Reset force production after use
      if (forceProduction) {
        setForceProduction(false);
      }
      
      // Call the onSyncComplete callback
      if (onSyncComplete) {
        onSyncComplete();
      }
      
      // Auto-dismiss after 10 seconds
      setTimeout(() => {
        setSyncStatus(prev => prev?.type === 'success' ? null : prev);
      }, 10000);
      
    } catch (err) {
      console.error(`Error syncing ${type}:`, err);
      setSyncStatus({
        type: 'error',
        message: `Sync failed: ${err.message}`
      });
      
      if (forceProduction) {
        setForceProduction(false);
      }
      
      setTimeout(() => {
        setSyncStatus(prev => prev?.type === 'error' ? null : prev);
      }, 10000);
    } finally {
      setIsSyncing(false);
    }
  };

  // Get appropriate feature list based on type
  const getFeaturesList = () => {
    if (type === "members") {
      return (
        <div className="sync-features">
          <p>Request WOM to update all member stats</p>
          <p>Import latest XP and EHB values</p>
          <p>Update member information in the database</p>
        </div>
      );
    } else {
      return (
        <div className="sync-features">
          <p>Fetch all WOM competitions for the clan</p>
          <p>Create or update events in the database</p>
          <p>Process results for completed competitions</p>
        </div>
      );
    }
  };

  // Get appropriate note based on type
  const getNote = () => {
    if (type === "members") {
      return "This process may take several minutes depending on the number of members.";
    } else {
      return "Competitions will appear as Events in the Events section.";
    }
  };

  // Get appropriate dev mode text based on type
  const getDevModeText = () => {
    if (type === "members") {
      return "Using simulated sync for local development.";
    } else {
      return "Using real WOM API but only updating 5 competitions.";
    }
  };

  return (
    <div className="wom-sync">
      <div className="wom-sync-header">
        <button
          className={`wom-sync-button ${isSyncing ? "syncing" : ""}`}
          onClick={handleSync}
          disabled={isSyncing}
        >
          {isSyncing ? (
            <>
              <span className="spinner"></span>
              Syncing...
            </>
          ) : (
            <>
              <span className="sync-icon">↻</span>
              {displayButtonText}
            </>
          )}
        </button>

        {lastSyncTime && (
          <div className="last-sync-time">
            Last sync: {lastSyncTime.toLocaleTimeString()}{" "}
            {lastSyncTime.toLocaleDateString()}
          </div>
        )}
      </div>

      {syncStatus && (
        <div className={`sync-status sync-status-${syncStatus.type}`}>
          {syncStatus.message}
        </div>
      )}

      <div className="wom-sync-info">
        <p>Clicking the Sync button will:</p>
        {getFeaturesList()}
        <p className="note">
          Note: {getNote()}
        </p>

        {process.env.NODE_ENV === "development" && (
          <div className="dev-mode-notice">
            <strong>Development Mode:</strong> {getDevModeText()}
            <div className="force-production-section">
              <button
                className="force-production-button"
                onClick={() => setForceProduction(true)}
                disabled={forceProduction || isSyncing}
              >
                Force {type === "members" ? "Real" : "Full"} Sync
              </button>
              <span className="force-production-warning">
                Will attempt to call Netlify function
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
