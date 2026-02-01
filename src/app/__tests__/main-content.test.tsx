import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MainContent } from "../main-content";

// Mock the components that might have complex dependencies
vi.mock("@/components/chat/ChatInterface", () => ({
  ChatInterface: () => <div data-testid="chat-interface">Chat Interface</div>,
}));

vi.mock("@/components/editor/FileTree", () => ({
  FileTree: () => <div data-testid="file-tree">File Tree</div>,
}));

vi.mock("@/components/editor/CodeEditor", () => ({
  CodeEditor: () => <div data-testid="code-editor">Code Editor</div>,
}));

vi.mock("@/components/preview/PreviewFrame", () => ({
  PreviewFrame: () => <div data-testid="preview-frame">Preview Frame</div>,
}));

vi.mock("@/components/HeaderActions", () => ({
  HeaderActions: () => <div data-testid="header-actions">Header Actions</div>,
}));

describe("MainContent Toggle Buttons", () => {
  it("should start with preview tab active by default", () => {
    render(<MainContent />);

    const previewButton = screen.getByRole("tab", { name: /preview/i });
    const codeButton = screen.getByRole("tab", { name: /code/i });

    expect(previewButton).toHaveAttribute("data-state", "active");
    expect(codeButton).toHaveAttribute("data-state", "inactive");
  });

  it("should toggle to code tab when code button is clicked", async () => {
    render(<MainContent />);

    const codeButton = screen.getByRole("tab", { name: /code/i });

    fireEvent.click(codeButton);

    await waitFor(() => {
      expect(codeButton).toHaveAttribute("data-state", "active");
    });
  });

  it("should toggle back to preview tab when preview button is clicked", async () => {
    render(<MainContent />);

    const previewButton = screen.getByRole("tab", { name: /preview/i });
    const codeButton = screen.getByRole("tab", { name: /code/i });

    // First click code
    fireEvent.click(codeButton);

    await waitFor(() => {
      expect(codeButton).toHaveAttribute("data-state", "active");
    });

    // Then click preview
    fireEvent.click(previewButton);

    await waitFor(() => {
      expect(previewButton).toHaveAttribute("data-state", "active");
      expect(codeButton).toHaveAttribute("data-state", "inactive");
    });
  });

  it("should toggle multiple times without issues", async () => {
    render(<MainContent />);

    const previewButton = screen.getByRole("tab", { name: /preview/i });
    const codeButton = screen.getByRole("tab", { name: /code/i });

    // Click code
    fireEvent.click(codeButton);
    await waitFor(() => {
      expect(codeButton).toHaveAttribute("data-state", "active");
    });

    // Click preview
    fireEvent.click(previewButton);
    await waitFor(() => {
      expect(previewButton).toHaveAttribute("data-state", "active");
    });

    // Click code again
    fireEvent.click(codeButton);
    await waitFor(() => {
      expect(codeButton).toHaveAttribute("data-state", "active");
    });

    // Click preview again
    fireEvent.click(previewButton);
    await waitFor(() => {
      expect(previewButton).toHaveAttribute("data-state", "active");
    });
  });

  it("should show preview frame when preview tab is active", () => {
    render(<MainContent />);

    expect(screen.getByTestId("preview-frame")).toBeInTheDocument();
    expect(screen.queryByTestId("code-editor")).not.toBeInTheDocument();
  });

  it("should show code editor when code tab is active", async () => {
    render(<MainContent />);

    const codeButton = screen.getByRole("tab", { name: /code/i });
    fireEvent.click(codeButton);

    await waitFor(() => {
      expect(screen.getByTestId("code-editor")).toBeInTheDocument();
      expect(screen.queryByTestId("preview-frame")).not.toBeInTheDocument();
    });
  });
});
