import React from "react";
import { AuthProvider } from "../appwrite-provider/AuthProvider";
import { useExtensionStore } from "../store/extensionStore";
import Login from "./Login";

export default function App({ onPopOut, onClose }: { onPopOut?: () => void; onClose?: () => void }) {
  const { currentPage } = useExtensionStore();

  return (
    <AuthProvider>
      <div style={{ padding: 24, position: "relative", height: "100%" }}>
        <div style={{ position: "absolute", top: 8, right: 8, display: "flex", gap: 8 }}>
          {onPopOut && (
            <button onClick={onPopOut} title="Pop out" style={{ borderRadius: 8, padding: "4px 8px" }}>
              ↗
            </button>
          )}
          {onClose && (
            <button onClick={onClose} title="Close" style={{ borderRadius: 8, padding: "4px 8px" }}>
              ✕
            </button>
          )}
        </div>
        {/* Render current page */}
        {currentPage === "login" && <Login />}
        {/* Add other pages as needed */}
      </div>
    </AuthProvider>
  );
}