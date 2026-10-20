"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUp,
  Users,
  UserRoundPlus,
  BookOpen,
  Wallet,
  Settings,
  UserPlus,
  ClipboardList,
  CalendarDays,
  MoreVertical,
  X,
  Check,
  Download,
  Search,
  Pencil,
  CheckCircle2,
  GraduationCap,
  FlaskConical,
  Trophy,
  CreditCard,
  ChevronRight,
  Bell,
  ArrowUpRight,
} from "lucide-react";

type Student = {
  id: string;
  name: string;
  className: string;
  status: string;
  email: string;
  year: string;
};
type Teacher = {
  id: string;
  name: string;
  subject: string;
  email: string;
  year: string;
};
type SchoolClass = {
  id: string;
  name: string;
  teacher: string;
  room: string;
  year: string;
};
type Attendance = {
  id: string;
  studentId: string;
  date: string;
  status: string;
  year: string;
};
type Event = {
  id: string;
  title: string;
  date: string;
  time: string;
  kind: string;
  year: string;
};
type School = {
  students: Student[];
  teachers: Teacher[];
  classes: SchoolClass[];
  attendance: Attendance[];
  events: Event[];
};
type Dialog =
  | "student"
  | "teacher"
  | "class"
  | "attendance"
  | "students"
  | "teachers"
  | "classes"
  | "events"
  | "event"
  | "reports"
  | "settings"
  | "details"
  | "event-details"
  | null;
const initial: School = {
  students: [
    {
      id: "STU00123",
      name: "Sophea Chan",
      className: "Grade 10A",
      status: "Active",
      email: "",
      year: "2025 - 2026",
    },
    {
      id: "STU00124",
      name: "Dara Kim",
      className: "Grade 9B",
      status: "Active",
      email: "",
      year: "2025 - 2026",
    },
    {
      id: "STU00125",
      name: "Sreyneang Lim",
      className: "Grade 11A",
      status: "Active",
      email: "",
      year: "2025 - 2026",
    },
    {
      id: "STU00126",
      name: "Visal Chhun",
      className: "Grade 8A",
      status: "Active",
      email: "",
      year: "2025 - 2026",
    },
    {
      id: "STU00127",
      name: "Monika Sok",
      className: "Grade 12B",
      status: "Active",
      email: "",
      year: "2025 - 2026",
    },
  ],
  teachers: [
    {
      id: "T001",
      name: "Sarah Kim",
      subject: "Mathematics",
      email: "",
      year: "2025 - 2026",
    },
    {
      id: "T002",
      name: "David Lee",
      subject: "Science",
      email: "",
      year: "2025 - 2026",
    },
  ],
  classes: [
    {
      id: "C001",
      name: "Grade 10A",
      teacher: "Sarah Kim",
      room: "A101",
      year: "2025 - 2026",
    },
    {
      id: "C002",
      name: "Grade 11A",
      teacher: "David Lee",
      room: "B201",
      year: "2025 - 2026",
    },
    {
      id: "C003",
      name: "Grade 12B",
      teacher: "Sarah Kim",
      room: "C302",
      year: "2025 - 2026",
    },
  ],
  attendance: [],
  events: [
    {
      id: "e1",
      title: "Midterm Exam (Grade 10)",
      date: "2026-10-05",
      time: "08:00 AM - 12:00 PM",
      kind: "Exam",
      year: "2025 - 2026",
    },
    {
      id: "e2",
      title: "Parent-Teacher Meeting",
      date: "2026-10-10",
      time: "02:00 PM - 04:00 PM",
      kind: "Meeting",
      year: "2025 - 2026",
    },
    {
      id: "e3",
      title: "Sports Day",
      date: "2026-10-15",
      time: "All Day",
      kind: "Event",
      year: "2025 - 2026",
    },
    {
      id: "e4",
      title: "Science Exhibition",
      date: "2026-10-18",
      time: "09:00 AM - 03:00 PM",
      kind: "Activity",
      year: "2025 - 2026",
    },
    {
      id: "e5",
      title: "Monthly Fee Due",
      date: "2026-10-25",
      time: "All Day",
      kind: "Finance",
      year: "2025 - 2026",
    },
  ],
};
const today = "2026-10-20";
const money = (v: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(v);
const initials = (name: string) =>
  name
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("");
const eventColors: Record<string, string> = {
  Exam: "orange",
  Meeting: "purple",
  Event: "red",
  Activity: "blue",
  Finance: "amber",
};

export default function Dashboard({
  year,
  query,
  notify,
  onNavigate,
  command,
  onCommandHandled,
}: {
  year: string;
  query: string;
  notify: (text: string) => void;
  onNavigate: (
    page: "Curriculum" | "Subject Allocation" | "Lesson Plans",
  ) => void;
  command: string;
  onCommandHandled: () => void;
}) {
  const [school, setSchool] = useState<School>(initial);
  const [ready, setReady] = useState(false);
  const [csrf, setCsrf] = useState("");
  const [saveStatus, setSaveStatus] = useState("Connecting to your school...");
  const [dialog, setDialog] = useState<Dialog>(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<Record<string, string>>({});
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDialog(null);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);
  const [chartYear, setChartYear] = useState(year);
  const [financePeriod, setFinancePeriod] = useState("This Year");
  const [hoverMonth, setHoverMonth] = useState<number | null>(7);
  const [showQuickActions, setShowQuickActions] = useState(true);
  const queue = useRef(Promise.resolve());
  useEffect(() => {
    setChartYear(year);
  }, [year]);
  useEffect(() => {
    let live = true;
    fetch("/api/dashboard")
      .then(async (r) => {
        if (!r.ok) throw new Error();
        const payload = await r.json();
        if (live) {
          if (payload.data) setSchool(payload.data);
          setCsrf(payload.csrfToken);
          setReady(true);
        }
      })
      .catch(() => {
        if (live)
          setSaveStatus("Connection unavailable · refresh to reconnect");
      });
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => {
    if (!ready || !csrf) return;
    setSaveStatus("Saving changes...");
    queue.current = queue.current
      .catch(() => {})
      .then(async () => {
        try {
          const response = await fetch("/api/dashboard", {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "X-CSRFToken": csrf,
            },
            body: JSON.stringify({ data: school }),
          });
          if (!response.ok) throw new Error();
          setSaveStatus("All changes saved");
        } catch {
          setSaveStatus("Changes not saved · check your connection");
          notify(
            "Could not save dashboard changes. Keep this page open and try again.",
          );
        }
      });
  }, [school, ready, csrf]);
  useEffect(() => {
    if (!command) return;
    setDialog(
      (
        {
          Students: "students",
          "Add Student": "student",
          "Add Teacher": "teacher",
          "Create Class": "class",
          Teachers: "teachers",
          Classes: "classes",
          Reports: "reports",
          Events: "events",
          Attendance: "attendance",
          "Fees & Finance": "reports",
          Settings: "settings",
        } as Record<string, Dialog>
      )[command] || null,
    );
    setSearch("");
    setForm({
      date: today,
      status: ["Add Student", "Add Teacher", "Create Class"].includes(command) ? "Active" : "Present",
      className: "Grade 10A",
      teacher: "",
      studentId: school.students[0]?.id || "",
    });
    onCommandHandled();
  }, [command, onCommandHandled, school.students]);
  const students = school.students.filter((r) => r.year === year);
  const teachers = school.teachers.filter((r) => r.year === year);
  const classes = school.classes.filter((r) => r.year === year);
  const events = school.events.filter((r) => r.year === year);
  const records = school.attendance.filter(
    (r) => r.year === year && r.date === today,
  );
  const baseline = year === "2025 - 2026";
  const studentTotal =
    (baseline ? 1240 : 0) +
    students.filter((s) => s.status === "Active").length;
  const teacherTotal = (baseline ? 84 : 0) + teachers.length;
  const classTotal = (baseline ? 45 : 0) + classes.length;
  const present =
    (baseline ? 1145 : 0) +
    records.filter((r) => r.status === "Present").length;
  const absent =
    (baseline ? 68 : 0) + records.filter((r) => r.status === "Absent").length;
  const late =
    (baseline ? 32 : 0) + records.filter((r) => r.status === "Late").length;
  const attendanceTotal = present + absent + late;
  const attendancePercent = attendanceTotal
    ? Math.round((present / attendanceTotal) * 100)
    : 0;
  const collected = baseline ? 89450 : 0,
    pending = baseline ? 34520 : 0;
  const enrollment =
    chartYear === "2025 - 2026"
      ? [58, 94, 92, 105, 122, 108, 118, 128, 137, 112, 102, 92]
      : chartYear === "2024 - 2025"
        ? [49, 76, 83, 94, 105, 99, 106, 112, 124, 103, 98, 87]
        : Array(12).fill(0);
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const filteredStudents = students.filter((s) =>
    `${s.name} ${s.id} ${s.className}`
      .toLowerCase()
      .includes((query || search).toLowerCase()),
  );
  const filteredEvents = events.filter((e) =>
    `${e.title} ${e.kind}`.toLowerCase().includes(query.toLowerCase()),
  );
  const start = (next: Dialog) => {
    if (!ready) {
      notify("Please wait for the school connection");
      return;
    }
    setSelectedStudent(null);
    setSearch("");
    setForm({
      status: next === "attendance" ? "Present" : "Active",
      className: classes[0]?.name || "Grade 10A",
      teacher: teachers[0]?.name || "",
      date: today,
      studentId: students[0]?.id || "",
      kind: "Event",
      time: "All Day",
    });
    setDialog(next);
  };
  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    if (
      ["student", "teacher", "class"].includes(dialog || "") &&
      !form.name?.trim()
    ) {
      notify("Please enter a name");
      return;
    }
    if (dialog === "event" && !form.title?.trim()) {
      notify("Please enter an event title");
      return;
    }
    const id = crypto.randomUUID();
    if (dialog === "student") {
      const student: Student = {
        id:
          selectedStudent?.id ||
          `STU${String(Math.max(127, ...school.students.map((s) => Number(s.id.replace(/\D/g, "")) || 0)) + 1).padStart(5, "0")}`,
        name: form.name.trim(),
        className: form.className,
        status: form.status,
        email: form.email || "",
        year,
      };
      setSchool((s) => ({
        ...s,
        students: selectedStudent
          ? s.students.map((r) => (r.id === selectedStudent.id ? student : r))
          : [student, ...s.students],
      }));
    } else if (dialog === "teacher")
      setSchool((s) => ({
        ...s,
        teachers: [
          ...s.teachers,
          {
            id,
            name: form.name.trim(),
            subject: form.subject,
            email: form.email || "",
            year,
          },
        ],
      }));
    else if (dialog === "class") {
      if (
        classes.some(
          (c) => c.name.toLowerCase() === form.name.trim().toLowerCase(),
        )
      ) {
        notify("A class with that name already exists");
        return;
      }
      setSchool((s) => ({
        ...s,
        classes: [
          ...s.classes,
          {
            id,
            name: form.name.trim(),
            teacher: form.teacher,
            room: form.room,
            year,
          },
        ],
      }));
    } else if (dialog === "attendance")
      setSchool((s) => ({
        ...s,
        attendance: [
          ...s.attendance.filter(
            (r) => !(r.studentId === form.studentId && r.date === form.date),
          ),
          {
            id,
            studentId: form.studentId,
            date: form.date,
            status: form.status,
            year,
          },
        ],
      }));
    else if (dialog === "event")
      setSchool((s) => ({
        ...s,
        events: [
          ...s.events,
          {
            id,
            title: form.title.trim(),
            date: form.date,
            time: form.time,
            kind: form.kind,
            year,
          },
        ].sort((a, b) => a.date.localeCompare(b.date)),
      }));
    setDialog(null);
    notify(
      dialog === "attendance"
        ? "Attendance recorded"
        : selectedStudent
          ? "Student details updated"
          : "Record created successfully",
    );
  };
  const exportReport = () => {
    const csv = [
      "Metric,Value,Academic Year",
      `Active Students,${studentTotal},${year}`,
      `Teachers,${teacherTotal},${year}`,
      `Classes,${classTotal},${year}`,
      `Present,${present},${year}`,
      `Absent,${absent},${year}`,
      `Late,${late},${year}`,
      `Collected Fees,${collected},${year}`,
      `Pending Fees,${pending},${year}`,
    ].join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `edumanage-school-report-${year.replaceAll(" ", "")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    notify("School report exported");
  };
  const field = (
    label: string,
    key: string,
    options?: string[],
    type = "text",
    required = true,
  ) => (
    <label>
      {label}
      {options ? (
        <select
          required={required}
          value={form[key] || ""}
          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        >
          <option value="" disabled>
            Select {label.toLowerCase()}
          </option>
          {options.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          required={required}
          value={form[key] || ""}
          onInput={(e) => setForm({ ...form, [key]: e.currentTarget.value })}
          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        />
      )}
    </label>
  );
  const studentTable = (all = false) => (
    <div className="table-scroll">
      <table className="dashboard-student-table">
        <thead>
          <tr>
            <th>STUDENT</th>
            <th>CLASS</th>
            <th>STATUS</th>
            <th>ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          {filteredStudents.slice(0, all ? 2000 : 5).map((student, i) => (
            <tr key={student.id}>
              <td>
                <button
                  className="dashboard-student-name"
                  onClick={() => {
                    setSelectedStudent(student);
                    setDialog("details");
                  }}
                >
                  <span className={`student-avatar student-avatar-${i % 5}`}>
                    {initials(student.name)}
                  </span>
                  <span>
                    <strong>{student.name}</strong>
                    <small>ID: {student.id}</small>
                  </span>
                </button>
              </td>
              <td>{student.className}</td>
              <td>
                <span
                  className={`badge ${student.status === "Active" ? "green" : "blue"}`}
                >
                  {student.status}
                </span>
              </td>
              <td>
                <button
                  className="student-more"
                  aria-label={`View student ${student.name}`}
                  onClick={() => {
                    setSelectedStudent(student);
                    setDialog("details");
                  }}
                >
                  <MoreVertical size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!filteredStudents.length && (
        <div className="dashboard-empty">
          <Search size={24} />
          <p>No students match your search.</p>
          <button className="text-button" onClick={() => start("student")}>
            Add your first student
          </button>
        </div>
      )}
    </div>
  );
  const eventList = (all = false) => (
    <div className="school-events">
      {filteredEvents.slice(0, all ? 2000 : 5).map((event) => {
        const Icon =
          event.kind === "Activity"
            ? FlaskConical
            : event.kind === "Event"
              ? Trophy
              : event.kind === "Finance"
                ? CreditCard
                : CalendarDays;
        return (
          <button
            className="school-event"
            key={event.id}
            onClick={() => {
              setSelectedEvent(event);
              setDialog("event-details");
            }}
          >
            <span className="event-date">
              <small>
                {new Date(event.date + "T12:00:00").toLocaleDateString(
                  "en-US",
                  { month: "short" },
                )}
              </small>
              <strong>{event.date.slice(8)}</strong>
            </span>
            <span className="event-content">
              <strong>
                <Icon
                  size={13}
                  className={`event-icon-${eventColors[event.kind]}`}
                />
                {event.title}
              </strong>
              <small>{event.time}</small>
            </span>
            <span className={`event-tag ${eventColors[event.kind]}`}>
              {event.kind}
            </span>
          </button>
        );
      })}
      {!filteredEvents.length && (
        <div className="dashboard-empty">
          <CalendarDays size={24} />
          <p>No events for this academic year.</p>
        </div>
      )}
    </div>
  );
  const dialogTitle = (
    {
      student: selectedStudent ? "Edit Student" : "Add Student",
      teacher: "Add Teacher",
      class: "Create Class",
      attendance: "Record Attendance",
      students: "Student Directory",
      teachers: "Teaching Staff",
      classes: "School Classes",
      events: "School Events",
      event: "Add School Event",
      reports: "School Performance Report",
      settings: "Dashboard Preferences",
      details: "Student Details",
      "event-details": "Event Details",
    } as Record<string, string>
  )[dialog || ""];
  return (
    <div className="school-dashboard">
      <section className="welcome-banner">
        <div
          className="welcome-photo"
          role="img"
          aria-label="Students holding books outside their school"
        />
        <div className="welcome-decoration" />
        <div className="welcome-copy">
          <h1>
            Welcome back,
            <br />
            John Doe! <span>👋</span>
          </h1>
          <p>
            Manage your school efficiently and make
            <br className="desktop-break" /> a bigger impact in students’ lives.
          </p>
          <button className="primary" onClick={() => start("reports")}>
            View Reports <ArrowRight size={18} />
          </button>
        </div>
        <aside className="welcome-quote">
          <strong>
            {new Date(today + "T12:00:00").toLocaleDateString("en-US", {
              weekday: "long",
            })}
            <br />
            {new Date(today + "T12:00:00").toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </strong>
          <div>
            <span>“</span>
            <blockquote>
              Education is the most powerful weapon which you can use to change
              the world.
            </blockquote>
          </div>
          <cite>— Nelson Mandela</cite>
        </aside>
      </section>
      <section className="dashboard-stats" aria-label="School summary">
        {[
          {
            title: "Total Students",
            value: studentTotal.toLocaleString(),
            change: "12%",
            note: "Active Students",
            icon: Users,
            color: "orange",
            action: "students",
          },
          {
            title: "Total Teachers",
            value: teacherTotal,
            change: "5%",
            note: "Teaching Staff",
            icon: UserRoundPlus,
            color: "purple",
            action: "teachers",
          },
          {
            title: "Total Classes",
            value: classTotal,
            change: "0%",
            note: "Across All Levels",
            icon: BookOpen,
            color: "green",
            action: "classes",
          },
          {
            title: "Total Revenue",
            value: money(baseline ? 125980 : 0),
            change: "18%",
            note: "This Academic Year",
            icon: Wallet,
            color: "red",
            action: "reports",
          },
        ].map(({ title, value, change, note, icon: Icon, color, action }) => (
          <button
            className={`dashboard-stat ${color}`}
            key={title}
            onClick={() => start(action as Dialog)}
          >
            <span className="dashboard-stat-icon">
              <Icon size={28} strokeWidth={1.8} />
            </span>
            <span className="dashboard-stat-copy">
              <span>{title}</span>
              <strong>
                {value}
                <small className={change === "0%" ? "neutral" : ""}>
                  {change === "0%" ? (
                    <span className="neutral-circle" />
                  ) : (
                    <ArrowUp size={13} />
                  )}
                  {change}
                </small>
              </strong>
              <span className="stat-caption">{note}</span>
            </span>
          </button>
        ))}
      </section>
      <section className="dashboard-middle">
        <article className="dashboard-card enrollment-card">
          <div className="dashboard-card-heading">
            <h2>Student Enrollment</h2>
            <select
              aria-label="Enrollment chart year"
              value={chartYear}
              onChange={(e) => setChartYear(e.target.value)}
            >
              <option>2025 - 2026</option>
              <option>2026 - 2027</option>
              <option>2024 - 2025</option>
            </select>
          </div>
          <div className="enrollment-chart">
            <div className="enrollment-y">
              {[200, 150, 100, 50, 0].map((n) => (
                <span key={n}>{n}</span>
              ))}
            </div>
            <div className="enrollment-columns">
              {enrollment.map((n: number, i: number) => (
                <button
                  key={i}
                  className="enrollment-month"
                  aria-label={`${months[i]} ${chartYear}: ${n} students enrolled`}
                  onMouseEnter={() => setHoverMonth(i)}
                  onMouseLeave={() => setHoverMonth(null)}
                  onFocus={() => setHoverMonth(i)}
                  onBlur={() => setHoverMonth(null)}
                >
                  <div className="enrollment-track">
                    <span style={{ height: `${n / 2}%` }} />
                  </div>
                  <small>{months[i]}</small>
                  {hoverMonth === i && (
                    <span className="enrollment-tooltip">
                      <span>
                        {months[i]} {chartYear.split(" - ")[1]}
                      </span>
                      <strong>{n} students</strong>
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </article>
        <article className="dashboard-card attendance-card">
          <div className="dashboard-card-heading">
            <h2>Attendance Overview</h2>
          </div>
          <div className="attendance-chart">
            <div
              className="attendance-donut"
              role="img"
              aria-label={`${attendancePercent}% attendance, ${present} present, ${absent} absent, ${late} late`}
              style={{
                background: attendanceTotal
                  ? `conic-gradient(#02c983 0% ${(present / attendanceTotal) * 100}%,#ff4e61 ${(present / attendanceTotal) * 100}% ${((present + absent) / attendanceTotal) * 100}%,#ffa031 ${((present + absent) / attendanceTotal) * 100}% 100%)`
                  : "#edf1f7",
              }}
            >
              <div>
                <strong>{attendancePercent}%</strong>
                <small>Overall Attendance</small>
              </div>
            </div>
            <div className="attendance-legend">
              {[
                ["Present", present, "#00c980"],
                ["Absent", absent, "#ff435a"],
                ["Late", late, "#ff9c2f"],
              ].map(([label, count, color]) => (
                <div key={label}>
                  <span
                    className="legend-dot"
                    style={{ background: String(color) }}
                  />
                  <span>{label}</span>
                  <strong>{Number(count).toLocaleString()}</strong>
                  <small style={{ color: String(color) }}>
                    {attendanceTotal
                      ? ((Number(count) / attendanceTotal) * 100).toFixed(
                          label === "Present" ? 0 : 1,
                        )
                      : 0}
                    %
                  </small>
                </div>
              ))}
            </div>
          </div>
        </article>
        <article className="dashboard-card quick-card">
          <div className="dashboard-card-heading">
            <h2>Quick Actions</h2>
            <button
              aria-label="Configure quick actions"
              onClick={() => start("settings")}
            >
              <Settings size={17} />
            </button>
          </div>
          {showQuickActions ? (
            <div className="quick-grid">
              {[
                {
                  label: "Add Student",
                  type: "student",
                  color: "orange",
                  icon: UserPlus,
                },
                {
                  label: "Add Teacher",
                  type: "teacher",
                  color: "purple",
                  icon: UserRoundPlus,
                },
                {
                  label: "Create Class",
                  type: "class",
                  color: "green",
                  icon: BookOpen,
                },
                {
                  label: "Record Attendance",
                  type: "attendance",
                  color: "blue",
                  icon: ClipboardList,
                },
              ].map(({ label, type, color, icon: Icon }) => (
                <button
                  className={color}
                  key={label}
                  onClick={() => start(type as Dialog)}
                >
                  <Icon size={27} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          ) : (
            <button
              className="restore-quick"
              onClick={() => setShowQuickActions(true)}
            >
              Show quick actions <ArrowUpRight size={16} />
            </button>
          )}
        </article>
      </section>
      <section className="dashboard-bottom">
        <article className="dashboard-card students-card">
          <div className="dashboard-card-heading">
            <h2>Recent Students</h2>
            <button className="view-all" onClick={() => start("students")}>
              View All
            </button>
          </div>
          {studentTable()}
        </article>
        <article className="dashboard-card events-card">
          <div className="dashboard-card-heading">
            <h2>Upcoming Events</h2>
            <button className="view-all" onClick={() => start("events")}>
              View All
            </button>
          </div>
          {eventList()}
        </article>
        <article className="dashboard-card finance-card">
          <div className="dashboard-card-heading">
            <h2>Fee Collection</h2>
            <select
              aria-label="Fee collection period"
              value={financePeriod}
              onChange={(e) => setFinancePeriod(e.target.value)}
            >
              <option>This Year</option>
              <option>Last Year</option>
            </select>
          </div>
          <div className="finance-legend">
            <span>
              <i />
              Collected
            </span>
            <span>
              <i />
              Pending
            </span>
          </div>
          <FinanceChart
            active={baseline}
            previous={financePeriod === "Last Year"}
          />
          <div className="finance-summary">
            <button onClick={() => start("reports")}>
              <span className="finance-icon green">
                <Wallet size={21} />
              </span>
              <span>
                <strong>
                  {money(
                    financePeriod === "Last Year"
                      ? collected * 0.82
                      : collected,
                  )}
                </strong>
                <small>Collected (72%)</small>
              </span>
            </button>
            <button onClick={() => start("reports")}>
              <span className="finance-icon red">
                <ClipboardList size={21} />
              </span>
              <span>
                <strong>
                  {money(
                    financePeriod === "Last Year" ? pending * 0.85 : pending,
                  )}
                </strong>
                <small>Pending (28%)</small>
              </span>
            </button>
          </div>
        </article>
      </section>
      <footer className="dashboard-footer">
        <span>
          <span className="online-dot" />
          {saveStatus}
        </span>
        <span>Demonstration school data · {year}</span>
      </footer>
      {dialog && (
        <div className="modal-backdrop" onClick={() => setDialog(null)}>
          <section
            className={`modal dashboard-modal ${["students", "events", "teachers", "classes", "reports"].includes(dialog) ? "wide" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-label={dialogTitle}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <span className="eyebrow">EDUMANAGE · {year}</span>
                <h2>{dialogTitle}</h2>
              </div>
              <button
                className="icon-button"
                aria-label="Close dialog"
                onClick={() => setDialog(null)}
              >
                <X size={20} />
              </button>
            </div>
            {dialog === "students" ? (
              <>
                <div className="directory-toolbar">
                  <div className="table-search">
                    <Search size={15} />
                    <input
                      aria-label="Search student directory"
                      placeholder="Search name, ID, or class..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <button className="primary" onClick={() => start("student")}>
                    <UserPlus size={16} />
                    Add Student
                  </button>
                </div>
                {studentTable(true)}
              </>
            ) : dialog === "events" ? (
              <>
                <div className="directory-toolbar">
                  <p>School calendar · October 2026</p>
                  <button className="primary" onClick={() => start("event")}>
                    <CalendarDays size={15} />
                    Add Event
                  </button>
                </div>
                {eventList(true)}
              </>
            ) : dialog === "teachers" || dialog === "classes" ? (
              <>
                <div className="directory-toolbar">
                  <p>
                    {dialog === "teachers" ? teachers.length : classes.length}{" "}
                    records in this directory
                  </p>
                  <button
                    className="primary"
                    onClick={() =>
                      start(dialog === "teachers" ? "teacher" : "class")
                    }
                  >
                    Add {dialog === "teachers" ? "Teacher" : "Class"}
                  </button>
                </div>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>NAME</th>
                        <th>{dialog === "teachers" ? "SUBJECT" : "TEACHER"}</th>
                        <th>{dialog === "teachers" ? "EMAIL" : "ROOM"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dialog === "teachers"
                        ? teachers.map((t) => (
                            <tr key={t.id}>
                              <td>
                                <strong>{t.name}</strong>
                              </td>
                              <td>{t.subject}</td>
                              <td>{t.email || "—"}</td>
                            </tr>
                          ))
                        : classes.map((c) => (
                            <tr key={c.id}>
                              <td>
                                <strong>{c.name}</strong>
                              </td>
                              <td>{c.teacher}</td>
                              <td>{c.room}</td>
                            </tr>
                          ))}
                    </tbody>
                  </table>
                </div>
                <div className="modal-footer">
                  <button
                    className="secondary"
                    onClick={() => {
                      setDialog(null);
                      onNavigate("Subject Allocation");
                    }}
                  >
                    Open Subject Allocation <ArrowRight size={14} />
                  </button>
                </div>
              </>
            ) : dialog === "details" && selectedStudent ? (
              <>
                <div className="modal-body">
                  <div className="student-detail-hero">
                    <span className="student-avatar">
                      {initials(selectedStudent.name)}
                    </span>
                    <div>
                      <h3>{selectedStudent.name}</h3>
                      <p>{selectedStudent.id}</p>
                    </div>
                    <span
                      className={`badge ${selectedStudent.status === "Active" ? "green" : "blue"}`}
                    >
                      {selectedStudent.status}
                    </span>
                  </div>
                  <dl className="detail-grid">
                    <div>
                      <dt>Class</dt>
                      <dd>{selectedStudent.className}</dd>
                    </div>
                    <div>
                      <dt>Academic Year</dt>
                      <dd>{selectedStudent.year}</dd>
                    </div>
                    <div>
                      <dt>Email</dt>
                      <dd>{selectedStudent.email || "Not provided"}</dd>
                    </div>
                  </dl>
                </div>
                <div className="modal-footer">
                  <button className="secondary" onClick={() => setDialog(null)}>
                    Close
                  </button>
                  <button
                    className="primary"
                    onClick={() => {
                      setForm({ ...selectedStudent });
                      setDialog("student");
                    }}
                  >
                    <Pencil size={14} />
                    Edit Student
                  </button>
                </div>
              </>
            ) : dialog === "event-details" && selectedEvent ? (
              <>
                <div className="modal-body">
                  <div className="detail-status">
                    <span
                      className={`event-tag ${eventColors[selectedEvent.kind]}`}
                    >
                      {selectedEvent.kind}
                    </span>
                    <span className="muted">{selectedEvent.year}</span>
                  </div>
                  <h3>{selectedEvent.title}</h3>
                  <dl className="detail-grid" style={{ marginTop: 24 }}>
                    <div>
                      <dt>Date</dt>
                      <dd>
                        {new Date(
                          selectedEvent.date + "T12:00:00",
                        ).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                        })}
                      </dd>
                    </div>
                    <div>
                      <dt>Time</dt>
                      <dd>{selectedEvent.time}</dd>
                    </div>
                  </dl>
                </div>
                <div className="modal-footer">
                  <button className="secondary" onClick={() => setDialog(null)}>
                    Close
                  </button>
                  <button className="primary" onClick={() => start("event")}>
                    Add School Event
                  </button>
                </div>
              </>
            ) : dialog === "reports" ? (
              <>
                <div className="modal-body">
                  <div className="report-heading">
                    <span className="badge green">Academic year {year}</span>
                    <span>Demonstration school overview</span>
                  </div>
                  <div className="school-report-grid">
                    {[
                      ["Active Students", studentTotal.toLocaleString()],
                      ["Teaching Staff", teacherTotal],
                      ["Classes", classTotal],
                      ["Overall Attendance", `${attendancePercent}%`],
                      ["Collected Fees", money(collected)],
                      ["Pending Fees", money(pending)],
                    ].map(([title, value]) => (
                      <div key={title}>
                        <small>{title}</small>
                        <strong>{value}</strong>
                      </div>
                    ))}
                  </div>
                  <p className="report-note">
                    School-wide sample totals include the reference school
                    baseline. Directories show example records and new records
                    you add.
                  </p>
                </div>
                <div className="modal-footer">
                  <button
                    className="secondary"
                    onClick={() => {
                      setDialog(null);
                      onNavigate("Curriculum");
                    }}
                  >
                    Academic workspace <ArrowRight size={15} />
                  </button>
                  <button className="primary" onClick={exportReport}>
                    <Download size={15} />
                    Export Report
                  </button>
                </div>
              </>
            ) : dialog === "settings" ? (
              <>
                <div className="modal-body dashboard-preferences">
                  <label>
                    <input
                      type="checkbox"
                      checked={showQuickActions}
                      onChange={(e) => setShowQuickActions(e.target.checked)}
                    />
                    <span>
                      <strong>Show quick actions</strong>
                      <small>
                        Keep your most frequent school tasks one click away.
                      </small>
                    </span>
                  </label>
                  <p>Display preferences apply to this session.</p>
                </div>
                <div className="modal-footer">
                  <button className="primary" onClick={() => setDialog(null)}>
                    <Check size={15} />
                    Done
                  </button>
                </div>
              </>
            ) : (
              <form onSubmit={save}>
                <div className="modal-body form-grid">
                  {dialog === "student" ? (
                    <>
                      {field("Full name", "name")}
                      {field("Class", "className", [
                        ...new Set([
                          ...classes.map((c) => c.name),
                          "Grade 8A",
                          "Grade 9B",
                          "Grade 10A",
                          "Grade 10B",
                          "Grade 11A",
                          "Grade 12B",
                        ]),
                      ])}
                      {field("Email", "email", undefined, "email", false)}
                      {field("Status", "status", ["Active", "Inactive"])}
                    </>
                  ) : dialog === "teacher" ? (
                    <>
                      {field("Full name", "name")}
                      {field("Subject", "subject")}
                      {field("Email", "email", undefined, "email", false)}
                    </>
                  ) : dialog === "class" ? (
                    <>
                      {field("Class name", "name")}
                      {field(
                        "Main teacher",
                        "teacher",
                        teachers.map((t) => t.name),
                      )}
                      {field("Room", "room")}
                    </>
                  ) : dialog === "attendance" ? (
                    <>
                      <label className="span-2">
                        Student
                        <select
                          required
                          value={form.studentId || ""}
                          onChange={(e) =>
                            setForm({ ...form, studentId: e.target.value })
                          }
                        >
                          {students.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name} · {s.className}
                            </option>
                          ))}
                        </select>
                      </label>
                      {field("Date", "date", undefined, "date")}
                      {field("Attendance status", "status", [
                        "Present",
                        "Absent",
                        "Late",
                      ])}
                      <p className="form-note span-2">
                        Recording the same student and date updates their
                        existing attendance record.
                      </p>
                    </>
                  ) : (
                    <>
                      {field("Event title", "title")}
                      {field("Event type", "kind", [
                        "Exam",
                        "Meeting",
                        "Event",
                        "Activity",
                        "Finance",
                      ])}
                      {field("Date", "date", undefined, "date")}
                      {field("Time", "time")}
                    </>
                  )}
                  <p className="form-note span-2">
                    <CheckCircle2 size={14} />
                    Saved to your school workspace · {year}
                  </p>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => setDialog(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="primary"
                    disabled={dialog === "attendance" && !students.length}
                  >
                    <Check size={15} />
                    {dialog === "attendance"
                      ? "Save Attendance"
                      : selectedStudent
                        ? "Save Changes"
                        : "Create Record"}
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function FinanceChart({
  active,
  previous,
}: {
  active: boolean;
  previous: boolean;
}) {
  const values = active
    ? [7, 14, 12, 17, 15, 20, 19, 28, 33, 38].map((n) =>
        previous ? n * 0.82 : n,
      )
    : Array(10).fill(0);
  const pending = active
    ? [2, 6, 3, 4, 9, 7, 10, 15, 14, 18].map((n) => (previous ? n * 0.85 : n))
    : Array(10).fill(0);
  const points = (ns: number[]) =>
    ns.map((n, i) => `${38 + i * 33},${137 - n * 2.9}`).join(" ");
  return (
    <svg
      className="fee-chart"
      viewBox="0 0 360 171"
      role="img"
      aria-label={`Collected and pending fee trends for ${previous ? "last year" : "this year"}`}
    >
      <defs>
        <linearGradient id="fee-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ff932b" stopOpacity=".15" />
          <stop offset="100%" stopColor="#ff932b" stopOpacity=".01" />
        </linearGradient>
      </defs>
      {[0, 10, 20, 30, 40].map((n) => (
        <g key={n}>
          <line
            x1="38"
            x2="345"
            y1={137 - n * 2.9}
            y2={137 - n * 2.9}
            stroke="#eaf0f6"
          />
          <text
            x="27"
            y={141 - n * 2.9}
            textAnchor="end"
            fontSize="9"
            fill="#7b8aa7"
          >
            {n ? `${n}K` : 0}
          </text>
        </g>
      ))}
      {values.map((_, i) => (
        <line
          key={i}
          x1={38 + i * 33}
          x2={38 + i * 33}
          y1="21"
          y2="137"
          stroke="#f1f4f8"
        />
      ))}
      <polygon
        points={`38,137 ${points(values)} 335,137`}
        fill="url(#fee-fill)"
      />
      <polyline
        points={points(values)}
        fill="none"
        stroke="#ff8218"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <polyline
        points={points(pending)}
        fill="none"
        stroke="#ffb292"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      {values.map((n, i) => (
        <g key={i}>
          <circle cx={38 + i * 33} cy={137 - n * 2.9} r="2.5" fill="#ff8218">
            <title>{`${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct"][i]}: ${money(n * 1000)} collected`}</title>
          </circle>
          <circle
            cx={38 + i * 33}
            cy={137 - pending[i] * 2.9}
            r="2.3"
            fill="#ffb292"
          />
          <text
            x={38 + i * 33}
            y="159"
            textAnchor="middle"
            fontSize="9"
            fill="#697c9f"
          >
            {
              [
                "Jan",
                "Feb",
                "Mar",
                "Apr",
                "May",
                "Jun",
                "Jul",
                "Aug",
                "Sep",
                "Oct",
              ][i]
            }
          </text>
        </g>
      ))}
    </svg>
  );
}
