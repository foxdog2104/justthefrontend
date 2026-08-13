import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/lib/session";

const FUNCTION_APP_URL = process.env.FUNCTION_APP_URL || "dietproject2-h3epgcfdaffvbse6.canadacentral-01.azurewebsites.net";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const backendRes = await fetch(`${FUNCTION_APP_URL}/api/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await backendRes.json();

    if (!backendRes.ok) {
      return NextResponse.json(data, { status: backendRes.status });
    }

    const token = await createSessionToken(data);
    const response = NextResponse.json(data, { status: 200 });
    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
    return response;
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Login failed. Is the Azure Function running?" },
      { status: 500 }
    );
  }
}
