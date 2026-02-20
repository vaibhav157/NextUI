import Link from "next/link";
import UserEditForm from "../[id]/user-edit-form";

export default function NewUserPage() {
  return (
    <main className="page">
      <section className="card">
        <p className="subtitle">
          <Link href="/">Back to users</Link>
        </p>
        <h1>Create User</h1>
        <p className="subtitle">Create a new user and save via your Python API.</p>
        <UserEditForm mode="create" />
      </section>
    </main>
  );
}
