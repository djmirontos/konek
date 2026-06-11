export default function DeleteAccountPage() {
  return (
    <div style={{minHeight:"100vh",background:"#F6FFFC",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"32px 20px",fontFamily:"sans-serif"}}>
      <div style={{maxWidth:"480px",width:"100%",background:"#fff",borderRadius:"20px",padding:"32px",boxShadow:"0 4px 24px rgba(43,179,154,0.08)"}}>
        <div style={{textAlign:"center",marginBottom:"24px"}}>
          <h1 style={{fontSize:"1.4rem",fontWeight:800,color:"#0F2E27",margin:0}}>Delete Your Account</h1>
          <p style={{color:"#888",fontSize:"0.9rem",marginTop:"8px"}}>Klasmeyt - The Student Community Platform</p>
        </div>
        <div style={{backgroundColor:"#FEF2F2",borderRadius:"12px",padding:"16px",marginBottom:"24px",border:"1px solid #FECACA"}}>
          <p style={{color:"#EF4444",fontWeight:700,fontSize:"0.85rem",margin:0}}>Warning</p>
          <p style={{color:"#666",fontSize:"0.82rem",marginTop:"6px",margin:"6px 0 0"}}>
            Deleting your account is permanent and cannot be undone. All your posts, messages, reactions, and profile data will be permanently removed.
          </p>
        </div>
        <div style={{marginBottom:"24px"}}>
          <p style={{fontWeight:700,color:"#0F2E27",fontSize:"0.9rem",marginBottom:"12px"}}>To request account deletion:</p>
          <div style={{background:"#F6FFFC",borderRadius:"10px",padding:"12px 14px",border:"1px solid #CBF7E5",marginBottom:"10px"}}>
            <p style={{fontWeight:700,color:"#2BB39A",fontSize:"0.85rem",margin:0}}>Option 1 - In App</p>
            <p style={{color:"#555",fontSize:"0.82rem",margin:"4px 0 0"}}>Go to Settings - Danger Zone - Delete Account</p>
          </div>
          <div style={{background:"#F6FFFC",borderRadius:"10px",padding:"12px 14px",border:"1px solid #CBF7E5"}}>
            <p style={{fontWeight:700,color:"#2BB39A",fontSize:"0.85rem",margin:0}}>Option 2 - Email Us</p>
            <p style={{color:"#555",fontSize:"0.82rem",margin:"4px 0 0"}}>Send email to support@klasmeyt.com with subject: Account Deletion Request. Include your registered phone number.</p>
          </div>
        </div>
        <div style={{backgroundColor:"#F6FFFC",borderRadius:"10px",padding:"14px",border:"1px solid #CBF7E5",marginBottom:"20px"}}>
          <p style={{fontWeight:700,color:"#0F2E27",fontSize:"0.85rem",marginBottom:"6px"}}>What gets deleted:</p>
          <p style={{color:"#555",fontSize:"0.8rem",margin:"3px 0"}}>- Your profile and personal information</p>
          <p style={{color:"#555",fontSize:"0.8rem",margin:"3px 0"}}>- All your posts, comments, and reactions</p>
          <p style={{color:"#555",fontSize:"0.8rem",margin:"3px 0"}}>- Your messages and conversations</p>
          <p style={{color:"#555",fontSize:"0.8rem",margin:"3px 0"}}>- Your Bazaar and Living listings</p>
          <p style={{color:"#555",fontSize:"0.8rem",margin:"3px 0"}}>- Your trust XP and badges</p>
        </div>
        <p style={{color:"#aaa",fontSize:"0.75rem",textAlign:"center",margin:0}}>
          Requests are processed within 30 days. Contact support@klasmeyt.com
        </p>
      </div>
    </div>
  );
}
