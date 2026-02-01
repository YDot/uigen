"use client";

import { Loader2 } from "lucide-react";

interface ToolArgs {
  command?: string;
  path?: string;
  new_path?: string;
  [key: string]: unknown;
}

interface ToolInvocation {
  toolName: string;
  args: ToolArgs;
  state: string;
  result?: unknown;
}

interface ToolInvocationDisplayProps {
  toolInvocation: ToolInvocation;
}

function getToolDescription(toolName: string, args: ToolArgs): string {
  const path = args?.path || "unknown file";

  if (toolName === "str_replace_editor") {
    switch (args?.command) {
      case "create":
        return `Creating ${path}`;
      case "str_replace":
      case "insert":
        return `Editing ${path}`;
      case "view":
        return `Viewing ${path}`;
      case "undo_edit":
        return `Undoing edit in ${path}`;
      default:
        return `Working on ${path}`;
    }
  }

  if (toolName === "file_manager") {
    switch (args?.command) {
      case "rename":
        return `Renaming ${path} → ${args?.new_path || "unknown"}`;
      case "delete":
        return `Deleting ${path}`;
      default:
        return `Managing ${path}`;
    }
  }

  return toolName;
}

export function ToolInvocationDisplay({
  toolInvocation,
}: ToolInvocationDisplayProps) {
  const { toolName, args, state, result } = toolInvocation;
  const description = getToolDescription(toolName, args || {});
  const isCompleted = state === "result" && result !== undefined;

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs font-mono border border-neutral-200">
      {isCompleted ? (
        <>
          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
          <span className="text-neutral-700">{description}</span>
        </>
      ) : (
        <>
          <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
          <span className="text-neutral-700">{description}</span>
        </>
      )}
    </div>
  );
}
