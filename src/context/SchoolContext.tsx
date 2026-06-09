"use client"
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { createClient } from "@/lib/supabase";

type School = { id: string; name: string; abbreviation: string; };

type SchoolContextType = {
  selectedSchool: string;
  setSelectedSchool: (school: string) => void;
  schools: School[];
};

const SchoolContext = createContext<SchoolContextType>({
  selectedSchool: "own",
  setSelectedSchool: () => {},
  schools: [],
});

export function SchoolProvider({ children }: { children: ReactNode }) {
  const supabase = createClient();
  const [selectedSchool, setSelectedSchoolState] = useState<string>("own");
  const [schools, setSchools] = useState<School[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("konek_selected_school");
      if (saved) setSelectedSchoolState(saved);
    } catch {}
  }, []);

  useEffect(() => {
    supabase
      .from("schools")
      .select("id, name, abbreviation")
      .order("name")
      .then(({ data }) => { if (data) setSchools(data); });
  }, []);

  function setSelectedSchool(school: string) {
    setSelectedSchoolState(school);
    try {
      localStorage.setItem("konek_selected_school", school);
    } catch {}
  }

  return (
    <SchoolContext.Provider value={{ selectedSchool, setSelectedSchool, schools }}>
      {children}
    </SchoolContext.Provider>
  );
}

export function useSchool() {
  return useContext(SchoolContext);
}
