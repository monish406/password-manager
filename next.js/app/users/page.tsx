"use client";

import { useState, useEffect } from "react";
import { type User, loadUser } from "@/app/lib/api";
import { NavButtons } from "@/app/lib/components";

const API_BASE = process.env.NEXT_PUBLIC_API_URL 

// ─── Auth headers — matches what the Flask backend expects ───────────────────
const authHeaders = (currentUser: User) => ({
  "Content-Type": "application/json",
  "X-User-Id":   String(currentUser.id),
  "X-User-Role": currentUser.role,
});

// ─── Avatar helpers ───────────────────────────────────────────────────────────
const AVATAR_COLOURS = ["#4F7FE8", "#E8622A", "#22C55E", "#A855F7", "#EAB308", "#14B8A6"];
const getInitials = (name: string) =>
  name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
const getAvatarBg = (name: string) =>
  AVATAR_COLOURS[name.charCodeAt(0) % AVATAR_COLOURS.length];

// ─── Local display type (adds computed fields to the API User) ────────────────
type DisplayUser = User & { initials: string; avatarBg: string; role: string };

const toDisplay = (u: { id: number; name: string; username: string; email: string; role: string }): DisplayUser => ({
  ...u,
  initials: getInitials(u.name),
  avatarBg: getAvatarBg(u.name),
});

// ─── Eye Icon ────────────────────────────────────────────────────────────────
const EyeIcon = ({ visible }: { visible: boolean }) =>
  visible ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );

// ─── Password Input ───────────────────────────────────────────────────────────
const PasswordInput = ({
  value, onChange, placeholder, inputStyle,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string; inputStyle: React.CSSProperties;
}) => {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <input
        type={show ? "text" : "password"}
        style={{ ...inputStyle, paddingRight: 36 }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}
        tabIndex={-1}
      >
        <EyeIcon visible={show} />
      </button>
    </div>
  );
};

// ─── Types ────────────────────────────────────────────────────────────────────
type PasswordEntry = {
  id: number;
  title: string;
  username: string;
  url: string;
  notes: string;
  created_at: string | null;
  updated_at: string | null;
};

// ─── User Detail Panel ────────────────────────────────────────────────────────
const UserDetailPanel = ({
  user,
  onClose,
  currentUser,
}: {
  user: DisplayUser;
  onClose: () => void;
  currentUser: User;
}) => {
  const [showPw, setShowPw] = useState(false);
  const isOwnProfile = currentUser.id === user.id;
  const isAdmin = currentUser.role === "admin";

  // ── Password entries state (admin-only) ──
  const [entries, setEntries]           = useState<PasswordEntry[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [entriesError, setEntriesError] = useState("");
  const [showEntries, setShowEntries]   = useState(false);

  const fetchEntries = async () => {
    if (!isAdmin) return;
    setEntriesLoading(true);
    setEntriesError("");
    try {
      const res = await fetch(`${API_BASE}/passwords/?user_id=${user.id}`, {
        headers: {
          "Content-Type": "application/json",
          "X-User-Id":   String(currentUser.id),
          "X-User-Role": currentUser.role,
        },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setEntriesError(body.error ?? `Failed to load entries (${res.status})`);
        return;
      }
      const data = await res.json();
      setEntries(data);
      setShowEntries(true);
    } catch {
      setEntriesError("Network error — could not load entries.");
    } finally {
      setEntriesLoading(false);
    }
  };

  // Re-fetch whenever the selected user changes
  useEffect(() => {
    setEntries([]);
    setShowEntries(false);
    setEntriesError("");
  }, [user.id]);

  return (
    <aside style={{ width: 320, background: "#ffffff", borderLeft: "1px solid #E4E8F0", display: "flex", flexDirection: "column", flexShrink: 0, boxShadow: "-4px 0 16px #0000000D", overflowY: "auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px 14px" }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: "#1A1D2E" }}>User Details</span>
        <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#9CA3AF", fontSize: 18, lineHeight: 1, padding: 2 }}>✕</button>
      </div>

      <div style={{ padding: "0 20px 20px" }}>
        {/* ── Avatar ── */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20, paddingTop: 4 }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: user.avatarBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 700, color: "#fff" }}>{user.initials}</div>
        </div>

        {/* ── User fields ── */}
        {[{ label: "Name", value: user.name }, { label: "Username", value: user.username }, { label: "Email", value: user.email }, { label: "Role", value: user.role }].map(({ label, value }) => (
          <div key={label} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#9CA3AF", letterSpacing: "0.07em", marginBottom: 4, textTransform: "uppercase" }}>{label}</div>
            <div style={{ fontSize: 13, color: "#1A1D2E", wordBreak: "break-all" }}>{value}</div>
          </div>
        ))}

        {/* ── Own profile password reveal ── */}
        {isOwnProfile && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#9CA3AF", letterSpacing: "0.07em", marginBottom: 4, textTransform: "uppercase" }}>Password</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 13, color: "#1A1D2E", letterSpacing: showPw ? "normal" : "0.15em" }}>
                {showPw ? (user as DisplayUser & { password?: string }).password ?? "••••••••" : "••••••••"}
              </span>
              <button type="button" onClick={() => setShowPw((s) => !s)} style={{ background: "transparent", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }} title={showPw ? "Hide" : "Show"}>
                <EyeIcon visible={showPw} />
              </button>
            </div>
          </div>
        )}

        {/* ── Admin: Password Entries Section ── */}
        {isAdmin && (
          <div style={{ marginTop: 8 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#9CA3AF", letterSpacing: "0.07em", textTransform: "uppercase" }}>
                Password Entries
              </div>
              <button
                onClick={fetchEntries}
                disabled={entriesLoading}
                style={{ fontSize: 11, fontWeight: 600, color: "#1878CE", background: "transparent", border: "none", cursor: entriesLoading ? "not-allowed" : "pointer", padding: 0, opacity: entriesLoading ? 0.5 : 1 }}
              >
                {entriesLoading ? "Loading…" : showEntries ? "Refresh" : "Load"}
              </button>
            </div>

            {entriesError && (
              <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 7, padding: "8px 10px", marginBottom: 10, color: "#DC2626", fontSize: 12 }}>
                {entriesError}
              </div>
            )}

            {showEntries && !entriesLoading && (
              entries.length === 0 ? (
                <div style={{ fontSize: 12, color: "#9CA3AF", textAlign: "center", padding: "14px 0", background: "#FAFBFF", borderRadius: 8, border: "1px dashed #E4E8F0" }}>
                  No entries for this user.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {entries.map((entry) => (
                    <div
                      key={entry.id}
                      style={{ background: "#F8F9FF", border: "1px solid #E4E8F0", borderRadius: 9, padding: "10px 12px" }}
                    >
                      {/* Title row */}
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: entry.username || entry.url ? 6 : 0 }}>
                        <div style={{ width: 26, height: 26, borderRadius: 6, background: "#1878CE18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1878CE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                          </svg>
                        </div>
                        <span style={{ fontWeight: 600, fontSize: 13, color: "#1A1D2E", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {entry.title}
                        </span>
                      </div>

                      {/* Username */}
                      {entry.username && (
                        <div style={{ fontSize: 11, color: "#6B7280", marginBottom: 2, paddingLeft: 32 }}>
                          <span style={{ color: "#9CA3AF" }}>user: </span>{entry.username}
                        </div>
                      )}

                      {/* URL */}
                      {entry.url && (
                        <div style={{ fontSize: 11, color: "#1878CE", paddingLeft: 32, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          <a href={entry.url} target="_blank" rel="noopener noreferrer" style={{ color: "#1878CE", textDecoration: "none" }}>
                            {entry.url.replace(/^https?:\/\//, "")}
                          </a>
                        </div>
                      )}

                      {/* Notes */}
                      {entry.notes && (
                        <div style={{ fontSize: 11, color: "#6B7280", marginTop: 4, paddingLeft: 32, fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {entry.notes}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Count badge */}
                  <div style={{ textAlign: "right", fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>
                    {entries.length} {entries.length === 1 ? "entry" : "entries"}
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </aside>
  );
};

// ─── UsersPage ────────────────────────────────────────────────────────────────
export const UsersPage = ({ currentUser }: { currentUser: User }) => {
  const [userList, setUserList]         = useState<DisplayUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<DisplayUser | null>(null);
  const [apiError, setApiError]         = useState<string>("");
  const [loading, setLoading]           = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);

  // ── Edit-user modal state ──
  const [editUser, setEditUser]                       = useState<DisplayUser | null>(null);
  const [editName, setEditName]                       = useState("");
  const [editUsername, setEditUsername]               = useState("");
  const [editEmail, setEditEmail]                     = useState("");
  const [editPassword, setEditPassword]               = useState("");
  const [editConfirmPassword, setEditConfirmPassword] = useState("");
  const [editPasswordError, setEditPasswordError]     = useState("");

  // ── Add-user modal state ──
  const [showAdd, setShowAdd]                         = useState(false);
  const [addName, setAddName]                         = useState("");
  const [addUsername, setAddUsername]                 = useState("");
  const [addEmail, setAddEmail]                       = useState("");
  const [addPassword, setAddPassword]                 = useState("");
  const [addError, setAddError]                       = useState("");

  // ── Load users from API on mount ──
  useEffect(() => {
    const fetchUsers = async () => {
      setFetchLoading(true);
      try {
        const res = await fetch(`${API_BASE}/users/`, {
          headers: authHeaders(currentUser),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setApiError(body.error ?? `Failed to load users (${res.status})`);
          return;
        }
        const data = await res.json();
        setUserList(data.map(toDisplay));
      } catch {
        setApiError("Network error — could not load users.");
      } finally {
        setFetchLoading(false);
      }
    };
    fetchUsers();
  }, [currentUser]);

  // ── Delete ──
  const deleteUser = async (id: number) => {
    setApiError("");
    try {
      const res = await fetch(`${API_BASE}/users/${id}`, {
        method:  "DELETE",
        headers: authHeaders(currentUser),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setApiError(body.error ?? `Delete failed (${res.status})`);
        return;
      }
    } catch {
      setApiError("Network error — could not delete user.");
      return;
    }
    setUserList((prev) => prev.filter((u) => u.id !== id));
    if (selectedUser?.id === id) setSelectedUser(null);
  };

  // ── Open Edit Modal ──
  const openEdit = (user: DisplayUser) => {
    setEditUser(user);
    setEditName(user.name);
    setEditUsername(user.username);
    setEditEmail(user.email);
    setEditPassword("");
    setEditConfirmPassword("");
    setEditPasswordError("");
  };

  // ── Save Edit ──
  const handleSaveEdit = async () => {
    if (!editUser || !editName.trim() || !editUsername.trim() || !editEmail.trim()) return;
    if (editPassword && editPassword !== editConfirmPassword) {
      setEditPasswordError("Passwords do not match.");
      return;
    }
    setEditPasswordError("");
    setApiError("");
    setLoading(true);

    const body: Record<string, string> = {
      name:     editName.trim(),
      username: editUsername.trim(),
      email:    editEmail.trim(),
    };
    if (currentUser.role === "admin" && editPassword) body.password = editPassword;

    try {
      const res = await fetch(`${API_BASE}/users/${editUser.id}`, {
        method:  "PUT",
        headers: authHeaders(currentUser),
        body:    JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setApiError(data.error ?? `Update failed (${res.status})`);
        setLoading(false);
        return;
      }
      const updated = toDisplay({
        ...editUser,
        name:     editName.trim(),
        username: editUsername.trim(),
        email:    editEmail.trim(),
      });
      setUserList((prev) => prev.map((u) => (u.id === editUser.id ? updated : u)));
      if (selectedUser?.id === editUser.id) setSelectedUser(updated);
    } catch {
      setApiError("Network error — could not update user.");
      setLoading(false);
      return;
    }

    setLoading(false);
    setEditUser(null);
  };

  // ── Add User ──
  const handleAddUser = async () => {
    if (!addName.trim() || !addUsername.trim() || !addEmail.trim()) return;
    if (currentUser.role === "admin" && !addPassword.trim()) return;
    setAddError("");
    setLoading(true);

    const addBody: Record<string, string> = {
      name:     addName.trim(),
      username: addUsername.trim(),
      email:    addEmail.trim(),
    };
    if (currentUser.role === "admin" && addPassword) addBody.password = addPassword;

    try {
      const res = await fetch(`${API_BASE}/users/register`, {
        method:  "POST",
        headers: authHeaders(currentUser),
        body: JSON.stringify(addBody),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAddError(data.error ?? `Registration failed (${res.status})`);
        setLoading(false);
        return;
      }
      // Re-fetch the full list so the new user's real ID from DB is reflected
      const listRes = await fetch(`${API_BASE}/users/`, { headers: authHeaders(currentUser) });
      if (listRes.ok) {
        const list = await listRes.json();
        setUserList(list.map(toDisplay));
      }
    } catch {
      setAddError("Network error — could not create user.");
      setLoading(false);
      return;
    }

    setAddName(""); setAddUsername(""); setAddEmail(""); setAddPassword("");
    setLoading(false);
    setShowAdd(false);
  };

  // ── Shared styles ──
  const inputStyle: React.CSSProperties = { width: "100%", background: "#F4F6FB", border: "1px solid #E4E8F0", borderRadius: 7, padding: "8px 12px", color: "#1A1D2E", fontSize: 13, outline: "none", boxSizing: "border-box" };
  const errorStyle: React.CSSProperties = { fontSize: 11, color: "#DC2626", marginTop: 4 };

  return (
    <>
      <main style={{ padding: "32px 28px", flex: 1, overflowY: "auto" }}>

        {/* ── Header ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <NavButtons />
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#1A1D2E" }}>Users Management</h1>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            style={{ display: "flex", alignItems: "center", gap: 7, background: "#1878CE", color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", fontWeight: 600, fontSize: 13, cursor: "pointer", boxShadow: "0 2px 8px #1878CE33" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add User
          </button>
        </div>

        {/* ── API Error Banner ── */}
        {apiError && (
          <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "10px 16px", marginBottom: 18, color: "#DC2626", fontSize: 13, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>{apiError}</span>
            <button onClick={() => setApiError("")} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#DC2626", fontSize: 16, lineHeight: 1 }}>✕</button>
          </div>
        )}

        {/* ── Table ── */}
        <div style={{ background: "#ffffff", border: "1px solid #E4E8F0", borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 12px #0000000A" }}>
          {fetchLoading ? (
            <div style={{ padding: 40, textAlign: "center", color: "#9CA3AF", fontSize: 14 }}>Loading users…</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #E4E8F0", background: "#FAFBFF" }}>
                  {["NAME", "USERNAME", "EMAIL", "ROLE", "ACTIONS"].map((h) => (
                    <th key={h} style={{ padding: "12px 20px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#9CA3AF", letterSpacing: "0.08em" }}>{h === "ACTIONS" ? "" : h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {userList.map((user, i) => (
                  <tr
                    key={`user-${user.id}-${i}`}
                    onClick={() => setSelectedUser(selectedUser?.id === user.id ? null : user)}
                    style={{ borderBottom: i < userList.length - 1 ? "1px solid #F0F2F8" : "none", transition: "background 0.1s", cursor: "pointer", background: selectedUser?.id === user.id ? "#EFF6FF" : "transparent" }}
                    onMouseEnter={(e) => { if (selectedUser?.id !== user.id) e.currentTarget.style.background = "#F8F9FF"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = selectedUser?.id === user.id ? "#EFF6FF" : "transparent"; }}
                  >
                    <td style={{ padding: "14px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: "50%", background: user.avatarBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0 }}>{user.initials}</div>
                        <span style={{ fontWeight: 500, fontSize: 14, color: "#1A1D2E" }}>{user.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: "14px 20px", color: "#1878CE", fontSize: 13 }}>{user.username}</td>
                    <td style={{ padding: "14px 20px", color: "#6B7280", fontSize: 13 }}>{user.email}</td>
                    <td style={{ padding: "14px 20px" }}>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 5, background: user.role === "admin" ? "#EFF6FF" : "#F3F4F6", color: user.role === "admin" ? "#1878CE" : "#6B7280" }}>
                        {user.role}
                      </span>
                    </td>
                    <td style={{ padding: "14px 20px" }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }} onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => openEdit(user)} style={{ background: "transparent", border: "none", cursor: "pointer", padding: 4, display: "flex", alignItems: "center" }} title="Edit user">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1878CE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button onClick={() => deleteUser(user.id)} style={{ background: "transparent", border: "none", cursor: "pointer", padding: 4, display: "flex", alignItems: "center" }} title="Delete user">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                            <path d="M10 11v6M14 11v6" />
                            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {/* ── User Detail Side Panel ── */}
      {selectedUser && <UserDetailPanel user={selectedUser} onClose={() => setSelectedUser(null)} currentUser={currentUser} />}

      {/* ── Add User Modal ── */}
      {showAdd && (
        <div style={{ position: "fixed", inset: 0, background: "#00000055", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }} onClick={() => { setShowAdd(false); setAddError(""); }}>
          <div style={{ background: "#ffffff", border: "1px solid #E4E8F0", borderRadius: 14, padding: 28, width: 360, boxShadow: "0 8px 32px #0000001A" }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ margin: "0 0 20px", color: "#1A1D2E", fontSize: 18 }}>Add User</h2>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: "#6B7280", display: "block", marginBottom: 5 }}>Full Name</label>
              <input style={inputStyle} value={addName} onChange={(e) => setAddName(e.target.value)} placeholder="e.g. Jordan Smith" />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: "#6B7280", display: "block", marginBottom: 5 }}>Username</label>
              <input style={inputStyle} value={addUsername} onChange={(e) => setAddUsername(e.target.value)} placeholder="e.g. jordan.s" />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: "#6B7280", display: "block", marginBottom: 5 }}>Email</label>
              <input style={inputStyle} value={addEmail} onChange={(e) => setAddEmail(e.target.value)} placeholder="e.g. jordan@nexus.io" />
            </div>
            {currentUser.role === "admin" && (
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: "#6B7280", display: "block", marginBottom: 5 }}>Password</label>
                <PasswordInput value={addPassword} onChange={setAddPassword} placeholder="Enter password" inputStyle={inputStyle} />
              </div>
            )}
            {addError && (
              <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 7, padding: "9px 12px", marginBottom: 14, color: "#DC2626", fontSize: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>{addError}</span>
                <button onClick={() => setAddError("")} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#DC2626", fontSize: 14, lineHeight: 1, padding: 0, marginLeft: 8 }}>✕</button>
              </div>
            )}
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button onClick={() => { setShowAdd(false); setAddError(""); }} style={{ flex: 1, background: "#F4F6FB", color: "#6B7280", border: "1px solid #E4E8F0", borderRadius: 7, padding: "9px", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Cancel</button>
              <button onClick={handleAddUser} disabled={loading} style={{ flex: 1, background: loading ? "#93C5FD" : "#1878CE", color: "#fff", border: "none", borderRadius: 7, padding: "9px", fontWeight: 600, fontSize: 13, cursor: loading ? "not-allowed" : "pointer" }}>
                {loading ? "Saving…" : "Add User"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit User Modal ── */}
      {editUser && (
        <div style={{ position: "fixed", inset: 0, background: "#00000055", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }} onClick={() => setEditUser(null)}>
          <div style={{ background: "#ffffff", border: "1px solid #E4E8F0", borderRadius: 14, padding: 28, width: 360, boxShadow: "0 8px 32px #0000001A" }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ margin: "0 0 20px", color: "#1A1D2E", fontSize: 18 }}>Edit User</h2>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: "#6B7280", display: "block", marginBottom: 5 }}>Full Name</label>
              <input style={inputStyle} value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: "#6B7280", display: "block", marginBottom: 5 }}>Username</label>
              <input style={inputStyle} value={editUsername} onChange={(e) => setEditUsername(e.target.value)} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: "#6B7280", display: "block", marginBottom: 5 }}>Email</label>
              <input style={inputStyle} value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
            </div>
            {currentUser.role === "admin" && (
              <>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 12, color: "#6B7280", display: "block", marginBottom: 5 }}>New Password <span style={{ color: "#C4C9D4", fontWeight: 400 }}>(leave blank to keep current)</span></label>
                  <PasswordInput value={editPassword} onChange={setEditPassword} placeholder="Enter new password" inputStyle={inputStyle} />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 12, color: "#6B7280", display: "block", marginBottom: 5 }}>Confirm New Password</label>
                  <PasswordInput value={editConfirmPassword} onChange={(v) => { setEditConfirmPassword(v); setEditPasswordError(""); }} placeholder="Re-enter new password" inputStyle={inputStyle} />
                  {editPasswordError && <div style={errorStyle}>{editPasswordError}</div>}
                </div>
              </>
            )}
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button onClick={() => { setEditUser(null); setEditPasswordError(""); }} style={{ flex: 1, background: "#F4F6FB", color: "#6B7280", border: "1px solid #E4E8F0", borderRadius: 7, padding: "9px", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Cancel</button>
              <button onClick={handleSaveEdit} disabled={loading} style={{ flex: 1, background: loading ? "#93C5FD" : "#1878CE", color: "#fff", border: "none", borderRadius: 7, padding: "9px", fontWeight: 600, fontSize: 13, cursor: loading ? "not-allowed" : "pointer" }}>
                {loading ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};