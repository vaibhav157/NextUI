import Link from "next/link";
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

async function getUsers(): Promise<User[]> {
  const baseUrl = process.env.PYTHON_API_BASE_URL ?? "http://127.0.0.1:8000";
  const usersPath = process.env.PYTHON_API_USERS_PATH ?? "/users";
  const response = await fetch(buildUsersUrl(baseUrl, usersPath), {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Failed to load users: ${response.status}`);
  }

  const payload = (await response.json()) as User[] | { users: User[] };
  if (Array.isArray(payload)) {
    return payload;
  }
  return payload.users;
}

export default async function UsersPage() {
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
}
