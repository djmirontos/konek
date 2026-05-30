'use client'
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

const OTHER_SCHOOL_ID = "00000000-0000-0000-0000-000000009998";
const GUEST_COMMUNITY_ID = "00000000-0000-0000-0000-000000009999";

type School = { id: string; name: string; abbreviation: string; };

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // step
  const [step, setStep] = useState<1 | 2>(1);

  // step 1 fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // step 2 fields
  const [schools, setSchools] = useState<School[]>([]);
  const [schoolSearch, setSchoolSearch] = useState("");
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [showSchoolList, setShowSchoolList] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");

  // school request modal
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestForm, setRequestForm] = useState({ school_name: "", city: "", province: "", notes: "" });
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState(false);

  // shared
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.from("schools").select("id, name, abbreviation").order("name").then(({ data }) => {
      if (data) setSchools(data);
    });
  }, []);

  const filteredSchools = schools.filter(s =>
    s.name.toLowerCase().includes(schoolSearch.toLowerCase()) ||
    s.abbreviation.toLowerCase().includes(schoolSearch.toLowerCase())
  );

  function validateStep1(): boolean {
    if (!firstName.trim()) { setError("Please enter your first name"); return false; }
    if (!lastName.trim()) { setError("Please enter your last name"); return false; }
    if (!phone.trim()) { setError("Please enter your phone number"); return false; }
    if (!/^09\d{9}$/.test(phone.trim())) { setError("Phone number must be in format 09XXXXXXXXX (11 digits)"); return false; }
    if (!password || password.length < 6) { setError("Password must be at least 6 characters"); return false; }
    return true;
  }

  function handleNext() {
    setError("");
    if (validateStep1()) setStep(2);
  }

  function handleAvatarSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError("Avatar must be under 5MB"); return; }
    setAvatarFile(file);
    setAvatarPreview(prev => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(file); });
  }

  function selectSchool(school: School) {
    setSelectedSchool(school);
    setSchoolSearch(school.name);
    setShowSchoolList(false);
  }

  function selectFallback(type: "other" | "guest") {
    const id = type === "other" ? OTHER_SCHOOL_ID : GUEST_COMMUNITY_ID;
    const name = type === "other" ? "Other School" : "Guest Community";
    const abbreviation = type === "other" ? "OTHER" : "GUEST";
    setSelectedSchool({ id, name, abbreviation });
    setSchoolSearch(name);
    setShowSchoolList(false);
  }

  async function handleRequestSchool() {
    if (!requestForm.school_name.trim() || !requestForm.city.trim() || !requestForm.province.trim()) {
      setError("Please fill in school name, city, and province"); return;
    }
    setRequestSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("school_requests").insert({
        school_name: requestForm.school_name.trim(),
        city: requestForm.city.trim(),
        province: requestForm.province.trim(),
        notes: requestForm.notes.trim() || null,
        requested_by_user_id: user?.id || null,
      });
      setRequestSuccess(true);
    } catch {
      setError("Failed to submit request. Please try again.");
    } finally {
      setRequestSubmitting(false);
    }
  }

  async function handleSignup() {
    setError("");
    if (!selectedSchool) { setError("Please select your school"); return; }
    setLoading(true);
    try {
      const cleanPhone = phone.trim();
      const placeholderEmail = email.trim() || (cleanPhone + "@konek.app");
      const fullName = firstName.trim() + " " + lastName.trim();

      // create auth account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: placeholderEmail,
        password: password,
      });
      if (authError) throw authError;
      if (!authData.user) throw new Error("Signup failed. Please try again.");

      // wait for session
      let session = authData.session;
      if (!session) {
        await new Promise(res => setTimeout(res, 1500));
        const { data: sessionData } = await supabase.auth.getSession();
        session = sessionData.session;
      }
      if (!session) throw new Error("Session not ready. Please try logging in.");

      // upload avatar if provided
      let avatarUrl: string | null = null;
      if (avatarFile) {
        const ext = avatarFile.name.split(".").pop();
        const path = "avatars/" + authData.user.id + "/avatar." + ext;
        const { error: uploadError } = await supabase.storage.from("konek-images").upload(path, avatarFile);
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from("konek-images").getPublicUrl(path);
          avatarUrl = urlData.publicUrl;
        }
      }

      // insert user profile
      const { error: profileError } = await supabase.from("users").insert({
        id: authData.user.id,
        full_name: fullName,
        email: email.trim() || null,
        phone_number: cleanPhone,
        school_id: selectedSchool.id,
        avatar_url: avatarUrl,
        verification_status: "unverified",
        is_verified: false,
        is_banned: false,
        ban_count: 0,
        role: "student",
      });
      if (profileError) throw profileError;

      router.push("/feeds");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", backgroundColor: "#F7F7F7", border: "1px solid #F0F0F0",
    borderRadius: "10px", padding: "12px 14px", fontSize: "0.875rem", color: "#1A1A1A",
    outline: "none", fontFamily: "inherit", boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = {
    fontSize: "0.68rem", fontWeight: 600, color: "#888",
    textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "5px", display: "block",
  };

  return (
    <div style={{minHeight: "100vh", background: "#fff", display: "flex", flexDirection: "column", maxWidth: "480px", margin: "0 auto", fontFamily: "'Plus Jakarta Sans', sans-serif"}}>

      {/* HEADER */}
      <div style={{backgroundColor: "#1D9E75", padding: "24px 24px 20px", textAlign: "center"}}>
        <Link href="/"><Image src="/konek.svg" alt="Konek" width={120} height={66} priority /></Link>
        <p style={{color: "#fff", fontWeight: 700, fontSize: "1rem", marginTop: "8px", marginBottom: "2px"}}>Create your account</p>
        <p style={{fontSize: "0.78rem", color: "rgba(255,255,255,0.8)", margin: 0}}>Your campus. Your community.</p>
      </div>

      {/* STEP INDICATOR */}
      <div style={{display: "flex", alignItems: "center", padding: "16px 24px 0", gap: "8px"}}>
        <div style={{flex: 1, height: "3px", borderRadius: "2px", backgroundColor: "#1D9E75"}}></div>
        <div style={{flex: 1, height: "3px", borderRadius: "2px", backgroundColor: step === 2 ? "#1D9E75" : "#F0F0F0"}}></div>
        <span style={{fontSize: "0.7rem", color: "#888", fontWeight: 600, whiteSpace: "nowrap"}}>Step {step} of 2</span>
      </div>

      <div style={{flex: 1, padding: "20px 24px 32px", display: "flex", flexDirection: "column", gap: "14px"}}>

        {error && (
          <div style={{backgroundColor: "#FEF2F2", border: "1px solid #FCA5A5", color: "#EF4444", fontSize: "0.8rem", padding: "10px 14px", borderRadius: "10px"}}>
            {error}
          </div>
        )}

        {/* ===== STEP 1 ===== */}
        {step === 1 && (
          <>
            <div style={{marginBottom: "4px"}}>
              <div style={{fontWeight: 700, fontSize: "1.1rem", color: "#1A1A1A"}}>Who are you?</div>
              <div style={{fontSize: "0.8rem", color: "#888", marginTop: "2px"}}>Tell us a little about yourself</div>
            </div>

            <div style={{display: "flex", gap: "10px"}}>
              <div style={{flex: 1}}>
                <label style={labelStyle}>First Name</label>
                <input type="text" placeholder="Juan" value={firstName}
                  onChange={e => { setFirstName(e.target.value); setError(""); }}
                  style={inputStyle} />
              </div>
              <div style={{flex: 1}}>
                <label style={labelStyle}>Last Name</label>
                <input type="text" placeholder="dela Cruz" value={lastName}
                  onChange={e => { setLastName(e.target.value); setError(""); }}
                  style={inputStyle} />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Phone Number <span style={{color: "#EF4444"}}>*</span></label>
              <input type="tel" placeholder="09XXXXXXXXX" value={phone} maxLength={11}
                onChange={e => { setPhone(e.target.value.replace(/\D/g, "")); setError(""); }}
                style={inputStyle} />
              <div style={{fontSize: "0.68rem", color: "#888", marginTop: "4px"}}>This is your login identity. No verification SMS yet.</div>
            </div>

            <div>
              <label style={labelStyle}>Email <span style={{color: "#1D9E75", fontWeight: 400, textTransform: "none", fontSize: "0.68rem"}}>(Optional — for future password recovery)</span></label>
              <input type="email" placeholder="juan@email.com (optional)" value={email}
                onChange={e => { setEmail(e.target.value); setError(""); }}
                style={inputStyle} />
            </div>

            <div>
              <label style={labelStyle}>Password <span style={{color: "#EF4444"}}>*</span></label>
              <div style={{position: "relative"}}>
                <input type={showPassword ? "text" : "password"} placeholder="Min. 6 characters" value={password}
                  onChange={e => { setPassword(e.target.value); setError(""); }}
                  style={{...inputStyle, paddingRight: "44px"}} />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  style={{position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: "0.8rem", color: "#888", fontFamily: "inherit"}}>
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <button onClick={handleNext}
              style={{width: "100%", backgroundColor: "#1D9E75", color: "#fff", padding: "13px", borderRadius: "10px", fontWeight: 700, fontSize: "0.9rem", border: "none", cursor: "pointer", fontFamily: "inherit", marginTop: "6px"}}>
              Next →
            </button>

            <p style={{textAlign: "center", fontSize: "0.75rem", color: "#888"}}>
              Already have an account?{" "}
              <Link href="/login" style={{color: "#1D9E75", fontWeight: 700, textDecoration: "none"}}>Log in</Link>
            </p>
          </>
        )}

        {/* ===== STEP 2 ===== */}
        {step === 2 && (
          <>
            <div style={{marginBottom: "4px"}}>
              <div style={{fontWeight: 700, fontSize: "1.1rem", color: "#1A1A1A"}}>Your School</div>
              <div style={{fontSize: "0.8rem", color: "#888", marginTop: "2px"}}>Search and select your school</div>
            </div>

            {/* SCHOOL SEARCH */}
            <div style={{position: "relative"}}>
              <label style={labelStyle}>School <span style={{color: "#EF4444"}}>*</span></label>
              <input type="text" placeholder="Search school name or abbreviation..."
                value={schoolSearch}
                onChange={e => { setSchoolSearch(e.target.value); setShowSchoolList(true); setSelectedSchool(null); setError(""); }}
                onFocus={() => setShowSchoolList(true)}
                style={inputStyle} />

              {showSchoolList && (
                <div style={{position: "absolute", top: "100%", left: 0, right: 0, backgroundColor: "#fff", border: "1px solid #F0F0F0", borderRadius: "10px", boxShadow: "0 4px 20px rgba(0,0,0,0.1)", zIndex: 200, maxHeight: "220px", overflowY: "auto", marginTop: "4px"}}>

                  {filteredSchools.filter(s => s.id !== OTHER_SCHOOL_ID && s.id !== GUEST_COMMUNITY_ID).length === 0 && schoolSearch.length > 0 ? (
                    <div style={{padding: "14px 16px", fontSize: "0.82rem", color: "#888", textAlign: "center"}}>No school found for "{schoolSearch}"</div>
                  ) : (
                    filteredSchools.filter(s => s.id !== OTHER_SCHOOL_ID && s.id !== GUEST_COMMUNITY_ID).map(school => (
                      <div key={school.id} onClick={() => selectSchool(school)}
                        style={{padding: "12px 16px", cursor: "pointer", borderBottom: "1px solid #F0F0F0", fontSize: "0.85rem", color: "#1A1A1A", fontWeight: selectedSchool?.id === school.id ? 700 : 400, backgroundColor: selectedSchool?.id === school.id ? "#E1F5EE" : "#fff"}}>
                        <div>{school.name}</div>
                        <div style={{fontSize: "0.7rem", color: "#888"}}>{school.abbreviation}</div>
                      </div>
                    ))
                  )}

                  {/* FALLBACK OPTIONS */}
                  <div style={{borderTop: "2px solid #F0F0F0", backgroundColor: "#F7F7F7"}}>
                    <div style={{padding: "8px 16px 4px", fontSize: "0.65rem", fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em"}}>Can't find your school?</div>
                    <div onClick={() => { setShowRequestModal(true); setShowSchoolList(false); }}
                      style={{padding: "10px 16px", cursor: "pointer", fontSize: "0.82rem", color: "#1D9E75", fontWeight: 700, display: "flex", alignItems: "center", gap: "8px"}}>
                      <span>📋</span> Request Your School
                    </div>
                    <div onClick={() => selectFallback("other")}
                      style={{padding: "10px 16px", cursor: "pointer", fontSize: "0.82rem", color: "#1A1A1A", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px", borderTop: "1px solid #F0F0F0"}}>
                      <span>🏫</span> Other School
                    </div>
                    <div onClick={() => selectFallback("guest")}
                      style={{padding: "10px 16px", cursor: "pointer", fontSize: "0.82rem", color: "#1A1A1A", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px", borderTop: "1px solid #F0F0F0"}}>
                      <span>🌐</span> Guest Community
                    </div>
                  </div>
                </div>
              )}
            </div>

            {selectedSchool && (
              <div style={{backgroundColor: "#E1F5EE", borderRadius: "10px", padding: "10px 14px", display: "flex", alignItems: "center", gap: "10px"}}>
                <span style={{fontSize: "1.2rem"}}>✅</span>
                <div>
                  <div style={{fontSize: "0.82rem", fontWeight: 700, color: "#0F6E56"}}>{selectedSchool.name}</div>
                  <div style={{fontSize: "0.7rem", color: "#1D9E75"}}>{selectedSchool.abbreviation}</div>
                </div>
              </div>
            )}

            {/* AVATAR */}
            <div>
              <label style={labelStyle}>Profile Photo <span style={{color: "#1D9E75", fontWeight: 400, textTransform: "none", fontSize: "0.68rem"}}>(Optional)</span></label>
              <div style={{display: "flex", alignItems: "center", gap: "16px", marginTop: "4px"}}>
                <div style={{width: "64px", height: "64px", borderRadius: "50%", backgroundColor: "#F0F0F0", overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.6rem"}}>
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="avatar" style={{width: "100%", height: "100%", objectFit: "cover"}} />
                  ) : "👤"}
                </div>
                <div style={{flex: 1}}>
                  <button type="button" onClick={() => avatarInputRef.current?.click()}
                    style={{backgroundColor: "#F7F7F7", border: "1px solid #F0F0F0", borderRadius: "10px", padding: "9px 16px", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", color: "#1A1A1A"}}>
                    {avatarFile ? "Change Photo" : "Upload Photo"}
                  </button>
                  {avatarFile && (
                    <button type="button" onClick={() => { setAvatarFile(null); setAvatarPreview(""); }}
                      style={{background: "none", border: "none", color: "#EF4444", fontSize: "0.75rem", cursor: "pointer", fontFamily: "inherit", marginLeft: "10px", fontWeight: 600}}>
                      Remove
                    </button>
                  )}
                  <div style={{fontSize: "0.68rem", color: "#888", marginTop: "4px"}}>You can add this later in your profile</div>
                </div>
                <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png" style={{display: "none"}} onChange={handleAvatarSelect} />
              </div>
            </div>

            {error && (
              <div style={{backgroundColor: "#FEF2F2", border: "1px solid #FCA5A5", color: "#EF4444", fontSize: "0.8rem", padding: "10px 14px", borderRadius: "10px"}}>
                {error}
              </div>
            )}

            <div style={{display: "flex", gap: "10px", marginTop: "6px"}}>
              <button onClick={() => { setStep(1); setError(""); }}
                style={{flex: 1, backgroundColor: "#F7F7F7", color: "#1A1A1A", padding: "13px", borderRadius: "10px", fontWeight: 700, fontSize: "0.9rem", border: "1px solid #F0F0F0", cursor: "pointer", fontFamily: "inherit"}}>
                ← Back
              </button>
              <button onClick={handleSignup} disabled={loading}
                style={{flex: 2, backgroundColor: loading ? "#ccc" : "#1D9E75", color: "#fff", padding: "13px", borderRadius: "10px", fontWeight: 700, fontSize: "0.9rem", border: "none", cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit"}}>
                {loading ? "Creating account..." : "Join Konek 🎉"}
              </button>
            </div>

            <p style={{textAlign: "center", fontSize: "0.72rem", color: "#888", marginTop: "4px"}}>
              By joining, you agree to keep Konek safe and respectful for everyone.
            </p>
          </>
        )}
      </div>

      {/* REQUEST SCHOOL MODAL */}
      {showRequestModal && (
        <>
          <div onClick={() => { setShowRequestModal(false); setRequestSuccess(false); }}
            style={{position: "fixed", inset: 0, zIndex: 400, backgroundColor: "rgba(0,0,0,0.4)"}} />
          <div style={{position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "min(480px, 100vw)", backgroundColor: "#fff", borderRadius: "20px 20px 0 0", zIndex: 500, padding: "20px 20px 40px"}}>
            <div style={{width: "40px", height: "4px", backgroundColor: "#E0E0E0", borderRadius: "2px", margin: "0 auto 16px"}}></div>

            {requestSuccess ? (
              <div style={{textAlign: "center", padding: "20px 0"}}>
                <div style={{fontSize: "3rem", marginBottom: "12px"}}>🎉</div>
                <div style={{fontWeight: 700, fontSize: "1rem", color: "#1A1A1A", marginBottom: "8px"}}>Request Submitted!</div>
                <div style={{fontSize: "0.85rem", color: "#888", lineHeight: 1.5, marginBottom: "20px"}}>
                  Thank you! We'll review and add your school soon. For now, you can join as Other School or Guest Community.
                </div>
                <div style={{display: "flex", gap: "10px"}}>
                  <button onClick={() => { selectFallback("other"); setShowRequestModal(false); setRequestSuccess(false); }}
                    style={{flex: 1, padding: "11px", borderRadius: "10px", border: "1px solid #F0F0F0", backgroundColor: "#F7F7F7", color: "#1A1A1A", fontWeight: 600, fontSize: "0.82rem", cursor: "pointer", fontFamily: "inherit"}}>
                    🏫 Other School
                  </button>
                  <button onClick={() => { selectFallback("guest"); setShowRequestModal(false); setRequestSuccess(false); }}
                    style={{flex: 1, padding: "11px", borderRadius: "10px", border: "none", backgroundColor: "#1D9E75", color: "#fff", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer", fontFamily: "inherit"}}>
                    🌐 Guest Community
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div style={{fontWeight: 700, fontSize: "1rem", color: "#1A1A1A", marginBottom: "4px"}}>Request Your School</div>
                <div style={{fontSize: "0.8rem", color: "#888", marginBottom: "16px"}}>We'll add it to Konek as soon as possible.</div>

                <div style={{display: "flex", flexDirection: "column", gap: "12px"}}>
                  <div>
                    <label style={labelStyle}>School Name <span style={{color: "#EF4444"}}>*</span></label>
                    <input type="text" placeholder="e.g. Tangub City Global College"
                      value={requestForm.school_name}
                      onChange={e => setRequestForm({...requestForm, school_name: e.target.value})}
                      style={inputStyle} />
                  </div>
                  <div style={{display: "flex", gap: "10px"}}>
                    <div style={{flex: 1}}>
                      <label style={labelStyle}>City / Municipality <span style={{color: "#EF4444"}}>*</span></label>
                      <input type="text" placeholder="e.g. Tangub City"
                        value={requestForm.city}
                        onChange={e => setRequestForm({...requestForm, city: e.target.value})}
                        style={inputStyle} />
                    </div>
                    <div style={{flex: 1}}>
                      <label style={labelStyle}>Province <span style={{color: "#EF4444"}}>*</span></label>
                      <input type="text" placeholder="e.g. Misamis Occidental"
                        value={requestForm.province}
                        onChange={e => setRequestForm({...requestForm, province: e.target.value})}
                        style={inputStyle} />
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Notes <span style={{color: "#888", fontWeight: 400, textTransform: "none", fontSize: "0.68rem"}}>(Optional)</span></label>
                    <input type="text" placeholder="Any additional info about your school"
                      value={requestForm.notes}
                      onChange={e => setRequestForm({...requestForm, notes: e.target.value})}
                      style={inputStyle} />
                  </div>
                </div>

                <div style={{display: "flex", gap: "10px", marginTop: "16px"}}>
                  <button onClick={() => setShowRequestModal(false)}
                    style={{flex: 1, padding: "12px", borderRadius: "10px", border: "1px solid #F0F0F0", backgroundColor: "#F7F7F7", color: "#888", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer", fontFamily: "inherit"}}>
                    Cancel
                  </button>
                  <button onClick={handleRequestSchool} disabled={requestSubmitting}
                    style={{flex: 2, padding: "12px", borderRadius: "10px", border: "none", backgroundColor: requestSubmitting ? "#ccc" : "#1D9E75", color: "#fff", fontWeight: 700, fontSize: "0.85rem", cursor: requestSubmitting ? "not-allowed" : "pointer", fontFamily: "inherit"}}>
                    {requestSubmitting ? "Submitting..." : "Submit Request"}
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* CLOSE SCHOOL LIST ON OUTSIDE CLICK */}
      {showSchoolList && (
        <div onClick={() => setShowSchoolList(false)} style={{position: "fixed", inset: 0, zIndex: 100}} />
      )}
    </div>
  );
}
