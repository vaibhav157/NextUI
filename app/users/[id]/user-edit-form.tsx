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

export default function UserEditForm({ mode, initialUser }: UserEditFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initialUser?.name ?? "");
  const [email, setEmail] = useState(initialUser?.email ?? "");
  const [role, setRole] = useState(initialUser?.role ?? "");
  const [status, setStatus] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  const baseUrl = useMemo(
    () => process.env.NEXT_PUBLIC_PYTHON_API_BASE_URL ?? "http://127.0.0.1:8000",
    []
  );
  const usersPath = useMemo(
    () => process.env.NEXT_PUBLIC_PYTHON_API_USERS_PATH ?? "/users",
    []
  );
  const usersUrl = useMemo(() => buildUsersUrl(baseUrl, usersPath), [baseUrl, usersPath]);

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

      const headers = {
        "Content-Type": "application/json"
      };

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

      if (!response.ok) {
        throw new Error(`Failed to update user: ${response.status}`);
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

  return (
    <form className="userForm" onSubmit={onSubmit}>
      <label>
        Name
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </label>

      <label>
        Email
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>

      <label>
        Role
        <input value={role} onChange={(e) => setRole(e.target.value)} />
      </label>

      <button type="submit" disabled={isSaving}>
        {isSaving ? "Saving..." : mode === "create" ? "Create User" : "Save Changes"}
      </button>

      {status ? <p className="statusText">{status}</p> : null}
    </form>
  );
}
