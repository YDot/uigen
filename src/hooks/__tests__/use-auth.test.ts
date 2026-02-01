import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useAuth } from "../use-auth";
import * as actions from "@/actions";
import * as anonTracker from "@/lib/anon-work-tracker";
import * as getProjectsAction from "@/actions/get-projects";
import * as createProjectAction from "@/actions/create-project";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

vi.mock("@/actions", () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: vi.fn(),
  clearAnonWork: vi.fn(),
}));

vi.mock("@/actions/get-projects", () => ({
  getProjects: vi.fn(),
}));

vi.mock("@/actions/create-project", () => ({
  createProject: vi.fn(),
}));

describe("useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("initial state", () => {
    test("returns isLoading as false initially", () => {
      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(false);
    });

    test("returns signIn and signUp functions", () => {
      const { result } = renderHook(() => useAuth());

      expect(typeof result.current.signIn).toBe("function");
      expect(typeof result.current.signUp).toBe("function");
    });
  });

  describe("signIn", () => {
    test("sets isLoading to true during sign in and false after", async () => {
      vi.mocked(actions.signIn).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ success: false }), 100))
      );

      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(false);

      let signInPromise: Promise<any>;
      act(() => {
        signInPromise = result.current.signIn("test@example.com", "password123");
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        vi.advanceTimersByTime(100);
        await signInPromise;
      });

      expect(result.current.isLoading).toBe(false);
    });

    test("returns success result from signIn action", async () => {
      vi.mocked(actions.signIn).mockResolvedValue({ success: true });
      vi.mocked(anonTracker.getAnonWorkData).mockReturnValue(null);
      vi.mocked(getProjectsAction.getProjects).mockResolvedValue([]);
      vi.mocked(createProjectAction.createProject).mockResolvedValue({
        id: "new-project-id",
        name: "New Design",
        userId: "user-id",
        messages: "[]",
        data: "{}",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const { result } = renderHook(() => useAuth());

      let signInResult: any;
      await act(async () => {
        signInResult = await result.current.signIn("test@example.com", "password123");
      });

      expect(signInResult).toEqual({ success: true });
      expect(actions.signIn).toHaveBeenCalledWith("test@example.com", "password123");
    });

    test("returns error result from signIn action", async () => {
      vi.mocked(actions.signIn).mockResolvedValue({
        success: false,
        error: "Invalid credentials",
      });

      const { result } = renderHook(() => useAuth());

      let signInResult: any;
      await act(async () => {
        signInResult = await result.current.signIn("test@example.com", "wrongpassword");
      });

      expect(signInResult).toEqual({ success: false, error: "Invalid credentials" });
      expect(mockPush).not.toHaveBeenCalled();
    });

    test("redirects to project with anonymous work after successful sign in", async () => {
      const anonWork = {
        messages: [{ id: "1", role: "user", content: "Hello" }],
        fileSystemData: { "/App.jsx": { type: "file", content: "test" } },
      };

      vi.mocked(actions.signIn).mockResolvedValue({ success: true });
      vi.mocked(anonTracker.getAnonWorkData).mockReturnValue(anonWork);
      vi.mocked(createProjectAction.createProject).mockResolvedValue({
        id: "anon-project-id",
        name: "Design from 10:30:00 AM",
        userId: "user-id",
        messages: JSON.stringify(anonWork.messages),
        data: JSON.stringify(anonWork.fileSystemData),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("test@example.com", "password123");
      });

      expect(createProjectAction.createProject).toHaveBeenCalledWith({
        name: expect.stringMatching(/^Design from /),
        messages: anonWork.messages,
        data: anonWork.fileSystemData,
      });
      expect(anonTracker.clearAnonWork).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/anon-project-id");
    });

    test("redirects to most recent project when no anonymous work exists", async () => {
      vi.mocked(actions.signIn).mockResolvedValue({ success: true });
      vi.mocked(anonTracker.getAnonWorkData).mockReturnValue(null);
      vi.mocked(getProjectsAction.getProjects).mockResolvedValue([
        {
          id: "recent-project-id",
          name: "Recent Project",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "older-project-id",
          name: "Older Project",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("test@example.com", "password123");
      });

      expect(mockPush).toHaveBeenCalledWith("/recent-project-id");
      expect(createProjectAction.createProject).not.toHaveBeenCalled();
    });

    test("creates new project when user has no existing projects", async () => {
      vi.mocked(actions.signIn).mockResolvedValue({ success: true });
      vi.mocked(anonTracker.getAnonWorkData).mockReturnValue(null);
      vi.mocked(getProjectsAction.getProjects).mockResolvedValue([]);
      vi.mocked(createProjectAction.createProject).mockResolvedValue({
        id: "new-project-id",
        name: "New Design #12345",
        userId: "user-id",
        messages: "[]",
        data: "{}",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("test@example.com", "password123");
      });

      expect(createProjectAction.createProject).toHaveBeenCalledWith({
        name: expect.stringMatching(/^New Design #\d+$/),
        messages: [],
        data: {},
      });
      expect(mockPush).toHaveBeenCalledWith("/new-project-id");
    });

    test("does not redirect on failed sign in", async () => {
      vi.mocked(actions.signIn).mockResolvedValue({
        success: false,
        error: "Invalid credentials",
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("test@example.com", "wrongpassword");
      });

      expect(mockPush).not.toHaveBeenCalled();
      expect(anonTracker.getAnonWorkData).not.toHaveBeenCalled();
      expect(getProjectsAction.getProjects).not.toHaveBeenCalled();
    });

    test("sets isLoading to false even when action throws", async () => {
      vi.mocked(actions.signIn).mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await expect(result.current.signIn("test@example.com", "password123")).rejects.toThrow(
          "Network error"
        );
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("signUp", () => {
    test("sets isLoading to true during sign up and false after", async () => {
      vi.mocked(actions.signUp).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ success: false }), 100))
      );

      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(false);

      let signUpPromise: Promise<any>;
      act(() => {
        signUpPromise = result.current.signUp("test@example.com", "password123");
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        vi.advanceTimersByTime(100);
        await signUpPromise;
      });

      expect(result.current.isLoading).toBe(false);
    });

    test("returns success result from signUp action", async () => {
      vi.mocked(actions.signUp).mockResolvedValue({ success: true });
      vi.mocked(anonTracker.getAnonWorkData).mockReturnValue(null);
      vi.mocked(getProjectsAction.getProjects).mockResolvedValue([]);
      vi.mocked(createProjectAction.createProject).mockResolvedValue({
        id: "new-project-id",
        name: "New Design",
        userId: "user-id",
        messages: "[]",
        data: "{}",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const { result } = renderHook(() => useAuth());

      let signUpResult: any;
      await act(async () => {
        signUpResult = await result.current.signUp("test@example.com", "password123");
      });

      expect(signUpResult).toEqual({ success: true });
      expect(actions.signUp).toHaveBeenCalledWith("test@example.com", "password123");
    });

    test("returns error result from signUp action", async () => {
      vi.mocked(actions.signUp).mockResolvedValue({
        success: false,
        error: "Email already registered",
      });

      const { result } = renderHook(() => useAuth());

      let signUpResult: any;
      await act(async () => {
        signUpResult = await result.current.signUp("existing@example.com", "password123");
      });

      expect(signUpResult).toEqual({ success: false, error: "Email already registered" });
      expect(mockPush).not.toHaveBeenCalled();
    });

    test("redirects to project with anonymous work after successful sign up", async () => {
      const anonWork = {
        messages: [{ id: "1", role: "user", content: "Create a button" }],
        fileSystemData: { "/App.jsx": { type: "file", content: "export default App" } },
      };

      vi.mocked(actions.signUp).mockResolvedValue({ success: true });
      vi.mocked(anonTracker.getAnonWorkData).mockReturnValue(anonWork);
      vi.mocked(createProjectAction.createProject).mockResolvedValue({
        id: "anon-project-id",
        name: "Design from 10:30:00 AM",
        userId: "user-id",
        messages: JSON.stringify(anonWork.messages),
        data: JSON.stringify(anonWork.fileSystemData),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("new@example.com", "password123");
      });

      expect(createProjectAction.createProject).toHaveBeenCalledWith({
        name: expect.stringMatching(/^Design from /),
        messages: anonWork.messages,
        data: anonWork.fileSystemData,
      });
      expect(anonTracker.clearAnonWork).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/anon-project-id");
    });

    test("creates new project for new user with no anonymous work", async () => {
      vi.mocked(actions.signUp).mockResolvedValue({ success: true });
      vi.mocked(anonTracker.getAnonWorkData).mockReturnValue(null);
      vi.mocked(getProjectsAction.getProjects).mockResolvedValue([]);
      vi.mocked(createProjectAction.createProject).mockResolvedValue({
        id: "new-project-id",
        name: "New Design #54321",
        userId: "user-id",
        messages: "[]",
        data: "{}",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("new@example.com", "password123");
      });

      expect(createProjectAction.createProject).toHaveBeenCalledWith({
        name: expect.stringMatching(/^New Design #\d+$/),
        messages: [],
        data: {},
      });
      expect(mockPush).toHaveBeenCalledWith("/new-project-id");
    });

    test("does not redirect on failed sign up", async () => {
      vi.mocked(actions.signUp).mockResolvedValue({
        success: false,
        error: "Password must be at least 8 characters",
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("test@example.com", "short");
      });

      expect(mockPush).not.toHaveBeenCalled();
      expect(anonTracker.getAnonWorkData).not.toHaveBeenCalled();
    });

    test("sets isLoading to false even when action throws", async () => {
      vi.mocked(actions.signUp).mockRejectedValue(new Error("Server error"));

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await expect(result.current.signUp("test@example.com", "password123")).rejects.toThrow(
          "Server error"
        );
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("edge cases", () => {
    test("handles anonymous work with empty messages array", async () => {
      vi.mocked(actions.signIn).mockResolvedValue({ success: true });
      vi.mocked(anonTracker.getAnonWorkData).mockReturnValue({
        messages: [],
        fileSystemData: {},
      });
      vi.mocked(getProjectsAction.getProjects).mockResolvedValue([
        {
          id: "existing-project",
          name: "Existing",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("test@example.com", "password123");
      });

      // Should not create project from empty anonymous work
      expect(mockPush).toHaveBeenCalledWith("/existing-project");
    });

    test("handles concurrent sign in calls", async () => {
      let resolveFirst: (value: any) => void;
      let resolveSecond: (value: any) => void;

      vi.mocked(actions.signIn)
        .mockImplementationOnce(() => new Promise((r) => (resolveFirst = r)))
        .mockImplementationOnce(() => new Promise((r) => (resolveSecond = r)));

      vi.mocked(anonTracker.getAnonWorkData).mockReturnValue(null);
      vi.mocked(getProjectsAction.getProjects).mockResolvedValue([
        { id: "project-1", name: "Project 1", createdAt: new Date(), updatedAt: new Date() },
      ]);

      const { result } = renderHook(() => useAuth());

      let firstPromise: Promise<any>;
      let secondPromise: Promise<any>;

      act(() => {
        firstPromise = result.current.signIn("first@example.com", "password123");
        secondPromise = result.current.signIn("second@example.com", "password456");
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveFirst!({ success: true });
        await firstPromise;
      });

      // isLoading may still be true because second call is pending
      await act(async () => {
        resolveSecond!({ success: true });
        await secondPromise;
      });

      expect(result.current.isLoading).toBe(false);
    });
  });
});
