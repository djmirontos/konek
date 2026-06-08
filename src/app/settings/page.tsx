'use client'
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";

type SettingsUser = {
  id: string; full_name: string; avatar_url: string | null;
  phone_number: string | null; school_id: string; role: string;
  show_online_status: boolean;
  privacy_settings: Record<string, string>;
  verification_status: string | null;
};

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [currentUser, setCurrentUser] = useState<SettingsUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [unreadMessages, setUnreadMessages] = useState(0);

  const [privacySettings, setPrivacySettings] = useState<Record<string, string>>({
    phone: "private", email: "private", birthdate: "school_only",
    course: "public", year_level: "public", hometown: "public"
  });
  const [savingPrivacy, setSavingPrivacy] = useState(false);

  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  const [showBlockedUsers, setShowBlockedUsers] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [showPushNotif, setShowPushNotif] = useState(true);
  const [showMsgRequests, setShowMsgRequests] = useState(true);

  useEffect(() => { initPage(); }, []);

  async function initPage() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    const { data } = await supabase.from("users").select("*").eq("id", user.id).single();
    if (data) {
      setCurrentUser(data);
      if (data.privacy_settings) setPrivacySettings(data.privacy_settings);
    }
    setLoading(false);
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  async function handleSavePrivacy(field: string, value: string) {
    if (!currentUser) return;
    setSavingPrivacy(true);
    const updated = { ...privacySettings, [field]: value };
    setPrivacySettings(updated);
    await supabase.from("users").update({ privacy_settings: updated }).eq("id", currentUser.id);
    setSavingPrivacy(false);
    showToast("Privacy updated!");
  }

  async function handleToggleOnlineStatus() {
    if (!currentUser) return;
    const newVal = !currentUser.show_online_status;
    await supabase.from("users").update({ show_online_status: newVal }).eq("id", currentUser.id);
    setCurrentUser(prev => prev ? { ...prev, show_online_status: newVal } : prev);
    showToast(newVal ? "Online status visible" : "Online status hidden");
  }

  async function handleChangePassword() {
    setPasswordError("");
    if (!currentPassword.trim()) { setPasswordError("Enter your current password."); return; }
    if (newPassword.length < 6) { setPasswordError("New password must be at least 6 characters."); return; }
    if (newPassword !== confirmPassword) { setPasswordError("Passwords do not match."); return; }
    if (!currentUser) return;
    setChangingPassword(true);
    try {
      const phone = currentUser.phone_number || "";
      const cleanPhone = phone.replace(/\D/g, "").replace(/^63/, "0");
      const email = cleanPhone + "@konek.app";
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
      if (signInError) { setPasswordError("Current password is incorrect."); setChangingPassword(false); return; }
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;
      setShowChangePassword(false);
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      showToast("Password changed successfully!");
    } catch {
      setPasswordError("Failed to change password. Try again.");
    } finally {
      setChangingPassword(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  function getVerificationLabel() {
    if (!currentUser) return "Not verified";
    if (currentUser.verification_status === "approved") return "Verified ✅";
    if (currentUser.verification_status === "pending") return "Under review ⏳";
    if (currentUser.verification_status === "rejected") return "Action required ⚠️";
    return "Not verified";
  }

  if (loading) {
    return (
      <div style={{minHeight: "100vh", background: "#F7F7F7", display: "flex", flexDirection: "column", maxWidth: "480px", margin: "0 auto", fontFamily: "'Plus Jakarta Sans', sans-serif", alignItems: "center", justifyContent: "center"}}>
        <div style={{width: "24px", height: "24px", border: "2px solid #E0E0E0", borderTopColor: "#2BB39A", borderRadius: "50%", animation: "spin 0.8s linear infinite"}} />
      </div>
    );
  }

  const Toggle = ({ on, onToggle }: { on: boolean; onToggle: () => void }) => (
    <button onClick={onToggle}
      style={{width: "44px", height: "24px", borderRadius: "12px", border: "none", cursor: "pointer",
        backgroundColor: on ? "#2BB39A" : "#E0E0E0", position: "relative", flexShrink: 0, transition: "background-color 0.2s"}}>
      <div style={{position: "absolute", top: "2px", width: "20px", height: "20px", borderRadius: "50%",
        backgroundColor: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.2)", transition: "left 0.2s",
        left: on ? "22px" : "2px"}} />
    </button>
  );

  const SectionLabel = ({ text }: { text: string }) => (
    <div style={{fontSize: "0.72rem", fontWeight: 600, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.07em", padding: "16px 16px 6px"}}>{text}</div>
  );

  const Card = ({ children }: { children: React.ReactNode }) => (
    <div style={{backgroundColor: "#fff", borderRadius: "14px", overflow: "hidden", border: "1px solid #F0F0F0", margin: "0 16px"}}>
      {children}
    </div>
  );

  const Row = ({ icon, iconBg, title, subtitle, right, onClick, danger }: {
    icon: string; iconBg?: string; title: string; subtitle?: string;
    right?: React.ReactNode; onClick?: () => void; danger?: boolean;
  }) => (
    <div onClick={onClick}
      style={{display: "flex", alignItems: "center", gap: "14px", padding: "13px 16px",
        borderBottom: "1px solid #F8F8F8", cursor: onClick ? "pointer" : "default",
        backgroundColor: "#fff"}}>
      <img src={icon} alt="" style={{width: "22px", height: "22px", objectFit: "contain", flexShrink: 0, opacity: danger ? 1 : 0.75}} />
      <div style={{flex: 1, minWidth: 0}}>
        <div style={{fontSize: "0.875rem", fontWeight: 600, color: danger ? "#EF4444" : "#1A1A1A"}}>{title}</div>
        {subtitle && <div style={{fontSize: "0.72rem", color: "#aaa", marginTop: "1px"}}>{subtitle}</div>}
      </div>
      {right}
    </div>
  );

  return (
    <div style={{minHeight: "100vh", background: "#F7F7F7", display: "flex", flexDirection: "column", maxWidth: "480px", margin: "0 auto", fontFamily: "'Plus Jakarta Sans', sans-serif"}}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {toast && (
        <div style={{position: "fixed", top: "70px", left: "50%", transform: "translateX(-50%)", backgroundColor: "#1A1A1A", color: "#fff", padding: "10px 20px", borderRadius: "20px", fontSize: "0.8rem", fontWeight: 600, zIndex: 1000, whiteSpace: "nowrap"}}>
          {toast}
        </div>
      )}

      {/* TOPBAR */}
      <div style={{backgroundColor: "#2BB39A", padding: "12px 16px", display: "flex", alignItems: "center", gap: "12px", position: "sticky", top: 0, zIndex: 100}}>
        <button onClick={() => router.back()} style={{background: "none", border: "none", cursor: "pointer", color: "#fff", fontSize: "1.4rem", padding: "2px 4px", lineHeight: 1}}>&#8249;</button>
        <span style={{color: "#fff", fontWeight: 700, fontSize: "1rem"}}>Settings</span>
      </div>

      <div style={{flex: 1, paddingBottom: "80px"}}>

        {/* ACCOUNT */}
        <SectionLabel text="Account" />
        <Card>
          <Row icon="/icon/edit_black.png" iconBg="#EAF3DE" title="Edit profile" subtitle="Name, bio, course, hometown"
            right={<span style={{fontSize: "1rem", color: "#ccc"}}>›</span>}
            onClick={() => router.push("/profile/" + currentUser?.id + "?edit=true")} />
          <Row icon="/icon/phone_black.png" iconBg="#EAF3DE" title="Phone number" subtitle={currentUser?.phone_number || "Not set"}
            right={<span style={{fontSize: "1rem", color: "#ccc"}}>›</span>}
            onClick={() => router.push("/profile/" + currentUser?.id + "?edit=true")} />
          <Row icon="/icon/password_black.png" iconBg="#EAF3DE" title="Change password"
            right={<span style={{fontSize: "1rem", color: "#ccc"}}>›</span>}
            onClick={() => setShowChangePassword(true)} />
          <Row icon="/icon/verify_black.png" iconBg="#E6F1FB" title="Student verification" subtitle={getVerificationLabel()}
            right={<span style={{fontSize: "1rem", color: "#ccc"}}>›</span>}
            onClick={() => router.push("/profile/" + currentUser?.id + "?verify=true")} />
        </Card>

        {/* PRIVACY */}
        <SectionLabel text="Privacy" />
        <Card>
          <div style={{padding: "13px 14px", borderBottom: "1px solid #F8F8F8"}}>
            <div style={{display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px"}}>
              <img src="/icon/visibility_black.png" alt="" style={{width: "22px", height: "22px", objectFit: "contain", flexShrink: 0, opacity: 0.75}} />
              <div style={{flex: 1}}>
                <div style={{fontSize: "0.875rem", fontWeight: 600, color: "#1A1A1A"}}>Profile visibility</div>
                <div style={{fontSize: "0.72rem", color: "#aaa"}}>Who can see your info</div>
              </div>
            </div>
            <div style={{display: "flex", flexDirection: "column", gap: "10px", paddingLeft: "46px"}}>
              {[
                { field: "phone", label: "Phone Number", icon: "/icon/phone_black.png" },
                { field: "birthdate", label: "Birthday", icon: "/icon/birthday_black.png" },
                { field: "course", label: "Course & Year", icon: "/icon/course_black.png" },
                { field: "hometown", label: "Hometown", icon: "/icon/living_black.png" },
              ].map(item => (
                <div key={item.field} style={{display: "flex", justifyContent: "space-between", alignItems: "center"}}>
                  <div style={{display: "flex", alignItems: "center", gap: "6px"}}>
                    <img src={item.icon} alt="" style={{width: "16px", height: "16px", objectFit: "contain", opacity: 0.6}} />
                    <span style={{fontSize: "0.8rem", color: "#555"}}>{item.label}</span>
                  </div>
                  <select value={privacySettings[item.field] || "public"}
                    onChange={e => handleSavePrivacy(item.field, e.target.value)}
                    disabled={savingPrivacy}
                    style={{fontSize: "0.75rem", fontWeight: 600, color: "#2BB39A", border: "1px solid #E0E0E0", borderRadius: "8px", padding: "4px 8px", backgroundColor: "#F7F7F7", cursor: "pointer", fontFamily: "inherit", outline: "none"}}>
                    <option value="public">Public</option>
                    <option value="school_only">School Only</option>
                    <option value="private">Private</option>
                  </select>
                </div>
              ))}
            </div>
          </div>
          <Row icon="/icon/online.png" iconBg="#EEEDFE" title="Show online status" subtitle="Let classmates see when you're active"
            right={<Toggle on={currentUser?.show_online_status !== false} onToggle={handleToggleOnlineStatus} />} />
          <Row icon="/icon/blockuser_black.png" iconBg="#EEEDFE" title="Blocked users"
            right={<span style={{fontSize: "1rem", color: "#ccc"}}>›</span>}
            onClick={() => setShowBlockedUsers(true)} />
        </Card>

        {/* NOTIFICATIONS */}
        <SectionLabel text="Notifications" />
        <Card>
          <Row icon="/icon/notification_black.png" iconBg="#FAEEDA" title="Push notifications" subtitle="Messages, reactions, comments"
            right={<Toggle on={showPushNotif} onToggle={() => { setShowPushNotif(v => !v); showToast(showPushNotif ? "Notifications off" : "Notifications on"); }} />} />
          <Row icon="/icon/chat_black.png" iconBg="#FAEEDA" title="Message requests" subtitle="Notify on new requests"
            right={<Toggle on={showMsgRequests} onToggle={() => { setShowMsgRequests(v => !v); showToast(showMsgRequests ? "Message request notifications off" : "Message request notifications on"); }} />} />
        </Card>

        {/* APPEARANCE */}
        <SectionLabel text="Appearance" />
        <Card>
          <Row icon="/icon/dark_black.png" iconBg="#F1EFE8" title="Dark mode"
            right={<Toggle on={false} onToggle={() => showToast("Dark mode coming soon!")} />} />
        </Card>

        {/* ABOUT */}
        <SectionLabel text="About" />
        <Card>
          <Row icon="/icon/version_black.png" iconBg="#EAF3DE" title="App version" right={<span style={{fontSize: "0.8rem", color: "#aaa"}}>v1.0.0</span>} />
          <Row icon="/icon/terms_black.png" iconBg="#EAF3DE" title="Terms of service"
            right={<span style={{fontSize: "1rem", color: "#ccc"}}>›</span>}
            onClick={() => showToast("Coming soon!")} />
          <Row icon="/icon/icons8-privacy-50.png" iconBg="#EAF3DE" title="Privacy policy"
            right={<span style={{fontSize: "1rem", color: "#ccc"}}>›</span>}
            onClick={() => showToast("Coming soon!")} />
        </Card>

        {/* ADMIN PANEL — admin/mod only */}
        {(currentUser?.role === "admin" || currentUser?.role === "moderator") && (
          <>
            <SectionLabel text="Admin" />
            <div style={{margin: "0 16px"}}>
              <button onClick={() => router.push("/admin")}
                style={{width: "100%", padding: "14px", borderRadius: "14px", border: "1.5px solid #2BB39A", backgroundColor: "#E1F5EE", color: "#2BB39A", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px"}}>
                <img src="/icon/settings_black.png" alt="" style={{width: "20px", height: "20px", objectFit: "contain"}} /> Admin Panel
              </button>
            </div>
          </>
        )}

        {/* DANGER ZONE */}
        <SectionLabel text="Danger zone" />
        <Card>
          <Row icon="/icon/delete_black.png" iconBg="#FCEBEB" title="Delete account" subtitle="This cannot be undone" danger onClick={() => setShowDeleteConfirm(true)} />
        </Card>

        <div style={{height: "16px"}} />
      </div>

      <BottomNav active="/feeds" unreadMessages={unreadMessages} />

      {/* CHANGE PASSWORD SHEET */}
      {showChangePassword && (
        <>
          <div onClick={() => { setShowChangePassword(false); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); setPasswordError(""); }}
            style={{position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", zIndex: 400}} />
          <div style={{position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "min(480px, 100vw)", backgroundColor: "#fff", borderRadius: "20px 20px 0 0", zIndex: 500, padding: "20px 20px 40px"}}>
            <div style={{width: "40px", height: "4px", backgroundColor: "#E0E0E0", borderRadius: "2px", margin: "0 auto 16px"}} />
            <div style={{fontWeight: 700, fontSize: "1rem", color: "#1A1A1A", marginBottom: "4px"}}>Change Password</div>
            <div style={{fontSize: "0.78rem", color: "#888", marginBottom: "20px"}}>Enter your current password, then choose a new one.</div>
            <div style={{marginBottom: "12px"}}>
              <label style={{fontSize: "0.75rem", fontWeight: 600, color: "#888", display: "block", marginBottom: "6px"}}>Current password</label>
              <input type="password" value={currentPassword} onChange={e => { setCurrentPassword(e.target.value); setPasswordError(""); }}
                placeholder="Enter current password"
                style={{width: "100%", border: "1px solid #F0F0F0", borderRadius: "12px", padding: "10px 12px", fontSize: "0.875rem", color: "#1A1A1A", backgroundColor: "#F7F7F7", fontFamily: "inherit", outline: "none", boxSizing: "border-box"}} />
            </div>
            <div style={{marginBottom: "12px"}}>
              <label style={{fontSize: "0.75rem", fontWeight: 600, color: "#888", display: "block", marginBottom: "6px"}}>New password</label>
              <input type="password" value={newPassword} onChange={e => { setNewPassword(e.target.value); setPasswordError(""); }}
                placeholder="At least 6 characters"
                style={{width: "100%", border: "1px solid #F0F0F0", borderRadius: "12px", padding: "10px 12px", fontSize: "0.875rem", color: "#1A1A1A", backgroundColor: "#F7F7F7", fontFamily: "inherit", outline: "none", boxSizing: "border-box"}} />
            </div>
            <div style={{marginBottom: "16px"}}>
              <label style={{fontSize: "0.75rem", fontWeight: 600, color: "#888", display: "block", marginBottom: "6px"}}>Confirm new password</label>
              <input type="password" value={confirmPassword} onChange={e => { setConfirmPassword(e.target.value); setPasswordError(""); }}
                placeholder="Repeat new password"
                style={{width: "100%", border: "1px solid #F0F0F0", borderRadius: "12px", padding: "10px 12px", fontSize: "0.875rem", color: "#1A1A1A", backgroundColor: "#F7F7F7", fontFamily: "inherit", outline: "none", boxSizing: "border-box"}} />
            </div>
            {passwordError && <div style={{color: "#EF4444", fontSize: "0.78rem", marginBottom: "12px"}}>{passwordError}</div>}
            <div style={{display: "flex", gap: "10px"}}>
              <button onClick={() => { setShowChangePassword(false); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); setPasswordError(""); }}
                style={{flex: 1, padding: "12px", borderRadius: "12px", border: "1px solid #F0F0F0", backgroundColor: "#fff", color: "#888", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer", fontFamily: "inherit"}}>Cancel</button>
              <button onClick={handleChangePassword} disabled={changingPassword}
                style={{flex: 1, padding: "12px", borderRadius: "12px", border: "none", backgroundColor: changingPassword ? "#ccc" : "#2BB39A", color: "#fff", fontWeight: 700, fontSize: "0.85rem", cursor: changingPassword ? "not-allowed" : "pointer", fontFamily: "inherit"}}>
                {changingPassword ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* BLOCKED USERS SHEET */}
      {showBlockedUsers && (
        <>
          <div onClick={() => setShowBlockedUsers(false)}
            style={{position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", zIndex: 400}} />
          <div style={{position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "min(480px, 100vw)", backgroundColor: "#fff", borderRadius: "20px 20px 0 0", zIndex: 500, padding: "20px 20px 40px"}}>
            <div style={{width: "40px", height: "4px", backgroundColor: "#E0E0E0", borderRadius: "2px", margin: "0 auto 16px"}} />
            <div style={{fontWeight: 700, fontSize: "1rem", color: "#1A1A1A", marginBottom: "20px"}}>Blocked Users</div>
            <div style={{textAlign: "center", padding: "24px 0"}}>
              <div style={{fontSize: "2.5rem", marginBottom: "10px"}}>🚫</div>
              <div style={{fontWeight: 700, fontSize: "0.95rem", color: "#1A1A1A", marginBottom: "6px"}}>No blocked users</div>
              <div style={{fontSize: "0.78rem", color: "#888", lineHeight: 1.5}}>You can block someone by visiting their profile and tapping the Report button.</div>
            </div>
          </div>
        </>
      )}

      {/* LOGOUT CONFIRM */}
      {showLogoutConfirm && (
        <>
          <div onClick={() => setShowLogoutConfirm(false)}
            style={{position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", zIndex: 400}} />
          <div style={{position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "min(480px, 100vw)", backgroundColor: "#fff", borderRadius: "20px 20px 0 0", zIndex: 500, padding: "24px 16px 40px"}}>
            <div style={{fontWeight: 700, fontSize: "1rem", color: "#1A1A1A", marginBottom: "8px", textAlign: "center"}}>Log out of Klasmeyt?</div>
            <div style={{fontSize: "0.85rem", color: "#888", textAlign: "center", marginBottom: "20px"}}>You'll need to log in again to access your account.</div>
            <div style={{display: "flex", gap: "10px"}}>
              <button onClick={() => setShowLogoutConfirm(false)}
                style={{flex: 1, padding: "12px", borderRadius: "12px", border: "1px solid #F0F0F0", backgroundColor: "#fff", color: "#888", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer", fontFamily: "inherit"}}>Cancel</button>
              <button onClick={handleLogout}
                style={{flex: 1, padding: "12px", borderRadius: "12px", border: "none", backgroundColor: "#EF4444", color: "#fff", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", fontFamily: "inherit"}}>Log Out</button>
            </div>
          </div>
        </>
      )}

      {/* DELETE ACCOUNT CONFIRM */}
      {showDeleteConfirm && (
        <>
          <div onClick={() => setShowDeleteConfirm(false)}
            style={{position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", zIndex: 400}} />
          <div style={{position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "min(480px, 100vw)", backgroundColor: "#fff", borderRadius: "20px 20px 0 0", zIndex: 500, padding: "24px 16px 40px"}}>
            <div style={{textAlign: "center", marginBottom: "16px"}}>
              <div style={{fontSize: "2rem", marginBottom: "8px"}}>⚠️</div>
              <div style={{fontWeight: 700, fontSize: "1rem", color: "#EF4444", marginBottom: "6px"}}>Delete your account?</div>
              <div style={{fontSize: "0.82rem", color: "#888", lineHeight: 1.6}}>All your posts, messages, and data will be permanently deleted. This cannot be undone.</div>
            </div>
            <div style={{display: "flex", gap: "10px"}}>
              <button onClick={() => setShowDeleteConfirm(false)}
                style={{flex: 1, padding: "12px", borderRadius: "12px", border: "1px solid #F0F0F0", backgroundColor: "#fff", color: "#888", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer", fontFamily: "inherit"}}>Cancel</button>
              <button onClick={() => { showToast("Please contact support to delete your account."); setShowDeleteConfirm(false); }}
                style={{flex: 1, padding: "12px", borderRadius: "12px", border: "none", backgroundColor: "#EF4444", color: "#fff", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", fontFamily: "inherit"}}>Delete</button>
            </div>
          </div>
        </>
      )}

    </div>
  );
}
