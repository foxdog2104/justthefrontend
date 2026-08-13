"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const oauthError = searchParams.get("error");

  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body =
        mode === "login" ? { email, password } : { email, password, name: name.trim() || email };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        setLoading(false);
        return;
      }

      router.push("/");
      router.refresh();
    } catch (err: any) {
      setError(err?.message || "Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="bg-white shadow-lg rounded-lg p-8 w-full max-w-sm">
        <h1 className="text-2xl font-semibold mb-1 text-center">Nutritional Insights</h1>
        <p className="text-sm text-gray-500 text-center mb-6">
          {mode === "login" ? "Sign in to view your dashboard" : "Create an account to get started"}
        </p>

        {(error || oauthError) && (
          <div className="bg-red-50 text-red-700 text-sm rounded p-2 mb-4">
            {error || oauthError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {mode === "register" && (
            <input
              type="text"
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="p-2 border rounded"
            />
          )}
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="p-2 border rounded"
          />
          <input
            type="password"
            required
            minLength={8}
            placeholder="Password (min. 8 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="p-2 border rounded"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white py-2 rounded disabled:opacity-50"
          >
            {loading ? "Please wait…" : mode === "login" ? "Sign In" : "Register"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setError(null);
          }}
          className="text-sm text-blue-600 mt-3 w-full text-center"
        >
          {mode === "login" ? "Need an account? Register" : "Already have an account? Sign in"}
        </button>

        <div className="flex items-center gap-2 my-4">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400">OR</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        <a
          href="/api/auth/google"
          className="flex items-center justify-center gap-2 border py-2 rounded hover:bg-gray-50 text-sm"
        >
          Continue with Google
        </a>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
