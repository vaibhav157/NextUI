"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export type PromptConfig = {
  id: number;
  key: string;
  system_prompt: string;
  user_prompt: string;
  is_active: boolean;
};

type PromptConfigEditFormProps = {
  mode: "create" | "edit";
  initialPromptConfig?: PromptConfig;
};

function buildPromptConfigsUrl(baseUrl: string, promptConfigsPath: string): string {
  const normalizedBase = baseUrl.replace(/\/+$/, "");
  const normalizedPath = promptConfigsPath.startsWith("/")
    ? promptConfigsPath
    : `/${promptConfigsPath}`;
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

export default function PromptConfigEditForm({ mode, initialPromptConfig }: PromptConfigEditFormProps) {
  const router = useRouter();
  const [key, setKey] = useState(initialPromptConfig?.key ?? "");
  const [systemPrompt, setSystemPrompt] = useState(initialPromptConfig?.system_prompt ?? "");
  const [userPrompt, setUserPrompt] = useState(initialPromptConfig?.user_prompt ?? "");
  const [isActive, setIsActive] = useState(initialPromptConfig?.is_active ?? true);
  const [status, setStatus] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const baseUrl = useMemo(
    () => process.env.NEXT_PUBLIC_PYTHON_API_BASE_URL ?? "http://127.0.0.1:8000",
    []
  );
  const promptConfigsPath = useMemo(
    () => process.env.NEXT_PUBLIC_PYTHON_API_PROMPT_CONFIGS_PATH ?? "/prompt-configs",
    []
  );
  const promptConfigsUrl = useMemo(
    () => buildPromptConfigsUrl(baseUrl, promptConfigsPath),
    [baseUrl, promptConfigsPath]
  );
  const isBusy = isSaving || isDeleting;

  function getHeaders(): HeadersInit {
    const token = getCookieValue("python_api_token");
    const tokenType = getCookieValue("python_api_token_type");
    return buildAuthHeaders(token, tokenType);
  }

  function getTargetKey(): string {
    if (mode === "edit") {
      return initialPromptConfig?.key ?? "";
    }

    return key.trim();
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setStatus("");

    try {
      const payloadKey = key.trim();
      const targetKey = getTargetKey();

      if (!payloadKey || !targetKey) {
        throw new Error("Key is required.");
      }

      const response = await fetch(`${promptConfigsUrl}/${encodeURIComponent(targetKey)}`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify({
          key: payloadKey,
          system_prompt: systemPrompt,
          user_prompt: userPrompt,
          is_active: isActive
        })
      });

      if (response.status === 401) {
        setStatus("Unauthorized. Please log in.");
        router.push("/login");
        return;
      }

      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        throw new Error(
          `Failed to save prompt config: ${response.status}${detail ? ` - ${detail.slice(0, 200)}` : ""}`
        );
      }

      const saved = (await response.json()) as PromptConfig;
      setStatus("Saved successfully.");
      router.push(`/prompt-configs/${encodeURIComponent(saved.key)}`);
      router.refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to save prompt config.");
    } finally {
      setIsSaving(false);
    }
  }

  async function onDelete() {
    const targetKey = getTargetKey();
    if (mode !== "edit" || !targetKey) {
      return;
    }

    const shouldDelete = window.confirm("Delete this prompt config? This action cannot be undone.");
    if (!shouldDelete) {
      return;
    }

    setIsDeleting(true);
    setStatus("");

    try {
      const response = await fetch(`${promptConfigsUrl}/${encodeURIComponent(targetKey)}`, {
        method: "DELETE",
        headers: getHeaders()
      });

      if (response.status === 401) {
        setStatus("Unauthorized. Please log in.");
        router.push("/login");
        return;
      }

      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        throw new Error(
          `Failed to delete prompt config: ${response.status}${detail ? ` - ${detail.slice(0, 200)}` : ""}`
        );
      }

      setStatus("Deleted successfully.");
      router.push("/prompt-configs");
      router.refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to delete prompt config.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <form className="userForm" onSubmit={onSubmit}>
      <label>
        Key
        <input
          value={key}
          onChange={(event) => setKey(event.target.value)}
          disabled={isBusy || mode === "edit"}
          required
        />
      </label>

      <label>
        System Prompt
        <textarea
          value={systemPrompt}
          onChange={(event) => setSystemPrompt(event.target.value)}
          disabled={isBusy}
          rows={7}
          required
        />
      </label>

      <label>
        User Prompt
        <textarea
          value={userPrompt}
          onChange={(event) => setUserPrompt(event.target.value)}
          disabled={isBusy}
          rows={7}
          required
        />
      </label>

      <label className="checkboxLabel">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(event) => setIsActive(event.target.checked)}
          disabled={isBusy}
        />
        Active
      </label>

      <div className="formActions">
        <button type="submit" disabled={isBusy}>
          {isSaving ? "Saving..." : mode === "create" ? "Create Prompt Config" : "Save Changes"}
        </button>

        {mode === "edit" ? (
          <button
            type="button"
            className="dangerBtn"
            disabled={isBusy}
            onClick={onDelete}
          >
            {isDeleting ? "Deleting..." : "Delete Prompt Config"}
          </button>
        ) : null}
      </div>

      {status ? <p className="statusText">{status}</p> : null}
    </form>
  );
}
