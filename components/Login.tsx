import React, { useState, useRef, useEffect } from "react";
import { Eye, EyeOff, Check, Mail, KeyRound, Link2 } from "lucide-react";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/Card";
import { Navbar } from "./layout/Navbar";
import { useExtensionStore } from "../store/extensionStore";
import {
  loginWithEmailPassword,
  sendEmailOtp,
  completeEmailOtp,
  sendMagicUrl,
  checkMfaRequired,
} from "../lib/appwrite";

const OTP_COOLDOWN = 120; // seconds

type Mode = "password" | "otp" | "magic";

export default function Login() {
  const [mode, setMode] = useState<Mode>("password");
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "", otp: "", userId: "" });
  const { setCurrentPage } = useExtensionStore();
  const [error, setError] = useState<string | null>(null);

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
    // Magic handled separately
  };

  const handleSendOTP = async () => {
    setError(null);
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
  };

  const handleSendMagic = async () => {
    setError(null);
    try {
      await sendMagicUrl(formData.email, window.location.origin + "/login");
      setMagicSent(true);
      setTimeout(() => setMagicSent(false), 4000);
    } catch (e: any) {
      setError(e.message || "Error sending magic link.");
    }
  };

  const modeButtons = [
    { label: "Password", value: "password", icon: KeyRound },
    { label: "OTP", value: "otp", icon: Mail },
    { label: "Magic Link", value: "magic", icon: Link2 },
  ] as const;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md glass shadow-2xl">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <img
                src="/images/logo.png"
                alt="Whisperrauth Logo"
                className="h-12 w-12 rounded-lg object-contain"
              />
            </div>
            <CardTitle className="text-2xl">Welcome back</CardTitle>
            <p className="text-sm text-muted-foreground">
              Sign in to your Whisperrauth account
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center gap-2 mb-6">
              {modeButtons.map((btn) => (
                <button
                  key={btn.value}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full shadow-md transition-all duration-150
                    ${mode === btn.value
                      ? "bg-primary text-white scale-105"
                      : "bg-white/60 text-[rgb(141,103,72)] hover:bg-primary/20"
                    }`}
                  style={{
                    boxShadow: mode === btn.value
                      ? "0 4px 16px 0 rgba(141,103,72,0.13)"
                      : "0 2px 8px 0 rgba(191,174,153,0.10)"
                  }}
                  onClick={() => {
                    setMode(btn.value as Mode);
                    setError(null);
                  }}
                  type="button"
                >
                  <btn.icon className="h-5 w-5" />
                  {btn.label}
                </button>
              ))}
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    setOtpSent(false);
                    setMagicSent(false);
                  }}
                  required
                />
              </div>
              {mode === "password" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Password</label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              )}
              {mode === "otp" && (
                <>
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      placeholder="Enter OTP"
                      value={formData.otp}
                      onChange={(e) => setFormData({ ...formData, otp: e.target.value })}
                      disabled={!otpSent}
                      className={`transition-all duration-200 ${!otpSent ? "blur-[2px] opacity-60" : ""}`}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="glass"
                      disabled={
                        !formData.email ||
                        otpCooldown > 0
                      }
                      onClick={handleSendOTP}
                    >
                      {otpSent ? (
                        <Check className="h-5 w-5 text-green-600" />
                      ) : (
                        "Get OTP"
                      )}
                    </Button>
                  </div>
                  {securityPhrase && otpSent && (
                    <div className="text-xs text-muted-foreground mt-1">
                      <span className="font-semibold">Security Phrase:</span> {securityPhrase}
                    </div>
                  )}
                  {otpCooldown > 0 && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Request again in {otpCooldown}s
                    </div>
                  )}
                </>
              )}
              {mode === "magic" && (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="glass flex-1"
                    disabled={!formData.email || magicSent}
                    onClick={handleSendMagic}
                  >
                    {magicSent ? (
                      <Check className="h-5 w-5 text-green-600" />
                    ) : (
                      "Get Magic Link"
                    )}
                  </Button>
                </div>
              )}
              {mode === "magic" && magicSent && (
                <div className="text-xs text-green-700 mt-2 flex items-center gap-2">
                  <Check className="h-4 w-4" /> Sent! Check your email for the magic link.
                </div>
              )}
              {error && <div className="text-red-600 text-sm">{error}</div>}
              {(mode === "password" || (mode === "otp" && otpSent)) && (
                <Button type="submit" className="w-full">
                  Sign In
                </Button>
              )}
            </form>
            <div className="mt-6 text-center space-y-2">
              {/* For extension, you may want to open register/forgot in a new tab or overlay */}
              <button
                className="text-sm text-primary hover:underline bg-transparent border-none"
                type="button"
                onClick={() => setCurrentPage("forgot-password")}
              >
                Forgot your password?
              </button>
              <p className="text-sm text-muted-foreground">
                Don't have an account?{" "}
                <button
                  className="text-primary hover:underline bg-transparent border-none"
                  type="button"
                  onClick={() => setCurrentPage("register")}
                >
                  Sign up
                </button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
