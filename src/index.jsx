import React from "react";
import ReactDOM from "react-dom/client";
import * as Sentry from "@sentry/react";
import "./styles/index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";

const sentryDsn = import.meta.env.VITE_SENTRY_DSN;

// Only report from real builds. Without the PROD guard the dev server and the
// Playwright smoke run also send events, and with no environment set they all
// arrive tagged "production" - a local test run against localhost:8889 looks
// exactly like a real user hitting a crash.
if (sentryDsn && import.meta.env.PROD) {
  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.MODE,
    integrations: [
      Sentry.browserTracingIntegration({
        tracePropagationTargets: ["localhost", /^\//],
      }),
    ],
    tracesSampleRate: 0.2,
    sendDefaultPii: true,
  });
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

reportWebVitals();
