// ─── Base config ─────────────────────────────────────────────────────────────
const BASE = process.env.NEXT_PUBLIC_API_URL = "http://localhost:5000";

export interface User {
  id: number;
  name: string;
  username: string;
  email: string;
  role: string;
}

// ─── Auth storage ─────────────────────────────────────────────────────────────
export function saveUser(user: User) {
  if (typeof window !== "undefined")
    localStorage.setItem("auth_user", JSON.stringify(user));
}

export function loadUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("auth_user");
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export function clearUser() {
  if (typeof window !== "undefined")
    localStorage.removeItem("auth_user");
}

// ─── Core fetch ───────────────────────────────────────────────────────────────
async function req<T>(
  path: string,
  user: User | null,
  opts: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((opts.headers as Record<string, string>) ?? {}),
  };

  if (user) {
    headers["X-User-Id"]   = String(user.id);
    headers["X-User-Role"] = user.role;
  }

  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    ...opts,
    headers,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data as T;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
// Accepts email OR username in the `email` field — backend checks both
export const login = async (body: { email: string; password: string }) => {
  const data = await req<{ message: string; user: User }>(
    "/users/login",
    null,
    {
      method: "POST",
      body: JSON.stringify({
        identifier: body.email.trim(), // backend checks username OR email
        password:   body.password,
      }),
    }
  );
  saveUser(data.user);   // persists to localStorage
  return data;
};

export const logout = async (user: User | null) => {
  const data = await req<{ message: string }>("/users/logout", user, {
    method: "POST",
  });
  clearUser();
  return data;
};

// ─── Users ────────────────────────────────────────────────────────────────────
export const listUsers = (user: User) =>
  req<User[]>("/users/", user);

export const createUser = (
  user: User,
  body: { name: string; username: string; email: string; password: string; role?: string }
) =>
  req<{ message: string; id: number }>("/users/register", user, {
    method: "POST",
    body: JSON.stringify(body),
  });

export const updateUser = (
  user: User,
  id: number,
  fields: Partial<{ name: string; username: string; email: string; password: string; role: string }>
) =>
  req<{ message: string }>(`/users/${id}`, user, {
    method: "PUT",
    body: JSON.stringify(fields),
  });

export const deleteUser = (user: User, id: number) =>
  req<{ message: string }>(`/users/${id}`, user, { method: "DELETE" });

// ─── Password vault ───────────────────────────────────────────────────────────
export interface PasswordEntry {
  id: number;
  user_id: number;
  title: string;
  username: string;
  url: string;
  notes: string;
  created_at: string;
  updated_at: string;
  password?: string;
}

export const listPasswords = (user: User, userId?: number) => {
  const qs = userId !== undefined ? `?user_id=${userId}` : "";
  return req<PasswordEntry[]>(`/passwords/${qs}`, user);
};

export const createPassword = (
  user: User,
  body: { title: string; password: string; username?: string; url?: string; notes?: string }
) =>
  req<PasswordEntry>("/passwords/", user, {
    method: "POST",
    body: JSON.stringify(body),
  });

export const updatePassword = (
  user: User,
  id: number,
  fields: Partial<{ title: string; username: string; url: string; notes: string; password: string }>
) =>
  req<PasswordEntry>(`/passwords/${id}`, user, {
    method: "PUT",
    body: JSON.stringify(fields),
  });

export const deletePassword = (user: User, id: number) =>
  req<{ message: string }>(`/passwords/${id}`, user, { method: "DELETE" });

export const revealPassword = (user: User, id: number, masterPassword: string) =>
  req<{ password: string }>(`/passwords/${id}/reveal`, user, {
    method: "POST",
    body: JSON.stringify({ master_password: masterPassword }),
  });