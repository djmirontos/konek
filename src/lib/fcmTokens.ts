"use client";
import { createClient } from "@/lib/supabase";

export async function registerFCMToken(userId: string) {
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    
    // Request permission
    const permission = await PushNotifications.requestPermissions();
    if (permission.receive !== "granted") return;
    
    // Register with FCM
    await PushNotifications.register();
    
    // Listen for token
    PushNotifications.addListener("registration", async (token) => {
      const supabase = createClient();
      await supabase.from("fcm_tokens").upsert({
        user_id: userId,
        token: token.value,
        platform: "android",
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,token" });
    });

    // Listen for notifications when app is open
    PushNotifications.addListener("pushNotificationReceived", (notification) => {
      console.log("Push received:", notification);
    });

    // Handle notification tap
    PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
      const url = action.notification.data?.url;
      if (url) window.location.href = url;
    });

  } catch (e) {
    // Not in Capacitor environment - ignore
    console.log("FCM not available in browser");
  }
}
