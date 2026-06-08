"use client";
import { useRouter } from "next/navigation";

export default function TermsPage() {
  const router = useRouter();
  return (
    <div style={{minHeight: "100vh", background: "#F7F7F7", display: "flex", flexDirection: "column", maxWidth: "480px", margin: "0 auto", fontFamily: "'Plus Jakarta Sans', sans-serif"}}>
      
      {/* Header */}
      <div style={{backgroundColor: "#2BB39A", padding: "12px 16px", display: "flex", alignItems: "center", gap: "12px", position: "sticky", top: 0, zIndex: 100}}>
        <button onClick={() => router.back()} style={{background: "none", border: "none", cursor: "pointer", color: "#fff", fontSize: "1.4rem", padding: "2px 4px", lineHeight: 1}}>&#8249;</button>
        <span style={{color: "#fff", fontWeight: 700, fontSize: "1rem"}}>Terms of Service</span>
      </div>

      <div style={{padding: "24px 20px", flex: 1}}>

        <div style={{backgroundColor: "#fff", borderRadius: "16px", padding: "20px", marginBottom: "16px", border: "1px solid #F0F0F0"}}>
          <h1 style={{fontSize: "1.2rem", fontWeight: 800, color: "#1A1A1A", margin: "0 0 4px"}}>Terms of Service</h1>
          <p style={{fontSize: "0.75rem", color: "#888", margin: "0 0 16px"}}>Last updated: June 2026</p>
          <p style={{fontSize: "0.85rem", color: "#555", lineHeight: 1.6, margin: 0}}>
            Welcome to Klasmeyt. By using our app, you agree to these Terms of Service. Please read them carefully before using Klasmeyt.
          </p>
        </div>

        {[
          {
            title: "1. Acceptance of Terms",
            content: [
              "By creating an account or using Klasmeyt, you agree to be bound by these Terms of Service.",
              "If you do not agree to these terms, please do not use Klasmeyt.",
              "We may update these terms from time to time. Continued use of the app means you accept any changes.",
            ]
          },
          {
            title: "2. Eligibility",
            content: [
              "You must be at least 18 years old to use Klasmeyt.",
              "You must be a current or former student of a college or university.",
              "You must provide accurate information when creating your account.",
              "One account per person is allowed.",
            ]
          },
          {
            title: "3. User Accounts",
            content: [
              "You are responsible for keeping your account credentials secure.",
              "Do not share your password with anyone.",
              "You are responsible for all activity that occurs under your account.",
              "Notify us immediately if you suspect unauthorized access to your account.",
              "We reserve the right to suspend or terminate accounts that violate these terms.",
            ]
          },
          {
            title: "4. Community Guidelines",
            content: [
              "Be respectful — treat all users with dignity and respect.",
              "No hate speech, harassment, bullying, or discrimination of any kind.",
              "No posting of explicit, sexual, or violent content.",
              "No spam, scams, or misleading information.",
              "No impersonation of other users, schools, or organizations.",
              "No posting of personal information of others without their consent.",
              "No content that promotes illegal activities.",
              "Violations may result in content removal, account suspension, or permanent ban.",
            ]
          },
          {
            title: "5. User Content",
            content: [
              "You own the content you post on Klasmeyt.",
              "By posting content, you grant Klasmeyt a license to display it within the app.",
              "You are solely responsible for the content you post.",
              "We reserve the right to remove any content that violates our guidelines.",
              "Content in Confessions is anonymous but not exempt from our community guidelines.",
            ]
          },
          {
            title: "6. Marketplace (Bazaar)",
            content: [
              "Klasmeyt is not responsible for transactions between buyers and sellers.",
              "All transactions are between users — Klasmeyt does not process payments.",
              "We do not guarantee the quality, safety, or legality of listed items.",
              "Report suspicious listings to our admin team.",
              "No listing of illegal items, stolen goods, or prohibited products.",
            ]
          },
          {
            title: "7. Privacy",
            content: [
              "Your use of Klasmeyt is also governed by our Privacy Policy.",
              "Please read our Privacy Policy at klasmeyt.com/privacy.",
              "We collect and use your data as described in our Privacy Policy.",
            ]
          },
          {
            title: "8. Intellectual Property",
            content: [
              "The Klasmeyt name, logo, and app design are owned by Klasmeyt.",
              "You may not copy, modify, or distribute our app or branding without permission.",
              "User-generated content remains the property of its respective creators.",
            ]
          },
          {
            title: "9. Disclaimers",
            content: [
              "Klasmeyt is provided as-is without any warranties.",
              "We do not guarantee that the app will be available at all times.",
              "We are not responsible for any loss or damage resulting from use of the app.",
              "We are not responsible for user-generated content posted by other users.",
            ]
          },
          {
            title: "10. Termination",
            content: [
              "You may delete your account at any time by contacting support.",
              "We may suspend or terminate your account for violating these terms.",
              "Upon termination, your access to Klasmeyt will be revoked.",
              "Content you posted may remain visible after account deletion.",
            ]
          },
          {
            title: "11. Governing Law",
            content: [
              "These terms are governed by the laws of the Philippines.",
              "Any disputes will be resolved under Philippine jurisdiction.",
            ]
          },
          {
            title: "12. Contact Us",
            content: [
              "If you have questions about these Terms of Service, contact us at:",
              "Email: djmirontos@gmail.com",
              "Website: klasmeyt.com",
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
