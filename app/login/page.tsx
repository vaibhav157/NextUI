"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

function buildLoginUrl(baseUrl: string, loginPath: string): string {
  const normalizedBase = baseUrl.replace(/\/+$/, "");
  const normalizedPath = loginPath.startsWith("/") ? loginPath : `/${loginPath}`;
  return `${normalizedBase}${normalizedPath}`;
}

function normalizeLoginUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    parsed.pathname = parsed.pathname.replace(/\/+/g, "/");
    return parsed.toString();
  } catch {
    return rawUrl;
  }
}

function getTokenFromPayload(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") {
    return undefined;
  }

  const data = payload as Record<string, unknown>;
  const keys = ["access_token", "token", "jwt", "auth_token"];
  for (const key of keys) {
    const value = data[key];
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }

  return undefined;
}

function getTokenTypeFromPayload(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") {
    return undefined;
  }

  const tokenType = (payload as Record<string, unknown>).token_type;
  if (typeof tokenType !== "string" || tokenType.length === 0) {
    return undefined;
  }

  return tokenType;
}

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loginUrl = useMemo(() => {
    const explicitUrl = process.env.NEXT_PUBLIC_PYTHON_API_LOGIN_URL;
    if (explicitUrl) {
      return normalizeLoginUrl(explicitUrl);
    }

    const baseUrl = process.env.NEXT_PUBLIC_PYTHON_API_BASE_URL ?? "http://127.0.0.1:8000";
    const loginPath = process.env.NEXT_PUBLIC_PYTHON_API_LOGIN_PATH ?? "/auth/login";
    return buildLoginUrl(baseUrl, loginPath);
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("");
    setIsSubmitting(true);

    try {
      const response = await fetch(loginUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ username, password })
      });

      const payload = await response.json().catch(() => ({}));
      const token = getTokenFromPayload(payload);

      if (!response.ok || !token) {
        throw new Error(`Login failed (${response.status}). Check credentials and auth endpoint.`);
      }

      const tokenType = getTokenTypeFromPayload(payload) ?? "Bearer";
      document.cookie = `python_api_token=${encodeURIComponent(token)}; Path=/; SameSite=Lax`;
      document.cookie = `python_api_token_type=${encodeURIComponent(tokenType)}; Path=/; SameSite=Lax`;

      setStatus("Login successful. Redirecting...");
      router.push("/");
      router.refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Login failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="page">
      <section className="card" style={{ maxWidth: 520 }}>
        <h1>Login</h1>
        <p className="subtitle">Sign in to request a token from your Python API.</p>

        <form className="userForm" onSubmit={onSubmit}>
          <label>
            Username
            <input value={username} onChange={(e) => setUsername(e.target.value)} required />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Login"}
          </button>

          {status ? <p className="statusText">{status}</p> : null}
        </form>
      </section>
    </main>
  );
}
