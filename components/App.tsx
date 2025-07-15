import React, { useState } from "react";
import { AuthProvider } from "../appwrite-provider/AuthProvider";
import { loginWithMasterpass } from "../app/(protected)/masterpass/logic";

export default function App() {
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
      <div style={{ padding: 24 }}>
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
      </div>
    </AuthProvider>
  );
}