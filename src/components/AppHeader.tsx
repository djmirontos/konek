'use client'
import Image from "next/image";
import { useRouter } from "next/navigation";

type School = { id: string; name: string; abbreviation: string; };
type User = { id: string; full_name: string; avatar_url: string | null; school_id: string; role: string; };

type Props = {
  currentUser: User | null;
  schools: School[];
  pageName?: string;
  selectedSchool: string;
  unreadCount: number;
  onSchoolPickerToggle: () => void;
  onNotificationsToggle: () => void;
  onAvatarClick?: () => void;
};

export default function AppHeader({
  currentUser, schools, pageName, selectedSchool, unreadCount,
  onSchoolPickerToggle, onNotificationsToggle, onAvatarClick
}: Props) {
  const router = useRouter();
  function goToProfile() {
    if (onAvatarClick) { onAvatarClick(); return; }
    if (currentUser) router.push(`/profile/${currentUser.id}`);
  }

  function getSchoolLabel() {
    if (selectedSchool === "own") {
      const s = schools.find(s => s.id === currentUser?.school_id);
      return s ? s.abbreviation : "My School";
    }
    if (selectedSchool === "all") return "All Schools";
    const s = schools.find(s => s.id === selectedSchool);
    return s ? s.abbreviation : "School";
  }

  return (
    <div style={{backgroundColor: "#1D9E75", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100}}>
      <div style={{display: "flex", flexDirection: "column"}}>
        <Image src="/konek.svg" alt="Konek" width={80} height={28} priority />
        {pageName && <span style={{color: "rgba(255,255,255,0.85)", fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.05em", marginTop: "2px"}}>{pageName}</span>}
      </div>
      <div style={{display: "flex", alignItems: "center", gap: "12px"}}>
        <button onClick={onSchoolPickerToggle} style={{backgroundColor: "rgba(255,255,255,0.2)", border: "none", borderRadius: "20px", padding: "6px 12px", color: "#fff", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", fontFamily: "inherit"}}>
          📍 {getSchoolLabel()} ▾
        </button>
        <button onClick={onNotificationsToggle} style={{background: "none", border: "none", cursor: "pointer", position: "relative", padding: "4px"}}>
          <Image src="/notification.png" alt="notifications" width={25} height={25} />
          {unreadCount > 0 && (
            <div style={{position: "absolute", top: "0px", right: "0px", backgroundColor: "#EF4444", color: "#fff", borderRadius: "50%", width: "16px", height: "16px", fontSize: "0.6rem", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", border: "1.5px solid #1D9E75"}}>
              {unreadCount > 9 ? "9+" : unreadCount}
            </div>
          )}
        </button>
        <button onClick={goToProfile} style={{background: "none", border: "none", cursor: "pointer", padding: 0}}>
          {currentUser?.avatar_url
            ? <img src={currentUser.avatar_url} alt="avatar" style={{width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover", border: "2px solid #fff"}} />
            : <div style={{width: "32px", height: "32px", borderRadius: "50%", backgroundColor: "#0F6E56", border: "2px solid #fff", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: "0.8rem"}}>{currentUser?.full_name?.charAt(0).toUpperCase()}</div>
          }
        </button>
      </div>
    </div>
  );
}