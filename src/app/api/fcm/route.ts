import { NextRequest, NextResponse } from "next/server";
import { sendFCMNotification } from "@/lib/fcm";

export async function POST(req: NextRequest) {
  try {
    const { token, title, body, url } = await req.json();
    if (!token || !title || !body) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    const success = await sendFCMNotification(token, title, body, url);
    return NextResponse.json({ success });
  } catch (error) {
    return NextResponse.json({ error: "Failed to send" }, { status: 500 });
  }
}
