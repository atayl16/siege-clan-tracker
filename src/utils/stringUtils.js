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
