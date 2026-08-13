import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/lib/session";

const FUNCTION_APP_URL = process.env.FUNCTION_APP_URL || "dietproject2-h3epgcfdaffvbse6.canadacentral-01.azurewebsites.net";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!code || !clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL("/login?error=" + encodeURIComponent("Google login isn't configured yet."), req.url)
    );
  }

  try {
    const redirectUri = `${req.nextUrl.origin}/api/auth/google/callback`;

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) throw new Error(tokenData.error_description || "Google sign-in failed.");

    const profileRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await profileRes.json();
    if (!profileRes.ok || !profile.email) throw new Error("Couldn't read your Google profile.");

    const upsertRes = await fetch(`${FUNCTION_APP_URL}/api/api/auth/oauth-upsert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: profile.email,
        name: profile.name || profile.email,
        provider: "google",
      }),
    });
    const user = await upsertRes.json();
    if (!upsertRes.ok) throw new Error(user.error || "Couldn't save your account.");

    const token = await createSessionToken(user);
    const response = NextResponse.redirect(new URL("/", req.url));
    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
    return response;
  } catch (err: any) {
    return NextResponse.redirect(
      new URL("/login?error=" + encodeURIComponent(err?.message || "Google sign-in failed."), req.url)
    );
  }
}
