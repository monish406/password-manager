export interface User {
  id: number;
  name: string;
  username: string;
  email: string;
  initials: string;
  avatarBg: string;
}

export interface PasswordEntry {
  id: number;
  platform: string;
  user: string;
  email: string;
  password: string;
  url: string;
}

// ─── Mock Users ───────────────────────────────────────────────────────

export const users: User[] = [
  { id: 1, name: "Alice Johnson", username: "alice",   email: "alice@nexus.io",   initials: "Aj", avatarBg: "#4F7FE8" },
  { id: 2, name: "Bob Smith",    username: "bob",    email: "bob@nexus.io",    initials: "BS", avatarBg: "#E8622A" },
  { id: 3, name: "Carol Williams",  username: "carol",  email: "carol@nexus.io",  initials: "CW", avatarBg: "#22C55E" },
  { id: 4, name: "David Brown",    username: "david",    email: "david@nexus.io",    initials: "DB", avatarBg: "#A855F7" },
  { id: 5, name: "Eva Brown",    username: "eva",    email: "eva@nexus.io",    initials: "EB", avatarBg: "#EAB308" },
];

// ✅ Exported so dashboard page.tsx can import it
export const currentUser: User = users[0];

// ─── Mock Passwords ───────────────────────────────────────────────────────────

export const initialPasswords: PasswordEntry[] = [
  { id: 1, platform: "GitHub", user: "alex.r",   email: "alex.r@nexus.io",   password: "gh_token_xK9mP2", url: "https://github.com" },
  { id: 2, platform: "GitHub", user: "morgan.l", email: "morgan.l@nexus.io", password: "gh_secure_99Lz",  url: "https://github.com" },
  { id: 3, platform: "Slack",  user: "alex.r",   email: "alex.r@nexus.io",   password: "slk_xR7wQ3nT",   url: "https://slack.com" },
  { id: 4, platform: "Slack",  user: "jamie.c",  email: "jamie.c@nexus.io",  password: "slk_mP2kL9vB",   url: "https://slack.com" },
  { id: 5, platform: "Jira",   user: "taylor.k", email: "taylor.k@nexus.io", password: "jira_pass_4Xz9", url: "https://jira.atlassian.com" },
  { id: 6, platform: "Notion", user: "casey.p",  email: "casey.p@nexus.io",  password: "notion_7Bm3Kp",  url: "https://notion.so" },
];