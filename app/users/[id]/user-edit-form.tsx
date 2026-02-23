"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export type User = {
  id: number;
  name: string;
  email: string;
  role: string;
};

type UserEditFormProps = {
  mode: "create" | "edit";
  initialUser?: User;
};

function buildUsersUrl(baseUrl: string, usersPath: string): string {
  const normalizedBase = baseUrl.replace(/\/+$/, "");
  const normalizedPath = usersPath.startsWith("/") ? usersPath : `/${usersPath}`;
  return `${normalizedBase}${normalizedPath}`;
}

function getCookieValue(name: string): string | undefined {
  const rawCookie = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${name}=`));

  if (!rawCookie) {
    return undefined;
  }

  return decodeURIComponent(rawCookie.split("=").slice(1).join("="));
}

function buildAuthHeaders(token?: string, tokenType?: string): HeadersInit {
  const headers: HeadersInit = {
    "Content-Type": "application/json"
  };

  if (!token) {
    return headers;
  }

  const normalizedType = tokenType && tokenType.trim().length > 0 ? tokenType.trim() : "Bearer";
  const authValue = token.startsWith(`${normalizedType} `) ? token : `${normalizedType} ${token}`;

  return {
    ...headers,
    Authorization: authValue
  };
}

export default function UserEditForm({ mode, initialUser }: UserEditFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initialUser?.name ?? "");
  const [email, setEmail] = useState(initialUser?.email ?? "");
  const [role, setRole] = useState(initialUser?.role ?? "");
  const [status, setStatus] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const baseUrl = useMemo(
    () => process.env.NEXT_PUBLIC_PYTHON_API_BASE_URL ?? "http://127.0.0.1:8000",
    []
  );
  const usersPath = useMemo(
    () => process.env.NEXT_PUBLIC_PYTHON_API_USERS_PATH ?? "/users",
    []
  );
  const usersUrl = useMemo(() => buildUsersUrl(baseUrl, usersPath), [baseUrl, usersPath]);
  const isBusy = isSaving || isDeleting;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setStatus("");

    try {
      const body = JSON.stringify({
        id: initialUser?.id,
        name,
        email,
        role
      });
      const token = getCookieValue("python_api_token");
      const tokenType = getCookieValue("python_api_token_type");
      const headers = buildAuthHeaders(token, tokenType);

      let response: Response;
      if (mode === "create") {
        response = await fetch(usersUrl, {
          method: "POST",
          headers,
          body
        });
      } else {
        response = await fetch(`${usersUrl}/${initialUser?.id}`, {
          method: "POST",
          headers,
          body
        });

        if (response.status === 404 || response.status === 405) {
          response = await fetch(`${usersUrl}/${initialUser?.id}`, {
            method: "PUT",
            headers,
            body
          });
        }

        if (response.status === 404 || response.status === 405) {
          response = await fetch(`${usersUrl}/${initialUser?.id}`, {
            method: "PATCH",
            headers,
            body
          });
        }

        if (response.status === 404 || response.status === 405) {
          response = await fetch(usersUrl, {
            method: "POST",
            headers,
            body
          });
        }
      }

      if (response.status === 401) {
        setStatus("Unauthorized. Please log in.");
        router.push("/login");
        return;
      }

      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        throw new Error(
          `Failed to update user: ${response.status}${detail ? ` - ${detail.slice(0, 200)}` : ""}`
        );
      }

      setStatus("Saved successfully.");
      router.push("/");
      router.refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to save.");
    } finally {
      setIsSaving(false);
    }
  }

  async function onDelete() {
    if (mode !== "edit" || !initialUser?.id) {
      return;
    }

    const shouldDelete = window.confirm("Delete this user? This action cannot be undone.");
    if (!shouldDelete) {
      return;
    }

    setIsDeleting(true);
    setStatus("");

    try {
      const token = getCookieValue("python_api_token");
      const tokenType = getCookieValue("python_api_token_type");
      const headers = buildAuthHeaders(token, tokenType);
      const response = await fetch(`${usersUrl}/${initialUser.id}`, {
        method: "DELETE",
        headers
      });

      if (response.status === 401) {
        setStatus("Unauthorized. Please log in.");
        router.push("/login");
        return;
      }

      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        throw new Error(
          `Failed to delete user: ${response.status}${detail ? ` - ${detail.slice(0, 200)}` : ""}`
        );
      }

      setStatus("Deleted successfully.");
      router.push("/");
      router.refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to delete user.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <form className="userForm" onSubmit={onSubmit}>
      <label>
        Name
        <input value={name} onChange={(e) => setName(e.target.value)} disabled={isBusy} />
      </label>

      <label>
        Email
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isBusy}
        />
      </label>

      <label>
        Role
        <input value={role} onChange={(e) => setRole(e.target.value)} disabled={isBusy} />
      </label>

      <div className="formActions">
        <button type="submit" disabled={isBusy}>
          {isSaving ? "Saving..." : mode === "create" ? "Create User" : "Save Changes"}
        </button>

        {mode === "edit" ? (
          <button
            type="button"
            className="dangerBtn"
            disabled={isBusy}
            onClick={onDelete}
          >
            {isDeleting ? "Deleting..." : "Delete User"}
          </button>
        ) : null}
      </div>

      {status ? <p className="statusText">{status}</p> : null}
    </form>
  );
}
