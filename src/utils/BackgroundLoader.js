import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

// Import clan icons
import clanIconExecutive from "../assets/images/Clan_icon_-_Executive.png";
import clanIconLeader from "../assets/images/Clan_icon_-_Leader.png";
import clanIconMentor from "../assets/images/Clan_icon_-_Mentor.png";
import clanIconMonarch from "../assets/images/Clan_icon_-_Monarch.png";
import clanIconPrefect from "../assets/images/Clan_icon_-_Prefect.png";
import clanIconSenator from "../assets/images/Clan_icon_-_Senator.png";
import clanIconSuperior from "../assets/images/Clan_icon_-_Superior.png";
import clanIconSupervisor from "../assets/images/Clan_icon_-_Supervisor.png";
import clanIconTzKal from "../assets/images/Clan_icon_-_TzKal.png";
import siegeHat1 from "../assets/images/siege_hat_1.png";
import wiseOldManIcon from "../assets/images/other/Wise_Old_Man_chathead.png";

// Import the preloadMetricIcons function from OsrsIcons
import { preloadMetricIcons } from "../components/OsrsIcons";

function BackgroundLoader() {
  const [appHasLoaded, setAppHasLoaded] = useState(false);
  const queryClient = useQueryClient();

  // Wait until after initial render to start background loading
  useEffect(() => {
    // Set a flag once the app has rendered
    const markAppAsLoaded = () => {
      setAppHasLoaded(true);
    };

    // Use requestIdleCallback if available, or setTimeout as fallback
    if ('requestIdleCallback' in window) {
      // Wait until browser is idle (user can interact with page)
      window.requestIdleCallback(markAppAsLoaded);
    } else {
      // Fallback - wait a moment after render
      setTimeout(markAppAsLoaded, 1000);
    }
  }, []);

  // Only start background loading after app has rendered
  useEffect(() => {
    if (!appHasLoaded) return;

    console.log("Starting background loading...");

    // Start API prefetching in priority order
    const prefetchApiData = () => {
      console.log("Background loading API data...");
      
      // Tier 1: Most critical data for navigation (highest priority)
      queryClient.prefetchQuery(["wom-group"], () => 
        fetch("/api/wom-group").then(res => res.json())
      );
      
      // Tier 2: Commonly viewed pages (medium priority)
      setTimeout(() => {
        queryClient.prefetchQuery(["wom-group-stats"], () => 
          fetch("/api/wom-group-stats").then(res => res.json())
        );
        
        queryClient.prefetchQuery(["members"], () => 
          fetch("/api/members").then(res => res.json())
        );
      }, 500);
      
      // Tier 3: Less frequently accessed pages (lower priority)
      setTimeout(() => {
        queryClient.prefetchQuery(["events"], () => 
          fetch("/api/events").then(res => res.json())
        );
        
        queryClient.prefetchQuery(["wom-group-achievements"], () => 
          fetch("/api/wom-group-achievements").then(res => res.json())
        );
      }, 1500);
      
      // Tier 4: Rarely accessed pages (lowest priority)
      setTimeout(() => {
        queryClient.prefetchQuery(["wom-competitions"], () => 
          fetch("/api/wom-competitions").then(res => res.json())
        );
        
        queryClient.prefetchQuery(["claim-requests"], () => 
          fetch("/api/claim-requests").then(res => res.json())
        );
        
        queryClient.prefetchQuery(["races"], () => 
          fetch("/api/races").then(res => res.json())
        );
      }, 3000);
    };

    // Start image preloading with prioritization
    const preloadImages = () => {
      console.log("Background loading images...");
      
      // List highest priority images first
      const imagesToPreload = [
        // Clan icons
        clanIconExecutive,
        clanIconLeader,
        clanIconMentor,
        clanIconMonarch,
        clanIconPrefect,
        clanIconSenator,
        clanIconSuperior,
        clanIconSupervisor,
        clanIconTzKal,
        siegeHat1,
        wiseOldManIcon
      ];

      // Load each image with a slight delay between them to avoid bandwidth spikes
      imagesToPreload.forEach((src, index) => {
        setTimeout(() => {
          const img = new Image();
          img.src = src;
          img.onload = () => console.log(`Loaded: ${src.split('/').pop()}`);
          img.onerror = () => console.error(`Failed to load: ${src}`);
        }, index * 100); // 100ms stagger between each image
      });
    };

    // Preload metric icons using the new optimized function from OsrsIcons
    const preloadGameIcons = () => {
      console.log("Background loading metric icons...");
      
      // Use the exported function from OsrsIcons with custom settings
      preloadMetricIcons({
        delayBetweenIcons: 75, // Slightly slower loading to reduce network congestion
        logLoading: true // Log each icon as it loads
      })
      .then(() => {
        console.log("Finished preloading all metric icons");
      })
      .catch(error => {
        console.error("Error during metric icon preloading:", error);
      });
    };

    // Use requestIdleCallback for background loading if available
    if ('requestIdleCallback' in window) {
      // Load during browser idle time
      const apiIdleCallback = window.requestIdleCallback(prefetchApiData, { timeout: 2000 });
      const imageIdleCallback = window.requestIdleCallback(preloadImages, { timeout: 3000 });
      const metricIconCallback = window.requestIdleCallback(() => {
        // Start metric icon preloading after some delay to let other assets load first
        setTimeout(preloadGameIcons, 1000);
      }, { timeout: 4000 });
      
      return () => {
        // Clean up idle callbacks if component unmounts
        window.cancelIdleCallback(apiIdleCallback);
        window.cancelIdleCallback(imageIdleCallback);
        window.cancelIdleCallback(metricIconCallback);
      };
    } else {
      // Fallback - start after a short delay
      const apiTimeout = setTimeout(prefetchApiData, 2000);
      const imageTimeout = setTimeout(preloadImages, 3000);
      const metricIconTimeout = setTimeout(preloadGameIcons, 4000);
      
      return () => {
        // Clean up timeouts if component unmounts
        clearTimeout(apiTimeout);
        clearTimeout(imageTimeout);
        clearTimeout(metricIconTimeout);
      };
    }
  }, [appHasLoaded, queryClient]);

  return null; // Component doesn't render anything visible
}

export default BackgroundLoader;
