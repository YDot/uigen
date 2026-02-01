import { test, expect, vi, beforeEach, afterEach } from "vitest";

// Use vi.hoisted to define mocks that will be available during hoisting
const { mockSign, mockJwtVerify, mockCookieStore, mockSignJWT } = vi.hoisted(() => {
  const mockSign = vi.fn();
  const mockJwtVerify = vi.fn();
  const mockCookieStore = {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  };
  const mockSignJWT = vi.fn();
  return { mockSign, mockJwtVerify, mockCookieStore, mockSignJWT };
});

vi.mock("jose", () => ({
  SignJWT: mockSignJWT,
  jwtVerify: mockJwtVerify,
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));

vi.mock("server-only", () => ({}));

// Import after mocks are set up
import {
  createSession,
  getSession,
  deleteSession,
  verifySession,
} from "../auth";

function createMockNextRequest(token?: string) {
  return {
    cookies: {
      get: vi.fn((name: string) => {
        if (name === "auth-token" && token) {
          return { value: token };
        }
        return undefined;
      }),
    },
  } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSign.mockResolvedValue("mock-jwt-token");
  mockSignJWT.mockImplementation(() => ({
    setProtectedHeader: vi.fn().mockReturnThis(),
    setExpirationTime: vi.fn().mockReturnThis(),
    setIssuedAt: vi.fn().mockReturnThis(),
    sign: mockSign,
  }));
});

afterEach(() => {
  vi.restoreAllMocks();
});

// createSession tests
test("createSession sets an HttpOnly cookie with JWT token", async () => {
  await createSession("user-123", "test@example.com");

  expect(mockCookieStore.set).toHaveBeenCalledTimes(1);
  const [cookieName, token, options] = mockCookieStore.set.mock.calls[0];

  expect(cookieName).toBe("auth-token");
  expect(token).toBe("mock-jwt-token");
  expect(options.httpOnly).toBe(true);
  expect(options.sameSite).toBe("lax");
  expect(options.path).toBe("/");
  expect(options.expires).toBeInstanceOf(Date);
});

test("createSession sets secure cookie in production", async () => {
  const originalEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";

  await createSession("user-123", "test@example.com");

  const options = mockCookieStore.set.mock.calls[0][2];
  expect(options.secure).toBe(true);

  process.env.NODE_ENV = originalEnv;
});

test("createSession sets non-secure cookie in development", async () => {
  const originalEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "development";

  await createSession("user-123", "test@example.com");

  const options = mockCookieStore.set.mock.calls[0][2];
  expect(options.secure).toBe(false);

  process.env.NODE_ENV = originalEnv;
});

test("createSession sets cookie expiry to 7 days from now", async () => {
  const before = Date.now();
  await createSession("user-789", "expires@test.com");
  const after = Date.now();

  const options = mockCookieStore.set.mock.calls[0][2];
  const expiresTime = options.expires.getTime();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  expect(expiresTime).toBeGreaterThanOrEqual(before + sevenDaysMs - 1000);
  expect(expiresTime).toBeLessThanOrEqual(after + sevenDaysMs + 1000);
});

test("createSession calls SignJWT with correct payload", async () => {
  await createSession("user-abc", "abc@test.com");

  expect(mockSignJWT).toHaveBeenCalledWith(
    expect.objectContaining({
      userId: "user-abc",
      email: "abc@test.com",
      expiresAt: expect.any(Date),
    })
  );
});

// getSession tests
test("getSession returns null when no cookie exists", async () => {
  mockCookieStore.get.mockReturnValue(undefined);

  const session = await getSession();

  expect(session).toBeNull();
  expect(mockCookieStore.get).toHaveBeenCalledWith("auth-token");
});

test("getSession returns session payload for valid token", async () => {
  mockCookieStore.get.mockReturnValue({ value: "valid-token" });
  mockJwtVerify.mockResolvedValue({
    payload: {
      userId: "user-abc",
      email: "valid@test.com",
      expiresAt: new Date(),
    },
  });

  const session = await getSession();

  expect(session).not.toBeNull();
  expect(session?.userId).toBe("user-abc");
  expect(session?.email).toBe("valid@test.com");
});

test("getSession returns null for invalid token", async () => {
  mockCookieStore.get.mockReturnValue({ value: "invalid-token" });
  mockJwtVerify.mockRejectedValue(new Error("Invalid token"));

  const session = await getSession();

  expect(session).toBeNull();
});

test("getSession returns null for expired token", async () => {
  mockCookieStore.get.mockReturnValue({ value: "expired-token" });
  mockJwtVerify.mockRejectedValue(new Error("Token expired"));

  const session = await getSession();

  expect(session).toBeNull();
});

test("getSession calls jwtVerify with correct token", async () => {
  mockCookieStore.get.mockReturnValue({ value: "test-token-123" });
  mockJwtVerify.mockResolvedValue({
    payload: { userId: "user", email: "test@test.com" },
  });

  await getSession();

  expect(mockJwtVerify).toHaveBeenCalledWith("test-token-123", expect.anything());
});

// deleteSession tests
test("deleteSession removes the auth cookie", async () => {
  await deleteSession();

  expect(mockCookieStore.delete).toHaveBeenCalledTimes(1);
  expect(mockCookieStore.delete).toHaveBeenCalledWith("auth-token");
});

// verifySession tests
test("verifySession returns null when no cookie in request", async () => {
  const request = createMockNextRequest();

  const session = await verifySession(request);

  expect(session).toBeNull();
  expect(request.cookies.get).toHaveBeenCalledWith("auth-token");
});

test("verifySession returns session for valid token in request", async () => {
  const request = createMockNextRequest("valid-token");
  mockJwtVerify.mockResolvedValue({
    payload: {
      userId: "user-verify",
      email: "verify@test.com",
      expiresAt: new Date(),
    },
  });

  const session = await verifySession(request);

  expect(session).not.toBeNull();
  expect(session?.userId).toBe("user-verify");
  expect(session?.email).toBe("verify@test.com");
});

test("verifySession returns null for invalid token in request", async () => {
  const request = createMockNextRequest("invalid-token");
  mockJwtVerify.mockRejectedValue(new Error("Invalid signature"));

  const session = await verifySession(request);

  expect(session).toBeNull();
});

test("verifySession returns null for expired token in request", async () => {
  const request = createMockNextRequest("expired-token");
  mockJwtVerify.mockRejectedValue(new Error("Token expired"));

  const session = await verifySession(request);

  expect(session).toBeNull();
});

test("verifySession calls jwtVerify with token from request", async () => {
  const request = createMockNextRequest("request-token-456");
  mockJwtVerify.mockResolvedValue({
    payload: { userId: "user", email: "test@test.com" },
  });

  await verifySession(request);

  expect(mockJwtVerify).toHaveBeenCalledWith("request-token-456", expect.anything());
});

// Edge cases
test("getSession handles empty string token value", async () => {
  mockCookieStore.get.mockReturnValue({ value: "" });
  mockJwtVerify.mockRejectedValue(new Error("Empty token"));

  const session = await getSession();

  expect(session).toBeNull();
});

test("verifySession handles malformed request cookies", async () => {
  const request = {
    cookies: {
      get: vi.fn().mockReturnValue(undefined),
    },
  } as any;

  const session = await verifySession(request);

  expect(session).toBeNull();
});
