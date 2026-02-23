"use client";

import { useRouter } from "next/navigation";

type PromptConfig = {
  id: number;
  key: string;
  is_active: boolean;
  system_prompt: string;
  user_prompt: string;
};

type PromptConfigsTableProps = {
  promptConfigs: PromptConfig[];
};

function clipText(value: string, max = 60): string {
  if (value.length <= max) {
    return value;
  }

  return `${value.slice(0, max)}...`;
}

export default function PromptConfigsTable({ promptConfigs }: PromptConfigsTableProps) {
  const router = useRouter();

  return (
    <div className="tableWrap">
      <table>
        <thead>
          <tr>
            <th>Key</th>
            <th>Status</th>
            <th>System Prompt</th>
            <th>User Prompt</th>
          </tr>
        </thead>
        <tbody>
          {promptConfigs.map((config) => (
            <tr
              key={config.id}
              className="clickableRow"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  router.push(`/prompt-configs/${encodeURIComponent(config.key)}`);
                }
              }}
              onClick={() => router.push(`/prompt-configs/${encodeURIComponent(config.key)}`)}
            >
              <td>{config.key}</td>
              <td>
                <span className={config.is_active ? "badge" : "badge inactiveBadge"}>
                  {config.is_active ? "Active" : "Inactive"}
                </span>
              </td>
              <td>{clipText(config.system_prompt)}</td>
              <td>{clipText(config.user_prompt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
