import React, { useState, useRef, useEffect } from "react";
import { Button, TextField, Card, CardContent, CardHeader, Typography, CircularProgress, Box } from "@mui/material";
import { Check, Mail, KeyRound, Link2 } from "lucide-react";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { useExtensionStore } from "../store/extensionStore";
import {
  loginWithEmailPassword,
  sendEmailOtp,
  completeEmailOtp,
  sendMagicUrl,
  checkMfaRequired,
} from "../lib/appwrite";

const OTP_COOLDOWN = 120;

type Mode = "password" | "otp" | "magic";

export default function Login() {
  const [mode, setMode] = useState<Mode>("password");
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "", otp: "", userId: "" });
  const { setCurrentPage } = useExtensionStore();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // OTP/Magic state
  const [otpSent, setOtpSent] = useState(false);
  const [magicSent, setMagicSent] = useState(false);
  const [securityPhrase, setSecurityPhrase] = useState("");
  const [otpCooldown, setOtpCooldown] = useState(0);
  const otpTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (mode === "otp" && formData.email) {
      const last = localStorage.getItem("otp_last_" + formData.email);
      if (last) {
        const elapsed = Math.floor((Date.now() - Number(last)) / 1000);
        if (elapsed < OTP_COOLDOWN) setOtpCooldown(OTP_COOLDOWN - elapsed);
      }
    }
    return () => {
      if (otpTimer.current) clearInterval(otpTimer.current);
    };
  }, [mode, formData.email]);

  useEffect(() => {
    if (otpCooldown > 0) {
      otpTimer.current = setInterval(() => {
        setOtpCooldown((c) => {
          if (c <= 1 && otpTimer.current) clearInterval(otpTimer.current);
          return c - 1;
        });
      }, 1000);
    }
    return () => {
      if (otpTimer.current) clearInterval(otpTimer.current);
    };
  }, [otpCooldown]);

  // Handlers
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    if (mode === "password") {
      try {
        await loginWithEmailPassword(formData.email, formData.password);
        try {
          await checkMfaRequired();
          setCurrentPage("masterpass");
        } catch (mfaError: any) {
          if (mfaError.type === "user_more_factors_required") {
            setCurrentPage("twofa");
          } else {
            setError(mfaError.message || "Login verification failed");
          }
        }
      } catch (err: any) {
        setError(err?.message || "Login failed");
      }
    } else if (mode === "otp") {
      try {
        await completeEmailOtp(formData.userId, formData.otp);
        try {
          await checkMfaRequired();
          setCurrentPage("masterpass");
        } catch (mfaError: any) {
          if (mfaError.type === "user_more_factors_required") {
            setCurrentPage("twofa");
          } else {
            setError(mfaError.message || "Login verification failed");
          }
        }
      } catch (err: any) {
        setError(err?.message || "Invalid OTP.");
      }
    }
    setLoading(false);
    // Magic handled separately
  };

  const handleSendOTP = async () => {
    setError(null);
    setLoading(true);
    try {
      const resp = await sendEmailOtp(formData.email, true);
      setOtpSent(true);
      setSecurityPhrase(resp.phrase || "");
      setFormData((f) => ({ ...f, userId: resp.userId }));
      localStorage.setItem("otp_last_" + formData.email, Date.now().toString());
      setOtpCooldown(OTP_COOLDOWN);
    } catch (e: any) {
      setError(e.message || "Error sending OTP.");
    }
    setLoading(false);
  };

  const handleSendMagic = async () => {
    setError(null);
    setLoading(true);
    try {
      await sendMagicUrl(formData.email, window.location.origin + "/login");
      setMagicSent(true);
      setTimeout(() => setMagicSent(false), 4000);
    } catch (e: any) {
      setError(e.message || "Error sending magic link.");
    }
    setLoading(false);
  };

  const modeButtons = [
    { label: "Password", value: "password", icon: KeyRound },
    { label: "OTP", value: "otp", icon: Mail },
    { label: "Magic Link", value: "magic", icon: Link2 },
  ] as const;

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column", bgcolor: "background.default" }}>
      {/* Navbar can be added here if needed */}
      <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", p: 2 }}>
        <Card sx={{ width: "100%", maxWidth: 400, borderRadius: 3, boxShadow: 8, bgcolor: "rgba(255,255,255,0.95)" }}>
          <CardHeader
            title={
              <Box sx={{ textAlign: "center" }}>
                <img
                  src="/images/logo.png"
                  alt="Whisperrauth Logo"
                  style={{ height: 48, width: 48, borderRadius: 8, objectFit: "contain", marginBottom: 8 }}
                />
                <Typography variant="h5" fontWeight={700}>Welcome back</Typography>
                <Typography variant="body2" color="text.secondary">
                  Sign in to your Whisperrauth account
                </Typography>
              </Box>
            }
          />
          <CardContent>
            <Box sx={{ display: "flex", justifyContent: "center", gap: 1, mb: 3 }}>
              {modeButtons.map((btn) => (
                <Button
                  key={btn.value}
                  variant={mode === btn.value ? "contained" : "outlined"}
                  color={mode === btn.value ? "primary" : "inherit"}
                  startIcon={<btn.icon size={18} />}
                  sx={{
                    borderRadius: 999,
                    boxShadow: mode === btn.value
                      ? "0 4px 16px 0 rgba(141,103,72,0.13)"
                      : "0 2px 8px 0 rgba(191,174,153,0.10)",
                    fontWeight: 500,
                  }}
                  onClick={() => {
                    setMode(btn.value as Mode);
                    setError(null);
                  }}
                  disabled={loading}
                >
                  {btn.label}
                </Button>
              ))}
            </Box>
            <form onSubmit={handleSubmit}>
              <TextField
                label="Email"
                type="email"
                fullWidth
                margin="normal"
                value={formData.email}
                onChange={e => {
                  setFormData({ ...formData, email: e.target.value });
                  setOtpSent(false);
                  setMagicSent(false);
                }}
                required
                disabled={loading}
              />
              {mode === "password" && (
                <TextField
                  label="Password"
                  type={showPassword ? "text" : "password"}
                  fullWidth
                  margin="normal"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  required
                  disabled={loading}
                  InputProps={{
                    endAdornment: (
                      <Button
                        onClick={() => setShowPassword(!showPassword)}
                        size="small"
                        sx={{ minWidth: 0, p: 0 }}
                        tabIndex={-1}
                      >
                        {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </Button>
                    ),
                  }}
                />
              )}
              {mode === "otp" && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <TextField
                    label="OTP"
                    type="text"
                    fullWidth
                    value={formData.otp}
                    onChange={e => setFormData({ ...formData, otp: e.target.value })}
                    disabled={!otpSent || loading}
                  />
                  <Button
                    variant="outlined"
                    onClick={handleSendOTP}
                    disabled={!formData.email || otpCooldown > 0 || loading}
                  >
                    {otpSent ? <Check size={20} color="green" /> : "Get OTP"}
                  </Button>
                </Box>
              )}
              {securityPhrase && otpSent && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                  <strong>Security Phrase:</strong> {securityPhrase}
                </Typography>
              )}
              {otpCooldown > 0 && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                  Request again in {otpCooldown}s
                </Typography>
              )}
              {mode === "magic" && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Button
                    variant="outlined"
                    fullWidth
                    onClick={handleSendMagic}
                    disabled={!formData.email || magicSent || loading}
                  >
                    {magicSent ? <Check size={20} color="green" /> : "Get Magic Link"}
                  </Button>
                </Box>
              )}
              {mode === "magic" && magicSent && (
                <Typography variant="caption" color="success.main" sx={{ mt: 2, display: "flex", alignItems: "center", gap: 1 }}>
                  <Check size={16} /> Sent! Check your email for the magic link.
                </Typography>
              )}
              {error && (
                <Typography variant="body2" color="error" sx={{ mt: 2 }}>
                  {error}
                </Typography>
              )}
              {(mode === "password" || (mode === "otp" && otpSent)) && (
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  color="primary"
                  sx={{ mt: 2 }}
                  disabled={loading}
                  endIcon={loading ? <CircularProgress size={18} /> : null}
                >
                  {loading ? "Signing In..." : "Sign In"}
                </Button>
              )}
            </form>
            <Box sx={{ mt: 4, textAlign: "center" }}>
              <Button
                variant="text"
                color="primary"
                onClick={() => setCurrentPage("forgot-password")}
                sx={{ fontSize: 14 }}
                disabled={loading}
              >
                Forgot your password?
              </Button>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Don't have an account?{" "}
                <Button
                  variant="text"
                  color="primary"
                  onClick={() => setCurrentPage("register")}
                  sx={{ fontSize: 14 }}
                  disabled={loading}
                >
                  Sign up
                </Button>
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
