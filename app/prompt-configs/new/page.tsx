import Link from "next/link";
import PromptConfigEditForm from "../[key]/prompt-config-edit-form";

export default function NewPromptConfigPage() {
  return (
    <main className="page">
      <section className="card">
        <p className="subtitle">
          <Link href="/prompt-configs">Back to prompt configs</Link>
        </p>
        <h1>Create Prompt Config</h1>
        <p className="subtitle">Create a new prompt config and save via your Python API.</p>
        <PromptConfigEditForm mode="create" />
      </section>
    </main>
  );
}
