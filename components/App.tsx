import React, { useState } from "react";
import { AuthProvider } from "../appwrite-provider/AuthProvider";
import { loginWithMasterpass } from "../app/(protected)/masterpass/logic";
import { useExtensionStore } from "../store/extensionStore";

export default function App({ onPopOut, onClose }: { onPopOut?: () => void; onClose?: () => void }) {
  const { currentPage, setCurrentPage } = useExtensionStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await loginWithMasterpass(email, password);
      // Show success UI or redirect as needed
    } catch (err: any) {
      setError(err.message || "Login failed");
    }
  };

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
        {currentPage === "login" && (
          <>
            <h2>Sign In</h2>
            <form onSubmit={handleLogin}>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                style={{ marginBottom: 8, width: "100%" }}
              />
              <input
                type="password"
                placeholder="Masterpass"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={{ marginBottom: 8, width: "100%" }}
              />
              <button type="submit">Login</button>
            </form>
            {error && <div style={{ color: "red" }}>{error}</div>}
          </>
        )}
        {/* Add other pages as needed */}
      </div>
    </AuthProvider>
  );
}