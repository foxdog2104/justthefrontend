import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || "dev-only-insecure-secret-change-me"
);

async function isAuthenticated(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get("session_token")?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, SECRET);
    return true;
  } catch {
    return false;
  }
}

export async function proxy(req: NextRequest) {
  const authed = await isAuthenticated(req);
  const isLoginPage = req.nextUrl.pathname === "/login";

  if (!authed && !isLoginPage) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (authed && isLoginPage) {
    return NextResponse.redirect(new URL("/", req.url));
  }
  return NextResponse.next();
}

// Runs on every page except API routes and static assets. API routes check
// the session themselves where needed (e.g. /api/auth/me) since they need
// to return JSON errors rather than redirects.
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
