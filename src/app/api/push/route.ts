import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { subscription, title, body, url, tag } = await req.json();

    if (!subscription || !title || !body) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const payload = JSON.stringify({ title, body, url: url || "/", tag: tag || "konek" });

    await webpush.sendNotification(subscription, payload);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Push notification error:", error);
    // 410 Gone means subscription is expired/invalid
    if (error.statusCode === 410) {
      return NextResponse.json({ error: "Subscription expired", expired: true }, { status: 410 });
    }
    return NextResponse.json({ error: "Failed to send notification" }, { status: 500 });
  }
}
