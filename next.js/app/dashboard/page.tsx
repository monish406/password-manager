"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { loadUser, clearUser, type User } from "@/app/lib/api";
import { UsersPage } from "@/app/users/page";
import { PasswordsPage } from "@/app/passwords/page";
import { NavContext, type NavPage } from "@/app/lib/components";

type NavItem = { id: NavPage; label: string; icon: React.ReactElement };

const NAV_ITEMS: NavItem[] = [
  {
    id: "users",
    label: "Users",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    id: "passwords",
    label: "Passwords",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
  },
];

const AVATAR_COLORS = ["#4F7FD4","#E8622A","#27AE60","#8E44AD","#E74C3C","#16A085","#D4AC0D","#2C3E50"];
const getInitials = (name: string) =>
  name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
const getAvatarBg = (name: string) =>
  AVATAR_COLORS[Math.abs(name.split("").reduce((h, c) => c.charCodeAt(0) + ((h << 5) - h), 0)) % AVATAR_COLORS.length];

export default function DashboardPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const router = useRouter();

  const [history, setHistory] = useState<NavPage[]>(["users"]);
  const [cursor, setCursor]   = useState(0);

  const activePage   = history[cursor];
  const canGoBack    = cursor > 0;
  const canGoForward = cursor < history.length - 1;

  const navigate = useCallback((page: NavPage) => {
    if (history[cursor] === page) return;
    setHistory((prev) => [...prev.slice(0, cursor + 1), page]);
    setCursor((c) => c + 1);
  }, [cursor, history]);

  const goBack    = useCallback(() => { if (canGoBack)    setCursor((c) => c - 1); }, [canGoBack]);
  const goForward = useCallback(() => { if (canGoForward) setCursor((c) => c + 1); }, [canGoForward]);

  useEffect(() => {
    const email  = sessionStorage.getItem("loggedInUserEmail");
    if (!email) { router.push("/login"); return; }
    const stored = loadUser();
    if (!stored || stored.email.toLowerCase() !== email.toLowerCase()) {
      router.push("/login"); return;
    }
    setCurrentUser(stored);
  }, [router]);

  const handleLogout = () => {
    sessionStorage.removeItem("loggedInUserEmail");
    clearUser();
    router.push("/login");
  };

  if (!currentUser) return null;

  const initials = getInitials(currentUser.name);
  const avatarBg = getAvatarBg(currentUser.name);

  return (
    <NavContext.Provider value={{ activePage, navigate, goBack, goForward, canGoBack, canGoForward }}>
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", backgroundColor: "#F0F3FA", fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif" }}>

        {/* ── Header ── */}
        <header style={{ height: 56, background: "#ffffff", borderBottom: "1px solid #E4E8F0", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", flexShrink: 0, boxShadow: "0 2px 8px #0000000A", zIndex: 10 }}>
          <span style={{ fontSize: "18px", fontWeight: 500, letterSpacing: "-0.3px", color: "#1e2a35", fontFamily: "Georgia, 'Times New Roman', serif" }}>
            Root<span style={{ color: "#e8622a" }}>x</span>wire
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#EFF6FF", border: "1.5px solid #BFDBFE", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#1878CE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.3, gap: 2 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#1e2a35" }}>{currentUser.name}</span>
                <span style={{ fontSize: 11, color: "#6B7280" }}>{currentUser.email}</span>
              </div>
            </div>
            <div style={{ width: 1, height: 28, background: "#E4E8F0" }} />
            <button onClick={handleLogout} style={{ background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA", borderRadius: 7, padding: "6px 14px", fontWeight: 600, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Sign Out
            </button>
          </div>
        </header>

        {/* ── Body ── */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

          {/* ── Sidebar ── */}
          <aside style={{ width: 220, background: "#ffffff", borderRight: "1px solid #E4E8F0", display: "flex", flexDirection: "column", flexShrink: 0, boxShadow: "2px 0 16px #0000000A" }}>
            <div style={{ margin: "14px 10px 6px", background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 10, padding: "10px 12px", display: "flex", alignItems: "center", gap: 9 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: avatarBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                {initials}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#1A1D2E", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{currentUser.name}</div>
                <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>{currentUser.username}</div>
              </div>
            </div>

            <div style={{ height: 1, background: "#E4E8F0", margin: "6px 10px 8px" }} />

            <nav style={{ flex: 1, padding: "0 10px" }}>
              {NAV_ITEMS.map((item) => {
                const active = activePage === item.id;
                return (
                  <button key={item.id} onClick={() => navigate(item.id)}
                    style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 9, border: "none", background: active ? "#EFF6FF" : "transparent", color: active ? "#1878CE" : "#6B7280", fontWeight: active ? 700 : 500, fontSize: 13, cursor: "pointer", marginBottom: 2, textAlign: "left", transition: "background 0.15s, color 0.15s" }}
                    onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "#F4F6FB"; }}
                    onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
                  >
                    {item.icon}
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {active && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#1878CE", flexShrink: 0 }} />}
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* ── Main Content ── */}
          <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
            {activePage === "users"     && <UsersPage     currentUser={currentUser} />}
            {activePage === "passwords" && <PasswordsPage currentUser={currentUser} onLogout={handleLogout} />}
          </div>
        </div>
      </div>
    </NavContext.Provider>
  );
}