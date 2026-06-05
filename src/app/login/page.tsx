'use client'
import { useState } from "react";
import { createClient } from "@/lib/supabase";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!phone.trim()) { setError("Please enter your phone number"); return; }
    if (!/^09\d{9}$/.test(phone.trim())) { setError("Phone number must be in format 09XXXXXXXXX (11 digits)"); return; }
    setLoading(true);
    try {
      const placeholderEmail = phone.trim() + "@konek.app";
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: placeholderEmail,
        password: password,
      });
      if (authError) throw authError;
      router.push("/feeds");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid phone number or password");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", backgroundColor: "#F7F7F7", border: "1px solid #F0F0F0",
    borderRadius: "10px", padding: "12px 14px", fontSize: "0.875rem", color: "#1A1A1A",
    outline: "none", fontFamily: "inherit", marginTop: "4px", display: "block",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "0.65rem", fontWeight: 600, color: "#888",
    textTransform: "uppercase", letterSpacing: "0.05em",
  };

  return (
    <div style={{minHeight: "100vh", background: "#fff", display: "flex", flexDirection: "column", maxWidth: "480px", margin: "0 auto", fontFamily: "'Plus Jakarta Sans', sans-serif"}}>

      {/* Header */}
      <div style={{backgroundColor: "#1D9E75", padding: "32px 24px 24px", textAlign: "center"}}>
        <Link href="/">
          <div style={{display: "flex", flexDirection: "column", alignItems: "center", gap: "0px"}}>
            <Image src="/klasmeytlogoblack.svg" alt="Klasmeyt" width={140} height={140} priority style={{marginBottom: "-12px"}} />
            <Image src="/klasmeytbgblack.svg" alt="Klasmeyt" width={220} height={62} priority />
          </div>
        </Link>
        <p style={{color: "#fff", fontWeight: 600, fontSize: "1rem", marginTop: "8px"}}>Welcome back!</p>
        <p style={{fontSize: "0.8rem", color: "rgba(255,255,255,0.8)", marginTop: "2px"}}>Log in to your account</p>
      </div>

      {/* Form */}
      <form onSubmit={handleLogin} style={{flex: 1, padding: "24px", display: "flex", flexDirection: "column", gap: "16px"}}>

        {error && (
          <div style={{backgroundColor: "#FEF2F2", border: "1px solid #FCA5A5", color: "#EF4444", fontSize: "0.8rem", padding: "10px 14px", borderRadius: "10px"}}>
            {error}
          </div>
        )}

        <div>
          <label style={labelStyle}>Phone Number</label>
          <input
            type="tel"
            required
            placeholder="09XXXXXXXXX"
            value={phone}
            maxLength={11}
            onChange={(e) => { setPhone(e.target.value.replace(/\D/g, "")); setError(""); }}
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>Password</label>
          <div style={{position: "relative"}}>
            <input
              type={showPassword ? "text" : "password"}
              required
              placeholder="Your password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              style={{...inputStyle, paddingRight: "54px"}}
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              style={{position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: "0.8rem", color: "#888", fontFamily: "inherit"}}>
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{width: "100%", backgroundColor: loading ? "#888" : "#1D9E75", color: "#fff", padding: "13px", borderRadius: "10px", fontWeight: 700, fontSize: "0.875rem", border: "none", cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit"}}
        >
          {loading ? "Logging in..." : "Log in"}
        </button>

        <div style={{display: "flex", alignItems: "center", gap: "12px", margin: "4px 0"}}>
          <div style={{flex: 1, height: "1px", backgroundColor: "#F0F0F0"}}></div>
          <span style={{fontSize: "0.75rem", color: "#888"}}>or</span>
          <div style={{flex: 1, height: "1px", backgroundColor: "#F0F0F0"}}></div>
        </div>

        <Link
          href="/signup"
          style={{display: "block", width: "100%", backgroundColor: "transparent", color: "#1D9E75", textAlign: "center", padding: "13px", borderRadius: "10px", fontWeight: 600, fontSize: "0.875rem", border: "1.5px solid #1D9E75", textDecoration: "none"}}
        >
          Create new account
        </Link>

        <p style={{textAlign: "center", fontSize: "0.7rem", color: "#aaa", paddingBottom: "16px"}}>
          By logging in, you agree to our{" "}
          <span style={{color: "#1D9E75", fontWeight: 600}}>Terms of Use</span>
          {" "}and{" "}
          <span style={{color: "#1D9E75", fontWeight: 600}}>Privacy Policy</span>
        </p>

      </form>
    </div>
  );
}
