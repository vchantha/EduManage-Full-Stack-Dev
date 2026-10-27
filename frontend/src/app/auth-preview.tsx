"use client";
import { Eye, GraduationCap, LogOut } from "lucide-react";
import type { AuthPolicy } from "./auth";

export function ProviderMark({ provider }: { provider: "Google" | "Microsoft" }) {
  if (provider === "Microsoft")
    return <span className="au-microsoft" aria-hidden="true"><i /><i /><i /><i /></span>;
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285f4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.52h3.24c1.9-1.75 2.98-4.33 2.98-7.37Z" />
      <path fill="#34a853" d="M12 22c2.7 0 4.96-.9 6.62-2.4l-3.24-2.52c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.76-5.59-4.12H3.07v2.59A10 10 0 0 0 12 22Z" />
      <path fill="#fbbc05" d="M6.41 13.92a6 6 0 0 1 0-3.84V7.49H3.07a10 10 0 0 0 0 9.02l3.34-2.59Z" />
      <path fill="#ea4335" d="M12 5.96c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.93 5.49l3.34 2.59A5.98 5.98 0 0 1 12 5.96Z" />
    </svg>
  );
}

export function LoginPreview({ policy }: { policy: AuthPolicy }) {
  return (
    <section className="au-setting-panel au-preview-panel">
      <header><Eye size={26} /><div><h2>Login Preview</h2><p>Preview your school’s sign-in screen.</p></div><span className="au-preview-badge">Preview</span></header>
      <div className="au-preview-backdrop">
        <div className="au-preview-card">
          <GraduationCap size={37} className="au-preview-cap" />
          <strong className="au-preview-brand">EduManage</strong>
          <h3>Welcome Back</h3><p>Sign in to your school account</p>
          <div className="au-preview-label">Username or Email</div>
          <div className="au-preview-input">john.doe@school.edu.kh</div>
          <div className="au-preview-label">Password</div>
          <div className="au-preview-input"><span>••••••••••••</span><Eye size={15} /></div>
          <div className="au-preview-options"><span>{policy.rememberMe ? "☑" : "☐"} Remember me</span><span>Forgot password?</span></div>
          <div className="au-preview-signin">Sign In</div>
          <div className="au-divider"><span />or continue with<span /></div>
          {(["Google", "Microsoft"] as const).map(provider => <div key={provider} className="au-sso"><ProviderMark provider={provider} />Continue with {provider}</div>)}
        </div>
        <p className="au-preview-caption">Preview only. Actual sign-in uses the enabled providers and linked school accounts.</p>
      </div>
      {policy.logoutConfirmation && <div className="au-logout-preview"><LogOut size={28} /><div><h3>Confirm Logout</h3><p>Are you sure you want to log out?</p></div><div className="au-preview-actions"><span>Cancel</span><span>Logout</span></div></div>}
    </section>
  );
}
