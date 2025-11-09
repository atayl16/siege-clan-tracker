// Helper function to titleize a string
export const titleize = (str) => {
  // Handle null, undefined, non-strings, and empty/whitespace strings
  if (!str || typeof str !== 'string' || str.trim() === '') return "-";
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};
