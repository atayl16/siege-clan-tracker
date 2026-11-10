// Helper function to titleize a string
export const titleize = (str) => {
  // Handle null, undefined, non-strings, and empty/whitespace strings
  if (!str || typeof str !== 'string' || str.trim() === '') return "-";
  const capitalize = (word) =>
    word.length === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1);
  return str
    .toLowerCase()
    .split(" ")
    .map((token) => token.split("_").map(capitalize).join(" "))
    .join(" ");
};

/**
 * An account username as members see it: underscores read as spaces and the
 * first letter is capitalised ("dan_xo" shows as "Dan xo"). Display only:
 * the stored username, and what people sign in with, stays "dan_xo".
 * Usernames cannot contain spaces, so two accounts never display the same.
 */
export const displayUsername = (username) => {
  if (!username || typeof username !== "string") return "";
  const spaced = username.replace(/_+/g, " ").trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
};
