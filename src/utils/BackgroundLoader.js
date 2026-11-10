import { useState, useEffect } from "react";

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
    
    // API data is not prefetched here. DataProvider (context/DataContext.jsx)
    // wraps the whole app and loads the WOM group, stats, achievements and
    // competitions through SWR on every visit. This used to call React
    // Query's prefetchQuery with the v3 signature, which v5 rejects ("queryKey
    // needs to be an Array"), so it fetched nothing and only logged errors -
    // and nothing reads React Query's cache anyway.

    // Start image preloading with prioritization
    const preloadImages = () => {
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
        }, index * 100); // 100ms stagger between each image
      });
    };

    // Preload metric icons using the new optimized function from OsrsIcons
    const preloadGameIcons = () => {
      // Use the exported function from OsrsIcons with custom settings
      preloadMetricIcons({
        delayBetweenIcons: 75, // Slightly slower loading to reduce network congestion
        logLoading: false // Disabled logging
      });
    };

    // Use requestIdleCallback for background loading if available
    if ('requestIdleCallback' in window) {
      // Load during browser idle time
      const imageIdleCallback = window.requestIdleCallback(preloadImages, { timeout: 3000 });
      const metricIconCallback = window.requestIdleCallback(() => {
        // Start metric icon preloading after some delay to let other assets load first
        setTimeout(preloadGameIcons, 1000);
      }, { timeout: 4000 });
      
      return () => {
        // Clean up idle callbacks if component unmounts
        window.cancelIdleCallback(imageIdleCallback);
        window.cancelIdleCallback(metricIconCallback);
      };
    } else {
      // Fallback - start after a short delay
      const imageTimeout = setTimeout(preloadImages, 3000);
      const metricIconTimeout = setTimeout(preloadGameIcons, 4000);
      
      return () => {
        // Clean up timeouts if component unmounts
        clearTimeout(imageTimeout);
        clearTimeout(metricIconTimeout);
      };
    }
  }, [appHasLoaded]);

  return null; // Component doesn't render anything visible
}

export default BackgroundLoader;
