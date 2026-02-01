import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolInvocationDisplay } from "../ToolInvocationDisplay";

afterEach(() => {
  cleanup();
});

// str_replace_editor tests
test("displays 'Creating' for str_replace_editor create command", () => {
  render(
    <ToolInvocationDisplay
      toolInvocation={{
        toolName: "str_replace_editor",
        args: { command: "create", path: "/App.jsx" },
        state: "result",
        result: "Success",
      }}
    />
  );

  expect(screen.getByText("Creating /App.jsx")).toBeDefined();
});

test("displays 'Editing' for str_replace_editor str_replace command", () => {
  render(
    <ToolInvocationDisplay
      toolInvocation={{
        toolName: "str_replace_editor",
        args: { command: "str_replace", path: "/components/Button.jsx" },
        state: "result",
        result: "Success",
      }}
    />
  );

  expect(screen.getByText("Editing /components/Button.jsx")).toBeDefined();
});

test("displays 'Editing' for str_replace_editor insert command", () => {
  render(
    <ToolInvocationDisplay
      toolInvocation={{
        toolName: "str_replace_editor",
        args: { command: "insert", path: "/utils/helpers.js" },
        state: "result",
        result: "Success",
      }}
    />
  );

  expect(screen.getByText("Editing /utils/helpers.js")).toBeDefined();
});

test("displays 'Viewing' for str_replace_editor view command", () => {
  render(
    <ToolInvocationDisplay
      toolInvocation={{
        toolName: "str_replace_editor",
        args: { command: "view", path: "/App.jsx" },
        state: "result",
        result: "file contents",
      }}
    />
  );

  expect(screen.getByText("Viewing /App.jsx")).toBeDefined();
});

test("displays 'Undoing edit in' for str_replace_editor undo_edit command", () => {
  render(
    <ToolInvocationDisplay
      toolInvocation={{
        toolName: "str_replace_editor",
        args: { command: "undo_edit", path: "/App.jsx" },
        state: "result",
        result: "Success",
      }}
    />
  );

  expect(screen.getByText("Undoing edit in /App.jsx")).toBeDefined();
});

test("displays 'Working on' for str_replace_editor with unknown command", () => {
  render(
    <ToolInvocationDisplay
      toolInvocation={{
        toolName: "str_replace_editor",
        args: { command: "unknown_command", path: "/App.jsx" },
        state: "result",
        result: "Success",
      }}
    />
  );

  expect(screen.getByText("Working on /App.jsx")).toBeDefined();
});

// file_manager tests
test("displays 'Renaming' for file_manager rename command", () => {
  render(
    <ToolInvocationDisplay
      toolInvocation={{
        toolName: "file_manager",
        args: { command: "rename", path: "/old.jsx", new_path: "/new.jsx" },
        state: "result",
        result: "Success",
      }}
    />
  );

  expect(screen.getByText("Renaming /old.jsx → /new.jsx")).toBeDefined();
});

test("displays 'Deleting' for file_manager delete command", () => {
  render(
    <ToolInvocationDisplay
      toolInvocation={{
        toolName: "file_manager",
        args: { command: "delete", path: "/temp.jsx" },
        state: "result",
        result: "Success",
      }}
    />
  );

  expect(screen.getByText("Deleting /temp.jsx")).toBeDefined();
});

test("displays 'Managing' for file_manager with unknown command", () => {
  render(
    <ToolInvocationDisplay
      toolInvocation={{
        toolName: "file_manager",
        args: { command: "unknown", path: "/file.jsx" },
        state: "result",
        result: "Success",
      }}
    />
  );

  expect(screen.getByText("Managing /file.jsx")).toBeDefined();
});

// State indicator tests
test("shows green dot when state is 'result' with result", () => {
  const { container } = render(
    <ToolInvocationDisplay
      toolInvocation={{
        toolName: "str_replace_editor",
        args: { command: "create", path: "/App.jsx" },
        state: "result",
        result: "Success",
      }}
    />
  );

  const greenDot = container.querySelector(".bg-emerald-500");
  expect(greenDot).toBeDefined();
  expect(greenDot).not.toBeNull();
});

test("shows spinner when state is not 'result'", () => {
  const { container } = render(
    <ToolInvocationDisplay
      toolInvocation={{
        toolName: "str_replace_editor",
        args: { command: "create", path: "/App.jsx" },
        state: "pending",
      }}
    />
  );

  const spinner = container.querySelector(".animate-spin");
  expect(spinner).toBeDefined();
  expect(spinner).not.toBeNull();
});

test("shows spinner when state is 'result' but result is undefined", () => {
  const { container } = render(
    <ToolInvocationDisplay
      toolInvocation={{
        toolName: "str_replace_editor",
        args: { command: "create", path: "/App.jsx" },
        state: "result",
        result: undefined,
      }}
    />
  );

  const spinner = container.querySelector(".animate-spin");
  expect(spinner).toBeDefined();
  expect(spinner).not.toBeNull();
});

// Edge case tests
test("handles missing args gracefully", () => {
  render(
    <ToolInvocationDisplay
      toolInvocation={{
        toolName: "str_replace_editor",
        args: {} as { command?: string; path?: string },
        state: "result",
        result: "Success",
      }}
    />
  );

  expect(screen.getByText("Working on unknown file")).toBeDefined();
});

test("handles missing path in args", () => {
  render(
    <ToolInvocationDisplay
      toolInvocation={{
        toolName: "str_replace_editor",
        args: { command: "create" },
        state: "result",
        result: "Success",
      }}
    />
  );

  expect(screen.getByText("Creating unknown file")).toBeDefined();
});

test("handles missing new_path in rename command", () => {
  render(
    <ToolInvocationDisplay
      toolInvocation={{
        toolName: "file_manager",
        args: { command: "rename", path: "/old.jsx" },
        state: "result",
        result: "Success",
      }}
    />
  );

  expect(screen.getByText("Renaming /old.jsx → unknown")).toBeDefined();
});

test("falls back to tool name for unknown tools", () => {
  render(
    <ToolInvocationDisplay
      toolInvocation={{
        toolName: "some_unknown_tool",
        args: { path: "/file.jsx" },
        state: "result",
        result: "Success",
      }}
    />
  );

  expect(screen.getByText("some_unknown_tool")).toBeDefined();
});

test("shows correct description during in-progress state", () => {
  render(
    <ToolInvocationDisplay
      toolInvocation={{
        toolName: "str_replace_editor",
        args: { command: "create", path: "/App.jsx" },
        state: "pending",
      }}
    />
  );

  expect(screen.getByText("Creating /App.jsx")).toBeDefined();
});
