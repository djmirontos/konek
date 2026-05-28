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
    school: "Tangub City",
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
    <div className="min-h-screen bg-white flex flex-col max-w-lg mx-auto">
      {/* Header */}
      <div style={{backgroundColor: "#1D9E75"}} className="px-6 pt-12 pb-8 text-center">
        <Link href="/">
          <Image src="/konek.svg" alt="Konek" width={160} height={88} priority />
        </Link>
        <p className="text-white font-semibold text-lg mt-2">Create your account</p>
        <p className="text-sm mt-1" style={{color: "rgba(255,255,255,0.8)"}}>Tangub City students only</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSignup} className="flex-1 px-6 py-6 space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        <div>
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Full Name</label>
          <input
            type="text"
            required
            placeholder="Juan dela Cruz"
            value={form.full_name}
            onChange={(e) => setForm({...form, full_name: e.target.value})}
            className="mt-1 w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:border-green-500"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Email</label>
          <input
            type="email"
            required
            placeholder="juan@email.com"
            value={form.email}
            onChange={(e) => setForm({...form, email: e.target.value})}
            className="mt-1 w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:border-green-500"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Password</label>
          <input
            type="password"
            required
            placeholder="Min. 6 characters"
            value={form.password}
            onChange={(e) => setForm({...form, password: e.target.value})}
            className="mt-1 w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:border-green-500"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">School</label>
          <select
            value={form.school}
            onChange={(e) => setForm({...form, school: e.target.value})}
            className="mt-1 w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:border-green-500"
          >
            {schools.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Student ID Photo</label>
          <label className="mt-1 flex flex-col items-center justify-center w-full border-2 border-dashed rounded-xl p-4 cursor-pointer" style={{borderColor: "#1D9E75", backgroundColor: "#E1F5EE"}}>
            {idPreview ? (
              <Image src={idPreview} alt="ID Preview" width={200} height={120} className="rounded-lg object-cover" />
            ) : (
              <>
                <span className="text-3xl mb-2">🪪</span>
                <span className="text-sm font-semibold" style={{color: "#0F6E56"}}>Tap to upload your Student ID</span>
                <span className="text-xs text-gray-400 mt-1">JPG or PNG · max 2MB </span>
              </>
            )}
            <input type="file" accept="image/*" className="hidden" onChange={handleIdUpload} />
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full text-white py-3 rounded-xl font-semibold text-sm"
          style={{backgroundColor: "#1D9E75"}}
        >
          {loading ? "Creating account..." : "Join Konek"}
        </button>

        <p className="text-center text-xs text-gray-400 pb-6">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold" style={{color: "#1D9E75"}}>
            Log in
          </Link>
        </p>
      </form>
    </div>
  );
}
