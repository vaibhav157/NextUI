import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import UserEditForm, { User } from "./user-edit-form";

type UserDetailPageProps = {
  params: {
    id: string;
  };
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

async function getUser(id: string): Promise<User> {
  const baseUrl = process.env.PYTHON_API_BASE_URL ?? "http://127.0.0.1:8000";
  const usersPath = process.env.PYTHON_API_USERS_PATH ?? "/users";
  const { token, tokenType } = getAuthContext();
  const headers = buildAuthHeaders(token, tokenType);
  const usersUrl = buildUsersUrl(baseUrl, usersPath);
  const response = await fetch(`${usersUrl}/${id}`, {
    cache: "no-store",
    headers
  });

  if (response.status === 401) {
    redirect("/login");
  }

  if (response.status === 404) {
    const listResponse = await fetch(usersUrl, {
      cache: "no-store",
      headers
    });

    if (listResponse.status === 401) {
      redirect("/login");
    }

    if (!listResponse.ok) {
      const detail = await listResponse.text().catch(() => "");
      throw new Error(
        `Failed to load users: ${listResponse.status}${detail ? ` - ${detail.slice(0, 200)}` : ""}`
      );
    }

    const payload = (await listResponse.json()) as User[] | { users: User[] };
    const users = Array.isArray(payload) ? payload : payload.users;
    const user = users.find((entry) => String(entry.id) === id);
    if (!user) {
      throw new Error(`User ${id} was not found in users list.`);
    }

    return user;
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Failed to load user ${id}: ${response.status}${detail ? ` - ${detail.slice(0, 200)}` : ""}`
    );
  }

  return (await response.json()) as User;
}

export default async function UserDetailPage({ params }: UserDetailPageProps) {
  const user = await getUser(params.id);

  return (
    <main className="page">
      <section className="card">
        <p className="subtitle">
          <Link href="/">Back to users</Link>
        </p>
        <h1>Edit User</h1>
        <p className="subtitle">Update this user and save via your Python POST API.</p>
        <UserEditForm mode="edit" initialUser={user} />
      </section>
    </main>
  );
}
