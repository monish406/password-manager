"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { login, saveUser } from "@/app/lib/api";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [identifier, setIdentifier]     = useState("");   // accepts email OR username
  const [password, setPassword]         = useState("");
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState("");
  const router = useRouter();

  useEffect(() => {
    document.title = "Rootxwire — Sign In";
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!identifier.trim()) { setError("Email or username is required."); return; }
    if (!password)           { setError("Password is required.");          return; }

    setLoading(true);
    try {
      // login() in api.ts calls POST /users/login and calls saveUser() internally
      const data = await login({ email: identifier.trim(), password });

      // Also keep email in sessionStorage so the dashboard auth-check works
      sessionStorage.setItem("loggedInUserEmail", data.user.email);
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid credentials");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#e8edf4] font-sans">

      {/* ── Card ── */}
      <div className="w-full max-w-[460px] mx-5 bg-white rounded-[20px] shadow-[0_8px_40px_rgba(0,0,0,0.10)] px-11 pt-12 pb-11">

        {/* Logo */}
        <div className="text-center mb-7">
          <span className="text-[22px] font-medium tracking-[-0.3px] text-[#1e2a35] font-serif">
            Root<span className="text-[#e8622a]">x</span>wire
          </span>
        </div>

        {/* Heading */}
        <div className="text-center mb-8">
          <h1 className="text-[28px] font-bold text-gray-900 mb-1.5 tracking-[-0.5px]">
            Welcome back
          </h1>
          <p className="text-sm text-gray-400">Sign in to your account to continue</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-[18px]">

          {/* Email / Username */}
          <div>
            <label
              htmlFor="identifier"
              className="block text-[11px] font-semibold text-gray-500 uppercase tracking-[0.06em] mb-[7px]"
            >
              Email or Username
            </label>
            <input
              id="identifier"
              type="text"
              value={identifier}
              onChange={(e) => { setIdentifier(e.target.value); setError(""); }}
              placeholder="you@nexus.io  or  alice"
              required
              autoComplete="username"
              className="w-full px-4 py-3 rounded-xl border border-[#e5eaf0] bg-[#f3f6fa] text-sm text-gray-700 outline-none box-border transition-[border-color,box-shadow] duration-200 placeholder:text-[#c4cdd6] focus:border-[#93c5fd] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)]"
            />
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              className="block text-[11px] font-semibold text-gray-500 uppercase tracking-[0.06em] mb-[7px]"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="w-full pl-4 pr-11 py-3 rounded-xl border border-[#e5eaf0] bg-[#f3f6fa] text-sm text-gray-700 outline-none box-border transition-[border-color,box-shadow] duration-200 placeholder:text-[#c4cdd6] focus:border-[#93c5fd] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)]"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 bg-transparent border-0 cursor-pointer p-0 text-[#b0bcc8] flex items-center"
              >
                {showPassword ? (
                  /* Eye open */
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                ) : (
                  /* Eye closed */
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.477 0-8.268-2.943-9.542-7a9.97 9.97 0 012.068-3.505M6.228 6.228A9.97 9.97 0 0112 5c4.477 0 8.268 2.943 9.542 7a9.97 9.97 0 01-4.423 5.323M6.228 6.228L3 3m3.228 3.228l3.65 3.65M17.772 17.772L21 21m-3.228-3.228l-3.65-3.65" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="text-sm text-red-500 text-center bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
              {error}
            </div>
          )}

          {/* Sign In Button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3.5 mt-1 rounded-xl border-0 text-white text-[15px] font-semibold flex items-center justify-center gap-2 transition-[background-color,transform] duration-200 ${
              loading
                ? "bg-[#5a93d4] cursor-not-allowed"
                : "bg-[#2c6fbd] cursor-pointer hover:bg-[#255fa3] active:scale-[0.99]"
            }`}
          >
            {loading ? (
              <>
                <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Signing in…
              </>
            ) : (
              "Sign in"
            )}
          </button>

        </form>
      </div>
    </div>
  );
}