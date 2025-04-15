import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

// Get environment variables at build time
const WOM_GROUP_ID = process.env.REACT_APP_WOM_GROUP_ID;

export default function WomEventsSyncButton() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [forceProduction, setForceProduction] = useState(false);
  
  // Debug environment variables when component mounts
  useEffect(() => {
    console.log('Environment variables:');
    console.log('WOM_GROUP_ID:', WOM_GROUP_ID);
    console.log('NODE_ENV:', process.env.NODE_ENV);
  }, []);

  const handleSync = async () => {
    // Prevent multiple sync requests
    if (isSyncing) return;
    
    try {
      setIsSyncing(true);
      setSyncStatus({ type: 'info', message: 'Syncing WOM Competitions...' });
      
      // Hardcoded fallback for development if environment variable is missing
      const groupId = WOM_GROUP_ID || '2928'; // Fallback to your group ID from .env file
      
      console.log(`Using WOM Group ID: ${groupId}`);
      
      if (!groupId) {
        throw new Error('WOM Group ID is missing. Please check your environment variables.');
      }
      
      // Determine if we're in development mode
      const isDev = !forceProduction && (
        process.env.NODE_ENV === 'development' || 
        window.location.hostname === 'localhost'
      );
      
      if (isDev) {
        // Simulate a sync for development, but use real WOM data
        console.log(`Development mode: Fetching real WOM competitions for group ${groupId}`);
        
        // Wait to simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Call the actual WOM API to get competitions
        const competitionsResponse = await fetch(`https://api.wiseoldman.net/v2/groups/${groupId}/competitions`);
        
        if (!competitionsResponse.ok) {
          throw new Error(`Failed to fetch competitions: ${competitionsResponse.status}`);
        }
        
        const competitions = await competitionsResponse.json();
        console.log(`Found ${competitions.length} competitions`);
        
        // Process each competition
        let updatedCount = 0;
        let errorCount = 0;
        
        for (const comp of competitions.slice(0, 5)) { // Process just 5 in dev mode
          try {
            console.log(`Processing competition: ${comp.title}`);
            
            // Check if this competition already exists in our database
            const { data: existingComps, error: checkError } = await supabase
              .from('events')
              .select('id, status')
              .eq('wom_id', comp.id);

            if (checkError) {
              console.error(`Error checking competition ${comp.id}:`, checkError);
              errorCount++;
              continue;
            }
            const existingComp =
              existingComps && existingComps.length > 0
                ? existingComps[0]
                : null;
            
            // Format the data for our events table
            const now = new Date();
            const startDate = new Date(comp.startsAt);
            const endDate = new Date(comp.endsAt);
            
            let status = 'upcoming';
            if (now > endDate) {
              status = 'completed';
            } else if (now >= startDate) {
              status = 'active';
            }
            
            const eventData = {
              name: comp.title,
              wom_id: comp.id,
              is_wom: true,
              type: comp.metric === 'overall' ? 'skilling' : comp.metric.includes('boss') ? 'pvm' : 'other',
              start_date: comp.startsAt,
              end_date: comp.endsAt,
              metric: comp.metric,
              status: status,
              description: `WOM Competition: ${comp.metric.replace(/_/g, ' ')}`
            };
            
            if (existingComp) {
              // Update existing event
              const { error: updateError } = await supabase
                .from('events')
                .update(eventData)
                .eq('id', existingComp.id);
              
              if (updateError) {
                console.error(`Error updating competition ${comp.id}:`, updateError);
                errorCount++;
              } else {
                updatedCount++;
              }
            } else {
              // Insert new event
              const { error: insertError } = await supabase
                .from('events')
                .insert([eventData]);
              
              if (insertError) {
                console.error(`Error inserting competition ${comp.id}:`, insertError);
                errorCount++;
              } else {
                updatedCount++;
              }
            }
            
            // Sleep briefly to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, 300));
            
          } catch (err) {
            console.error(`Error processing competition:`, err);
            errorCount++;
          }
        }
        
        setLastSyncTime(new Date());
        setSyncStatus({
          type: 'success',
          message: `DEV MODE: Sync completed! Updated ${updatedCount} competitions with ${errorCount} errors.`
        });
      } else {
        // In production (or when forced), use the Netlify function
        console.log(forceProduction ? 'Forcing production mode' : 'Production mode');
        console.log('Calling Netlify function: /.netlify/functions/wom-events');
        
        const response = await fetch('/.netlify/functions/wom-events', {
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
        
        const events = await response.json();
        console.log('Sync function response:', events);
        
        setLastSyncTime(new Date());
        setSyncStatus({
          type: 'success',
          message: `Sync completed! Updated ${events.length} WOM competitions.`
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
      console.error('Error syncing WOM competitions:', err);
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
              Sync WOM Competitions
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
          <li>Fetch all WOM competitions for the clan</li>
          <li>Create or update events in the database</li>
          <li>Process results for completed competitions</li>
        </ul>
        <p className="note">Note: Competitions will appear as Events in the Events section.</p>
        
        {process.env.NODE_ENV === 'development' && (
          <div className="dev-mode-notice">
            <strong>Development Mode:</strong> Using real WOM API but only updating 5 competitions.
            <div className="force-production-section">
              <button 
                className="force-production-button"
                onClick={() => setForceProduction(true)}
                disabled={forceProduction || isSyncing}
              >
                Force Full Sync
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
