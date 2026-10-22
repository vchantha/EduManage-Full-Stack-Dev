"use client";
import { useEffect, useRef, useState } from "react";
import {
  Users,
  Check,
  X,
  Clock,
  CalendarDays,
  ClipboardList,
  Plus,
  ChevronDown,
  Settings,
  Search,
  Upload,
  Download,
  Save,
  MoreVertical,
  FileText,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Eye,
  CheckSquare,
  AlertCircle,
} from "lucide-react";
import {
  AttendanceData,
  AttendanceSession,
  AttendanceMark,
  AttendanceStatus,
  SessionDraft,
  attendanceStatuses,
  sessionKey,
  counts,
  percent,
  attendanceDate,
  dailyMarks,
  attendanceCsv,
  parseAttendanceCsv,
} from "./attendance-data";
type Tab =
  | "Take Attendance"
  | "Attendance Records"
  | "Student Overview"
  | "Analytics";
const tabs: Tab[] = [
  "Take Attendance",
  "Attendance Records",
  "Student Overview",
  "Analytics",
];
const statusClass = (s: string) => s.toLowerCase().replaceAll(" ", "-");
function Panel({
  title,
  action,
  children,
  className = "",
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`at-panel ${className}`}>
      <header>
        <h2>{title}</h2>
        {action}
      </header>
      {children}
    </section>
  );
}
function Status({ value }: { value: AttendanceStatus }) {
  return (
    <span className={`at-status ${statusClass(value)}`}>
      {value === "Present" ? (
        <Check size={12} />
      ) : value === "Absent" ? (
        <X size={12} />
      ) : (
        <Clock size={12} />
      )}{" "}
      {value}
    </span>
  );
}
function Metric({
  title,
  value,
  note,
  color,
  icon: Icon,
}: {
  title: string;
  value: number;
  note: string;
  color: string;
  icon: typeof Users;
}) {
  return (
    <div className={`at-metric ${color}`}>
      <span>
        <Icon size={30} />
      </span>
      <section>
        <strong>{value.toLocaleString()}</strong>
        <h3>{title}</h3>
        <p>{note}</p>
      </section>
    </div>
  );
}
export default function AttendanceWorkspace({
  year,
  term,
  query,
  notify,
}: {
  year: string;
  term: string;
  query: string;
  notify: (s: string) => void;
}) {
  const [data, setData] = useState<AttendanceData | null>(null),
    [revision, setRevision] = useState(0),
    [tab, setTab] = useState<Tab>("Take Attendance"),
    [classId, setClassId] = useState("class-1"),
    [date, setDate] = useState("2026-10-03"),
    [subject, setSubject] = useState("Mathematics"),
    [drafts, setDrafts] = useState<Record<string, SessionDraft>>({}),
    [selected, setSelected] = useState<string[]>([]),
    [search, setSearch] = useState(""),
    [page, setPage] = useState(1),
    [pageSize, setPageSize] = useState(8),
    [showRemarks, setShowRemarks] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [modal, setModal] = useState<
      "options" | "import" | "report" | "student" | null
    >(null),
    [studentId, setStudentId] = useState(""),
    [period, setPeriod] = useState("This Week"),
    [ratePeriod, setRatePeriod] = useState("This Term"),
    [recordClass, setRecordClass] = useState("All Classes"),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [menu, setMenu] = useState(false),
    [importRows, setImportRows] = useState<AttendanceMark[] | null>(null),
    [importName, setImportName] = useState("");
  const csrf = useRef(""),
    file = useRef<HTMLInputElement>(null);
  useEffect(() => {
    let alive = true;
    fetch("/api/attendance")
      .then(async (r) => {
        const p = await r.json();
        if (!r.ok) throw Error(p.error || "Could not load attendance");
        if (alive) {
          setData(p.data);
          setRevision(p.revision);
          csrf.current = p.csrfToken;
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
    setSelected([]);
    setPage(1);
    setSearch("");
  }, [classId, date, subject, year, term, tab]);
  useEffect(() => {
    setPage(1);
  }, [query, search, recordClass, from, to]);
  useEffect(() => {
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) {
        setModal(null);
        setMenu(false);
      }
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [busy]);
  if (!data)
    return (
      <div className="at-loading" role="status">
        {error || "Loading attendance records…"}
      </div>
    );
  const classes = data.classes.filter(
      (c) => c.year === year && c.term === term,
    ),
    classroom = classes.find((c) => c.id === classId),
    roster = data.students.filter((s) => s.classId === classroom?.id),
    scopeSessions = data.sessions.filter(
      (s) => s.year === year && s.term === term,
    ),
    key = sessionKey({ classId, date, subject, year, term }),
    saved = scopeSessions.find((s) => sessionKey(s) === key),
    base: SessionDraft = {
      classId,
      date,
      subject,
      year,
      term,
      teacher: saved?.teacher || classroom?.teacher || "",
      marks:
        saved?.marks ||
        roster.map((s) => ({
          studentId: s.id,
          status: "Not Marked" as AttendanceStatus,
          remarks: "",
        })),
    },
    draft = drafts[key] || base,
    dirty = JSON.stringify(draft) !== JSON.stringify(base),
    count = counts(draft.marks),
    className = (id: string) =>
      data.classes.find((c) => c.id === id)?.name || "Unknown class",
    student = (id: string) => data.students.find((s) => s.id === id),
    q = (query || search).trim().toLowerCase();
  const update = (next: SessionDraft) => {
    setDrafts((old) => ({ ...old, [key]: next }));
    setError("");
  };
  const mark = (id: string, status: AttendanceStatus, remarks?: string) =>
    update({
      ...draft,
      marks: draft.marks.map((m) =>
        m.studentId === id
          ? { ...m, status, remarks: remarks ?? m.remarks }
          : m,
      ),
    });
  const rows = roster.filter((s) =>
      [
        s.id,
        s.name,
        className(s.classId),
        draft.marks.find((m) => m.studentId === s.id)?.status,
        draft.marks.find((m) => m.studentId === s.id)?.remarks,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q),
    ),
    pageCount = Math.max(1, Math.ceil(rows.length / pageSize)),
    safePage = Math.min(page, pageCount),
    visible = rows.slice((safePage - 1) * pageSize, safePage * pageSize);
  const day = dailyMarks(scopeSessions, date),
    allStudents = data.students.filter((s) =>
      classes.some((c) => c.id === s.classId),
    ),
    latest = new Map(day.map((m) => [m.studentId, m])),
    schoolCounts = counts(
      allStudents.map(
        (s) =>
          latest.get(s.id) || {
            studentId: s.id,
            status: "Not Marked",
            remarks: "",
          },
      ),
    ),
    opening =
      data.opening.date === date &&
      data.opening.year === year &&
      data.opening.term === term
        ? data.opening
        : null,
    totals = {
      total: schoolCounts.total + (opening?.total || 0),
      present: schoolCounts.present + (opening?.present || 0),
      absent: schoolCounts.absent + (opening?.absent || 0),
      late: schoolCounts.late + (opening?.late || 0),
      unmarked: schoolCounts.unmarked,
    };
  const save = async () => {
    if (busy || !classroom || !dirty) return;
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/attendance", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrf.current,
          },
          body: JSON.stringify({ session: draft, revision }),
        }),
        p = await r.json();
      if (!r.ok) throw Error(p.error || "Could not save attendance");
      setData(p.data);
      setRevision(p.revision);
      setDrafts((old) => {
        const next = { ...old };
        delete next[key];
        return next;
      });
      notify("Attendance saved");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save attendance");
    } finally {
      setBusy(false);
    }
  };
  const bulk = (status: string) => {
    if (!attendanceStatuses.includes(status as AttendanceStatus)) return;
    if (!selected.length) {
      setError("Select at least one student before using bulk marking.");
      return;
    }
    update({
      ...draft,
      marks: draft.marks.map((m) =>
        selected.includes(m.studentId)
          ? { ...m, status: status as AttendanceStatus }
          : m,
      ),
    });
  };
  const exportDraft = () =>
    attendanceCsv(`attendance-${date}.csv`, [
      ["studentId", "status", "remarks"],
      ...draft.marks.map((m) => [m.studentId, m.status, m.remarks]),
    ]);
  const recordRows = scopeSessions
    .filter(
      (s) =>
        (recordClass === "All Classes" || s.classId === recordClass) &&
        (!from || s.date >= from) &&
        (!to || s.date <= to) &&
        [
          s.date,
          className(s.classId),
          s.subject,
          s.teacher,
          ...s.marks.flatMap((m) => [
            student(m.studentId)?.name,
            m.studentId,
            m.status,
            m.remarks,
          ]),
        ]
          .join(" ")
          .toLowerCase()
          .includes(q),
    )
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt),
    );
  const exportRecords = () => {
    if (from && to && from > to) {
      setError("Report start date must not be after the end date.");
      return;
    }
    attendanceCsv("edumanage-attendance-report.csv", [
      [
        "Date",
        "Class",
        "Subject",
        "Teacher",
        "Student ID",
        "Student",
        "Status",
        "Remarks",
      ],
      ...recordRows.flatMap((s) =>
        s.marks.map((m) => [
          s.date,
          className(s.classId),
          s.subject,
          s.teacher,
          m.studentId,
          student(m.studentId)?.name || "",
          m.status,
          m.remarks,
        ]),
      ),
    ]);
    notify("Attendance report downloaded");
  };
  const openSession = (s: AttendanceSession) => {
    setClassId(s.classId);
    setDate(s.date);
    setSubject(s.subject);
    setTab("Take Attendance");
    setSelected([]);
    setSearch("");
    setPage(1);
    setError("");
  };
  const dayStart = new Date(`${date}T12:00:00Z`),
    weekday = (dayStart.getUTCDay() + 6) % 7,
    chartDates =
      period === "This Week"
        ? Array.from({ length: 7 }, (_, i) => {
            const d = new Date(dayStart);
            d.setUTCDate(d.getUTCDate() - weekday + i);
            return d.toISOString().slice(0, 10);
          })
        : Array.from(
            {
              length: new Date(
                dayStart.getUTCFullYear(),
                dayStart.getUTCMonth() + 1,
                0,
              ).getDate(),
            },
            (_, i) => `${date.slice(0, 7)}-${String(i + 1).padStart(2, "0")}`,
          ),
    chart = chartDates.map((d) => counts(dailyMarks(scopeSessions, d))),
    chartPoint = (n: number, total: number, i: number) =>
      `${45 + (i * 350) / Math.max(1, chartDates.length - 1)},${140 - (total ? n / total : 0) * 112}`;
  const chartSegments: number[][] = [];
  chart.forEach((c, i) => {
    if (!c.total) return;
    const last = chartSegments[chartSegments.length - 1];
    if (!last || last[last.length - 1] !== i - 1) chartSegments.push([i]);
    else last.push(i);
  });
  const rates = data.classes
    .filter((c) => c.year === year && c.term === term)
    .map((c) => {
      const sessions = scopeSessions.filter(
          (s) =>
            s.classId === c.id &&
            (ratePeriod !== "Selected Date" || s.date === date),
        ),
        counters = counts(sessions.flatMap((s) => s.marks));
      return {
        ...c,
        ...counters,
        rate: counters.total ? (100 * counters.present) / counters.total : 0,
      };
    })
    .sort((a, b) =>
      a.grade.localeCompare(b.grade, undefined, { numeric: true }),
    );
  const analyticsRates = classes.map((c) => ({
    ...c,
    ...counts(
      scopeSessions.filter((s) => s.classId === c.id).flatMap((s) => s.marks),
    ),
  }));
  const preferredSubject = (id: string) =>
    scopeSessions.find((s) => s.classId === id && s.date === date)?.subject ||
    classes.find((c) => c.id === id)?.subjects[0] ||
    "";
  const names = allStudents.filter(
      (s) =>
        (recordClass === "All Classes" || s.classId === recordClass) &&
        [s.id, s.name, className(s.classId)]
          .join(" ")
          .toLowerCase()
          .includes(q),
    ),
    studentPage = names.slice(
      (Math.min(page, Math.max(1, Math.ceil(names.length / 12))) - 1) * 12,
      Math.min(page, Math.max(1, Math.ceil(names.length / 12))) * 12,
    ),
    studentRecords = (id: string) =>
      scopeSessions
        .filter((s) => s.marks.some((m) => m.studentId === id))
        .sort((a, b) => b.date.localeCompare(a.date)),
    selectedStudent = student(studentId);
  const importFile = async (f: File | undefined) => {
    setImportRows(null);
    if (!f) return;
    setImportName(f.name);
    try {
      if (f.size > 100_000)
        throw Error("Attendance CSV must be no larger than 100 KB");
      setImportRows(parseAttendanceCsv(await f.text(), roster, draft.marks));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not import CSV");
    }
  };
  const sessionSummary = (records: AttendanceSession[], limit = 8) => (
    <div className="at-scroll">
      <table className="at-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Class</th>
            <th>Subject</th>
            <th>Present</th>
            <th>Absent</th>
            <th>Late</th>
            <th>Unmarked</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {records.slice(0, limit).map((s) => {
            const c = counts(s.marks);
            return (
              <tr key={s.id}>
                <td>{attendanceDate(s.date)}</td>
                <td>{className(s.classId)}</td>
                <td>{s.subject}</td>
                <td className="at-green-text">{c.present}</td>
                <td className="at-red-text">{c.absent}</td>
                <td className="at-orange-text">{c.late}</td>
                <td>{c.unmarked}</td>
                <td>
                  <button
                    type="button"
                    className="at-view"
                    aria-label={`View ${s.date} ${className(s.classId)} ${s.subject}`}
                    onClick={() => openSession(s)}
                  >
                    <Eye size={14} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {!records.length && (
        <p className="at-empty">No attendance sessions match these filters.</p>
      )}
    </div>
  );
  const pagination = (
    <div className="at-pagination">
      <span>
        Showing {rows.length ? (safePage - 1) * pageSize + 1 : 0}–
        {Math.min(safePage * pageSize, rows.length)} of {rows.length} students
      </span>
      <button
        type="button"
        aria-label="Previous student page"
        disabled={safePage === 1}
        onClick={() => setPage(safePage - 1)}
      >
        <ChevronLeft size={16} />
      </button>
      <b>
        {safePage} / {pageCount}
      </b>
      <button
        type="button"
        aria-label="Next student page"
        disabled={safePage === pageCount}
        onClick={() => setPage(safePage + 1)}
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
  return (
    <div className="at-workspace">
      <div className="at-breadcrumb">
        Attendance <span>›</span> {tab}
      </div>
      <div className="at-heading">
        <section>
          <h1>Attendance</h1>
          <p>Record and monitor student attendance across all classes.</p>
        </section>
        <div className="at-heading-actions">
          <div className="at-create">
            <button
              type="button"
              className="primary"
              onClick={() => setTab("Take Attendance")}
            >
              <Plus size={21} />
              Take Attendance
            </button>
            <button
              type="button"
              className="primary"
              aria-label="More attendance actions"
              aria-expanded={menu}
              onClick={() => setMenu(!menu)}
            >
              <ChevronDown size={16} />
            </button>
            {menu && (
              <div className="at-dropdown">
                <button
                  type="button"
                  onClick={() => {
                    setMenu(false);
                    setModal("import");
                    setError("");
                    setImportRows(null);
                  }}
                >
                  Import class register
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenu(false);
                    exportDraft();
                  }}
                >
                  Download class template
                </button>
              </div>
            )}
          </div>
          <button
            type="button"
            className="at-outline"
            onClick={() => {
              setTab("Attendance Records");
              setModal("report");
            }}
          >
            <ClipboardList size={20} />
            View Reports
          </button>
        </div>
      </div>
      <div className="at-metrics">
        <Metric
          title="Total Students"
          value={totals.total}
          note="All classes · selected date"
          color="green"
          icon={Users}
        />
        <Metric
          title="Present"
          value={totals.present}
          note={`${percent(totals.present, totals.total)} · ${attendanceDate(date)}`}
          color="blue"
          icon={Check}
        />
        <Metric
          title="Absent"
          value={totals.absent}
          note={`${percent(totals.absent, totals.total)} · selected date`}
          color="red"
          icon={X}
        />
        <Metric
          title="Late"
          value={totals.late}
          note={`${percent(totals.late, totals.total)} · ${totals.unmarked} not marked`}
          color="orange"
          icon={Clock}
        />
      </div>
      {error && (
        <div className="at-error" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
          <button
            type="button"
            aria-label="Dismiss attendance error"
            onClick={() => setError("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
      <div className="at-layout">
        <section className="at-register at-panel">
          <div className="at-tabs" role="tablist" aria-label="Attendance views">
            {tabs.map((t) => (
              <button
                type="button"
                role="tab"
                aria-selected={tab === t}
                key={t}
                onClick={() => {
                  setTab(t);
                  setError("");
                }}
              >
                {t}
              </button>
            ))}
          </div>
          {tab === "Take Attendance" ? (
            <>
              <div className="at-filter-row">
                <label>
                  Class <b>*</b>
                  <select
                    aria-label="Attendance class"
                    value={classroom ? classId : ""}
                    disabled={busy}
                    onChange={(e) => {
                      const c = classes.find((c) => c.id === e.target.value);
                      setClassId(e.target.value);
                      setSubject(preferredSubject(e.target.value));
                    }}
                  >
                    {!classroom && <option value="">Select class</option>}
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Date <b>*</b>
                  <input
                    aria-label="Attendance date"
                    type="date"
                    value={date}
                    disabled={busy}
                    onInput={(e) => {
                      if (e.currentTarget.value) setDate(e.currentTarget.value);
                    }}
                    onChange={(e) => {
                      if (e.target.value) setDate(e.target.value);
                    }}
                  />
                </label>
                <label>
                  Subject
                  <select
                    aria-label="Attendance subject"
                    value={subject}
                    disabled={busy || !classroom}
                    onChange={(e) => setSubject(e.target.value)}
                  >
                    {classroom?.subjects.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Teacher
                  <select
                    aria-label="Attendance teacher"
                    value={draft.teacher}
                    disabled={busy || !classroom}
                    onChange={(e) =>
                      update({ ...draft, teacher: e.target.value })
                    }
                  >
                    {[
                      ...new Set([
                        ...data.classes.map((c) => c.teacher),
                        draft.teacher,
                      ]),
                    ]
                      .filter(Boolean)
                      .map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                  </select>
                </label>
                <button
                  type="button"
                  className="at-outline"
                  onClick={() => setModal("options")}
                >
                  <Settings size={15} />
                  More Options
                </button>
              </div>
              <div className="at-class-summary">
                {[
                  [ClipboardList, "Total Students", count.total, ""],
                  [
                    Check,
                    "Present",
                    count.present,
                    percent(count.present, count.total),
                  ],
                  [
                    X,
                    "Absent",
                    count.absent,
                    percent(count.absent, count.total),
                  ],
                  [Clock, "Late", count.late, percent(count.late, count.total)],
                  [
                    X,
                    "Not Marked",
                    count.unmarked,
                    percent(count.unmarked, count.total),
                  ],
                ].map(([Icon, title, value, rate], i) => {
                  const I = Icon as typeof Check;
                  return (
                    <div key={String(title)} className={`at-mini at-mini-${i}`}>
                      <span>
                        <I size={18} />
                      </span>
                      <section>
                        <small>{String(title)}</small>
                        <strong>
                          {Number(value)} <em>{rate ? `(${rate})` : ""}</em>
                        </strong>
                      </section>
                    </div>
                  );
                })}
              </div>
              <div className="at-register-tools">
                <div className="at-search">
                  <Search size={18} />
                  <input
                    aria-label="Search class register"
                    placeholder="Search by name or student ID..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <select
                  aria-label="Bulk attendance actions"
                  value=""
                  disabled={busy}
                  onChange={(e) => bulk(e.target.value)}
                >
                  <option value="">Bulk Actions</option>
                  {attendanceStatuses.map((s) => (
                    <option key={s} value={s}>
                      Mark selected {s}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="at-outline"
                  disabled={!classroom || busy}
                  onClick={() => {
                    setModal("import");
                    setImportRows(null);
                    setError("");
                  }}
                >
                  <Upload size={15} />
                  Import
                </button>
                <button
                  type="button"
                  className="primary at-save"
                  disabled={!classroom || !dirty || busy}
                  onClick={save}
                >
                  <Save size={15} />
                  {busy ? "Saving…" : "Save Attendance"}
                </button>
              </div>
              <div className="at-scroll">
                <table className="at-table at-roster">
                  <thead>
                    <tr>
                      <th>
                        <input
                          type="checkbox"
                          aria-label="Select displayed students"
                          checked={
                            !!visible.length &&
                            visible.every((s) => selected.includes(s.id))
                          }
                          onChange={(e) =>
                            setSelected(
                              e.target.checked
                                ? [
                                    ...new Set([
                                      ...selected,
                                      ...visible.map((s) => s.id),
                                    ]),
                                  ]
                                : selected.filter(
                                    (id) => !visible.some((s) => s.id === id),
                                  ),
                            )
                          }
                        />
                      </th>
                      <th>#</th>
                      <th>Student</th>
                      <th>Student ID</th>
                      <th>Status</th>
                      {showRemarks && <th>Remarks</th>}
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((s, i) => {
                      const m = draft.marks.find((m) => m.studentId === s.id)!;
                      return (
                        <tr key={s.id}>
                          <td>
                            <input
                              type="checkbox"
                              aria-label={`Select ${s.name} ${s.id}`}
                              checked={selected.includes(s.id)}
                              onChange={(e) =>
                                setSelected(
                                  e.target.checked
                                    ? [...selected, s.id]
                                    : selected.filter((id) => id !== s.id),
                                )
                              }
                            />
                          </td>
                          <td>{(safePage - 1) * pageSize + i + 1}</td>
                          <td>
                            <button
                              type="button"
                              className="at-person"
                              onClick={() => {
                                setStudentId(s.id);
                                setModal("student");
                              }}
                            >
                              <span>
                                {s.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .slice(0, 2)}
                              </span>
                              <section>
                                <strong>{s.name}</strong>
                                <small>{className(s.classId)}</small>
                              </section>
                            </button>
                          </td>
                          <td>{s.id}</td>
                          <td>
                            <select
                              className={`at-status-select ${statusClass(m.status)}`}
                              aria-label={`Status for ${s.name} ${s.id}`}
                              value={m.status}
                              disabled={busy}
                              onChange={(e) =>
                                mark(s.id, e.target.value as AttendanceStatus)
                              }
                            >
                              {attendanceStatuses.map((v) => (
                                <option key={v}>{v}</option>
                              ))}
                            </select>
                          </td>
                          {showRemarks && (
                            <td>
                              <input
                                className="at-remark"
                                aria-label={`Remarks for ${s.name} ${s.id}`}
                                placeholder="-"
                                maxLength={500}
                                value={m.remarks}
                                disabled={busy}
                                onInput={(e) =>
                                  mark(s.id, m.status, e.currentTarget.value)
                                }
                                onChange={(e) =>
                                  mark(s.id, m.status, e.target.value)
                                }
                              />
                            </td>
                          )}
                          <td>
                            <button
                              type="button"
                              className="at-view"
                              aria-label={`View student ${s.name} ${s.id}`}
                              onClick={() => {
                                setStudentId(s.id);
                                setModal("student");
                              }}
                            >
                              <MoreVertical size={17} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {!rows.length && (
                <p className="at-empty">
                  {classroom
                    ? "No students match your search."
                    : "No class roster in this academic year and term."}
                </p>
              )}
              {pagination}
              {dirty && (
                <div className="at-draft-notice">
                  Unsaved class register{" "}
                  <button
                    type="button"
                    onClick={() =>
                      setDrafts((old) => {
                        const next = { ...old };
                        delete next[key];
                        return next;
                      })
                    }
                  >
                    Discard Register Changes
                  </button>
                  <button type="button" onClick={exportDraft}>
                    Export Draft CSV
                  </button>
                </div>
              )}
            </>
          ) : tab === "Attendance Records" ? (
            <div className="at-records">
              <div className="at-record-filters">
                <label>
                  Class
                  <select
                    aria-label="Records class"
                    value={recordClass}
                    onChange={(e) => setRecordClass(e.target.value)}
                  >
                    <option>All Classes</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  From
                  <input
                    aria-label="Records from date"
                    type="date"
                    value={from}
                    onInput={(e) => setFrom(e.currentTarget.value)}
                    onChange={(e) => setFrom(e.target.value)}
                  />
                </label>
                <label>
                  To
                  <input
                    aria-label="Records to date"
                    type="date"
                    value={to}
                    onInput={(e) => setTo(e.currentTarget.value)}
                    onChange={(e) => setTo(e.target.value)}
                  />
                </label>
                <button
                  type="button"
                  className="at-outline"
                  onClick={exportRecords}
                >
                  <Download size={15} />
                  Export CSV
                </button>
              </div>
              <div className="at-search">
                <Search size={17} />
                <input
                  aria-label="Search attendance records"
                  placeholder="Search class, subject, student, or date..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              {from && to && from > to ? (
                <p className="at-error">
                  Start date must not be after end date.
                </p>
              ) : (
                sessionSummary(
                  recordRows.slice(
                    (Math.min(
                      page,
                      Math.max(1, Math.ceil(recordRows.length / 12)),
                    ) -
                      1) *
                      12,
                  ),
                  12,
                )
              )}
              <div className="at-pagination">
                <span>{recordRows.length} saved sessions</span>
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </button>
                <b>
                  {Math.min(
                    page,
                    Math.max(1, Math.ceil(recordRows.length / 12)),
                  )}
                </b>
                <button
                  type="button"
                  disabled={page * 12 >= recordRows.length}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          ) : tab === "Student Overview" ? (
            <div className="at-records">
              <div className="at-record-filters">
                <label>
                  Class
                  <select
                    aria-label="Student overview class"
                    value={recordClass}
                    onChange={(e) => setRecordClass(e.target.value)}
                  >
                    <option>All Classes</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="at-search">
                <Search size={17} />
                <input
                  aria-label="Search attendance students"
                  placeholder="Search student name, ID, or class..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="at-scroll">
                <table className="at-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Class</th>
                      <th>Present</th>
                      <th>Absent</th>
                      <th>Late</th>
                      <th>Rate</th>
                      <th>History</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentPage.map((s) => {
                      const records = studentRecords(s.id),
                        c = counts(
                          records.flatMap((r) =>
                            r.marks.filter((m) => m.studentId === s.id),
                          ),
                        );
                      return (
                        <tr key={s.id}>
                          <td>
                            <strong>{s.name}</strong>
                            <small>{s.id}</small>
                          </td>
                          <td>{className(s.classId)}</td>
                          <td>{c.present}</td>
                          <td>{c.absent}</td>
                          <td>{c.late}</td>
                          <td>{percent(c.present, c.total)}</td>
                          <td>
                            <button
                              type="button"
                              className="at-outline"
                              onClick={() => {
                                setStudentId(s.id);
                                setModal("student");
                              }}
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {!names.length && (
                <p className="at-empty">No students match your search.</p>
              )}
              <div className="at-pagination">
                <span>{names.length} students</span>
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </button>
                <b>
                  {Math.min(page, Math.max(1, Math.ceil(names.length / 12)))}
                </b>
                <button
                  type="button"
                  disabled={page * 12 >= names.length}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          ) : (
            <div className="at-analytics">
              <h2>Attendance Analytics</h2>
              <p>
                Saved student-session counts for {year}, {term}. Late and
                unmarked are separate from Present.
              </p>
              <div className="at-analytic-stats">
                {(() => {
                  const c = counts(scopeSessions.flatMap((s) => s.marks));
                  return (
                    <>
                      <div>
                        <small>Student Sessions</small>
                        <strong>{c.total.toLocaleString()}</strong>
                      </div>
                      <div>
                        <small>Present Rate</small>
                        <strong>{percent(c.present, c.total)}</strong>
                      </div>
                      <div>
                        <small>Absent</small>
                        <strong>{c.absent}</strong>
                      </div>
                      <div>
                        <small>Not Marked</small>
                        <strong>{c.unmarked}</strong>
                      </div>
                    </>
                  );
                })()}
              </div>
              <div className="at-scroll">
                <table className="at-table">
                  <thead>
                    <tr>
                      <th>Class</th>
                      <th>Sessions</th>
                      <th>Present</th>
                      <th>Absent</th>
                      <th>Late</th>
                      <th>Unmarked</th>
                      <th>Present Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analyticsRates.map((r) => (
                      <tr key={r.id}>
                        <td>{r.name}</td>
                        <td>
                          {
                            scopeSessions.filter((s) => s.classId === r.id)
                              .length
                          }
                        </td>
                        <td>{r.present}</td>
                        <td>{r.absent}</td>
                        <td>{r.late}</td>
                        <td>{r.unmarked}</td>
                        <td>{percent(r.present, r.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                type="button"
                className="at-outline"
                onClick={() => {
                  setTab("Attendance Records");
                  setModal("report");
                }}
              >
                <Download size={16} />
                Export Detailed Report
              </button>
            </div>
          )}
        </section>
        <aside className="at-side">
          <Panel
            title="Attendance Summary"
            action={
              <select
                aria-label="Attendance summary period"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
              >
                <option>This Week</option>
                <option>This Month</option>
              </select>
            }
          >
            <svg
              className="at-line-chart"
              viewBox="0 0 430 175"
              role="img"
              aria-label={`Saved attendance rates for the ${period.toLowerCase()} containing ${date}`}
            >
              <defs>
                <linearGradient id="at-fill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stopColor="#00bd83" stopOpacity=".18" />
                  <stop offset="1" stopColor="#00bd83" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[0, 25, 50, 75, 100].map((v) => (
                <g key={v}>
                  <line
                    x1="45"
                    x2="402"
                    y1={140 - v * 1.12}
                    y2={140 - v * 1.12}
                    stroke="#e5edf5"
                  />
                  <text x="8" y={143 - v * 1.12}>
                    {v}%
                  </text>
                </g>
              ))}
              {chartSegments.map((segment, n) => (
                <polygon
                  key={n}
                  points={`${chartPoint(0, 1, segment[0])} ${segment.map((i) => chartPoint(chart[i].present, chart[i].total, i)).join(" ")} ${chartPoint(0, 1, segment[segment.length - 1])}`}
                  fill="url(#at-fill)"
                />
              ))}
              {(["present", "absent", "late"] as const).map((k, j) => (
                <g key={k}>
                  {chartSegments.map((segment, n) => (
                    <polyline
                      key={n}
                      points={segment
                        .map((i) => chartPoint(chart[i][k], chart[i].total, i))
                        .join(" ")}
                      fill="none"
                      stroke={["#00ba81", "#ff4165", "#ff870a"][j]}
                      strokeWidth="1.8"
                    />
                  ))}
                  {chart.map((c, i) => {
                    const [x, y] = chartPoint(c[k], c.total, i).split(",");
                    return c.total ? (
                      <circle
                        key={i}
                        cx={x}
                        cy={y}
                        r={period === "This Week" ? 3.5 : 2}
                        fill={["#00ba81", "#ff4165", "#ff870a"][j]}
                      >
                        <title>
                          {chartDates[i]}: {c[k]} / {c.total} {k}
                        </title>
                      </circle>
                    ) : null;
                  })}
                </g>
              ))}
              {chartDates.map((d, i) =>
                period === "This Week" || i % 5 === 0 ? (
                  <text
                    key={d}
                    x={45 + (i * 350) / Math.max(1, chartDates.length - 1)}
                    y="163"
                    textAnchor="middle"
                  >
                    {period === "This Week"
                      ? new Date(`${d}T12:00Z`).toLocaleDateString("en-US", {
                          weekday: "short",
                          timeZone: "UTC",
                        })
                      : d.slice(-2)}
                  </text>
                ) : null,
              )}
            </svg>
            <div className="at-chart-legend">
              <span>Present</span>
              <span>Absent</span>
              <span>Late</span>
            </div>
            <p className="at-chart-note">
              Saved class sessions; no record shows no marker.
            </p>
          </Panel>
          <Panel
            title="Class Attendance Rate"
            action={
              <select
                aria-label="Class rate period"
                value={ratePeriod}
                onChange={(e) => setRatePeriod(e.target.value)}
              >
                <option>This Term</option>
                <option>Selected Date</option>
              </select>
            }
          >
            <div className="at-rates">
              {rates.map((r, i) => (
                <button
                  type="button"
                  key={r.id}
                  onClick={() => {
                    setClassId(r.id);
                    setSubject(preferredSubject(r.id));
                    setTab("Take Attendance");
                  }}
                >
                  <span>{r.grade}</span>
                  <i>
                    <b
                      style={{
                        width: `${r.rate}%`,
                        background: [
                          "#00bd86",
                          "#00bd86",
                          "#84c950",
                          "#ff9715",
                          "#ff4969",
                          "#ff8305",
                        ][i],
                      }}
                    />
                  </i>
                  <strong>{r.rate.toFixed(1)}%</strong>
                </button>
              ))}
              {!rates.length && <p>No class data for this period.</p>}
            </div>
          </Panel>
          <Panel
            title="Recent Attendance Records"
            action={
              <button
                type="button"
                className="at-link"
                onClick={() => setTab("Attendance Records")}
              >
                View All
              </button>
            }
          >
            {sessionSummary(
              [...scopeSessions].sort(
                (a, b) =>
                  b.date.localeCompare(a.date) ||
                  b.updatedAt.localeCompare(a.updatedAt),
              ),
              5,
            )}
          </Panel>
        </aside>
      </div>
      <footer className="at-footer">
        <span>
          {busy
            ? "Saving attendance…"
            : dirty
              ? "Unsaved register changes"
              : "Attendance up to date"}
        </span>
        <small>
          Demonstration roster · {allStudents.length} tracked students
          {opening ? ` + ${opening.total} reference opening students` : ""} ·
          selected date {date}
        </small>
      </footer>
      {modal && (
        <div className="at-modal-overlay">
          <section
            className="at-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="at-modal-title"
          >
            <header>
              <h2 id="at-modal-title">
                {modal === "options"
                  ? "Register Options"
                  : modal === "import"
                    ? "Import Attendance"
                    : modal === "report"
                      ? "Attendance Reports"
                      : selectedStudent?.name || "Student History"}
              </h2>
              <button
                type="button"
                aria-label="Close attendance dialog"
                onClick={() => setModal(null)}
              >
                <X size={21} />
              </button>
            </header>
            {modal === "options" ? (
              <>
                <label className="at-option">
                  <input
                    type="checkbox"
                    checked={showRemarks}
                    onChange={(e) => setShowRemarks(e.target.checked)}
                  />
                  Show editable remarks
                </label>
                <label className="at-option">
                  Rows per page
                  <select
                    aria-label="Register rows per page"
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                  >
                    {[8, 16, 32].map((n) => (
                      <option key={n}>{n}</option>
                    ))}
                  </select>
                </label>
                <p className="at-note">
                  Each register is identified by academic year, term, class,
                  date, and subject. Re-saving the same register updates its
                  existing session.
                </p>
              </>
            ) : modal === "import" ? (
              <>
                <p className="at-note">
                  Import statuses for the selected class. Download the template,
                  keep the student IDs, and use Present, Absent, Late, or Not
                  Marked. Existing remarks can include quoted commas. Maximum
                  file size: 100 KB. Changes are staged until Save Attendance.
                </p>
                <button
                  type="button"
                  className="at-outline"
                  disabled={!classroom}
                  onClick={exportDraft}
                >
                  <Download size={16} />
                  Download Class Template
                </button>
                <input
                  ref={file}
                  type="file"
                  aria-label="Attendance CSV file"
                  accept=".csv,text/csv"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    importFile(f);
                  }}
                />
                <button
                  type="button"
                  className="at-outline"
                  disabled={!classroom}
                  onClick={() => file.current?.click()}
                >
                  <Upload size={16} />
                  Choose CSV
                </button>
                {importName && <p>{importName}</p>}
                {importRows && (
                  <>
                    <p className="at-note">
                      Preview: {counts(importRows).present} present,{" "}
                      {counts(importRows).absent} absent,{" "}
                      {counts(importRows).late} late,{" "}
                      {counts(importRows).unmarked} not marked.
                    </p>
                    <button
                      type="button"
                      className="primary"
                      onClick={() => {
                        update({ ...draft, marks: importRows });
                        setModal(null);
                        setTab("Take Attendance");
                        notify(
                          "Imported register staged · save to keep changes",
                        );
                      }}
                    >
                      Apply Imported Register
                    </button>
                  </>
                )}
              </>
            ) : modal === "report" ? (
              <>
                <p className="at-note">
                  Export saved attendance records for {year}, {term}. Draft
                  changes are excluded.
                </p>
                <div className="at-report-fields">
                  <label>
                    Class
                    <select
                      aria-label="Report class"
                      value={recordClass}
                      onChange={(e) => setRecordClass(e.target.value)}
                    >
                      <option>All Classes</option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    From
                    <input
                      type="date"
                      aria-label="Report from date"
                      value={from}
                      onInput={(e) => setFrom(e.currentTarget.value)}
                      onChange={(e) => setFrom(e.target.value)}
                    />
                  </label>
                  <label>
                    To
                    <input
                      type="date"
                      aria-label="Report to date"
                      value={to}
                      onInput={(e) => setTo(e.currentTarget.value)}
                      onChange={(e) => setTo(e.target.value)}
                    />
                  </label>
                </div>
                <p>
                  {recordRows.length} matching sessions ·{" "}
                  {recordRows.reduce((sum, s) => sum + s.marks.length, 0)}{" "}
                  student records
                </p>
                <button
                  type="button"
                  className="primary"
                  onClick={exportRecords}
                >
                  <Download size={16} />
                  Download Attendance Report
                </button>
              </>
            ) : (
              <>
                <p className="at-note">
                  {selectedStudent?.id} ·{" "}
                  {selectedStudent ? className(selectedStudent.classId) : ""} ·
                  saved lesson attendance
                </p>
                <div className="at-scroll">
                  <table className="at-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Subject</th>
                        <th>Status</th>
                        <th>Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentRecords(studentId).map((s) => {
                        const m = s.marks.find(
                          (m) => m.studentId === studentId,
                        )!;
                        return (
                          <tr key={s.id}>
                            <td>{attendanceDate(s.date)}</td>
                            <td>{s.subject}</td>
                            <td>
                              <Status value={m.status} />
                            </td>
                            <td>{m.remarks || "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {!studentRecords(studentId).length && (
                  <p>No saved attendance history.</p>
                )}
              </>
            )}
            {error && (
              <p className="at-error" role="alert">
                {error}
              </p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
