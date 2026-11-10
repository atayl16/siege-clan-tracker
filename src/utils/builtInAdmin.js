/**
 * The built-in admin account (username "admin"). Its login is hard-coded
 * (context/AuthContext.jsx) and signs in through a users row named "admin",
 * so its username, password and admin rights must never change: the server
 * refuses all three. It has no characters, goals or races of its own either,
 * so it has no profile page.
 */
export const isBuiltInAdmin = (user) => String(user?.username ?? "").toLowerCase() === "admin";
