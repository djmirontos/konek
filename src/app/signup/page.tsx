'use client'
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ full_name: "", email: "", password: "", school_id: "" });
  const [idFile, setIdFile] = useState<File | null>(null);
  const [idPreview, setIdPreview] = useState("");
  const [schools, setSchools] = useState<{id: string; name: string}[]>([]);

  useEffect(() => {
    supabase.from("schools").select("id, name").order("name").then(({ data }) => {
      if (data) { setSchools(data); setForm(f => ({...f, school_id: data[0]?.id || ""})); }
    });
  }, []);

  const handleIdUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { setError("ID photo must be less than 2MB"); return; }
      setIdFile(file);
      setIdPreview(prev => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(file); });
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!idFile) { setError("Please upload your Student ID photo"); return; }
    if (!form.school_id) { setError("Please select your school"); return; }
    setLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
      });
      if (authError) throw authError;
      if (!authData.user) throw new Error("Signup failed");

      let session = authData.session;
      if (!session) {
        await new Promise(res => setTimeout(res, 1500));
        const { data: sessionData } = await supabase.auth.getSession();
        session = sessionData.session;
      }
      if (!session) throw new Error("Session not ready. Please try logging in.");

      const fileExt = idFile.name.split(".").pop();
      const filePath = `${authData.user.id}/student-id.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from("konek-images").upload(filePath, idFile);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("konek-images").getPublicUrl(filePath);

      const { error: profileError } = await supabase.from("users").insert({
        id: authData.user.id,
        full_name: form.full_name,
        email: form.email,
        school_id: form.school_id,
        student_id_url: urlData.publicUrl,
        is_verified: true,
        is_banned: false,
        ban_count: 0,
        role: "student",
      });
      if (profileError) throw profileError;
      router.push("/feeds");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = { width: "100%", backgroundColor: "#F7F7F7", border: "1px solid #F0F0F0", borderRadius: "10px", padding: "10px 14px", fontSize: "0.8rem", color: "#1A1A1A", outline: "none", fontFamily: "inherit", marginTop: "3px", display: "block" };
  const labelStyle = { fontSize: "0.65rem", fontWeight: 600 as const, color: "#888", textTransform: "uppercase" as const, letterSpacing: "0.05em" };

  return (
    <div style={{minHeight: "100vh", background: "#fff", display: "flex", flexDirection: "column", maxWidth: "480px", margin: "0 auto"}}>
      <div style={{backgroundColor: "#1D9E75", padding: "24px 24px 18px", textAlign: "center"}}>
        <Link href="/"><Image src="/konek.svg" alt="Konek" width={160} height={88} priority /></Link>
        <p style={{color: "#fff", fontWeight: 600, fontSize: "1rem", marginTop: "4px"}}>Create your account</p>
        <p style={{fontSize: "0.8rem", color: "rgba(255,255,255,0.8)"}}>Tangub City students only</p>
      </div>
      <form onSubmit={handleSignup} style={{flex: 1, padding: "16px 24px", display: "flex", flexDirection: "column", gap: "12px"}}>
        {error && <div style={{backgroundColor: "#FEF2F2", border: "1px solid #FCA5A5", color: "#EF4444", fontSize: "0.8rem", padding: "10px 14px", borderRadius: "10px"}}>{error}</div>}
        <div>
          <label style={labelStyle}>Full Name</label>
          <input type="text" required placeholder="Juan dela Cruz" value={form.full_name} onChange={(e) => setForm({...form, full_name: e.target.value})} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Email</label>
          <input type="email" required placeholder="juan@email.com" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Password</label>
          <input type="password" required placeholder="Min. 6 characters" value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>School</label>
          <select value={form.school_id} onChange={(e) => setForm({...form, school_id: e.target.value})} style={inputStyle}>
            {schools.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Student ID Photo</label>
          <label style={{marginTop: "3px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "100%", border: "2px dashed #1D9E75", borderRadius: "10px", padding: "14px", cursor: "pointer", backgroundColor: "#E1F5EE", textAlign: "center"}}>
            {idPreview ? (
              <img src={idPreview} alt="ID Preview" style={{width: "160px", height: "90px", borderRadius: "8px", objectFit: "cover"}} />
            ) : (
              <div>
                <div style={{fontSize: "1.6rem", marginBottom: "4px"}}>🪪</div>
                <div style={{fontSize: "0.8rem", fontWeight: 600, color: "#0F6E56"}}>Tap to upload your Student ID</div>
                <div style={{fontSize: "0.7rem", color: "#888", marginTop: "2px"}}>JPG or PNG - max 2MB - auto-approved</div>
              </div>
            )}
            <input type="file" accept="image/*" style={{display: "none"}} onChange={handleIdUpload} />
          </label>
        </div>
        <button type="submit" disabled={loading} style={{width: "100%", backgroundColor: loading ? "#888" : "#1D9E75", color: "#fff", padding: "12px", borderRadius: "10px", fontWeight: 600, fontSize: "0.875rem", border: "none", cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit"}}>
          {loading ? "Creating account..." : "Join Konek"}
        </button>
        <p style={{textAlign: "center", fontSize: "0.75rem", color: "#888", paddingBottom: "16px"}}>
          Already have an account?{" "}
          <Link href="/login" style={{color: "#1D9E75", fontWeight: 600, textDecoration: "none"}}>Log in</Link>
        </p>
      </form>
    </div>
  );
}