import React from "react";
import { createRoot } from "react-dom/client";
import App from "../components/App";
import WidgetButton from "../components/WidgetButton";
import { restoreStateFromStorage, useExtensionStore } from "../store/extensionStore";

export default {
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
    let isOverlayOpen = false;

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
      overlayContainer.style.background = "rgba(255,255,255,0.95)";
      overlayContainer.style.borderRadius = "16px";
      overlayContainer.style.boxShadow = "0 4px 24px rgba(0,0,0,0.13)";
      overlayContainer.style.overflow = "auto";
      document.body.appendChild(overlayContainer);
      const overlayRoot = createRoot(overlayContainer);
      overlayRoot.render(
        React.createElement(App, {
          onPopOut: popOutWindow,
          onClose: closeOverlay,
        })
      );
      isOverlayOpen = true;
      updateWidget();
    };

    const closeOverlay = () => {
      if (overlayContainer) {
        overlayContainer.remove();
        overlayContainer = null;
        isOverlayOpen = false;
        updateWidget();
      }
    };

    const toggleOverlay = () => {
      if (overlayContainer) {
        closeOverlay();
      } else {
        showOverlay();
      }
    };

    const popOutWindow = () => {
      closeOverlay();
      // Open popup window
      const popup = window.open(
        chrome.runtime.getURL("popup.html"),
        "WhisperrAuthPopup",
        "width=420,height=640,top=100,left=100"
      );
      
      // Set popout state
      useExtensionStore.getState().setPopoutWindow(popup);
      useExtensionStore.getState().setIsPopout(true);
      
      // Listen for popup close to reset state
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          useExtensionStore.getState().setPopoutWindow(null);
          useExtensionStore.getState().setIsPopout(false);
        }
      }, 1000);
    };

    const updateWidget = () => {
      widgetRoot.render(
        React.createElement(WidgetButton, {
          onClick: toggleOverlay,
          onPopOut: popOutWindow,
          isOverlayOpen,
        })
      );
    };

    // Initial widget render
    updateWidget();

    // Listen for messages from popup to sync state
    window.addEventListener('message', (event) => {
      if (event.origin !== window.location.origin) return;
      if (event.data.type === 'EXTENSION_STATE_SYNC') {
        // Handle state sync from popup
        const { currentPage, user, isAuthenticated } = event.data.payload;
        useExtensionStore.getState().setCurrentPage(currentPage);
        useExtensionStore.getState().setUser(user);
        useExtensionStore.getState().setAuthenticated(isAuthenticated);
      }
    });
  },
};