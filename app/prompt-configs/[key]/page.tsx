import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import PromptConfigEditForm, { PromptConfig } from "./prompt-config-edit-form";

type PromptConfigDetailPageProps = {
  params: {
    key: string;
  };
};

function buildPromptConfigsUrl(baseUrl: string, promptConfigsPath: string): string {
  const normalizedBase = baseUrl.replace(/\/+$/, "");
  const normalizedPath = promptConfigsPath.startsWith("/")
    ? promptConfigsPath
    : `/${promptConfigsPath}`;
  return `${normalizedBase}${normalizedPath}`;
}

function buildAuthHeaders(token?: string, tokenType?: string): HeadersInit | undefined {
  if (!token) {
    return undefined;
  }

  const normalizedType = tokenType && tokenType.trim().length > 0 ? tokenType.trim() : "Bearer";
  const authValue = token.startsWith(`${normalizedType} `) ? token : `${normalizedType} ${token}`;

  return {
    Authorization: authValue
  };
}

function getAuthContext(): { token?: string; tokenType?: string } {
  const cookieStore = cookies();
  const token = cookieStore.get("python_api_token")?.value ?? process.env.PYTHON_API_TOKEN;
  const tokenType =
    cookieStore.get("python_api_token_type")?.value ??
    process.env.PYTHON_API_TOKEN_TYPE ??
    "Bearer";

  return { token, tokenType };
}

async function getPromptConfig(key: string): Promise<PromptConfig> {
  const baseUrl = process.env.PYTHON_API_BASE_URL ?? "http://127.0.0.1:8000";
  const promptConfigsPath = process.env.PYTHON_API_PROMPT_CONFIGS_PATH ?? "/prompt-configs";
  const { token, tokenType } = getAuthContext();

  const promptConfigsUrl = buildPromptConfigsUrl(baseUrl, promptConfigsPath);
  const response = await fetch(`${promptConfigsUrl}/${encodeURIComponent(key)}`, {
    cache: "no-store",
    headers: buildAuthHeaders(token, tokenType)
  });

  if (response.status === 401) {
    redirect("/login");
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Failed to load prompt config ${key}: ${response.status}${detail ? ` - ${detail.slice(0, 200)}` : ""}`
    );
  }

  return (await response.json()) as PromptConfig;
}

export default async function PromptConfigDetailPage({ params }: PromptConfigDetailPageProps) {
  const decodedKey = decodeURIComponent(params.key);
  const promptConfig = await getPromptConfig(decodedKey);

  return (
    <main className="page">
      <section className="card">
        <p className="subtitle">
          <Link href="/prompt-configs">Back to prompt configs</Link>
        </p>
        <h1>Edit Prompt Config</h1>
        <p className="subtitle">Update this prompt config and save via your Python API.</p>
        <PromptConfigEditForm mode="edit" initialPromptConfig={promptConfig} />
      </section>
    </main>
  );
}
