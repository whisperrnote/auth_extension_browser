import React from "react";
import { createRoot } from "react-dom/client";
// Import main App component from extension (to be copied from website)
import App from "../components/App";

export default defineContentScript({
  matches: ['*://*.google.com/*'],
  main() {
    // Inject a container for the extension UI
    const container = document.createElement("div");
    container.id = "whisperrauth-extension-root";
    container.style.position = "fixed";
    container.style.top = "20px";
    container.style.right = "20px";
    container.style.zIndex = "99999";
    container.style.width = "400px";
    container.style.height = "600px";
    container.style.background = "rgba(255,255,255,0.95)";
    container.style.borderRadius = "16px";
    container.style.boxShadow = "0 4px 24px rgba(0,0,0,0.13)";
    container.style.overflow = "auto";
    document.body.appendChild(container);

    // Mount React app
    const root = createRoot(container);
    root.render(<App />);
  },
});
