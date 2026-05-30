'use client'

type School = { id: string; name: string; abbreviation: string; };
type User = { id: string; full_name: string; avatar_url: string | null; school_id: string; role: string; };

type Props = {
  schools: School[];
  currentUser: User | null;
  selectedSchool: string;
  onSelect: (id: string) => void;
  onClose: () => void;
  allSchoolsLabel?: string;
};

export default function SchoolPicker({ schools, currentUser, selectedSchool, onSelect, onClose, allSchoolsLabel = "See posts from all Tangub schools" }: Props) {
  const options = [
    { id: "own", label: "🏫 My School", sub: schools.find(s => s.id === currentUser?.school_id)?.name || "" },
    { id: "all", label: "🌐 All Schools", sub: allSchoolsLabel },
    ...schools.map(s => ({ id: s.id, label: s.abbreviation, sub: s.name }))
  ];

  return (
    <>
      <div style={{position: "fixed", top: "60px", left: "50%", transform: "translateX(-50%)", width: "min(480px, 100vw)", backgroundColor: "#fff", zIndex: 200, boxShadow: "0 4px 20px rgba(0,0,0,0.15)", borderRadius: "0 0 16px 16px", overflow: "hidden"}}>
        {options.map(option => (
          <button key={option.id} onClick={() => { onSelect(option.id); onClose(); }}
            style={{width: "100%", padding: "12px 16px", background: selectedSchool === option.id ? "#E1F5EE" : "#fff", border: "none", borderBottom: "1px solid #F0F0F0", cursor: "pointer", textAlign: "left", fontFamily: "inherit"}}>
            <div style={{fontWeight: 600, fontSize: "0.85rem", color: selectedSchool === option.id ? "#1D9E75" : "#1A1A1A"}}>{option.label}</div>
            {option.sub && <div style={{fontSize: "0.72rem", color: "#888", marginTop: "2px"}}>{option.sub}</div>}
          </button>
        ))}
      </div>
      <div onClick={onClose} style={{position: "fixed", inset: 0, zIndex: 150}} />
    </>
  );
}