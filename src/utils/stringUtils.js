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
 * first letter is capitalised ("ash_ko" shows as "Ash ko"). Display only:
 * the stored username stays "ash_ko". Signup turns a typed space into an
 * underscore (utils/username.js), so a member who signs up as "Test user" is
 * stored as "test_user" and sees "Test user". Stored names never hold a space.
 */
export const displayUsername = (username) => {
  if (!username || typeof username !== "string") return "";
  const spaced = username.replace(/_+/g, " ").trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
};
