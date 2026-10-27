"use client";
import { useEffect, useRef, useState } from "react";
import {
  LockKeyhole,
  LogOut,
  Clock,
  Users,
  ShieldCheck,
  Save,
  X,
  Monitor,
  Check,
} from "lucide-react";
import { AuthPolicy, type Providers, useSchoolAuth } from "./auth";
import { LoginPreview, ProviderMark } from "./auth-preview";
type ActiveSession = {
  id: number;
  created: string;
  lastSeen: string;
  current: boolean;
};
function Switch({
  title,
  note,
  value,
  onChange,
  disabled = false,
  icon: Icon,
}: {
  title: string;
  note: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  icon?: typeof LockKeyhole;
}) {
  return (
    <div className="au-setting-switch">
      {Icon && <Icon size={23} />}
      <div>
        <strong>{title}</strong>
        <p>{note}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-label={title}
        aria-checked={value}
        disabled={disabled}
        onClick={() => onChange(!value)}
      >
        <span />
      </button>
    </div>
  );
}
export default function AuthSecuritySettings({
  mode = "login",
}: {
  mode?: "login" | "sessions";
}) {
  const auth = useSchoolAuth(),
    [draft, setDraft] = useState<AuthPolicy | null>(null),
    [saved, setSaved] = useState<AuthPolicy | null>(null),
    [revision, setRevision] = useState(0),
    [sessions, setSessions] = useState<ActiveSession[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [provider, setProvider] = useState<"Google" | "Microsoft" | null>(null),
    [list, setList] = useState(mode === "sessions"),
    [revoke, setRevoke] = useState<ActiveSession | null>(null);
  const csrf = useRef("");
  const [providers, setProviders] = useState<Providers | null>(null);
  const loadSessions = async () => {
    const r = await fetch("/api/auth/sessions", { cache: "no-store" });
    if (!r.ok) throw Error("Could not load your active sessions.");
    const p = await r.json();
    setSessions(p.sessions);
  };
  useEffect(() => {
    let active = true;
    fetch("/api/auth/policy", { cache: "no-store" })
      .then(async (r) => {
        const p = await r.json();
        if (!r.ok) throw Error(p.error || "Could not load security settings");
        if (active) {
          csrf.current = p.csrfToken;
          setDraft(p.policy);
          setSaved(p.policy);
          setRevision(p.revision);
          setProviders(p.providers);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    loadSessions().catch((e) => setError(e.message));
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => setList(mode === "sessions"), [mode]);
  useEffect(() => {
    if (!provider) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setProvider(null);
    };
    window.addEventListener("keydown", close);
    const previous = document.activeElement as HTMLElement | null;
    const timer = setTimeout(() => document.getElementById("au-provider-close")?.focus(), 0);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", close);
      previous?.focus();
    };
  }, [provider]);
  if (!draft || !saved)
    return (
      <p className="au-settings-loading">
        {error || "Loading login and session settings…"}
      </p>
    );
  const policy = draft,
    dirty = JSON.stringify(policy) !== JSON.stringify(saved),
    change = <K extends keyof AuthPolicy>(key: K, value: AuthPolicy[K]) => {
      setDraft({ ...policy, [key]: value });
      setMessage("");
      setError("");
    };
  const save = async () => {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/auth/policy", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrf.current,
          },
          body: JSON.stringify({ policy, revision }),
        }),
        p = await r.json();
      if (!r.ok) throw Error(p.error || "Could not save security settings");
      setDraft(p.policy);
      setSaved(p.policy);
      setRevision(p.revision);
      await auth.refreshPolicy();
      setMessage("Login and session settings saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save settings");
    } finally {
      setBusy(false);
    }
  };
  const field = (
    title: string,
    note: string,
    key:
      | "maxAttempts"
      | "lockMinutes"
      | "passwordExpiryDays"
      | "idleMinutes"
      | "redirectAfterLogout",
    options: [string | number, string][],
  ) => (
    <label className="au-setting-field">
      <div>
        <strong>{title}</strong>
        <p>{note}</p>
      </div>
      <select
        aria-label={title}
        disabled={busy}
        value={policy[key]}
        onChange={(e) =>
          change(
            key,
            key === "redirectAfterLogout"
              ? e.target.value
              : Number(e.target.value),
          )
        }
      >
        {options.map(([v, t]) => (
          <option key={v} value={v}>
            {t}
          </option>
        ))}
      </select>
    </label>
  );
  const revokeSession = async () => {
    if (!revoke) return;
    setBusy(true);
    try {
      const r = await fetch("/api/auth/sessions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrf.current,
          },
          body: JSON.stringify({ id: revoke.id }),
        }),
        p = await r.json();
      if (!r.ok) throw Error(p.error);
      setRevoke(null);
      if (p.endedCurrent) auth.expired();
      else await loadSessions();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not end session");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="au-settings">
      <div className="au-settings-toolbar">
        <span>
          {dirty
            ? "Unsaved login and session changes"
            : message || "Login and session settings are up to date"}
        </span>
        {dirty && (
          <button
            type="button"
            className="au-outline"
            disabled={busy}
            onClick={() => setDraft({ ...saved })}
          >
            Discard Changes
          </button>
        )}
        <button
          type="button"
          className="au-primary"
          disabled={busy || !dirty}
          onClick={save}
        >
          <Save size={16} />
          {busy ? "Saving…" : "Save Changes"}
        </button>
      </div>
      {error && (
        <p className="au-error" role="alert">
          {error}
        </p>
      )}
      {mode === "login" && (
        <div className="au-settings-columns au-login-layout">
          <div className="au-setting-stack au-policy-stack">
          <section className="au-setting-panel">
            <header>
              <LockKeyhole size={29} />
              <div>
                <h2>Login Settings</h2>
                <p>Configure how users can sign in to the system.</p>
              </div>
            </header>
            <div className="au-setting-body">
              <Switch
                icon={ShieldCheck}
                title="Enable Username/Password Login"
                note="Sign in with your school administrator account."
                value={policy.passwordLogin}
                onChange={(v) => change("passwordLogin", v)}
                disabled
              />
              <h3 className="au-provider-heading">Single sign-on</h3>
              <div className="au-provider-list">
                {(["Google", "Microsoft"] as const).map(name => (
                  <div key={name} className="au-provider-row">
                    <ProviderMark provider={name} />
                    <div><strong>{name}</strong><p>Allow school accounts to sign in with {name}</p></div>
                    <span className="au-provider-status">{providers?.[name === "Google" ? "google" : "microsoft"].configured ? policy[name === "Google" ? "googleLogin" : "microsoftLogin"] ? "Enabled" : "Ready to enable" : "Needs setup"}</span>
                    <button type="button" className="au-outline" aria-label={`Configure ${name} sign-in`} onClick={() => setProvider(name)}>Configure</button>
                  </div>
                ))}
              </div>
              <Switch title="Continue with Google" note="Enable Google sign-in for linked administrator accounts." value={policy.googleLogin} onChange={v => change("googleLogin", v)} disabled={busy || (!providers?.google.configured && !policy.googleLogin)} />
              <Switch title="Continue with Microsoft" note="Enable Microsoft sign-in for linked administrator accounts." value={policy.microsoftLogin} onChange={v => change("microsoftLogin", v)} disabled={busy || (!providers?.microsoft.configured && !policy.microsoftLogin)} />
              <Switch
                icon={Clock}
                title="Enable Remember Me"
                note="Allow a 14-day sign-in cookie on this device."
                value={policy.rememberMe}
                onChange={(v) => change("rememberMe", v)}
                disabled={busy}
              />
              {field(
                "Maximum Login Attempts",
                "Failed attempts before a temporary lock.",
                "maxAttempts",
                [
                  [3, "3 attempts"],
                  [5, "5 attempts"],
                  [10, "10 attempts"],
                ],
              )}
              {field(
                "Account Lock Duration",
                "Lock period after repeated failed sign-ins.",
                "lockMinutes",
                [
                  [15, "15 minutes"],
                  [30, "30 minutes"],
                  [60, "60 minutes"],
                ],
              )}
              {field(
                "Password Expiry",
                "Require an administrator password update periodically.",
                "passwordExpiryDays",
                [
                  [0, "Never"],
                  [30, "30 days"],
                  [60, "60 days"],
                  [90, "90 days"],
                ],
              )}
              <Switch
                title="Require Strong Password"
                note="Use 12+ characters, mixed case, numbers, and symbols."
                value={policy.strongPassword}
                onChange={(v) => change("strongPassword", v)}
                disabled={busy}
              />
              <p className="au-setting-note">
                Password policy applies to administrator password forms. Expiry
                tracking starts with the first sign-in after this feature is
                enabled. Your password is never stored in the browser by
                EduManage.
              </p>
            </div>
          </section>
            <section className="au-setting-panel">
              <header>
                <LogOut size={29} />
                <div>
                  <h2>Logout Settings</h2>
                  <p>Configure logout behavior and session handling.</p>
                </div>
              </header>
              <div className="au-setting-body">
                <Switch
                  title="Show Logout Confirmation"
                  note="Display a confirmation dialog before logout."
                  value={policy.logoutConfirmation}
                  onChange={(v) => change("logoutConfirmation", v)}
                  disabled={busy}
                />
                {field(
                  "Redirect After Logout",
                  "Choose the page displayed after signing out.",
                  "redirectAfterLogout",
                  [
                    ["Login Page", "Login Page"],
                    ["Logged Out Page", "Logged Out Page"],
                  ],
                )}
                <Switch
                  title="Clear Browser Session"
                  note="Clear EduManage browser preferences on logout."
                  value={policy.clearBrowserSession}
                  onChange={(v) => change("clearBrowserSession", v)}
                  disabled={busy}
                />
                <Switch
                  title="End All Active Sessions"
                  note="End all of your tracked sessions when you log out."
                  value={policy.endAllSessions}
                  onChange={(v) => change("endAllSessions", v)}
                  disabled={busy}
                />
                <Switch
                  title="Auto Logout on Inactivity"
                  note="Automatically sign out inactive sessions."
                  value={policy.idleEnabled}
                  onChange={(v) => change("idleEnabled", v)}
                  disabled={busy}
                />
                {field(
                  "Inactivity Timeout",
                  "Maximum time without activity before sign-out.",
                  "idleMinutes",
                  [
                    [5, "5 minutes"],
                    [15, "15 minutes"],
                    [30, "30 minutes"],
                    [60, "60 minutes"],
                  ],
                )}
                <Switch
                  title="Show Logout Button in Header"
                  note="Keep logout visible beside your profile."
                  value={policy.showLogoutHeader}
                  onChange={(v) => change("showLogoutHeader", v)}
                  disabled={busy}
                />
              </div>
            </section>
          </div>
          <div className="au-setting-stack au-preview-stack">
            <LoginPreview policy={policy} />
            <section className="au-setting-panel">
              <header>
                <Clock size={26} />
                <div>
                  <h2>Session Information</h2>
                  <p>Current session settings and your active devices.</p>
                </div>
              </header>
              <div className="au-session-summary">
                <div>
                  <Clock size={19} />
                  <span>
                    <strong>Session Timeout</strong>
                    <small>
                      {policy.idleEnabled
                        ? `${policy.idleMinutes} minutes (inactivity)`
                        : "Inactivity timeout disabled"}
                    </small>
                  </span>
                </div>
                <div>
                  <Users size={19} />
                  <span>
                    <strong>Your Active Sessions</strong>
                    <small>{sessions.length} currently active</small>
                  </span>
                </div>
                <button
                  type="button"
                  className="au-outline"
                  onClick={() => {
                    setList(true);
                    loadSessions().catch((e) => setError(e.message));
                  }}
                >
                  View Active Sessions
                </button>
              </div>
            </section>
          </div>
        </div>
      )}
      {provider && (
        <div className="au-overlay">
          <section className="au-dialog au-provider-dialog" role="dialog" aria-modal="true" aria-labelledby="au-provider-title" onKeyDown={event => {
            if (event.key === "Tab") { event.preventDefault(); document.getElementById("au-provider-close")?.focus(); }
          }}>
            <ProviderMark provider={provider} />
            <h2 id="au-provider-title">Connect {provider}</h2>
            <p>{providers?.[provider === "Google" ? "google" : "microsoft"].configured ? `The ${provider} server configuration is ready. Use the provider switch and Save Changes to enable or disable sign-in.` : `Register the school application with ${provider}, then save its credentials and linked account IDs in the server’s local environment file.`}</p>
            <div className="au-provider-steps"><strong>Setup requirements</strong><ol><li>A school-managed {provider} web application.</li><li>Callback address: <code>/api/auth/sso/{provider.toLowerCase()}/callback</code> on your EduManage site.</li><li>Server-side client ID and secret{provider === "Microsoft" ? ", plus the school tenant ID" : ""}.</li><li>Link the provider’s subject ID to an existing school administrator. See SSO-SETUP.md in the project.</li><li>Restart the backend, enable the provider here, and Save Changes.</li></ol></div>
            <p>Keep provider secrets on the server. The preview does not enable sign-in or change access to your school.</p>
            <button id="au-provider-close" type="button" className="au-primary" onClick={() => setProvider(null)}>Back to Settings</button>
          </section>
        </div>
      )}
      {(list || mode === "sessions") && (
        <section className="au-setting-panel au-session-list">
          <header>
            <Monitor size={28} />
            <div>
              <h2>Session & Security</h2>
              <p>Review and end your active sign-in sessions.</p>
            </div>
            <button
              type="button"
              className="au-outline"
              onClick={() => loadSessions().catch((e) => setError(e.message))}
            >
              Refresh Sessions
            </button>
          </header>
          <div className="au-session-scroll">
            <table>
              <thead>
                <tr>
                  <th>Device Session</th>
                  <th>Signed In</th>
                  <th>Last Activity</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s, i) => (
                  <tr key={s.id}>
                    <td>
                      {s.current ? "This browser" : "Other browser"}{" "}
                      <span>#{i + 1}</span>
                    </td>
                    <td>{new Date(s.created).toLocaleString()}</td>
                    <td>{new Date(s.lastSeen).toLocaleString()}</td>
                    <td>
                      <button
                        type="button"
                        className="au-outline"
                        onClick={() => setRevoke(s)}
                      >
                        End Session
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="au-setting-note">
            Only your sessions are listed. Ending a session removes its
            server-side sign-in cookie authority.
          </p>
        </section>
      )}
      {revoke && (
        <div className="au-overlay">
          <section
            className="au-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="au-revoke-title"
          >
            <button
              type="button"
              className="au-close"
              onClick={() => setRevoke(null)}
              aria-label="Close session confirmation"
            >
              <X size={20} />
            </button>
            <LogOut size={38} />
            <h2 id="au-revoke-title">End this session?</h2>
            <p>
              {revoke.current
                ? "This browser will return to the sign-in page."
                : "That browser will need to sign in again."}
            </p>
            <div className="au-dialog-actions">
              <button type="button" onClick={() => setRevoke(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="au-primary"
                disabled={busy}
                onClick={revokeSession}
              >
                End Session
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
