"use client";

import { useState, useEffect, useCallback } from "react";
import { NavButtons, EyeIcon } from "@/app/lib/components";
import {
  login as apiLogin,
  logout as apiLogout,
  saveUser,
  listPasswords,
  createPassword,
  deletePassword as apiDeletePassword,
  revealPassword,
  type User,
  type PasswordEntry,
} from "@/app/lib/api";


// ─── Login Gate ───────────────────────────────────────────────────────────────

const LoginPage = ({ onLogin }: { onLogin: (user: User) => void }) => {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd]   = useState(false);
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      const { user } = await apiLogin({ email: email.trim().toLowerCase(), password });
      saveUser(user);
      onLogin(user);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Invalid email or password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", background: "linear-gradient(135deg,#EFF6FF 0%,#F8F9FF 100%)",
      display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui,sans-serif",
    }}>
      <div style={{
        background: "#fff", borderRadius: 18, boxShadow: "0 8px 40px #1878CE18",
        padding: "40px 36px", width: 380, border: "1px solid #E4E8F0",
      }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 32 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14, background: "#1878CE",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 24, marginBottom: 14, boxShadow: "0 4px 16px #1878CE44",
          }}>🔑</div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#1A1D2E" }}>Password Manager</h1>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: "#9CA3AF" }}>Sign in to access your vault</p>
        </div>

        {/* Email */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#6B7280", display: "block", marginBottom: 5 }}>Email</label>
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleLogin()} placeholder="you@company.com"
            style={{ width: "100%", background: "#F4F6FB", border: "1px solid #E4E8F0", borderRadius: 8, padding: "10px 14px", fontSize: 14, color: "#1A1D2E", outline: "none", boxSizing: "border-box" }}
          />
        </div>

        {/* Password */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#6B7280", display: "block", marginBottom: 5 }}>Password</label>
          <div style={{ position: "relative" }}>
            <input
              type={showPwd ? "text" : "password"} value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleLogin()} placeholder="••••••••"
              style={{ width: "100%", background: "#F4F6FB", border: "1px solid #E4E8F0", borderRadius: 8, padding: "10px 40px 10px 14px", fontSize: 14, color: "#1A1D2E", outline: "none", boxSizing: "border-box" }}
            />
            <button onClick={() => setShowPwd(v => !v)}
              style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", cursor: "pointer", padding: 2, display: "flex", alignItems: "center" }}>
              <EyeIcon open={showPwd} />
            </button>
          </div>
        </div>

        {error && (
          <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "9px 14px", marginBottom: 16, fontSize: 13, color: "#DC2626", fontWeight: 500 }}>
            {error}
          </div>
        )}

        <button onClick={handleLogin} disabled={loading || !email || !password}
          style={{ width: "100%", background: loading || !email || !password ? "#93C5FD" : "#1878CE", color: "#fff", border: "none", borderRadius: 9, padding: "12px", fontWeight: 700, fontSize: 14, cursor: loading || !email || !password ? "not-allowed" : "pointer", boxShadow: "0 2px 8px #1878CE33", transition: "background 0.2s" }}>
          {loading ? "Signing in…" : "Sign In"}
        </button>

        <p style={{ marginTop: 20, fontSize: 12, color: "#9CA3AF", textAlign: "center", lineHeight: 1.6 }}>
          Passwords are <strong>private</strong> — only the owner can reveal them
        </p>
      </div>
    </div>
  );
};


// ─── Reveal Modal ─────────────────────────────────────────────────────────────



// ─── Locked Password Cell ─────────────────────────────────────────────────────
// Shown to admin for entries they don't own — no reveal option at all.

const LockedPasswordCell = () => (
  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
    <span style={{ fontSize: 13, color: "#D1D5DB", fontFamily: "monospace", letterSpacing: "0.1em" }}>
      ••••••••
    </span>
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      background: "#F3F4F6", border: "1px solid #E5E7EB",
      borderRadius: 6, padding: "2px 8px", fontSize: 11,
      color: "#9CA3AF", cursor: "default", userSelect: "none",
    }}>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      </svg>
      Private
    </span>
  </div>
);


// ─── Password Detail Panel ────────────────────────────────────────────────────

const PasswordDetailPanel = ({
  entry,
  onClose,
  onDelete,
  currentUser,
}: {
  entry: PasswordEntry & { is_owner?: boolean };
  onClose: () => void;
  onDelete: (id: number) => void;
  currentUser: User;
}) => {
  const [revealedPwd, setRevealedPwd] = useState<string | null>(null);
  const [showRevealedPwd, setShowRevealedPwd] = useState(false);
  const [revealLoading, setRevealLoading] = useState(false);
  const [detailMasterPwd, setDetailMasterPwd] = useState("");
  const [detailRevealError, setDetailRevealError] = useState("");
  const [showDetailPrompt, setShowDetailPrompt] = useState(false);
  const admin = ["admin", "administrator"].includes((currentUser.role ?? "").toLowerCase());
  // is_owner is set by the backend; fall back to true for non-admin users
  const isOwner = entry.is_owner !== false;

  const platformColors: Record<string, string> = {
    GitHub: "#24292e", Slack: "#4A154B", Jira: "#0052CC", Notion: "#000000",
  };
  const bg = platformColors[entry.title] ?? "#1878CE";

  return (
    <>
      <aside style={{ width: 300, background: "#ffffff", borderLeft: "1px solid #E4E8F0", display: "flex", flexDirection: "column", flexShrink: 0, boxShadow: "-4px 0 16px #0000000D", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px 14px" }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: "#1A1D2E" }}>Password Details</span>
          <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#9CA3AF", fontSize: 18, lineHeight: 1, padding: 2 }}>✕</button>
        </div>

        <div style={{ padding: "0 20px 8px", display: "flex", justifyContent: "flex-end" }}>
          {/* Role badge */}
          <span style={{ fontSize: 11, fontWeight: 700, borderRadius: 99, padding: "3px 10px", background: admin ? "#EFF6FF" : "#F0FDF4", color: admin ? "#1878CE" : "#16A34A", border: `1px solid ${admin ? "#BFDBFE" : "#BBF7D0"}` }}>
            {admin ? "👑 Admin View" : "👤 My Entry"}
          </span>
        </div>

        {/* Admin viewing someone else's entry — show ownership notice */}
        {admin && !isOwner && (
          <div style={{
            margin: "0 16px 8px",
            background: "#FFFBEB", border: "1px solid #FDE68A",
            borderRadius: 8, padding: "8px 12px",
            fontSize: 12, color: "#92400E",
            display: "flex", alignItems: "flex-start", gap: 6,
          }}>
            <span style={{ fontSize: 14, flexShrink: 0 }}>🔒</span>
            <span>This password belongs to another user. The actual password value is <strong>private</strong> and cannot be revealed.</span>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "20px" }}>
          <div style={{ width: 68, height: 68, borderRadius: 16, background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 700, color: "#fff", marginBottom: 14, boxShadow: "0 4px 12px #0000001A" }}>
            {entry.title[0]}
          </div>
          <span style={{ fontWeight: 700, fontSize: 16, color: "#1A1D2E", marginBottom: 4 }}>{entry.title}</span>
          <a href={entry.url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "#1878CE", textDecoration: "none" }}>{entry.url}</a>
        </div>

        <div style={{ padding: "0 20px 20px" }}>
          {[
            { label: "Username", value: entry.username, blue: true },
            { label: "Notes",    value: entry.notes,    blue: false },
          ].map(({ label, value, blue }) => (
            <div key={label} style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#9CA3AF", letterSpacing: "0.07em", marginBottom: 5, textTransform: "uppercase" as const }}>{label}</div>
              <div style={{ fontSize: 13, color: blue ? "#1878CE" : "#1A1D2E" }}>{value || "—"}</div>
            </div>
          ))}

          {/* Reveal — only shown when current user owns the entry */}
          {isOwner ? (
            <div style={{ marginBottom: 10 }}>
              {!revealedPwd ? (
                !showDetailPrompt ? (
                  <button onClick={() => setShowDetailPrompt(true)}
                    style={{ width: "100%", background: "#F4F6FB", color: "#6B7280", border: "1px solid #E4E8F0", borderRadius: 8, padding: "9px", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                    🔓 Reveal Password
                  </button>
                ) : (
                  <div style={{ background: "#F4F6FB", border: "1px solid #E4E8F0", borderRadius: 8, padding: "10px 12px" }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "#6B7280", marginBottom: 6 }}>Enter your account password</div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <input
                        autoFocus
                        type="password"
                        placeholder="Password"
                        value={detailMasterPwd}
                        onChange={e => setDetailMasterPwd(e.target.value)}
                        onKeyDown={async e => {
                          if (e.key === "Enter" && detailMasterPwd) {
                            setRevealLoading(true); setDetailRevealError("");
                            try {
                              const { password } = await revealPassword(currentUser, entry.id, detailMasterPwd);
                              setRevealedPwd(password); setShowDetailPrompt(false);
                            } catch (err: unknown) {
                              setDetailRevealError(err instanceof Error ? err.message : "Wrong password");
                            } finally { setRevealLoading(false); }
                          }
                          if (e.key === "Escape") { setShowDetailPrompt(false); setDetailRevealError(""); }
                        }}
                        style={{ flex: 1, background: "#fff", border: "1px solid #E4E8F0", borderRadius: 6, padding: "6px 8px", fontSize: 12, outline: "none", color: "#1A1D2E" }}
                      />
                      <button
                        onClick={async () => {
                          setRevealLoading(true); setDetailRevealError("");
                          try {
                            const { password } = await revealPassword(currentUser, entry.id, detailMasterPwd);
                            setRevealedPwd(password); setShowDetailPrompt(false);
                          } catch (err: unknown) {
                            setDetailRevealError(err instanceof Error ? err.message : "Wrong password");
                          } finally { setRevealLoading(false); }
                        }}
                        disabled={revealLoading || !detailMasterPwd}
                        style={{ background: revealLoading || !detailMasterPwd ? "#93C5FD" : "#1878CE", color: "#fff", border: "none", borderRadius: 6, padding: "6px 10px", fontSize: 12, fontWeight: 600, cursor: revealLoading || !detailMasterPwd ? "not-allowed" : "pointer" }}>
                        {revealLoading ? "…" : "OK"}
                      </button>
                    </div>
                    {detailRevealError && <div style={{ fontSize: 11, color: "#DC2626", marginTop: 4 }}>{detailRevealError}</div>}
                  </div>
                )
              ) : (
                <div style={{ position: "relative", background: "#F4F6FB", border: "1px solid #E4E8F0", borderRadius: 8, padding: "10px 40px 10px 12px", fontFamily: "monospace", fontSize: 13, color: "#1A1D2E", wordBreak: "break-all" }}>
                  {showRevealedPwd ? revealedPwd : "••••••••••••"}
                  <button
                    onMouseDown={() => setShowRevealedPwd(true)}
                    onMouseUp={() => setShowRevealedPwd(false)}
                    onMouseLeave={() => setShowRevealedPwd(false)}
                    onTouchStart={() => setShowRevealedPwd(true)}
                    onTouchEnd={() => setShowRevealedPwd(false)}
                    style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", cursor: "pointer", padding: 2, display: "flex", alignItems: "center", userSelect: "none" }}>
                    <EyeIcon open={showRevealedPwd} />
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Admin viewing another user's entry — locked, no reveal */
            <div style={{
              width: "100%", boxSizing: "border-box",
              background: "#F9FAFB", border: "1px solid #E5E7EB",
              borderRadius: 8, padding: "9px", marginBottom: 10,
              display: "flex", alignItems: "center", justifyContent: "center",
              gap: 6, fontSize: 13, color: "#9CA3AF", cursor: "not-allowed",
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              Password is private
            </div>
          )}

          <button onClick={() => onDelete(entry.id)}
            style={{ width: "100%", background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA", borderRadius: 8, padding: "9px", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
            Delete Entry
          </button>
        </div>
      </aside>


    </>
  );
};


// ─── Passwords Page ───────────────────────────────────────────────────────────

export const PasswordsPage = ({ currentUser, onLogout }: { currentUser: User; onLogout: () => void }) => {
  const [passwords, setPasswords]               = useState<(PasswordEntry & { is_owner?: boolean })[]>([]);
  const [loading, setLoading]                   = useState(true);
  const [fetchError, setFetchError]             = useState("");
  const [showPassModal, setShowPassModal]       = useState(false);
  const [newPass, setNewPass]                   = useState({ platform: "", username: "", url: "", notes: "", password: "" });
  const [addError, setAddError]                 = useState("");
  const [addLoading, setAddLoading]             = useState(false);
  const [showPlatformDropdown, setShowPlatformDropdown] = useState(false);
  const [selectedPassword, setSelectedPassword] = useState<(PasswordEntry & { is_owner?: boolean }) | null>(null);
  const [expandedPlatforms, setExpandedPlatforms] = useState<Record<string, boolean>>({});
  const [visiblePasswords, setVisiblePasswords]   = useState<Record<number, boolean>>({});
  const [revealedPasswords, setRevealedPasswords] = useState<Record<number, string>>({});
  const [inlinePrompt, setInlinePrompt]           = useState<{ id: number; pwd: string; loading: boolean; error: string } | null>(null);

  const admin = ["admin", "administrator"].includes((currentUser.role ?? "").toLowerCase());

  // ── Fetch from API on mount ──────────────────────────────────────────────────
  const fetchPasswords = useCallback(async () => {
    setLoading(true); setFetchError("");
    try {
      const data = await listPasswords(currentUser);
      setPasswords(data as (PasswordEntry & { is_owner?: boolean })[]);
    } catch (e: unknown) {
      setFetchError(e instanceof Error ? e.message : "Failed to load passwords");
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => { fetchPasswords(); }, [fetchPasswords]);

  // ── Delete via API ───────────────────────────────────────────────────────────
  const deletePassword = async (id: number) => {
    try {
      await apiDeletePassword(currentUser, id);
      setPasswords(prev => prev.filter(p => p.id !== id));
      if (selectedPassword?.id === id) setSelectedPassword(null);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Delete failed");
    }
  };

  // ── Create via API ───────────────────────────────────────────────────────────
  const addPassword = async () => {
    if (!newPass.platform || !newPass.password) return;
    setAddLoading(true); setAddError("");
    try {
      const entry = await createPassword(currentUser, {
        title:    newPass.platform,
        password: newPass.password,
        username: newPass.username,
        url:      newPass.url,
        notes:    newPass.notes,
      });
      // New entries always belong to the current user
      setPasswords(prev => [{ ...entry, is_owner: true }, ...prev]);
      setNewPass({ platform: "", username: "", url: "", notes: "", password: "" });
      setShowPlatformDropdown(false);
      setShowPassModal(false);
    } catch (e: unknown) {
      setAddError(e instanceof Error ? e.message : "Failed to add password");
    } finally {
      setAddLoading(false);
    }
  };

  // ── Logout ───────────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    try { await apiLogout(currentUser); } catch {} finally { if (onLogout) onLogout(); }
  };

  // ── Toggle password visibility (reveal or hide inline) ──────────────────────
  const togglePasswordVisibility = (entry: PasswordEntry & { is_owner?: boolean }) => {
    const isOwner = entry.is_owner !== false;
    if (!isOwner) return;

    if (visiblePasswords[entry.id]) {
      setVisiblePasswords(prev => ({ ...prev, [entry.id]: false }));
    } else if (revealedPasswords[entry.id]) {
      setVisiblePasswords(prev => ({ ...prev, [entry.id]: true }));
    } else {
      // Open inline password prompt for this entry
      setInlinePrompt({ id: entry.id, pwd: "", loading: false, error: "" });
    }
  };

  const submitInlineReveal = async (entryId: number) => {
    if (!inlinePrompt) return;
    setInlinePrompt(prev => prev ? { ...prev, loading: true, error: "" } : null);
    try {
      const { password } = await revealPassword(currentUser, entryId, inlinePrompt.pwd);
      setRevealedPasswords(prev => ({ ...prev, [entryId]: password }));
      setVisiblePasswords(prev => ({ ...prev, [entryId]: true }));
      setInlinePrompt(null);
    } catch (e: unknown) {
      setInlinePrompt(prev => prev ? { ...prev, loading: false, error: e instanceof Error ? e.message : "Wrong password" } : null);
    }
  };

  const platformColors: Record<string, string> = {
    GitHub: "#24292e", Slack: "#4A154B", Jira: "#0052CC", Notion: "#000000",
    Google: "#EA4335", Gmail: "#D93025", Microsoft: "#0078D4",
    Figma: "#F24E1E", Zoom: "#2D8CFF", Discord: "#5865F2",
  };

  // Group by title (platform)
  const grouped: Record<string, (PasswordEntry & { is_owner?: boolean })[]> = {};
  passwords.forEach(p => {
    if (!grouped[p.title]) grouped[p.title] = [];
    grouped[p.title].push(p);
  });

  return (
    <>
      <main style={{ padding: "32px 28px", flex: 1, overflowY: "auto" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <NavButtons />
            <div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#1A1D2E" }}>
                {admin ? "Password Management" : "My Passwords"}
              </h1>
              {admin && (
                <p style={{ margin: "3px 0 0", fontSize: 12, color: "#9CA3AF" }}>
                  Viewing all users' entries — passwords remain private to their owners
                </p>
              )}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => setShowPassModal(true)}
              style={{ background: "#1878CE", color: "#fff", border: "none", borderRadius: 8, padding: "10px 18px", fontWeight: 600, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, boxShadow: "0 2px 8px #1878CE44" }}>
              + Add Password
            </button>

          </div>
        </div>

        {/* Loading / error states */}
        {loading && (
          <div style={{ background: "#fff", border: "1px solid #E4E8F0", borderRadius: 12, padding: "48px 20px", textAlign: "center", color: "#9CA3AF", fontSize: 14 }}>
            Loading passwords…
          </div>
        )}
        {fetchError && (
          <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12, padding: "20px", color: "#DC2626", fontSize: 14, marginBottom: 16 }}>
            {fetchError} — <button onClick={fetchPasswords} style={{ background: "none", border: "none", color: "#1878CE", cursor: "pointer", fontWeight: 600, padding: 0 }}>Retry</button>
          </div>
        )}

        {!loading && !fetchError && passwords.length === 0 && (
          <div style={{ background: "#fff", border: "1px solid #E4E8F0", borderRadius: 12, padding: "48px 20px", textAlign: "center", color: "#9CA3AF", fontSize: 14 }}>
            No passwords found. Click <strong>+ Add Password</strong> to get started.
          </div>
        )}

        {/* Grouped table */}
        {!loading && Object.entries(grouped).map(([platform, entries]) => {
          const isOpen = expandedPlatforms[platform] !== false;
          const bg = platformColors[platform] ?? "#1878CE";
          return (
            <div key={platform} style={{ background: "#ffffff", border: "1px solid #E4E8F0", borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 12px #0000000A", marginBottom: 16 }}>
              <div onClick={() => setExpandedPlatforms(prev => ({ ...prev, [platform]: !isOpen }))}
                style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 20px", cursor: "pointer", background: "#FAFBFF", borderBottom: isOpen ? "1px solid #E4E8F0" : "none", userSelect: "none" }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                  {platform[0]}
                </div>
                <span style={{ fontWeight: 700, fontSize: 15, color: "#1A1D2E", flex: 1 }}>{platform}</span>
                <span style={{ fontSize: 12, color: "#9CA3AF", background: "#F0F2F8", borderRadius: 99, padding: "2px 10px", fontWeight: 600 }}>
                  {entries.length} entr{entries.length !== 1 ? "ies" : "y"}
                </span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  style={{ transition: "transform 0.2s", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>

              {isOpen && (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#F8F9FF" }}>
                      {[
                        "USERNAME",
                        ...(admin ? ["OWNER"] : []),
                        "URL",
                        "PASSWORD",
                        "ADDED",
                        "",
                      ].map(h => (
                        <th key={h} style={{ padding: "9px 20px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#9CA3AF", letterSpacing: "0.08em" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map(p => {
                      const isOwner = p.is_owner !== false;
                      const ext = p as unknown as { owner_name?: string };
                      return (
                        <tr key={p.id}
                          onClick={() => setSelectedPassword(selectedPassword?.id === p.id ? null : p)}
                          style={{ borderTop: "1px solid #F0F2F8", transition: "background 0.1s", cursor: "pointer", background: selectedPassword?.id === p.id ? "#EFF6FF" : "transparent" }}
                          onMouseEnter={e => { if (selectedPassword?.id !== p.id) e.currentTarget.style.background = "#F8F9FF"; }}
                          onMouseLeave={e => { e.currentTarget.style.background = selectedPassword?.id === p.id ? "#EFF6FF" : "transparent"; }}>

                          {/* Username */}
                          <td style={{ padding: "13px 20px", color: "#1878CE", fontSize: 13 }}>{p.username || "—"}</td>

                          {/* Owner name — admin only */}
                          {admin && (
                            <td style={{ padding: "13px 20px", fontSize: 13 }}>
                              <span style={{
                                display: "inline-flex", alignItems: "center", gap: 5,
                                background: isOwner ? "#EFF6FF" : "#F3F4F6",
                                color: isOwner ? "#1878CE" : "#6B7280",
                                border: `1px solid ${isOwner ? "#BFDBFE" : "#E5E7EB"}`,
                                borderRadius: 99, padding: "2px 9px", fontSize: 11, fontWeight: 600,
                              }}>
                                {isOwner ? "👤 You" : (ext.owner_name || "Other user")}
                              </span>
                            </td>
                          )}

                          {/* URL */}
                          <td style={{ padding: "13px 20px" }}>
                            {p.url
                              ? <a href={p.url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ color: "#1878CE", fontSize: 13, textDecoration: "none" }}>{p.url}</a>
                              : <span style={{ color: "#9CA3AF", fontSize: 13 }}>—</span>}
                          </td>

                          {/* Password cell — owner sees eye toggle, non-owner sees locked */}
                          <td style={{ padding: "13px 20px" }}>
                            {isOwner ? (
                              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <span style={{ fontSize: 13, color: "#1A1D2E", fontFamily: "monospace", letterSpacing: visiblePasswords[p.id] ? "normal" : "0.1em" }}>
                                    {visiblePasswords[p.id] && revealedPasswords[p.id] ? revealedPasswords[p.id] : "••••••••"}
                                  </span>
                                  <button onClick={e => { e.stopPropagation(); togglePasswordVisibility(p); }}
                                    style={{ background: "transparent", border: "none", cursor: "pointer", padding: 2, display: "flex", alignItems: "center", color: "#9CA3AF" }}
                                    title={visiblePasswords[p.id] ? "Hide password" : "Reveal password"}>
                                    <EyeIcon open={!!visiblePasswords[p.id]} />
                                  </button>
                                  {visiblePasswords[p.id] && revealedPasswords[p.id] && (
                                    <button
                                      onClick={e => {
                                        e.stopPropagation();
                                        navigator.clipboard.writeText(revealedPasswords[p.id]);
                                      }}
                                      title="Copy password"
                                      style={{ background: "transparent", border: "none", cursor: "pointer", padding: 2, display: "flex", alignItems: "center", color: "#9CA3AF" }}>
                                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                      </svg>
                                    </button>
                                  )}
                                </div>
                                {/* Inline password prompt — appears below the row */}
                                {inlinePrompt?.id === p.id && (
                                  <div onClick={e => e.stopPropagation()} style={{ display: "flex", flexDirection: "column", gap: 4, background: "#fff", border: "1px solid #E4E8F0", borderRadius: 8, padding: "8px 10px", boxShadow: "0 4px 16px #0000001A", minWidth: 220 }}>
                                    <div style={{ fontSize: 11, fontWeight: 600, color: "#6B7280", marginBottom: 2 }}>Enter your account password</div>
                                    <div style={{ display: "flex", gap: 6 }}>
                                      <input
                                        autoFocus
                                        type="password"
                                        placeholder="Password"
                                        value={inlinePrompt.pwd}
                                        onChange={e => setInlinePrompt(prev => prev ? { ...prev, pwd: e.target.value } : null)}
                                        onKeyDown={e => { if (e.key === "Enter") submitInlineReveal(p.id); if (e.key === "Escape") setInlinePrompt(null); }}
                                        style={{ flex: 1, background: "#F4F6FB", border: "1px solid #E4E8F0", borderRadius: 6, padding: "5px 8px", fontSize: 12, outline: "none", color: "#1A1D2E" }}
                                      />
                                      <button
                                        onClick={() => submitInlineReveal(p.id)}
                                        disabled={inlinePrompt.loading || !inlinePrompt.pwd}
                                        style={{ background: inlinePrompt.loading || !inlinePrompt.pwd ? "#93C5FD" : "#1878CE", color: "#fff", border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 12, fontWeight: 600, cursor: inlinePrompt.loading || !inlinePrompt.pwd ? "not-allowed" : "pointer" }}>
                                        {inlinePrompt.loading ? "…" : "OK"}
                                      </button>
                                      <button onClick={() => setInlinePrompt(null)} style={{ background: "#F4F6FB", color: "#6B7280", border: "1px solid #E4E8F0", borderRadius: 6, padding: "5px 8px", fontSize: 12, cursor: "pointer" }}>✕</button>
                                    </div>
                                    {inlinePrompt.error && <div style={{ fontSize: 11, color: "#DC2626", marginTop: 2 }}>{inlinePrompt.error}</div>}
                                  </div>
                                )}
                              </div>
                            ) : (
                              /* Admin viewing another user's password — show locked indicator */
                              <LockedPasswordCell />
                            )}
                          </td>

                          {/* Added date */}
                          <td style={{ padding: "13px 20px", color: "#9CA3AF", fontSize: 12 }}>
                            {p.created_at ? new Date(p.created_at).toLocaleDateString() : "—"}
                          </td>

                          {/* Delete */}
                          <td style={{ padding: "13px 20px" }}>
                            <button onClick={e => { e.stopPropagation(); deletePassword(p.id); }}
                              style={{ background: "transparent", border: "none", cursor: "pointer", padding: 4, display: "flex", alignItems: "center" }}>
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                <path d="M10 11v6M14 11v6" />
                                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          );
        })}
      </main>

      {/* Detail panel */}
      {selectedPassword && (
        <PasswordDetailPanel
          entry={selectedPassword}
          onClose={() => setSelectedPassword(null)}
          onDelete={deletePassword}
          currentUser={currentUser}
        />
      )}



      {/* Add Password Modal */}
      {showPassModal && (
        <div style={{ position: "fixed", inset: 0, background: "#00000055", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}
          onClick={() => setShowPassModal(false)}>
          <div style={{ background: "#ffffff", border: "1px solid #E4E8F0", borderRadius: 14, padding: 28, width: 380, boxShadow: "0 8px 32px #0000001A" }}
            onClick={e => e.stopPropagation()}>
            <h2 style={{ margin: "0 0 20px", color: "#1A1D2E", fontSize: 18 }}>Add New Password</h2>

            {/* Platform */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: "#6B7280", display: "block", marginBottom: 5 }}>Platform Name *</label>
              <div style={{ position: "relative" }}>
                <input value={newPass.platform}
                  onChange={e => { setNewPass(prev => ({ ...prev, platform: e.target.value })); setShowPlatformDropdown(true); }}
                  onFocus={() => setShowPlatformDropdown(true)}
                  placeholder="Enter platform name"
                  style={{ width: "100%", background: "#F4F6FB", border: "1px solid #E4E8F0", borderRadius: 7, padding: "8px 36px 8px 12px", color: "#1A1D2E", fontSize: 13, outline: "none", boxSizing: "border-box" }}
                />
                {showPlatformDropdown && (() => {
                  const existing = Array.from(new Set(passwords.map(p => p.title)));
                  const all = Array.from(new Set([...existing, ...Object.keys(platformColors)]));
                  const filtered = all.filter(p => p.toLowerCase().includes(newPass.platform.toLowerCase()));
                  if (!filtered.length) return null;
                  return (
                    <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#fff", border: "1px solid #E4E8F0", borderRadius: 8, boxShadow: "0 4px 16px #0000001A", zIndex: 200, maxHeight: 220, overflowY: "auto" }}>
                      {filtered.map(p => (
                        <div key={p}
                          onMouseDown={() => { setNewPass(prev => ({ ...prev, platform: p })); setShowPlatformDropdown(false); }}
                          style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", cursor: "pointer", fontSize: 13, color: "#1A1D2E" }}
                          onMouseEnter={e => (e.currentTarget.style.background = "#F4F6FB")}
                          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                          <div style={{ width: 26, height: 26, borderRadius: 6, background: platformColors[p] ?? "#1878CE", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff" }}>{p[0]}</div>
                          <span>{p}</span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Username */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: "#6B7280", display: "block", marginBottom: 5 }}>Username</label>
              <input value={newPass.username} onChange={e => setNewPass(prev => ({ ...prev, username: e.target.value }))}
                placeholder="Enter username / login"
                style={{ width: "100%", background: "#F4F6FB", border: "1px solid #E4E8F0", borderRadius: 7, padding: "8px 12px", color: "#1A1D2E", fontSize: 13, outline: "none", boxSizing: "border-box" }}
              />
            </div>

            {/* Password & URL */}
            {[
              { label: "Password *", key: "password", type: "password" },
              { label: "URL",        key: "url",      type: "text" },
            ].map(({ label, key, type }) => (
              <div key={key} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: "#6B7280", display: "block", marginBottom: 5 }}>{label}</label>
                <input value={newPass[key as keyof typeof newPass]}
                  onChange={e => setNewPass(prev => ({ ...prev, [key]: e.target.value }))}
                  placeholder={`Enter ${label.replace(" *", "").toLowerCase()}`} type={type}
                  style={{ width: "100%", background: "#F4F6FB", border: "1px solid #E4E8F0", borderRadius: 7, padding: "8px 12px", color: "#1A1D2E", fontSize: 13, outline: "none", boxSizing: "border-box" }}
                />
              </div>
            ))}

            {/* Notes */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: "#6B7280", display: "block", marginBottom: 5 }}>Notes</label>
              <input value={newPass.notes} onChange={e => setNewPass(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Optional notes"
                style={{ width: "100%", background: "#F4F6FB", border: "1px solid #E4E8F0", borderRadius: 7, padding: "8px 12px", color: "#1A1D2E", fontSize: 13, outline: "none", boxSizing: "border-box" }}
              />
            </div>

            {addError && (
              <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "8px 12px", marginBottom: 12, fontSize: 13, color: "#DC2626" }}>
                {addError}
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button onClick={() => { setShowPassModal(false); setShowPlatformDropdown(false); setAddError(""); }}
                style={{ flex: 1, background: "#F4F6FB", color: "#6B7280", border: "1px solid #E4E8F0", borderRadius: 7, padding: "9px", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Cancel</button>
              <button onClick={addPassword} disabled={addLoading || !newPass.platform || !newPass.password}
                style={{ flex: 1, background: addLoading || !newPass.platform || !newPass.password ? "#93C5FD" : "#1878CE", color: "#fff", border: "none", borderRadius: 7, padding: "9px", fontWeight: 600, fontSize: 13, cursor: addLoading || !newPass.platform || !newPass.password ? "not-allowed" : "pointer" }}>
                {addLoading ? "Saving…" : "Add Password"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};


// ─── App Root ─────────────────────────────────────────────────────────────────

export default function App() {
  const [loggedInUser, setLoggedInUser] = useState<User | null>(null);

  if (!loggedInUser) {
    return <LoginPage onLogin={setLoggedInUser} />;
  }

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "system-ui,sans-serif" }}>
      <PasswordsPage currentUser={loggedInUser} onLogout={() => setLoggedInUser(null)} />
    </div>
  );
}