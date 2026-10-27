"use client";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { ProviderMark } from "./auth-preview";
import {
  GraduationCap,
  BookOpen,
  ChartNoAxesCombined,
  Trophy,
  Mail,
  LockKeyhole,
  Eye,
  EyeOff,
  ArrowRight,
  LogOut,
  X,
  ArrowLeft,
  ShieldCheck,
} from "lucide-react";
export type AuthPolicy = {
  passwordLogin: boolean;
  googleLogin: boolean;
  microsoftLogin: boolean;
  rememberMe: boolean;
  maxAttempts: number;
  lockMinutes: number;
  passwordExpiryDays: number;
  strongPassword: boolean;
  logoutConfirmation: boolean;
  redirectAfterLogout: string;
  clearBrowserSession: boolean;
  endAllSessions: boolean;
  idleEnabled: boolean;
  idleMinutes: number;
  showLogoutHeader: boolean;
};
export type Providers = Record<"google" | "microsoft", { configured: boolean; enabled: boolean }>;
type User = { id: number; username: string; name: string; role: string };
type AuthContextValue = {
  user: User | null;
  policy: AuthPolicy | null;
  requestLogout: () => void;
  refreshPolicy: () => Promise<void>;
  expired: () => void;
};
const Context = createContext<AuthContextValue>({
  user: null,
  policy: null,
  requestLogout: () => {},
  refreshPolicy: async () => {},
  expired: () => {},
});
export const useSchoolAuth = () => useContext(Context);
function Brand() {
  return (
    <div className="au-brand">
      <GraduationCap size={48} fill="currentColor" strokeWidth={1.2} />
      <span>
        <strong>EduManage</strong>
        <small>School Management System</small>
      </span>
    </div>
  );
}
export function AuthGate({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null),
    [policy, setPolicy] = useState<AuthPolicy | null>(null),
    [view, setView] = useState<"loading" | "login" | "app" | "loggedout">(
      "loading",
    ),
    [setup, setSetup] = useState(false),
    [error, setError] = useState(""),
    [confirm, setConfirm] = useState(false),
    [busy, setBusy] = useState(false),
    [identifier, setIdentifier] = useState(""),
    [password, setPassword] = useState(""),
    [show, setShow] = useState(false),
    [remember, setRemember] = useState(false),
    [help, setHelp] = useState(false);
  const [providers, setProviders] = useState<Providers | null>(null);
  const [linkHint, setLinkHint] = useState<{ provider: string; subject: string } | null>(null);
  const csrf = useRef(""),
    activity = useRef(false),
    lastActivity = useRef(Date.now()),
    check = useRef(false);
  const expired = () => {
    setUser(null);
    setConfirm(false);
    setPassword("");
    setView("login");
    setError("Your session has ended. Sign in again to continue.");
  };
  const refreshPolicy = async () => {
    const r = await fetch("/api/auth/session", { cache: "no-store" });
    if (!r.ok) throw Error("Could not connect to the school server");
    const p = await r.json();
    csrf.current = p.csrfToken;
    setPolicy(p.policy);
    setSetup(p.setupRequired);
    setProviders(p.providers);
    if (p.ssoError) setError(p.ssoError);
    setLinkHint(p.ssoLinkHint || null);
    setUser(p.user);
    setView(p.authenticated ? "app" : "login");
  };
  useEffect(() => {
    refreshPolicy().catch((e) => {
      setError(e.message);
      setView("login");
    });
  }, []);
  useEffect(() => {
    if (view !== "app") return;
    const touch = () => {
      activity.current = true;
      lastActivity.current = Date.now();
    };
    for (const name of ["pointerdown", "keydown", "wheel", "touchstart"])
      window.addEventListener(name, touch, { passive: true });
    const timer = setInterval(async () => {
      if (check.current) return;
      check.current = true;
      try {
        const active = activity.current;
        activity.current = false;
        const r = await fetch("/api/auth/session", {
          cache: "no-store",
          headers: active ? { "X-School-Activity": "1" } : {},
        });
        if (r.ok) {
          const p = await r.json();
          csrf.current = p.csrfToken;
          setPolicy(p.policy);
          if (!p.authenticated) expired();
        }
      } catch {
        // A connection interruption is not proof that the session has expired.
      } finally {
        check.current = false;
      }
    }, 15000);
    return () => {
      clearInterval(timer);
      for (const name of ["pointerdown", "keydown", "wheel", "touchstart"])
        window.removeEventListener(name, touch);
    };
  }, [view]);
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) {
        setConfirm(false);
        setHelp(false);
      }
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [busy]);
  useEffect(() => {
    const base = window.fetch;
    window.fetch = async (...args) => {
      const r = await base(...args);
      const path = typeof args[0] === "string" ? args[0] : "";
      if (
        r.status === 401 &&
        path.startsWith("/api/") &&
        !path.includes("/auth/login")
      )
        expired();
      return r;
    };
    return () => {
      window.fetch = base;
    };
  }, []);
  const logoutNow = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrf.current,
        },
        body: "{}",
      });
      if (!r.ok) throw Error("Could not sign out. Please try again.");
      const p = await r.json();
      if (p.clearBrowserSession) {
        for (const store of [localStorage, sessionStorage])
          for (const key of Object.keys(store))
            if (key.startsWith("edumanage")) store.removeItem(key);
      }
      setPassword("");
      setUser(null);
      setConfirm(false);
      setView(p.redirect === "Login Page" ? "login" : "loggedout");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not sign out");
    } finally {
      setBusy(false);
    }
  };
  const requestLogout = () => {
    setError("");
    if (policy?.logoutConfirmation) setConfirm(true);
    else logoutNow();
  };
  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const session = await fetch("/api/auth/session", { cache: "no-store" });
      if (!session.ok) throw Error("Could not connect to the school server.");
      const s = await session.json();
      csrf.current = s.csrfToken;
      const r = await fetch("/api/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrf.current,
          },
          body: JSON.stringify({ identifier, password, remember }),
        }),
        p = await r.json();
      if (!r.ok) throw Error(p.error || "Unable to sign in");
      csrf.current = p.csrfToken;
      setUser(p.user);
      setPolicy(p.policy);
      setPassword("");
      lastActivity.current = Date.now();
      activity.current = true;
      setView("app");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to sign in");
    } finally {
      setBusy(false);
    }
  };
  const signInProvider = async (provider: "google" | "microsoft") => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const r = await fetch(`/api/auth/sso/${provider}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRFToken": csrf.current },
        body: JSON.stringify({ remember }),
      });
      const p = await r.json();
      if (!r.ok) throw Error(p.error || "Could not start provider sign-in.");
      window.location.assign(p.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start provider sign-in.");
      setBusy(false);
    }
  };
  if (view === "loading")
    return (
      <div className="au-loading">
        <Brand />
        <p>Connecting to your school…</p>
      </div>
    );
  if (view === "login")
    return (
      <div className="au-login">
        <section className="au-welcome">
          <Brand />
          <div className="au-welcome-copy">
            <h1>
              Bright Future
              <br />
              Starts Here
            </h1>
            <p>
              Manage students, teachers, classes
              <br />
              and school operations in one place.
            </p>
            <div className="au-values">
              <span>
                <BookOpen />
                Education
              </span>
              <span>
                <ChartNoAxesCombined />
                Growth
              </span>
              <span>
                <Trophy />
                Success
              </span>
            </div>
          </div>
        </section>
        <main className="au-login-main">
          <form className="au-login-card" onSubmit={signIn}>
            <h2>Welcome Back</h2>
            <p>Sign in to your EduManage account</p>
            {setup && (
              <div className="au-setup">
                Your school administrator needs to set up an account before you
                can sign in.
              </div>
            )}
            <label>
              Username or Email
              <div className="au-input">
                <Mail size={18} />
                <input
                  aria-label="Username or Email"
                  autoComplete="username"
                  maxLength={254}
                  required
                  value={identifier}
                  onInput={(e) => setIdentifier(e.currentTarget.value)}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Enter your username or email"
                />
              </div>
            </label>
            <label>
              Password
              <div className="au-input">
                <LockKeyhole size={18} />
                <input
                  aria-label="Password"
                  autoComplete="current-password"
                  type={show ? "text" : "password"}
                  required
                  maxLength={1024}
                  value={password}
                  onInput={(e) => setPassword(e.currentTarget.value)}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  aria-label={show ? "Hide password" : "Show password"}
                  onClick={() => setShow(!show)}
                >
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>
            <div className="au-login-options">
              <label>
                <input
                  type="checkbox"
                  checked={remember}
                  disabled={!policy?.rememberMe}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                Remember me
              </label>
              <button type="button" onClick={() => setHelp(true)}>
                Forgot password?
              </button>
            </div>
            {error && (
              <div role="alert" className="au-error">
                {error}
              </div>
            )}
            {linkHint && <div className="au-setup">Give your school administrator this verified {linkHint.provider} account ID to link your account: <code style={{ overflowWrap: "anywhere" }}>{linkHint.subject}</code></div>}
            <button
              type="submit"
              className="au-primary au-signin"
              disabled={busy || !policy?.passwordLogin}
            >
              <ArrowRight size={20} />
              {busy ? "Signing in…" : "Sign In"}
            </button>
            <div className="au-divider">
              <span />
              OR
              <span />
            </div>
            <button type="button" className="au-sso" disabled={busy || !providers?.google.configured || !providers.google.enabled} onClick={() => signInProvider("google")}>
              <ProviderMark provider="Google" />Continue with Google
            </button>
            <button type="button" className="au-sso" disabled={busy || !providers?.microsoft.configured || !providers.microsoft.enabled} onClick={() => signInProvider("microsoft")}>
              <ProviderMark provider="Microsoft" />
              Continue with Microsoft
            </button>
            <p className="au-provider-note">{providers?.google.configured && providers.google.enabled || providers?.microsoft.configured && providers.microsoft.enabled ? "Use a provider account linked by your school administrator." : "Provider sign-in needs administrator setup."}</p>
            <footer>Don’t have an account? Contact your administrator.</footer>
          </form>
        </main>
        {help && (
          <div className="au-overlay">
            <section
              className="au-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="au-help-title"
            >
              <button
                type="button"
                className="au-close"
                aria-label="Close password help"
                onClick={() => setHelp(false)}
              >
                <X />
              </button>
              <ShieldCheck size={38} />
              <h2 id="au-help-title">Reset Your Password</h2>
              <p>
                Contact your school administrator to reset your password
                securely. No reset request has been sent.
              </p>
              <button
                type="button"
                className="au-primary"
                onClick={() => setHelp(false)}
              >
                Back to Sign In
              </button>
            </section>
          </div>
        )}
      </div>
    );
  if (view === "loggedout")
    return (
      <div className="au-loggedout">
        <section>
          <Brand />
          <div>
            <h1>
              You have been
              <br />
              logged out
            </h1>
            <p>
              Thank you for using EduManage.
              <br />
              See you again soon!
            </p>
            <button
              type="button"
              onClick={() => {
                setError("");
                refreshPolicy().catch(() => setView("login"));
              }}
            >
              <ArrowLeft size={18} />
              Back to Login
            </button>
          </div>
        </section>
        <aside>
          <svg
            viewBox="0 0 420 380"
            role="img"
            aria-label="An open door with an orange exit arrow"
          >
            <ellipse cx="219" cy="341" rx="153" ry="12" fill="#e8f2fb" />
            <path
              d="M142 81H286V337H142Z"
              fill="#fff0d8"
              stroke="#ffb867"
              strokeWidth="7"
            />
            <path d="M151 96H270V337H151Z" fill="#fff" />
            <path
              d="M142 81L218 124V355L142 335Z"
              fill="#97b2d1"
              stroke="#6f8cae"
              strokeWidth="5"
            />
            <path
              d="M202 237v21"
              stroke="#fff"
              strokeWidth="6"
              strokeLinecap="round"
            />
            <path
              d="M251 219H337m-26-25 26 25-26 25"
              fill="none"
              stroke="#ff9826"
              strokeWidth="18"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M88 312H124L118 340H94Z" fill="#8aa4ba" />
            <path
              d="M106 313v-46m0 17q-31-27-27-5 3 19 27 21m1-12q31-32 30-9-4 21-30 23"
              fill="#55b39e"
              stroke="#359582"
              strokeWidth="3"
            />
            <circle cx="319" cy="98" r="5" fill="#ffcf8a" />
            <circle cx="99" cy="149" r="4" fill="#c9e7df" />
          </svg>
        </aside>
      </div>
    );
  return (
    <Context.Provider
      value={{ user, policy, requestLogout, refreshPolicy, expired }}
    >
      {children}
      {confirm && (
        <div className="au-overlay au-logout-overlay">
          <section
            className="au-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="au-confirm-title"
          >
            <button
              type="button"
              className="au-close"
              aria-label="Close logout confirmation"
              disabled={busy}
              onClick={() => setConfirm(false)}
            >
              <X size={20} />
            </button>
            <LogOut className="au-exit-icon" size={47} />
            <h2 id="au-confirm-title">Confirm Logout</h2>
            <p>
              Are you sure you want to logout from EduManage?
              <br />
              You will need to sign in again to access your account.
            </p>
            {error && (
              <div className="au-error" role="alert">
                {error}
              </div>
            )}
            <div className="au-dialog-actions">
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirm(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="au-primary"
                disabled={busy}
                onClick={logoutNow}
              >
                <LogOut size={17} />
                {busy ? "Signing out…" : "Logout"}
              </button>
            </div>
          </section>
        </div>
      )}
    </Context.Provider>
  );
}
