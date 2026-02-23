import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import UsersTable from "./users-table";

type User = {
  id: number;
  name: string;
  email: string;
  role: string;
};

function buildUsersUrl(baseUrl: string, usersPath: string): string {
  const normalizedBase = baseUrl.replace(/\/+$/, "");
  const normalizedPath = usersPath.startsWith("/") ? usersPath : `/${usersPath}`;
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

async function getUsers(): Promise<User[]> {
  const baseUrl = process.env.PYTHON_API_BASE_URL ?? "http://127.0.0.1:8000";
  const usersPath = process.env.PYTHON_API_USERS_PATH ?? "/users";
  const { token, tokenType } = getAuthContext();
  const response = await fetch(buildUsersUrl(baseUrl, usersPath), {
    cache: "no-store",
    headers: buildAuthHeaders(token, tokenType)
  });

  if (response.status === 401) {
    redirect("/login");
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Failed to load users: ${response.status}${detail ? ` - ${detail.slice(0, 200)}` : ""}`
    );
  }

  const payload = (await response.json()) as User[] | { users: User[] };
  if (Array.isArray(payload)) {
    return payload;
  }

  return payload.users;
}

function renderAccessError(message: string) {
  const isAdminAccessError = message.includes("403") && message.includes("Admin access required");

  return (
    <main className="page">
      <section className="card">
        <h1>{isAdminAccessError ? "Admin Access Required" : "Unable to Load Users"}</h1>
        <p className="subtitle">
          {isAdminAccessError
            ? "Your account is authenticated but does not have permission to view users."
            : "There was a problem loading users from the API."}
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

export default async function UsersPage() {
  try {
    const users = await getUsers();

    return (
      <main className="page">
        <section className="card">
          <div className="headerRow">
            <h1>Users</h1>
            <Link href="/users/new" className="primaryBtn">
              Create New
            </Link>
          </div>
          <p className="subtitle">Users loaded from your Python API.</p>

          <UsersTable users={users} />
        </section>
      </main>
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return renderAccessError(message);
  }
}
