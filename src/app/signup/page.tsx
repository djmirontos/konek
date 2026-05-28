'use client'
import { useState } from "react";
import { createClient } from "@/lib/supabase";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    school: "Tangub City Global College",
  });
  const [idFile, setIdFile] = useState<File | null>(null);
  const [idPreview, setIdPreview] = useState("");

  const schools = [
    "Tangub City Global College",
    "Tangub City National High School",
    "Saint Michael High School",
    "Northern Mindanao College of Science and Technology",
    "Misamis University",
    "Misamis Institute of Technology",
    "La Salle Academy Tangub",
    "Medina College",
  ];

  const handleIdUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError("ID photo must be less than 2MB");
        return;
      }
      setIdFile(file);
      setIdPreview(URL.createObjectURL(file));
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!idFile) {
      setError("Please upload your Student ID photo");
      return;
    }
    setLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
      });
      if (authError) throw authError;
      if (!authData.user) throw new Error("Signup failed");

      const fileExt = idFile.name.split(".").pop();
      const filePath = `${authData.user.id}/student-id.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("konek-images")
        .upload(filePath, idFile);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("konek-images")
        .getPublicUrl(filePath);

      const { error: profileError } = await supabase.from("users").insert({
        id: authData.user.id,
        full_name: form.full_name,
        email: form.email,
        student_id_url: urlData.publicUrl,
        is_verified: true,
      });
      if (profileError) throw profileError;

      router.push("/feeds");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div className="page-header">
        <Link href="/">
          <Image src="/konek.svg" alt="Konek" width={160} height={88} priority />
        </Link>
        <p className="page-header-title">Create your account</p>
        <p className="page-header-sub">Tangub City students only</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSignup} className="flex-1 px-6 py-6 space-y-4">
        {error && <div className="alert-error">{error}</div>}

        <div>
          <label className="input-label">Full Name</label>
          <input
            type="text"
            required
            placeholder="Juan dela Cruz"
            value={form.full_name}
            onChange={(e) => setForm({...form, full_name: e.target.value})}
            className="input-field"
          />
        </div>

        <div>
          <label className="input-label">Email</label>
          <input
            type="email"
            required
            placeholder="juan@email.com"
            value={form.email}
            onChange={(e) => setForm({...form, email: e.target.value})}
            className="input-field"
          />
        </div>

        <div>
          <label className="input-label">Password</label>
          <input
            type="password"
            required
            placeholder="Min. 6 characters"
            value={form.password}
            onChange={(e) => setForm({...form, password: e.target.value})}
            className="input-field"
          />
        </div>

        <div>
          <label className="input-label">School</label>
          <select
            value={form.school}
            onChange={(e) => setForm({...form, school: e.target.value})}
            className="input-field"
          >
            {schools.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="input-label">Student ID Photo</label>
          <label className="upload-box">
            {idPreview ? (
              <Image src={idPreview} alt="ID Preview" width={200} height={120} className="rounded-lg object-cover" />
            ) : (
              <>
                <span className="text-3xl mb-2">🪪</span>
                <span className="upload-box-title">Tap to upload your Student ID</span>
                <span className="upload-box-sub">JPG or PNG · max 2MB · auto-approved</span>
              </>
            )}
            <input type="file" accept="image/*" className="hidden" onChange={handleIdUpload} />
          </label>
        </div>

        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? "Creating account..." : "Join Konek"}
        </button>

        <p className="text-center text-xs pb-6" style={{color: "var(--color-text-secondary)"}}>
          Already have an account?{" "}
          <Link href="/login" className="font-semibold" style={{color: "var(--color-primary)"}}>
            Log in
          </Link>
        </p>
      </form>
    </div>
  );
}
