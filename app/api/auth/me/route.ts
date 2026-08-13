import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/session";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const user = await verifySessionToken(token);
  if (!user) {
    return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });
  }
  return NextResponse.json(user);
}
