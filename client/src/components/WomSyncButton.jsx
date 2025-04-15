import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function WomSyncButton() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [forceProduction, setForceProduction] = useState(false);

  const handleSync = async () => {
    // Prevent multiple sync requests
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
        // Simulate a sync for development, but use real WOM data
        console.log('Development mode: Fetching real WOM data for a subset of members');
        
        // Wait to simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // First fetch a small set of members from our database
        const { data: membersToUpdate, error: fetchError } = await supabase
          .from('members')
          .select('wom_id, name, wom_name, current_xp, current_lvl, ehb')
          .order('wom_id', { ascending: true })
          .limit(5); // Just update 5 members to keep it light
        
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
      } else {
        // In production (or when forced), use the Netlify function
        console.log(forceProduction ? 'Forcing production mode' : 'Production mode');
        console.log('Calling Netlify function: /.netlify/functions/sync-wom');
        
        const response = await fetch('/.netlify/functions/sync-wom', {
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
          message: `Sync completed! Updated ${data.stats.updated} members with ${data.stats.errors} errors.`
        });
      }
      
      // Reset force production after use
      if (forceProduction) {
        setForceProduction(false);
      }
      
      // Auto-dismiss after 10 seconds
      setTimeout(() => {
        setSyncStatus(prev => prev?.type === 'success' ? null : prev);
      }, 10000);
      
    } catch (err) {
      console.error('Error syncing with WOM:', err);
      setSyncStatus({
        type: 'error',
        message: `Sync failed: ${err.message}`
      });
      
      // Reset force production after error
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

  return (
    <div className="wom-sync">
      <div className="wom-sync-header">
        <button 
          className={`wom-sync-button ${isSyncing ? 'syncing' : ''}`}
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
              Sync Members
            </>
          )}
        </button>
        
        {lastSyncTime && (
          <div className="last-sync-time">
            Last sync: {lastSyncTime.toLocaleTimeString()} {lastSyncTime.toLocaleDateString()}
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
        <ul>
          <li>Request WOM to update all member stats</li>
          <li>Import latest XP and EHB values</li>
          <li>Update member information in the database</li>
        </ul>
        <p className="note">Note: This process may take several minutes depending on the number of members.</p>
        
        {process.env.NODE_ENV === 'development' && (
          <div className="dev-mode-notice">
            <strong>Development Mode:</strong> Using simulated sync for local development.
            <div className="force-production-section">
              <button 
                className="force-production-button"
                onClick={() => setForceProduction(true)}
                disabled={forceProduction || isSyncing}
              >
                Force Real Sync
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
