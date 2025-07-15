import React from "react";
import { createRoot } from "react-dom/client";
import App from "../components/App";
import { restoreStateFromStorage } from "../store/extensionStore";
import { defineContentScript } from "wxt";
import { Button, Paper, Box } from "@mui/material";

// Widget button styles using Material UI Box
const widgetBtnStyle: React.CSSProperties = {
  position: "fixed",
  top: "20px",
  right: "20px",
  zIndex: 99998,
  width: "48px",
  height: "48px",
  borderRadius: "50%",
  background: "#fff",
  boxShadow: "0 2px 8px rgba(0,0,0,0.13)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  border: "1px solid #eee"
};

function WidgetButton({ onClick }: { onClick: () => void }) {
  return (
    <Box sx={widgetBtnStyle} onClick={onClick} title="Open Whisperr Auth">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="#888" strokeWidth="2" />
        <path d="M8 12h8M12 8v8" stroke="#888" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </Box>
  );
}

export default defineContentScript({
  matches: ['*://*.google.com/*'],
  async main() {
    await restoreStateFromStorage();

    // Inject widget button
    const widgetBtnContainer = document.createElement("div");
    widgetBtnContainer.id = "whisperrauth-widget-btn";
    document.body.appendChild(widgetBtnContainer);
    const widgetRoot = createRoot(widgetBtnContainer);

    // Overlay logic
    let overlayContainer: HTMLDivElement | null = null;
    const showOverlay = () => {
      if (overlayContainer) return;
      overlayContainer = document.createElement("div");
      overlayContainer.id = "whisperrauth-extension-root";
      overlayContainer.style.position = "fixed";
      overlayContainer.style.top = "20px";
      overlayContainer.style.right = "80px";
      overlayContainer.style.zIndex = "99999";
      overlayContainer.style.width = "400px";
      overlayContainer.style.height = "600px";
      overlayContainer.style.background = "transparent";
      overlayContainer.style.borderRadius = "16px";
      overlayContainer.style.boxShadow = "0 4px 24px rgba(0,0,0,0.13)";
      overlayContainer.style.overflow = "auto";
      document.body.appendChild(overlayContainer);
      const overlayRoot = createRoot(overlayContainer);
      overlayRoot.render(
        <Paper elevation={8} sx={{
          width: "100%",
          height: "100%",
          borderRadius: "16px",
          background: "rgba(255,255,255,0.95)",
          boxShadow: "0 4px 24px rgba(0,0,0,0.13)",
          overflow: "auto",
        }}>
          <App onPopOut={popOutWindow} onClose={closeOverlay} />
        </Paper>
      );
    };

    const closeOverlay = () => {
      if (overlayContainer) {
        overlayContainer.remove();
        overlayContainer = null;
      }
    };

    // Pop out into new window
    const popOutWindow = () => {
      closeOverlay();
      window.open(
        chrome.runtime.getURL("popup.html"),
        "WhisperrAuthPopup",
        "width=420,height=640,top=100,right=100"
      );
    };

    widgetRoot.render(<WidgetButton onClick={showOverlay} />);
  },
});