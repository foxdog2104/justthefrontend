import { SignJWT, jwtVerify } from "jose";

// In production, set SESSION_SECRET in your environment (a long random
// string). This fallback is fine for local dev only.
const SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || "dev-only-insecure-secret-change-me"
);

export const SESSION_COOKIE_NAME = "session_token";
export const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60; // 8 hours

export type SessionUser = {
  email: string;
  name: string;
  provider: string;
};

export async function createSessionToken(user: SessionUser): Promise<string> {
  return await new SignJWT({ email: user.email, name: user.name, provider: user.provider })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(SECRET);
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    if (typeof payload.email !== "string" || typeof payload.name !== "string") return null;
    return {
      email: payload.email,
      name: payload.name,
      provider: typeof payload.provider === "string" ? payload.provider : "email",
    };
  } catch {
    return null;
  }
}
