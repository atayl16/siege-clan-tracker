import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import Button from './ui/Button';
import Card from './ui/Card';
import { FaSync, FaCheckCircle, FaExclamationTriangle, FaServer, FaCode } from 'react-icons/fa';

import "./WomSyncButton.css";

// Get environment variables at build time
const WOM_GROUP_ID = process.env.REACT_APP_WOM_GROUP_ID;

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

  // Debug environment variables when component mounts
  useEffect(() => {
    if (type === "events") {
      console.log('Environment variables:');
      console.log('WOM_GROUP_ID:', WOM_GROUP_ID);
      console.log('NODE_ENV:', process.env.NODE_ENV);
    }
  }, [type]);

  // Set default button text based on type
  const displayButtonText = buttonText || (type === "members" ? "Sync Members" : "Sync WOM Competitions");
  
  // Set the correct Netlify function endpoint
  const endpoint = syncEndpoint || (type === "members" ? 
    "/.netlify/functions/sync-wom" : 
    "/.netlify/functions/wom-events");

  const handleSync = async () => {
    if (isSyncing) return;
    
    try {
      // Add more visible feedback
      console.log(`${new Date().toISOString()} - Sync started for ${type}`);
      setIsSyncing(true);
      setSyncStatus({ type: 'info', message: type === "members" ? 'Syncing with Wise Old Man...' : 'Syncing WOM Competitions...' });
      
      // For events sync, verify group ID
      if (type === "events") {
        const groupId = WOM_GROUP_ID || '2928'; // Add fallback directly here
        
        console.log(`Using WOM Group ID: ${groupId}`);
        
        if (!groupId) {
          throw new Error('WOM Group ID is missing. Please check your environment variables.');
        }
      }
      
      // Determine if we're in development mode
      const isDev = !forceProduction && (
        process.env.NODE_ENV === 'development' || 
        window.location.hostname === 'localhost'
      );
      
      console.log(`Environment: ${isDev ? 'Development' : 'Production'}`);
      
      // Add visual spinner or indicator here if needed
      
      if (isDev) {
        // Different dev mode behavior based on type
        if (type === "members") {
          await handleMemberSyncDev();
        } else {
          await handleCompetitionSyncDev();
        }
      } else {
        await handleProductionSync();
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
      console.log(`${new Date().toISOString()} - Sync finished for ${type}`);
    }
  };
  
  // Extract member sync logic to separate function
  const handleMemberSyncDev = async () => {
    console.log('Development mode: Fetching real WOM data for a subset of members');
    
    // Wait to simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // First fetch a small set of members from our database
    const { data: membersToUpdate, error: fetchError } = await supabase
      .from('members')
      .select('wom_id, name, wom_name, current_xp, current_lvl, ehb')
      .order('wom_id', { ascending: true })
      .limit(150);
    
    if (fetchError) throw fetchError;
    console.log(`Found ${membersToUpdate?.length || 0} members to update`);
    
    // Then fetch real data for each member from WOM API
    let updateCount = 0;
    let errorCount = 0;
    
    for (const member of membersToUpdate || []) {
      try {
        if (!member.wom_name) {
          console.log(`Skipping member ${member.name} - no WOM username`);
          continue;
        }
        
        console.log(`Fetching real WOM data for ${member.wom_name}`);
        
        // Call the actual WOM API for this player
        const playerResponse = await fetch(`https://api.wiseoldman.net/v2/players/${encodeURIComponent(member.wom_name)}`);
        
        if (!playerResponse.ok) {
          console.error(`Error fetching WOM data for ${member.wom_name}: ${playerResponse.status}`);
          errorCount++;
          continue;
        }
        
        const playerData = await playerResponse.json();
        
        // Get the latest snapshot data
        const latestSnapshot = playerData.latestSnapshot?.data;
        const newXp = latestSnapshot?.skills?.overall?.experience || member.current_xp || 0;
        const newLevel = latestSnapshot?.skills?.overall?.level || member.current_lvl || 1;
        const newEhb = Math.round(
          playerData.latestSnapshot?.data?.computed?.ehb?.value ||
            member.ehb ||
            0
        );
        console.log(`Updating ${member.name} with real data:`, { 
          xp: newXp, 
          level: newLevel, 
          ehb: newEhb 
        });
        
        // Update with real data
        const { error: updateError } = await supabase
          .from('members')
          .update({
            current_xp: newXp,
            current_lvl: newLevel,
            ehb: newEhb,
            updated_at: new Date().toISOString()
          })
          .eq('wom_id', member.wom_id);
        
        if (updateError) {
          console.error(`Error updating ${member.name}:`, updateError);
          errorCount++;
        } else {
          updateCount++;
        }
        
        // Sleep briefly to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (err) {
        console.error(`Error processing ${member.name}:`, err);
        errorCount++;
      }
    }
    
    setLastSyncTime(new Date());
    setSyncStatus({
      type: 'success',
      message: `DEV MODE: Real data sync completed! Updated ${updateCount} members with ${errorCount} errors.`
    });
  };
    
  const handleCompetitionSyncDev = async () => {
    console.log('Development mode: Forwarding to Netlify function instead of direct DB access');
    
    // Wait to simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Use the Netlify function even in dev mode to avoid RLS issues
    console.log(`Calling Netlify function: ${endpoint} (even in dev mode)`);
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ devMode: true, limit: 5 }) // Tell function we're in dev mode and want a limit
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      throw new Error(`HTTP error ${response.status}: ${errorText.substring(0, 100)}...`);
    }
    
    const data = await response.json();
    console.log('Dev mode sync via Netlify function response:', data);
    
    setLastSyncTime(new Date());
    setSyncStatus({
      type: 'success',
      message: `DEV MODE: Sync completed! Processed ${data.length || 0} competitions via Netlify function.`
    });
  };
  
  // Production sync logic
  const handleProductionSync = async () => {
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
    
    if (type === "members") {
      setSyncStatus({
        type: 'success',
        message: `Sync completed! Updated ${data.stats?.updated || 0} members with ${data.stats?.errors || 0} errors.`
      });
    } else {
      setSyncStatus({
        type: 'success',
        message: `Sync completed! Updated ${data.length || 0} WOM competitions.`
      });
    }
  };

  // Get appropriate feature list based on type
  const getFeaturesList = () => {
    if (type === "members") {
      return (
        <ul className="ui-sync-features">
          <li>Request WOM to update all member stats</li>
          <li>Import latest XP and EHB values</li>
          <li>Update member information in the database</li>
        </ul>
      );
    } else {
      return (
        <ul className="ui-sync-features">
          <li>Fetch all WOM competitions for the clan</li>
          <li>Create or update events in the database</li>
          <li>Process results for completed competitions</li>
        </ul>
      );
    }
  };

  return (
    <Card variant="dark" className="ui-wom-sync-container">
      <Card.Header className="ui-wom-sync-header">
        <div className="ui-wom-sync-title">
          <h3>
            <FaSync className="ui-icon-left" />
            {type === "members" ? "WOM Member Sync" : "WOM Event Sync"}
          </h3>
        </div>
        
        <div className="ui-wom-sync-actions">
          <Button
            variant="primary"
            onClick={handleSync}
            disabled={isSyncing}
            icon={<FaSync className={isSyncing ? "ui-icon-spin" : ""} />}
          >
            {isSyncing ? "Syncing..." : displayButtonText}
          </Button>
          
          {lastSyncTime && (
            <div className="ui-last-sync-time">
              Last sync: {lastSyncTime.toLocaleTimeString()}{" "}
              {lastSyncTime.toLocaleDateString()}
            </div>
          )}
        </div>
      </Card.Header>

      <Card.Body>
        {syncStatus && (
          <div className={`ui-message ${syncStatus.type === 'success' ? 'ui-message-success' : syncStatus.type === 'error' ? 'ui-message-error' : 'ui-message-info'}`}>
            {syncStatus.type === 'success' ? (
              <FaCheckCircle className="ui-message-icon" />
            ) : syncStatus.type === 'error' ? (
              <FaExclamationTriangle className="ui-message-icon" />
            ) : (
              <FaSync className="ui-message-icon ui-icon-spin" />
            )}
            <span>{syncStatus.message}</span>
          </div>
        )}

        <div className="ui-wom-sync-info">
          <p><strong>Clicking the Sync button will:</strong></p>
          {getFeaturesList()}
          <p className="ui-sync-note">
            <strong>Note:</strong> {type === "members" 
              ? "This process may take several minutes depending on the number of members."
              : "Competitions will appear as Events in the Events section."
            }
          </p>
        </div>

        {process.env.NODE_ENV === "development" && (
          <div className="ui-dev-mode-notice">
            <div className="ui-dev-mode-header">
              <FaCode className="ui-icon-left" /> 
              <strong>Development Mode:</strong>
            </div>
            <p>
              {type === "members"
                ? "Using simulated sync for local development."
                : "Using real WOM API but only updating 5 competitions."}
            </p>
            <div className="ui-force-production-section">
              <Button
                variant="warning"
                size="sm"
                onClick={() => setForceProduction(true)}
                disabled={forceProduction || isSyncing}
                icon={<FaServer />}
              >
                Force {type === "members" ? "Real" : "Full"} Sync
              </Button>
              <span className="ui-force-production-warning">
                Will attempt to call Netlify function
              </span>
            </div>
          </div>
        )}
      </Card.Body>
    </Card>
  );
}
