"use client"
import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type SchoolContextType = {
  selectedSchool: string;
  setSelectedSchool: (school: string) => void;
};

const SchoolContext = createContext<SchoolContextType>({
  selectedSchool: "own",
  setSelectedSchool: () => {},
});

export function SchoolProvider({ children }: { children: ReactNode }) {
  const [selectedSchool, setSelectedSchoolState] = useState<string>("own");

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("konek_selected_school");
      if (saved) setSelectedSchoolState(saved);
    } catch {}
  }, []);

  function setSelectedSchool(school: string) {
    setSelectedSchoolState(school);
    try {
      localStorage.setItem("konek_selected_school", school);
    } catch {}
  }

  return (
    <SchoolContext.Provider value={{ selectedSchool, setSelectedSchool }}>
      {children}
    </SchoolContext.Provider>
  );
}

export function useSchool() {
  return useContext(SchoolContext);
}
