import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import PromptConfigsTable from "./prompt-configs-table";

type PromptConfig = {
  id: number;
  key: string;
  system_prompt: string;
  user_prompt: string;
  is_active: boolean;
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

async function getPromptConfigs(): Promise<PromptConfig[]> {
  const baseUrl = process.env.PYTHON_API_BASE_URL ?? "http://127.0.0.1:8000";
  const promptConfigsPath = process.env.PYTHON_API_PROMPT_CONFIGS_PATH ?? "/prompt-configs";
  const { token, tokenType } = getAuthContext();

  const response = await fetch(buildPromptConfigsUrl(baseUrl, promptConfigsPath), {
    cache: "no-store",
    headers: buildAuthHeaders(token, tokenType)
  });

  if (response.status === 401) {
    redirect("/login");
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Failed to load prompt configs: ${response.status}${detail ? ` - ${detail.slice(0, 200)}` : ""}`
    );
  }

  return (await response.json()) as PromptConfig[];
}

function renderAccessError(message: string) {
  const isAdminAccessError = message.includes("403") && message.includes("Admin access required");

  return (
    <main className="page">
      <section className="card">
        <h1>{isAdminAccessError ? "Admin Access Required" : "Unable to Load Prompt Configs"}</h1>
        <p className="subtitle">
          {isAdminAccessError
            ? "Your account is authenticated but does not have permission to view prompt configs."
            : "There was a problem loading prompt configs from the API."}
        </p>
        <p className="subtitle">
          {isAdminAccessError
            ? "Please sign in with an admin account and try again."
            : message}
        </p>
        <Link href="/login" className="primaryBtn">
          Go to Login
        </Link>
      </section>
    </main>
  );
}

export default async function PromptConfigsPage() {
  try {
    const promptConfigs = await getPromptConfigs();

    return (
      <main className="page">
        <section className="card">
          <div className="headerRow">
            <h1>Prompt Configurations</h1>
            <Link href="/prompt-configs/new" className="primaryBtn">
              Create New
            </Link>
          </div>
          <p className="subtitle">Prompt configs loaded from your Python API.</p>

          <PromptConfigsTable promptConfigs={promptConfigs} />
        </section>
      </main>
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return renderAccessError(message);
  }
}
