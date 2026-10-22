"use client";
import { initialPlanning, type AcademicYear, type Term } from "./planning-data";
import { useEffect, useRef, useState } from "react";
import {
  Settings,
  CalendarDays,
  BookOpen,
  Users,
  Bell,
  Database,
  School,
  Save,
  ImagePlus,
  Globe,
  Clock,
  Hash,
  Mail,
  MessageCircle,
  Zap,
  Shield,
  Download,
  FileText,
  RotateCcw,
  X,
  Plus,
  Pencil,
  Check,
  CloudDownload,
  Box,
  GraduationCap,
  Palette,
  Link,
  Search,
} from "lucide-react";

export const settingsSections = [
  "General",
  "Academic Year",
  "Class & Grading",
  "Users & Roles",
  "Notifications",
  "System Configuration",
  "Data Management",
  "Backup & Security",
  "Integrations",
  "Appearance",
] as const;
export type SettingsSection = (typeof settingsSections)[number];
type Person = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
};
type SettingsData = {
  school: {
    name: string;
    shortName: string;
    type: string;
    established: string;
    address: string;
    phone: string;
    email: string;
    website: string;
    logo: string;
  };
  preferences: {
    language: string;
    timezone: string;
    dateFormat: string;
    timeFormat: string;
    firstDay: string;
    currency: string;
    autoStudentId: boolean;
    emailEnabled: boolean;
    smsEnabled: boolean;
  };
  grading: {
    scale: string;
    passMark: string;
    precision: string;
    classCapacity: string;
    studentPrefix: string;
  };
  notifications: {
    attendance: boolean;
    fees: boolean;
    exams: boolean;
    digest: string;
    replyTo: string;
  };
  system: { schoolCode: string; supportEmail: string; sessionNotice: string };
  integrations: { website: string; helpUrl: string; calendarUrl: string };
  appearance: { accent: string; density: string; showDescriptions: boolean };
  directory: Person[];
};
type Envelope = {
  data: SettingsData;
  revision: number;
  logs: { at: string; action: string; sections: string[] }[];
  lastExport: string | null;
};
type SystemInfo = {
  version: string;
  database: string;
  workerUptimeSeconds: number;
  checkedAt: string;
};
const icons = [
  Settings,
  CalendarDays,
  BookOpen,
  Users,
  Bell,
  Database,
  Database,
  Shield,
  Link,
  Palette,
];
const descriptions = [
  "School information",
  "Terms and academic periods",
  "Class structure and grading",
  "Manage users and permissions",
  "Email, SMS and alerts",
  "Advanced configuration",
];
function Panel({
  title,
  note,
  icon: Icon,
  action,
  children,
}: {
  title: string;
  note?: string;
  icon: typeof Settings;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="st-panel">
      <header>
        <Icon size={30} />
        <div>
          <h2>{title}</h2>
          {note && <p>{note}</p>}
        </div>
        {action}
      </header>
      <div className="st-panel-body">{children}</div>
    </section>
  );
}
function Field({
  label,
  value,
  onChange,
  options,
  type = "text",
  required = false,
  wide = false,
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  options?: string[][];
  type?: string;
  required?: boolean;
  wide?: boolean;
}) {
  return (
    <label className={`st-field ${wide ? "wide" : ""}`}>
      <span>
        {label}
        {required && <b> *</b>}
      </span>
      {options ? (
        <select value={value} onChange={(e) => onChange(e.target.value)}>
          {options.map(([v, t]) => (
            <option key={v} value={v}>
              {t || v}
            </option>
          ))}
        </select>
      ) : type === "textarea" ? (
        <textarea
          value={value}
          onInput={(e) => onChange(e.currentTarget.value)}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          type={type}
          required={required}
          value={value}
          onInput={(e) => onChange(e.currentTarget.value)}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  );
}
function Toggle({
  label,
  note,
  value,
  onChange,
  icon: Icon = Bell,
}: {
  label: string;
  note?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  icon?: typeof Bell;
}) {
  return (
    <div className="st-toggle">
      <Icon size={19} />
      <div>
        <strong>{label}</strong>
        {note && <small>{note}</small>}
      </div>
      <button
        type="button"
        role="switch"
        aria-label={label}
        aria-checked={value}
        onClick={() => onChange(!value)}
      >
        <span />
      </button>
    </div>
  );
}
const opts = (...values: string[]) => values.map((v) => [v, v]);
const download = (name: string, body: string) => {
  const u = URL.createObjectURL(new Blob([body], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = u;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(u), 1000);
};

export default function SchoolSettings({
  year,
  term,
  section,
  onSection,
  query,
  notify,
  onAcademic,
}: {
  year: string;
  term: string;
  section: SettingsSection;
  onSection: (s: SettingsSection) => void;
  query: string;
  notify: (s: string) => void;
  onAcademic: () => void;
}) {
  const [envelope, setEnvelope] = useState<Envelope | null>(null),
    [draft, setDraft] = useState<SettingsData | null>(null),
    [info, setInfo] = useState<SystemInfo | null>(null),
    [academicData, setAcademicData] = useState<{
      years: AcademicYear[];
      terms: Term[];
    }>(initialPlanning),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [modal, setModal] = useState<"reset" | "person" | "roles" | null>(null),
    [person, setPerson] = useState<Person>({
      id: "",
      name: "",
      email: "",
      role: "Teacher",
      status: "Active",
    });
  const csrf = useRef(""),
    file = useRef<HTMLInputElement>(null);
  useEffect(() => {
    let alive = true;
    fetch("/api/settings")
      .then(async (r) => {
        if (!r.ok)
          throw Error("Could not load settings. Refresh to reconnect.");
        const p = await r.json();
        if (alive) {
          csrf.current = p.csrfToken;
          setEnvelope(p);
          setDraft(p.data);
          setInfo(p.systemInfo);
          if (p.academicData) setAcademicData(p.academicData);
        }
      })
      .catch((e) => {
        if (alive) setError(e.message);
      });
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) setModal(null);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [busy]);
  if (!draft || !envelope)
    return (
      <div className="st-loading" role="status">
        {error || "Loading school settings…"}
      </div>
    );
  const data = draft,
    dirty = JSON.stringify(data) !== JSON.stringify(envelope.data);
  const change = <K extends keyof SettingsData>(
    group: K,
    key: string,
    value: string | boolean,
  ) => setDraft({ ...data, [group]: { ...data[group], [key]: value } });
  const save = async (next: SettingsData = data, action = "save") => {
    if (busy) return false;
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrf.current,
        },
        body: JSON.stringify({
          data: next,
          revision: envelope.revision,
          action,
        }),
      });
      const p = await r.json();
      if (!r.ok) throw Error(p.error || "Could not save settings");
      setEnvelope(p);
      setDraft(p.data);
      notify(
        action === "export"
          ? "Settings snapshot downloaded"
          : action === "reset"
            ? "Display and notification preferences reset"
            : "Settings saved",
      );
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save settings");
      return false;
    } finally {
      setBusy(false);
    }
  };
  const route = (next: SettingsSection) => onSection(next);
  const saveButton = (
    <button
      type="button"
      className="primary st-save"
      disabled={busy || !dirty}
      onClick={() => save()}
    >
      <Save size={17} />
      {busy ? "Saving…" : "Save Changes"}
    </button>
  );
  const stamp = (s: string) =>
    new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: data.preferences.timezone,
      hour12: data.preferences.timeFormat === "12-hour (AM/PM)",
    }).format(new Date(s));
  const exportSettings = async () => {
    if (dirty) {
      setError(
        "Save or discard your changes before exporting a settings snapshot.",
      );
      return;
    }
    const body = JSON.stringify(
      {
        format: "edumanage-settings-v1",
        exportedAt: new Date().toISOString(),
        settings: envelope.data,
      },
      null,
      2,
    );
    download("edumanage-settings.json", body);
    await save(envelope.data, "export");
  };
  const upload = async (image: File | undefined) => {
    if (!image) return;
    if (
      !["image/png", "image/jpeg"].includes(image.type) ||
      image.size > 2 * 1024 * 1024
    ) {
      setError("Choose a JPG or PNG image no larger than 2 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const src = String(reader.result),
        preview = new Image();
      preview.onload = () => {
        change("school", "logo", src);
        setError("");
      };
      preview.onerror = () =>
        setError("The selected file could not be opened as an image.");
      preview.src = src;
    };
    reader.readAsDataURL(image);
  };
  const schoolFields = (
    <>
      <Field
        label="School Name"
        required
        value={data.school.name}
        onChange={(v) => change("school", "name", v)}
      />
      <Field
        label="Short Name"
        required
        value={data.school.shortName}
        onChange={(v) => change("school", "shortName", v)}
      />
      <Field
        label="School Type"
        value={data.school.type}
        onChange={(v) => change("school", "type", v)}
        options={opts(
          "Primary & Secondary",
          "Primary",
          "Secondary",
          "Higher Education",
        )}
      />
      <Field
        label="Established Year"
        type="number"
        value={data.school.established}
        onChange={(v) => change("school", "established", v)}
      />
      <Field
        label="Address"
        wide
        type="textarea"
        value={data.school.address}
        onChange={(v) => change("school", "address", v)}
      />
    </>
  );
  const preferences = (
    <>
      <div className="st-pref-fields">
        {[
          [Globe, "Default Language", "language", opts("English", "Khmer")],
          [
            Clock,
            "Default Time Zone",
            "timezone",
            [
              ["Asia/Phnom_Penh", "(GMT+07:00) Phnom Penh"],
              ["Asia/Bangkok", "(GMT+07:00) Bangkok"],
              ["UTC", "(GMT+00:00) UTC"],
            ],
          ],
          [
            CalendarDays,
            "Date Format",
            "dateFormat",
            opts("DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"),
          ],
          [
            Clock,
            "Time Format",
            "timeFormat",
            opts("12-hour (AM/PM)", "24-hour"),
          ],
          [
            CalendarDays,
            "First Day of Week",
            "firstDay",
            opts("Monday", "Sunday", "Saturday"),
          ],
          [
            Hash,
            "Currency",
            "currency",
            [
              ["USD", "USD - US Dollar ($)"],
              ["KHR", "KHR - Cambodian Riel (៛)"],
            ],
          ],
        ].map(([Icon, label, key, values]) => {
          const I = Icon as typeof Globe;
          return (
            <div className="st-pref-row" key={String(key)}>
              <I size={18} />
              <Field
                label={String(label)}
                value={String(
                  data.preferences[key as keyof typeof data.preferences],
                )}
                onChange={(v) => change("preferences", String(key), v)}
                options={values as string[][]}
              />
            </div>
          );
        })}
      </div>
      <Toggle
        icon={Hash}
        label="Enable Student ID Auto-Generation"
        note="Automatically generate student IDs"
        value={data.preferences.autoStudentId}
        onChange={(v) => change("preferences", "autoStudentId", v)}
      />
      <Toggle
        icon={Mail}
        label="Enable Email Notifications"
        note="Send system notifications via email"
        value={data.preferences.emailEnabled}
        onChange={(v) => change("preferences", "emailEnabled", v)}
      />
      <Toggle
        icon={MessageCircle}
        label="Enable SMS Notifications"
        note="Send important alerts via SMS"
        value={data.preferences.smsEnabled}
        onChange={(v) => change("preferences", "smsEnabled", v)}
      />
    </>
  );
  const period = academicData.years.find((y) => y.name === year),
    semester = academicData.terms.find(
      (t) => t.yearId === period?.id && t.name === term,
    );
  const calendarDate = (date: string) => {
    const [y, m, d] = date.split("-");
    return data.preferences.dateFormat === "YYYY-MM-DD"
      ? date
      : data.preferences.dateFormat === "MM/DD/YYYY"
        ? `${m}/${d}/${y}`
        : `${d}/${m}/${y}`;
  };
  const academic = (
    <Panel
      title="School Calendar & Academic Year"
      note="Current academic year and term information"
      icon={CalendarDays}
      action={
        <button type="button" className="st-outline" onClick={onAcademic}>
          <Pencil size={16} />
          Edit Academic Year
        </button>
      }
    >
      <div className="st-academic">
        <div>
          <span>
            <GraduationCap size={34} />
          </span>
          <section>
            <small>Academic Year</small>
            <strong>{year}</strong>
            <p>
              {period
                ? `${calendarDate(period.start)} - ${calendarDate(period.end)}`
                : "No academic year record"}
            </p>
          </section>
          {period && <b className="st-badge">{period.status}</b>}
        </div>
        <div>
          <span>
            <BookOpen size={30} />
          </span>
          <section>
            <small>Selected Term</small>
            <strong>{term}</strong>
            <p>
              {semester
                ? `${calendarDate(semester.start)} - ${calendarDate(semester.end)}`
                : "No term record"}
            </p>
          </section>
        </div>
      </div>
      {section === "Academic Year" && (
        <p className="st-note">
          Dates and configured status follow the selected academic year and
          term. Open the academic year workspace to edit the saved school
          calendar.
        </p>
      )}
    </Panel>
  );
  const system = (
    <Panel
      title="System Information"
      note="Version and system details"
      icon={Database}
    >
      <div className="st-info-grid">
        <div>
          <Box />
          <section>
            <small>Application Version</small>
            <strong>v{info?.version || "—"}</strong>
          </section>
        </div>
        <div>
          <CloudDownload />
          <section>
            <small>Last Settings Export</small>
            <strong>
              {envelope.lastExport
                ? stamp(envelope.lastExport)
                : "No export yet"}
            </strong>
          </section>
          {envelope.lastExport && <b className="st-badge">Saved</b>}
        </div>
        <div>
          <Database />
          <section>
            <small>Database</small>
            <strong>{info?.database || "—"}</strong>
          </section>
        </div>
        <div>
          <Clock />
          <section>
            <small>Server Worker Uptime</small>
            <strong>
              {Math.floor((info?.workerUptimeSeconds || 0) / 60)} minutes
            </strong>
          </section>
        </div>
      </div>
    </Panel>
  );
  const actions = [
    [
      Users,
      "Manage Users",
      "Add or edit directory users",
      () => route("Users & Roles"),
    ],
    [
      Shield,
      "Manage Roles",
      "View role responsibilities",
      () => setModal("roles"),
    ],
    [
      Mail,
      "Configure Email",
      "Notification preferences",
      () => route("Notifications"),
    ],
    [
      Database,
      "Backup Data",
      "Export settings snapshot",
      () => route("Data Management"),
    ],
    [
      FileText,
      "System Logs",
      "View settings activity",
      () => route("System Configuration"),
    ],
    [
      RotateCcw,
      "Reset Settings",
      "Restore preference defaults",
      () => setModal("reset"),
    ],
  ] as const;
  const quick = (
    <Panel title="Quick Actions" note="Common configuration tasks" icon={Zap}>
      <div className="st-quick">
        {actions.map(([Icon, title, note, run], i) => (
          <button
            type="button"
            key={title}
            className={`st-color-${i}`}
            onClick={run}
          >
            <Icon size={25} />
            <strong>{title}</strong>
            <small>{note}</small>
          </button>
        ))}
      </div>
    </Panel>
  );
  const match = query.trim().toLowerCase(),
    results = settingsSections.filter((s, i) =>
      (
        s +
        " " +
        descriptions[i] +
        " " +
        (s === "General"
          ? "school language time zone currency logo address email phone preferences"
          : "")
      )
        .toLowerCase()
        .includes(match),
    );
  return (
    <div
      className={`st-workspace st-accent-${data.appearance.accent.toLowerCase()} ${data.appearance.density === "Compact" ? "st-compact" : ""} ${!data.appearance.showDescriptions ? "st-hide-descriptions" : ""}`}
    >
      <div className="st-breadcrumb">
        Settings <span>›</span> {section}
      </div>
      <div className="st-heading">
        <h1>Settings</h1>
        <p>
          Manage your school system configuration, academic settings, users, and
          preferences.
        </p>
      </div>
      <div className="st-tabs" role="tablist" aria-label="Settings sections">
        {settingsSections.slice(0, 6).map((s, i) => {
          const I = icons[i],
            active =
              section === s ||
              (i === 5 && settingsSections.indexOf(section) > 5);
          return (
            <button
              type="button"
              role="tab"
              aria-selected={active}
              key={s}
              onClick={() => route(s)}
            >
              <I size={27} />
              <span>
                <strong>{i === 5 ? "System" : s}</strong>
                <small>{descriptions[i]}</small>
              </span>
            </button>
          );
        })}
      </div>
      {match && (
        <div className="st-search-results">
          <Search size={18} />
          <strong>Settings matching “{query}”</strong>
          {results.length ? (
            results.map((s) => (
              <button key={s} type="button" onClick={() => route(s)}>
                {s}
              </button>
            ))
          ) : (
            <span>No matching section</span>
          )}
        </div>
      )}
      {error && (
        <div className="st-error" role="alert">
          {error}
          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Dismiss settings error"
          >
            <X size={16} />
          </button>
        </div>
      )}
      {section === "General" ? (
        <div className="st-columns">
          <div className="st-stack">
            <Panel
              title="School Information"
              note="Basic information about your school"
              icon={School}
              action={saveButton}
            >
              <div className="st-school-top">
                <div className="st-logo">
                  <img
                    src={data.school.logo || "/school-campus.png"}
                    alt="School logo preview"
                  />
                  <button
                    type="button"
                    className="st-outline"
                    onClick={() => file.current?.click()}
                  >
                    <ImagePlus size={15} />
                    Change Logo
                  </button>
                  <small>JPG, PNG (Max 2MB)</small>
                  {data.school.logo && (
                    <button
                      type="button"
                      className="st-outline"
                      onClick={() => change("school", "logo", "")}
                    >
                      Use Default Image
                    </button>
                  )}
                  <input
                    ref={file}
                    aria-label="School logo file"
                    type="file"
                    accept="image/png,image/jpeg"
                    hidden
                    onChange={(e) => upload(e.target.files?.[0])}
                  />
                </div>
                <div className="st-form-grid">{schoolFields}</div>
              </div>
              <div className="st-contact">
                <Field
                  label="Phone"
                  value={data.school.phone}
                  onChange={(v) => change("school", "phone", v)}
                />
                <Field
                  label="Email"
                  type="email"
                  value={data.school.email}
                  onChange={(v) => change("school", "email", v)}
                />
                <Field
                  label="Website"
                  type="url"
                  value={data.school.website}
                  onChange={(v) => change("school", "website", v)}
                />
              </div>
            </Panel>
            {academic}
            {system}
          </div>
          <div className="st-stack">
            <Panel
              title="School Preferences"
              note="Configure general system preferences"
              icon={Settings}
            >
              {preferences}
            </Panel>
            {quick}
          </div>
        </div>
      ) : section === "Academic Year" ? (
        <div className="st-stack">
          {academic}
          <Panel
            title="Academic Calendar"
            note="Manage school dates, events, terms, and semesters"
            icon={CalendarDays}
          >
            <p className="st-note">
              Academic years and term records are managed in Academics. Changes
              there remain available throughout the school workspace.
            </p>
            <button type="button" className="primary" onClick={onAcademic}>
              Open Academic Years
            </button>
          </Panel>
        </div>
      ) : section === "Class & Grading" ? (
        <Panel
          title="Class & Grading Defaults"
          note="Planning defaults for new class and assessment setup"
          icon={BookOpen}
          action={saveButton}
        >
          <div className="st-form-grid">
            <Field
              label="Grading Scale"
              value={data.grading.scale}
              onChange={(v) => change("grading", "scale", v)}
              options={opts("Percentage (0–100)", "Letter grades (A–F)")}
            />
            <Field
              label="Default Pass Mark (%)"
              type="number"
              value={data.grading.passMark}
              onChange={(v) => change("grading", "passMark", v)}
            />
            <Field
              label="Score Decimal Places"
              value={data.grading.precision}
              onChange={(v) => change("grading", "precision", v)}
              options={opts("0", "1", "2")}
            />
            <Field
              label="Default Class Capacity"
              type="number"
              value={data.grading.classCapacity}
              onChange={(v) => change("grading", "classCapacity", v)}
            />
            <Field
              label="Student ID Prefix"
              value={data.grading.studentPrefix}
              onChange={(v) => change("grading", "studentPrefix", v)}
            />
          </div>
          <p className="st-note">
            These saved planning defaults do not regrade existing exams or
            rename existing student IDs. Existing exam pass marks are managed in
            Examinations.
          </p>
        </Panel>
      ) : section === "Users & Roles" ? (
        <Panel
          title="Users & Roles"
          note="School contact directory and role planning"
          icon={Users}
          action={
            <div className="st-actions">
              <button
                type="button"
                className="st-outline"
                onClick={() => setModal("roles")}
              >
                <Shield size={16} />
                Role Guide
              </button>
              <button
                type="button"
                className="primary"
                disabled={busy}
                onClick={() => {
                  setPerson({
                    id: crypto.randomUUID(),
                    name: "",
                    email: "",
                    role: "Teacher",
                    status: "Active",
                  });
                  setModal("person");
                }}
              >
                <Plus size={16} />
                Add Directory User
              </button>
            </div>
          }
        >
          <p className="st-note">
            Directory entries are local school records. They do not create
            sign-in accounts, invite people, or grant access permissions.
          </p>
          <div className="st-table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.directory
                  .filter((p) =>
                    Object.values(p).join(" ").toLowerCase().includes(match),
                  )
                  .map((p) => (
                    <tr key={p.id}>
                      <td>
                        <span className="st-person-avatar">
                          {p.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)}
                        </span>
                        {p.name}
                      </td>
                      <td>{p.email}</td>
                      <td>{p.role}</td>
                      <td>
                        <span
                          className={`st-badge ${p.status === "Inactive" ? "inactive" : ""}`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="st-outline"
                          aria-label={`Edit directory user ${p.name}`}
                          onClick={() => {
                            setPerson({ ...p });
                            setModal("person");
                          }}
                        >
                          <Pencil size={14} />
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : section === "Notifications" ? (
        <div className="st-columns">
          <Panel
            title="Notification Preferences"
            note="Choose the alerts your school wants to receive"
            icon={Bell}
            action={saveButton}
          >
            <Toggle
              icon={Mail}
              label="Email Notifications"
              value={data.preferences.emailEnabled}
              onChange={(v) => change("preferences", "emailEnabled", v)}
            />
            <Toggle
              icon={MessageCircle}
              label="SMS Notifications"
              value={data.preferences.smsEnabled}
              onChange={(v) => change("preferences", "smsEnabled", v)}
            />
            {(
              [
                ["attendance", "Attendance Alerts"],
                ["fees", "Fee Reminders"],
                ["exams", "Examination Updates"],
              ] as const
            ).map(([key, title]) => (
              <Toggle
                key={key}
                label={title}
                value={data.notifications[key]}
                onChange={(v) => change("notifications", key, v)}
              />
            ))}
            <div className="st-form-grid">
              <Field
                label="Digest Frequency"
                value={data.notifications.digest}
                onChange={(v) => change("notifications", "digest", v)}
                options={opts("Daily", "Weekly", "Off")}
              />
              <Field
                label="Reply-to Email"
                type="email"
                value={data.notifications.replyTo}
                onChange={(v) => change("notifications", "replyTo", v)}
              />
            </div>
          </Panel>
          <Panel
            title="Delivery Status"
            note="Email and SMS connections"
            icon={Mail}
          >
            <div className="st-service">
              <Mail />
              <div>
                <strong>Email delivery</strong>
                <p>Not connected</p>
              </div>
            </div>
            <div className="st-service">
              <MessageCircle />
              <div>
                <strong>SMS delivery</strong>
                <p>Not connected</p>
              </div>
            </div>
            <p className="st-note">
              Preferences are saved locally. No email or SMS provider is
              configured, and saving these options sends no messages. Provider
              credentials belong in the server environment.
            </p>
          </Panel>
        </div>
      ) : section === "System Configuration" ? (
        <div className="st-stack">
          {system}
          <Panel
            title="System Configuration"
            note="School identifiers and support information"
            icon={Settings}
            action={saveButton}
          >
            <div className="st-form-grid">
              <Field
                label="School Code"
                value={data.system.schoolCode}
                onChange={(v) => change("system", "schoolCode", v)}
              />
              <Field
                label="Support Email"
                type="email"
                value={data.system.supportEmail}
                onChange={(v) => change("system", "supportEmail", v)}
              />
              <Field
                label="Welcome Notice"
                wide
                value={data.system.sessionNotice}
                onChange={(v) => change("system", "sessionNotice", v)}
              />
            </div>
          </Panel>
          <Panel
            title="Settings Activity Log"
            note="Latest 100 configuration events; values and credentials are not logged"
            icon={FileText}
          >
            <div className="st-table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Action</th>
                    <th>Changed Sections</th>
                  </tr>
                </thead>
                <tbody>
                  {envelope.logs.map((l, i) => (
                    <tr key={i}>
                      <td>{stamp(l.at)}</td>
                      <td>{l.action}</td>
                      <td>{l.sections.join(", ") || "Settings snapshot"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!envelope.logs.length && (
                <p className="st-note">No saved settings activity yet.</p>
              )}
            </div>
          </Panel>
        </div>
      ) : section === "Data Management" ? (
        <Panel
          title="Data Management"
          note="Export school settings for your records"
          icon={Database}
        >
          <div className="st-service">
            <Download size={35} />
            <div>
              <h3>Download Settings Snapshot</h3>
              <p>
                School information, preferences, directory, and configuration in
                a JSON file.
              </p>
            </div>
            <button
              type="button"
              className="primary"
              disabled={busy}
              onClick={exportSettings}
            >
              <Download size={16} />
              Download Settings
            </button>
          </div>
          <p className="st-note">
            This export contains school contact details and directory emails. It
            is a settings snapshot, not a database backup; academic, finance,
            examination, and library records are not included. Keep the file in
            your own secure storage.
          </p>
          <p>
            Last settings export:{" "}
            <strong>
              {envelope.lastExport
                ? stamp(envelope.lastExport)
                : "No export yet"}
            </strong>
          </p>
        </Panel>
      ) : section === "Backup & Security" ? (
        <div className="st-columns">
          <Panel
            title="Backup & Security"
            note="Local school workspace status"
            icon={Shield}
          >
            <div className="st-service">
              <Check />
              <div>
                <strong>Request protection</strong>
                <p>Settings updates require a valid CSRF token.</p>
              </div>
            </div>
            <div className="st-service">
              <Database />
              <div>
                <strong>Persistent storage</strong>
                <p>
                  School settings are stored in the local PostgreSQL workspace.
                </p>
              </div>
            </div>
            <p className="st-note">
              The local demonstration has no sign-in or permission enforcement.
              Role labels in the directory do not provide access control. Full
              database backup and authentication must be configured separately
              before shared use.
            </p>
          </Panel>
          <Panel
            title="Settings Snapshot"
            note="Download configuration for your records"
            icon={CloudDownload}
          >
            <p className="st-note">
              A settings export includes only the configuration shown here. It
              does not back up the full database.
            </p>
            <button
              type="button"
              className="primary"
              onClick={() => route("Data Management")}
            >
              Open Data Management
            </button>
          </Panel>
        </div>
      ) : section === "Integrations" ? (
        <Panel
          title="Integration Links"
          note="Save school reference URLs without connecting external services"
          icon={Link}
          action={saveButton}
        >
          <div className="st-form-grid">
            <Field
              label="School Website URL"
              type="url"
              value={data.integrations.website}
              onChange={(v) => change("integrations", "website", v)}
            />
            <Field
              label="Help Centre URL"
              type="url"
              value={data.integrations.helpUrl}
              onChange={(v) => change("integrations", "helpUrl", v)}
            />
            <Field
              label="Calendar Reference URL"
              wide
              type="url"
              value={data.integrations.calendarUrl}
              onChange={(v) => change("integrations", "calendarUrl", v)}
            />
          </div>
          <p className="st-note">
            Saving a link stores it in this workspace. It does not connect,
            sync, or send data to that service. Use public URLs without
            passwords or access tokens.
          </p>
        </Panel>
      ) : (
        <Panel
          title="Appearance"
          note="Preview and save the appearance of Settings pages"
          icon={Palette}
          action={saveButton}
        >
          <div className="st-form-grid">
            <Field
              label="Accent Colour"
              value={data.appearance.accent}
              onChange={(v) => change("appearance", "accent", v)}
              options={opts("Orange", "Blue", "Green")}
            />
            <Field
              label="Content Density"
              value={data.appearance.density}
              onChange={(v) => change("appearance", "density", v)}
              options={opts("Comfortable", "Compact")}
            />
          </div>
          <Toggle
            label="Show Panel Descriptions"
            note="Display supporting text below panel titles"
            value={data.appearance.showDescriptions}
            onChange={(v) => change("appearance", "showDescriptions", v)}
          />
          <div className="st-appearance-preview">
            <Settings size={28} />
            <strong>{data.school.name}</strong>
            <span>Settings preview</span>
          </div>
        </Panel>
      )}
      <footer className="st-status">
        <span>
          {busy
            ? "Saving settings…"
            : dirty
              ? "Unsaved changes · use Save Changes"
              : "All settings saved"}
        </span>
        {dirty && (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setDraft(structuredClone(envelope.data));
              setError("");
            }}
          >
            Discard Changes
          </button>
        )}
        <small>
          Local school configuration · USD finance records remain unchanged
        </small>
      </footer>
      {modal && (
        <div className="st-modal-overlay">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="st-modal-title"
            className="st-modal"
          >
            <header>
              <h2 id="st-modal-title">
                {modal === "reset"
                  ? "Reset Preferences"
                  : modal === "roles"
                    ? "Role Guide"
                    : "Directory User"}
              </h2>
              <button
                type="button"
                aria-label="Close settings dialog"
                disabled={busy}
                onClick={() => setModal(null)}
              >
                <X size={21} />
              </button>
            </header>
            {modal === "reset" ? (
              <>
                <p>
                  Restore display and notification preferences to their
                  defaults? School information, logo, directory, and all
                  academic and financial records will be kept.
                </p>
                <button
                  type="button"
                  className="primary"
                  disabled={busy}
                  onClick={async () => {
                    const next = {
                      ...data,
                      preferences: {
                        language: "English",
                        timezone: "Asia/Phnom_Penh",
                        dateFormat: "DD/MM/YYYY",
                        timeFormat: "12-hour (AM/PM)",
                        firstDay: "Monday",
                        currency: "USD",
                        autoStudentId: true,
                        emailEnabled: true,
                        smsEnabled: false,
                      },
                      notifications: {
                        attendance: true,
                        fees: true,
                        exams: true,
                        digest: "Daily",
                        replyTo: data.school.email,
                      },
                      appearance: {
                        accent: "Orange",
                        density: "Comfortable",
                        showDescriptions: true,
                      },
                    };
                    if (await save(next, "reset")) setModal(null);
                  }}
                >
                  Confirm Reset Preferences
                </button>
              </>
            ) : modal === "roles" ? (
              <>
                <p className="st-note">
                  Reference responsibilities only. These labels do not grant
                  sign-in access or enforce permissions.
                </p>
                {[
                  [
                    "Administrator",
                    "Coordinates school configuration and administration.",
                  ],
                  ["Teacher", "Plans lessons and records academic activity."],
                  ["Accountant", "Maintains school fee and payment records."],
                  ["Librarian", "Maintains books, borrowers, and loans."],
                ].map(([r, n]) => (
                  <div className="st-role" key={r}>
                    <Shield size={22} />
                    <div>
                      <strong>{r}</strong>
                      <p>{n}</p>
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const next = {
                    ...data,
                    directory: data.directory.some((p) => p.id === person.id)
                      ? data.directory.map((p) =>
                          p.id === person.id ? person : p,
                        )
                      : [...data.directory, person],
                  };
                  if (await save(next)) setModal(null);
                }}
              >
                <p className="st-note">
                  Saving creates or updates a directory record only.
                </p>
                <div className="st-form-grid">
                  <Field
                    label="Full Name"
                    required
                    value={person.name}
                    onChange={(v) => setPerson({ ...person, name: v })}
                  />
                  <Field
                    label="Directory Email"
                    type="email"
                    required
                    value={person.email}
                    onChange={(v) => setPerson({ ...person, email: v })}
                  />
                  <Field
                    label="Role Label"
                    value={person.role}
                    onChange={(v) => setPerson({ ...person, role: v })}
                    options={opts(
                      "Administrator",
                      "Teacher",
                      "Accountant",
                      "Librarian",
                    )}
                  />
                  <Field
                    label="Directory Status"
                    value={person.status}
                    onChange={(v) => setPerson({ ...person, status: v })}
                    options={opts("Active", "Inactive")}
                  />
                </div>
                <button type="submit" className="primary" disabled={busy}>
                  Save Directory User
                </button>
              </form>
            )}
            {error && (
              <p role="alert" className="st-error">
                {error}
              </p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
