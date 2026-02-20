import Link from "next/link";
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

async function getUser(id: string): Promise<User> {
  const baseUrl = process.env.PYTHON_API_BASE_URL ?? "http://127.0.0.1:8000";
  const usersPath = process.env.PYTHON_API_USERS_PATH ?? "/users";
  const usersUrl = buildUsersUrl(baseUrl, usersPath);
  const response = await fetch(`${usersUrl}/${id}`, {
    cache: "no-store"
  });

  if (response.status === 404) {
    const listResponse = await fetch(usersUrl, {
      cache: "no-store"
    });
    if (!listResponse.ok) {
      throw new Error(`Failed to load users: ${listResponse.status}`);
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
    throw new Error(`Failed to load user ${id}: ${response.status}`);
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
