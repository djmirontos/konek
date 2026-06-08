import admin from "firebase-admin";

function getFirebaseApp() {
  if (admin.apps.length > 0) return admin.apps[0]!;
  
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || "{}");
  
  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export async function sendFCMNotification(
  fcmToken: string,
  title: string,
  body: string,
  url?: string
) {
  try {
    const app = getFirebaseApp();
    await admin.messaging(app).send({
      token: fcmToken,
      notification: { title, body },
      android: {
        priority: "high",
        notification: {
          sound: "default",
          clickAction: "FLUTTER_NOTIFICATION_CLICK",
        },
      },
      data: { url: url || "/feeds" },
    });
    return true;
  } catch (error) {
    console.error("FCM send error:", error);
    return false;
  }
}

export async function sendFCMToUser(
  userId: string,
  title: string,
  body: string,
  url: string,
  supabase: any
) {
  try {
    const { data: tokens } = await supabase
      .from("fcm_tokens")
      .select("token")
      .eq("user_id", userId);
    
    if (!tokens || tokens.length === 0) return;
    
    await Promise.all(
      tokens.map((t: { token: string }) =>
        sendFCMNotification(t.token, title, body, url)
      )
    );
  } catch (error) {
    console.error("sendFCMToUser error:", error);
  }
}
