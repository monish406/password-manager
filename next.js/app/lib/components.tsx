"use client";

import { createContext, useContext } from "react";

// ─── Nav Context ──────────────────────────────────────────────────────────────
// Shared context so NavButtons can switch pages without prop-drilling.

export type NavPage = "users" | "passwords";

export type NavContextType = {
  activePage: NavPage;
  navigate: (page: NavPage) => void;
  goBack: () => void;
  goForward: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
};

export const NavContext = createContext<NavContextType | null>(null);

export const useNav = () => {
  const ctx = useContext(NavContext);
  if (!ctx) throw new Error("useNav must be used inside a NavContext.Provider");
  return ctx;
};

// ─── NavButtons ───────────────────────────────────────────────────────────────

export const NavButtons = () => {
  const { goBack, goForward, canGoBack, canGoForward } = useNav();

  const btnStyle = (enabled: boolean): React.CSSProperties => ({
    background: "#F4F6FB",
    border: "1px solid #E4E8F0",
    borderRadius: 7,
    width: 30,
    height: 30,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: enabled ? "pointer" : "default",
    color: enabled ? "#6B7280" : "#C9D0DA",
    flexShrink: 0,
    opacity: enabled ? 1 : 0.5,
    transition: "background 0.15s, color 0.15s",
  });

  return (
    <div style={{ display: "flex", gap: 4 }}>
      {/* Back */}
      <button
        onClick={goBack}
        disabled={!canGoBack}
        style={btnStyle(canGoBack)}
        title="Go back"
        onMouseEnter={(e) => {
          if (canGoBack) {
            e.currentTarget.style.background = "#E8EDF5";
            e.currentTarget.style.color = "#1878CE";
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "#F4F6FB";
          e.currentTarget.style.color = canGoBack ? "#6B7280" : "#C9D0DA";
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      {/* Forward */}
      <button
        onClick={goForward}
        disabled={!canGoForward}
        style={btnStyle(canGoForward)}
        title="Go forward"
        onMouseEnter={(e) => {
          if (canGoForward) {
            e.currentTarget.style.background = "#E8EDF5";
            e.currentTarget.style.color = "#1878CE";
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "#F4F6FB";
          e.currentTarget.style.color = canGoForward ? "#6B7280" : "#C9D0DA";
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    </div>
  );
};

// ─── EyeIcon ──────────────────────────────────────────────────────────────────

export const EyeIcon = ({ open }: { open: boolean }) => {
  if (open) {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
};