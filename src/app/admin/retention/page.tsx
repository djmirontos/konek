'use client'
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type SchoolStat = {
  id: string;
  name: string;
  abbreviation: string;
  totalUsers: number;
  activeUsers: number;
  newThisWeek: number;
};

type FeatureStat = {
  label: string;
  icon: string;
  count: number;
  percent: number;
  color: string;
};

type RetentionStats = {
  totalUsers: number;
  dau: number;
  wau: number;
  mau: number;
  dauMauRatio: number;
  d1Retention: number;
  d7Retention: number;
  d30Retention: number;
  schools: SchoolStat[];
  features: FeatureStat[];
};

export default function AdminRetentionPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<RetentionStats | null>(null);
  const [currentUser, setCurrentUser] = useState<{ full_name: string; role: string } | null>(null);

  useEffect(() => { initPage(); }, []);

  async function initPage() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    const { data: userData } = await supabase.from("users").select("*").eq("id", user.id).single();
    if (!userData || (userData.role !== "admin" && userData.role !== "moderator")) {
      router.push("/feeds"); return;
    }
    setCurrentUser(userData);
    await fetchStats();
    setLoading(false);
  }

  async function fetchStats() {
    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0,0,0,0);
    const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(now); monthAgo.setDate(monthAgo.getDate() - 30);
    const twoDaysAgo = new Date(now); twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const eightDaysAgo = new Date(now); eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);
    const thirtyOneDaysAgo = new Date(now); thirtyOneDaysAgo.setDate(thirtyOneDaysAgo.getDate() - 31);

    const [
      { count: totalUsers },
      { count: dau },
      { count: wau },
      { count: mau },
    ] = await Promise.all([
      supabase.from("users").select("id", { count: "exact", head: true }),
      supabase.from("users").select("id", { count: "exact", head: true }).gte("last_active_at", todayStart.toISOString()),
      supabase.from("users").select("id", { count: "exact", head: true }).gte("last_active_at", weekAgo.toISOString()),
      supabase.from("users").select("id", { count: "exact", head: true }).gte("last_active_at", monthAgo.toISOString()),
    ]);

    const { count: d1Base } = await supabase.from("users").select("id", { count: "exact", head: true })
      .gte("created_at", twoDaysAgo.toISOString()).lt("created_at", todayStart.toISOString());
    const { count: d1Active } = await supabase.from("users").select("id", { count: "exact", head: true })
      .gte("created_at", twoDaysAgo.toISOString()).lt("created_at", todayStart.toISOString())
      .gte("last_active_at", twoDaysAgo.toISOString());

    const fourteenDaysAgo = new Date(now); fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    const { count: d7Base } = await supabase.from("users").select("id", { count: "exact", head: true })
      .gte("created_at", fourteenDaysAgo.toISOString()).lt("created_at", eightDaysAgo.toISOString());
    const { count: d7Active } = await supabase.from("users").select("id", { count: "exact", head: true })
      .gte("created_at", fourteenDaysAgo.toISOString()).lt("created_at", eightDaysAgo.toISOString())
      .gte("last_active_at", weekAgo.toISOString());

    const sixtyDaysAgo = new Date(now); sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    const { count: d30Base } = await supabase.from("users").select("id", { count: "exact", head: true })
      .gte("created_at", sixtyDaysAgo.toISOString()).lt("created_at", thirtyOneDaysAgo.toISOString());
    const { count: d30Active } = await supabase.from("users").select("id", { count: "exact", head: true })
      .gte("created_at", sixtyDaysAgo.toISOString()).lt("created_at", thirtyOneDaysAgo.toISOString())
      .gte("last_active_at", monthAgo.toISOString());

    const d1Retention = d1Base ? Math.round(((d1Active || 0) / d1Base) * 100) : 0;
    const d7Retention = d7Base ? Math.round(((d7Active || 0) / d7Base) * 100) : 0;
    const d30Retention = d30Base ? Math.round(((d30Active || 0) / d30Base) * 100) : 0;
    const dauMauRatio = mau ? Math.round(((dau || 0) / mau) * 100) : 0;

    const { data: schoolsData } = await supabase.from("schools").select("id, name, abbreviation");
    const schools: SchoolStat[] = [];
    if (schoolsData) {
      for (const school of schoolsData) {
        const [
          { count: totalSchoolUsers },
          { count: activeSchoolUsers },
          { count: newThisWeek },
        ] = await Promise.all([
          supabase.from("users").select("id", { count: "exact", head: true }).eq("school_id", school.id),
          supabase.from("users").select("id", { count: "exact", head: true }).eq("school_id", school.id).gte("last_active_at", weekAgo.toISOString()),
          supabase.from("users").select("id", { count: "exact", head: true }).eq("school_id", school.id).gte("created_at", weekAgo.toISOString()),
        ]);
        if ((totalSchoolUsers || 0) > 0) {
          schools.push({
            id: school.id,
            name: school.name,
            abbreviation: school.abbreviation,
            totalUsers: totalSchoolUsers || 0,
            activeUsers: activeSchoolUsers || 0,
            newThisWeek: newThisWeek || 0,
          });
        }
      }
      schools.sort((a, b) => b.activeUsers - a.activeUsers);
    }

    const [
      { count: feedPosts },
      { count: soapboxPosts },
      { count: confessionPosts },
      { count: bazaarListings },
      { count: livingListings },
      { count: messagesSent },
    ] = await Promise.all([
      supabase.from("posts").select("id", { count: "exact", head: true }).eq("type", "feed").gte("created_at", monthAgo.toISOString()),
      supabase.from("posts").select("id", { count: "exact", head: true }).eq("type", "soapbox").gte("created_at", monthAgo.toISOString()),
      supabase.from("posts").select("id", { count: "exact", head: true }).eq("type", "confession").gte("created_at", monthAgo.toISOString()),
      supabase.from("listings").select("id", { count: "exact", head: true }).gte("created_at", monthAgo.toISOString()),
      supabase.from("boarding_houses").select("id", { count: "exact", head: true }).gte("created_at", monthAgo.toISOString()),
      supabase.from("messages").select("id", { count: "exact", head: true }).gte("created_at", monthAgo.toISOString()),
    ]);

    const featureCounts = [
      { label: "Messages", icon: "MSG", count: messagesSent || 0, color: "#3B82F6" },
      { label: "Feeds", icon: "FEED", count: feedPosts || 0, color: "#1D9E75" },
      { label: "Soapbox", icon: "SOAP", count: soapboxPosts || 0, color: "#8B5CF6" },
      { label: "Confession", icon: "CONF", count: confessionPosts || 0, color: "#F59E0B" },
      { label: "Bazaar", icon: "BAZ", count: bazaarListings || 0, color: "#EC4899" },
      { label: "Living", icon: "LIV", count: livingListings || 0, color: "#06B6D4" },
    ];
    const maxCount = Math.max(...featureCounts.map(f => f.count), 1);
    const features: FeatureStat[] = featureCounts
      .map(f => ({ ...f, percent: Math.round((f.count / maxCount) * 100) }))
      .sort((a, b) => b.count - a.count);

    setStats({
      totalUsers: totalUsers || 0,
      dau: dau || 0,
      wau: wau || 0,
      mau: mau || 0,
      dauMauRatio,
      d1Retention,
      d7Retention,
      d30Retention,
      schools,
      features,
    });
  }

  function RetentionBar({ label, value, color }: { label: string; value: number; color: string }) {
    const getGrade = (v: number) => v >= 40 ? "Healthy" : v >= 20 ? "Average" : "At Risk";
    return (
      <div style={{ marginBottom: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
          <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "#1A1A1A" }}>{label}</span>
          <span style={{ fontWeight: 800, fontSize: "0.85rem", color }}>{value}% <span style={{ fontWeight: 400, fontSize: "0.72rem", color: "#888" }}>{getGrade(value)}</span></span>
        </div>
        <div style={{ backgroundColor: "#F0F0F0", borderRadius: "99px", height: "8px", overflow: "hidden" }}>
          <div style={{ width: value + "%", height: "100%", backgroundColor: color, borderRadius: "99px", transition: "width 0.6s ease" }} />
        </div>
      </div>
    );
  }

  if (loading) return (
    <div style={{ minHeight: "100vh", backgroundColor: "#1D9E75", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div style={{ color: "#fff", fontSize: "0.9rem", fontWeight: 600 }}>Loading retention data...</div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#F7F7F7", maxWidth: "480px", margin: "0 auto", fontFamily: "'Plus Jakarta Sans', sans-serif", paddingBottom: "40px" }}>

      <div style={{ backgroundColor: "#1D9E75", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <button onClick={() => router.push("/admin")} style={{ background: "none", border: "none", cursor: "pointer", color: "#fff", fontSize: "1.4rem", padding: "0", width: "36px" }}>&#8249;</button>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontWeight: 800, fontSize: "1rem", color: "#fff", letterSpacing: "0.05em" }}>RETENTION</div>
          <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.8)", marginTop: "1px" }}>{currentUser?.full_name} · {currentUser?.role}</div>
        </div>
        <button onClick={fetchStats} style={{ background: "none", border: "none", cursor: "pointer", color: "#fff", fontSize: "1.1rem", padding: "0", width: "36px" }}>&#8635;</button>
      </div>

      <div style={{ padding: "16px 16px 0" }}>
        <div style={{ fontWeight: 800, fontSize: "0.8rem", color: "#888", letterSpacing: "0.08em", marginBottom: "10px" }}>OVERVIEW</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
          {[
            { label: "Total Users", value: stats?.totalUsers, color: "#1D9E75" },
            { label: "Daily Active", value: stats?.dau, color: "#F59E0B" },
            { label: "Weekly Active", value: stats?.wau, color: "#3B82F6" },
            { label: "Monthly Active", value: stats?.mau, color: "#8B5CF6" },
          ].map((card, i) => (
            <div key={i} style={{ backgroundColor: "#fff", borderRadius: "14px", padding: "14px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <div style={{ fontSize: "1.6rem", fontWeight: 800, color: card.color, lineHeight: 1 }}>{card.value ?? "0"}</div>
              <div style={{ fontSize: "0.72rem", color: "#888", marginTop: "4px", fontWeight: 500 }}>{card.label}</div>
            </div>
          ))}
        </div>
        <div style={{ backgroundColor: "#fff", borderRadius: "14px", padding: "14px 16px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", marginBottom: "16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "#1A1A1A" }}>DAU / MAU Ratio</div>
            <div style={{ fontSize: "0.72rem", color: "#888", marginTop: "2px" }}>Stickiness — target is 20%+</div>
          </div>
          <div style={{ fontWeight: 800, fontSize: "1.8rem", color: (stats?.dauMauRatio || 0) >= 20 ? "#1D9E75" : (stats?.dauMauRatio || 0) >= 10 ? "#F59E0B" : "#EF4444" }}>
            {stats?.dauMauRatio}%
          </div>
        </div>
      </div>

      <div style={{ padding: "0 16px 16px" }}>
        <div style={{ fontWeight: 800, fontSize: "0.8rem", color: "#888", letterSpacing: "0.08em", marginBottom: "10px" }}>USER RETENTION</div>
        <div style={{ backgroundColor: "#fff", borderRadius: "14px", padding: "16px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <RetentionBar label="Day 1 Retention" value={stats?.d1Retention || 0} color="#1D9E75" />
          <RetentionBar label="Day 7 Retention" value={stats?.d7Retention || 0} color="#3B82F6" />
          <RetentionBar label="Day 30 Retention" value={stats?.d30Retention || 0} color="#8B5CF6" />
          <div style={{ fontSize: "0.7rem", color: "#AAA", marginTop: "8px", lineHeight: 1.5 }}>
            D1: returned next day · D7: returned within 7 days · D30: returned within 30 days
          </div>
        </div>
      </div>

      <div style={{ padding: "0 16px 16px" }}>
        <div style={{ fontWeight: 800, fontSize: "0.8rem", color: "#888", letterSpacing: "0.08em", marginBottom: "10px" }}>SCHOOL ANALYTICS</div>
        <div style={{ backgroundColor: "#fff", borderRadius: "14px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" }}>
          {(stats?.schools.length || 0) === 0 ? (
            <div style={{ padding: "24px", textAlign: "center", color: "#888", fontSize: "0.85rem" }}>No school data yet.</div>
          ) : stats?.schools.map((school, i) => {
            const activePercent = school.totalUsers > 0 ? Math.round((school.activeUsers / school.totalUsers) * 100) : 0;
            return (
              <div key={school.id} style={{ padding: "14px 16px", borderBottom: i < (stats.schools.length - 1) ? "1px solid #F0F0F0" : "none" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "#1A1A1A" }}>{school.abbreviation}</span>
                    <span style={{ fontSize: "0.7rem", color: "#888", marginLeft: "6px" }}>{school.name}</span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "0.72rem", color: "#1D9E75", fontWeight: 700 }}>{school.activeUsers} active</div>
                    <div style={{ fontSize: "0.65rem", color: "#AAA" }}>+{school.newThisWeek} this week</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ flex: 1, backgroundColor: "#F0F0F0", borderRadius: "99px", height: "6px", overflow: "hidden" }}>
                    <div style={{ width: activePercent + "%", height: "100%", backgroundColor: "#1D9E75", borderRadius: "99px" }} />
                  </div>
                  <span style={{ fontSize: "0.7rem", color: "#888", minWidth: "32px", textAlign: "right" }}>{activePercent}%</span>
                </div>
                <div style={{ fontSize: "0.65rem", color: "#AAA", marginTop: "3px" }}>{school.totalUsers} total users</div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ padding: "0 16px 16px" }}>
        <div style={{ fontWeight: 800, fontSize: "0.8rem", color: "#888", letterSpacing: "0.08em", marginBottom: "4px" }}>FEATURE ENGAGEMENT</div>
        <div style={{ fontSize: "0.7rem", color: "#AAA", marginBottom: "10px" }}>Based on last 30 days activity</div>
        <div style={{ backgroundColor: "#fff", borderRadius: "14px", padding: "16px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          {stats?.features.map((feature, i) => (
            <div key={i} style={{ marginBottom: i < (stats.features.length - 1) ? "14px" : "0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                <span style={{ fontWeight: 600, fontSize: "0.85rem", color: "#1A1A1A" }}>{feature.label}</span>
                <span style={{ fontWeight: 700, fontSize: "0.82rem", color: feature.color }}>{feature.count.toLocaleString()}</span>
              </div>
              <div style={{ backgroundColor: "#F0F0F0", borderRadius: "99px", height: "7px", overflow: "hidden" }}>
                <div style={{ width: feature.percent + "%", height: "100%", backgroundColor: feature.color, borderRadius: "99px", transition: "width 0.6s ease" }} />
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
