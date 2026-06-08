// Push notification utilities for Klasmeyt
export async function registerServiceWorker() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    console.log("Push notifications not supported");
    return null;
  }
  try {
    const registration = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    return registration;
  } catch (error) {
    console.error("Service worker registration failed:", error);
    return null;
  }
}

export async function subscribeToPush(userId: string, supabase: any): Promise<boolean> {
  try {
    const registration = await registerServiceWorker();
    if (!registration) return false;
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return false;
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
    const convertedKey = urlBase64ToUint8Array(vapidKey);
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey,
      });
    }
    const sub = subscription.toJSON();
    await supabase.from("push_subscriptions").upsert({
      user_id: userId,
      endpoint: sub.endpoint,
      p256dh: sub.keys?.p256dh,
      auth: sub.keys?.auth,
    }, { onConflict: "user_id,endpoint" });
    return true;
  } catch (error) {
    console.error("Push subscription failed:", error);
    return false;
  }
}

export async function sendPushToUser(
  recipientId: string,
  title: string,
  body: string,
  url: string,
  tag: string,
  supabase: any
) {
  try {
    // Send Web Push (browser/PWA)
    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", recipientId);

    if (subs && subs.length > 0) {
      for (const sub of subs) {
        const subscription = {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        };
        const response = await fetch("/api/push", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subscription, title, body, url, tag }),
        });
        if (response.status === 410) {
          await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        }
      }
    }

    // Send FCM Push (Android native app)
    const { data: fcmTokens } = await supabase
      .from("fcm_tokens")
      .select("token")
      .eq("user_id", recipientId);

    if (fcmTokens && fcmTokens.length > 0) {
      for (const { token } of fcmTokens) {
        await fetch("/api/fcm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, title, body, url }),
        });
      }
    }
  } catch (error) {
    console.error("Send push error:", error);
  }
}

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer as ArrayBuffer;
}
