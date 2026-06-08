"use client";
import { useRouter } from "next/navigation";

export default function PrivacyPage() {
  const router = useRouter();
  return (
    <div style={{minHeight: "100vh", background: "#F7F7F7", display: "flex", flexDirection: "column", maxWidth: "480px", margin: "0 auto", fontFamily: "'Plus Jakarta Sans', sans-serif"}}>
      
      {/* Header */}
      <div style={{backgroundColor: "#2BB39A", padding: "12px 16px", display: "flex", alignItems: "center", gap: "12px", position: "sticky", top: 0, zIndex: 100}}>
        <button onClick={() => router.back()} style={{background: "none", border: "none", cursor: "pointer", color: "#fff", fontSize: "1.4rem", padding: "2px 4px", lineHeight: 1}}>&#8249;</button>
        <span style={{color: "#fff", fontWeight: 700, fontSize: "1rem"}}>Privacy Policy</span>
      </div>

      <div style={{padding: "24px 20px", flex: 1}}>
        
        <div style={{backgroundColor: "#fff", borderRadius: "16px", padding: "20px", marginBottom: "16px", border: "1px solid #F0F0F0"}}>
          <h1 style={{fontSize: "1.2rem", fontWeight: 800, color: "#1A1A1A", marginBottom: "4px", margin: "0 0 4px"}}>Privacy Policy</h1>
          <p style={{fontSize: "0.75rem", color: "#888", margin: "0 0 16px"}}>Last updated: June 2026</p>
          <p style={{fontSize: "0.85rem", color: "#555", lineHeight: 1.6, margin: "0"}}>
            Klasmeyt ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and protect your information when you use our campus social app.
          </p>
        </div>

        {[
          {
            title: "1. Information We Collect",
            content: [
              "Account information: name, phone number, and optional email address",
              "Profile information: bio, course, year level, hometown, birthday (optional)",
              "School information: your selected school or campus",
              "Content you create: posts, comments, reactions, messages, and marketplace listings",
              "Profile photos and images you upload",
              "Device information: FCM token for push notifications",
              "Usage data: last active time and online status (can be disabled in settings)",
            ]
          },
          {
            title: "2. How We Use Your Information",
            content: [
              "To provide and maintain the Klasmeyt service",
              "To display your profile to other users in your school community",
              "To send push notifications about reactions, comments, and messages",
              "To verify your student identity (optional verification)",
              "To improve app performance and fix issues",
              "To enforce our community guidelines",
            ]
          },
          {
            title: "3. Information Sharing",
            content: [
              "Your posts and public profile are visible to other Klasmeyt users",
              "We do not sell your personal information to third parties",
              "We do not share your data with advertisers",
              "Student ID photos (for verification) are only seen by Klasmeyt admins",
              "We may share data if required by law",
            ]
          },
          {
            title: "4. Data Storage & Security",
            content: [
              "Your data is stored securely on Supabase servers in Singapore (ap-southeast-1)",
              "We use industry-standard encryption for data transmission",
              "Passwords are never stored in plain text",
              "Profile photos are stored in secure cloud storage",
            ]
          },
          {
            title: "5. Your Privacy Controls",
            content: [
              "Control who sees your phone number, birthday, course, and hometown",
              "Toggle your online status visibility on or off",
              "Delete your posts and listings at any time",
              "Request account deletion by contacting support",
            ]
          },
          {
            title: "6. Push Notifications",
            content: [
              "We use Firebase Cloud Messaging (FCM) to send push notifications",
              "You can disable notifications in your device settings at any time",
              "We only send notifications for relevant activity (reactions, comments, messages)",
            ]
          },
          {
            title: "7. Children's Privacy",
            content: [
              "Klasmeyt is intended for college and university students aged 18 and above",
              "We do not knowingly collect information from users under 18",
            ]
          },
          {
            title: "8. Changes to This Policy",
            content: [
              "We may update this Privacy Policy from time to time",
              "We will notify users of significant changes through the app",
              "Continued use of Klasmeyt after changes means you accept the updated policy",
            ]
          },
          {
            title: "9. Contact Us",
            content: [
              "If you have questions about this Privacy Policy, contact us at:",
              "Email: djmirontos@gmail.com",
              "App: Klasmeyt — klasmeyt.com",
            ]
          },
        ].map(section => (
          <div key={section.title} style={{backgroundColor: "#fff", borderRadius: "16px", padding: "20px", marginBottom: "12px", border: "1px solid #F0F0F0"}}>
            <h2 style={{fontSize: "0.9rem", fontWeight: 700, color: "#1A1A1A", margin: "0 0 12px"}}>{section.title}</h2>
            <ul style={{margin: 0, paddingLeft: "16px", display: "flex", flexDirection: "column", gap: "6px"}}>
              {section.content.map((item, i) => (
                <li key={i} style={{fontSize: "0.82rem", color: "#555", lineHeight: 1.5}}>{item}</li>
              ))}
            </ul>
          </div>
        ))}

        <div style={{textAlign: "center", padding: "16px 0 32px"}}>
          <p style={{fontSize: "0.75rem", color: "#aaa"}}>© 2026 Klasmeyt. All rights reserved.</p>
          <p style={{fontSize: "0.75rem", color: "#aaa"}}>klasmeyt.com</p>
        </div>
      </div>
    </div>
  );
}
