import { useEffect } from "react";

export const getSeasonalIcon = () => {
  const month = new Date().getMonth(); // 0-indexed (0 = January, 11 = December)

  if (month === 9) {
    // October
    return `/icons/siege_pumpkin.png`;
  } else if (month === 11) {
    // December
    return `/icons/siege_hat_1.png`;
  } else {
    return `/icons/favicon.ico`; // Default favicon path
  }
};

const SeasonalFavicon = () => {
  // Rest of component remains unchanged
  useEffect(() => {
    // Update the favicon based on the current month
    const favicon = document.querySelector("link[rel='icon']");
    if (favicon) {
      favicon.href = getSeasonalIcon();
    }

    // If you also want to update the apple-touch-icon
    const appleIcon = document.querySelector("link[rel='apple-touch-icon']");
    if (appleIcon) {
      appleIcon.href = getSeasonalIcon();
    }
  }, []);

  return null;
};

export default SeasonalFavicon;
