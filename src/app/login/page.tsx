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
  const [form, setForm] = useState({ email: "", password: "" });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      });
      if (authError) throw authError;
      router.push("/feeds");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%",
    backgroundColor: "#F7F7F7",
    border: "1px solid #F0F0F0",
    borderRadius: "10px",
    padding: "12px 14px",
    fontSize: "0.875rem",
    color: "#1A1A1A",
    outline: "none",
    fontFamily: "inherit",
    marginTop: "4px",
    display: "block",
  };

  const labelStyle = {
    fontSize: "0.65rem",
    fontWeight: 600 as const,
    color: "#888",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
  };

  return (
    <div style={{minHeight: "100vh", background: "#fff", display: "flex", flexDirection: "column", maxWidth: "480px", margin: "0 auto"}}>

      {/* Header */}
      <div style={{backgroundColor: "#1D9E75", padding: "48px 24px 32px", textAlign: "center"}}>
        <Link href="/">
          <Image src="/konek.svg" alt="Konek" width={200} height={110} priority />
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
          <label style={labelStyle}>Email</label>
          <input
            type="email"
            required
            placeholder="juan@email.com"
            value={form.email}
            onChange={(e) => setForm({...form, email: e.target.value})}
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>Password</label>
          <input
            type="password"
            required
            placeholder="Your password"
            value={form.password}
            onChange={(e) => setForm({...form, password: e.target.value})}
            style={inputStyle}
          />
        </div>

        <div style={{textAlign: "right", marginTop: "-8px"}}>
          <Link href="/forgot-password" style={{fontSize: "0.75rem", color: "#1D9E75", fontWeight: 600, textDecoration: "none"}}>
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{width: "100%", backgroundColor: loading ? "#888" : "#1D9E75", color: "#fff", padding: "13px", borderRadius: "10px", fontWeight: 600, fontSize: "0.875rem", border: "none", cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit"}}
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
