"use client";
import Dashboard from "./dashboard";
import PlanningWorkspace from "./planning-workspace";
import type { PlanningPage } from "./planning-data";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  GraduationCap,
  LayoutDashboard,
  Users,
  UserRound,
  CalendarDays,
  ClipboardList,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Plus,
  Search,
  Bell,
  Maximize,
  Settings,
  LibraryBig,
  Bus,
  MessagesSquare,
  ChartNoAxesCombined,
  Wallet,
  Clock3,
  Layers,
  Shapes,
  SlidersHorizontal,
  Download,
  Eye,
  Pencil,
  MoreVertical,
  X,
  Check,
  CheckCheck,
  ShieldCheck,
  FileCheck2,
  Trash2,
  Menu,
  LogOut,
  HelpCircle,
  ArrowUpRight,
  CheckCircle2,
  CircleAlert,
} from "lucide-react";

type Page = "Curriculum" | "Subject Allocation" | "Lesson Plans";
type Row = {
  academicYear: string;
  term: string;
  id: string;
  name: string;
  code: string;
  description: string;
  levels: string;
  subjects: number;
  version: string;
  status: string;
  date: string;
  teacher: string;
  room: string;
  subject: string;
  className: string;
  time: string;
};
type Data = Record<Page, Row[]>;
const base: Row = {
  academicYear: "2025 - 2026",
  term: "Term 1",
  id: "",
  name: "",
  code: "",
  description: "",
  levels: "Grade 10",
  subjects: 8,
  version: "v1.0",
  status: "Active",
  date: "2025-08-01",
  teacher: "Sarah Kim",
  room: "A101",
  subject: "Mathematics",
  className: "Grade 10A",
  time: "08:00",
};
const row = (id: string, fields: Partial<Row>): Row => ({
  ...base,
  id,
  ...fields,
});
const initial: Data = {
  Curriculum: [
    row("c1", {
      name: "National Curriculum - General Education",
      code: "NC-GEN",
      description: "Standard national curriculum for general education",
      levels: "KG - Grade 12",
      subjects: 96,
      version: "v3.0",
    }),
    row("c2", {
      name: "Cambridge International Curriculum",
      code: "CAM-INT",
      description: "Cambridge international curriculum framework",
      levels: "Grade 1 - Grade 12",
      subjects: 78,
      version: "v2.1",
    }),
    row("c3", {
      name: "STEM Enrichment Program",
      code: "STEM-01",
      description: "Enhanced STEM curriculum with practical learning",
      levels: "Grade 6 - Grade 12",
      subjects: 24,
      status: "Draft",
      date: "2026-01-01",
    }),
    row("c4", {
      name: "Early Childhood Curriculum",
      code: "ECC-01",
      description: "Early childhood development curriculum",
      levels: "KG",
      subjects: 12,
      version: "v2.2",
    }),
    row("c5", {
      name: "Vocational & Technical Education",
      code: "TVET-01",
      description: "Technical and vocational education program",
      levels: "Grade 10 - Grade 12",
      subjects: 36,
      version: "v1.5",
    }),
  ],
  "Subject Allocation": [
    row("a1", {
      name: "Grade 10A",
      levels: "Grade 10",
      teacher: "Sarah Kim",
      room: "A101",
      status: "Complete",
    }),
    row("a2", {
      name: "Grade 10B",
      levels: "Grade 10",
      teacher: "David Lee",
      room: "A102",
      status: "Complete",
    }),
    row("a3", {
      name: "Grade 11A",
      levels: "Grade 11",
      subjects: 9,
      teacher: "Sok Chantha",
      room: "B201",
      status: "Complete",
    }),
    row("a4", {
      name: "Grade 11B",
      levels: "Grade 11",
      subjects: 9,
      teacher: "Rithy Sok",
      room: "B202",
      status: "Complete",
    }),
    row("a5", {
      name: "Grade 12A",
      levels: "Grade 12",
      subjects: 10,
      teacher: "Dara Chhun",
      room: "C301",
      status: "Complete",
    }),
    row("a6", {
      name: "Grade 12B",
      levels: "Grade 12",
      subjects: 10,
      teacher: "Monika Sok",
      room: "C302",
      status: "Complete",
    }),
  ],
  "Lesson Plans": [
    row("l1", {
      name: "Quadratic Functions",
      subject: "Mathematics",
      className: "Grade 10A",
      teacher: "Sarah Kim",
      date: "2025-10-06",
      status: "Approved",
      description:
        "Explore quadratic functions, their graphs, and real-world applications.",
    }),
    row("l2", {
      name: "Cell Structure",
      subject: "Science",
      className: "Grade 11B",
      teacher: "David Lee",
      date: "2025-10-06",
      status: "Approved",
      time: "10:00",
      description:
        "Identify and describe the structure and functions of plant and animal cells.",
    }),
    row("l3", {
      name: "Reading Comprehension",
      subject: "English",
      className: "Grade 12A",
      teacher: "Sok Chantha",
      date: "2025-10-07",
      status: "Pending",
      time: "13:00",
      description:
        "Build reading fluency and infer meaning from a selection of texts.",
    }),
    row("l4", {
      name: "World War II Overview",
      subject: "History",
      className: "Grade 11A",
      teacher: "Rithy Sok",
      date: "2025-10-07",
      status: "Approved",
      time: "15:00",
      description:
        "Examine the key events and historical impact of World War II.",
    }),
    row("l5", {
      name: "Chemical Reactions",
      subject: "Chemistry",
      className: "Grade 12B",
      teacher: "Monika Sok",
      date: "2025-10-08",
      status: "Needs Revision",
      description:
        "Observe chemical reactions and balance simple chemical equations.",
    }),
    row("l6", {
      name: "Poetry Analysis",
      subject: "English",
      className: "Grade 10B",
      teacher: "Dara Chhun",
      date: "2025-10-08",
      status: "Approved",
      description: "Analyze imagery, tone, and figurative language in poetry.",
    }),
  ],
};
const teachers = [
  "Sarah Kim",
  "David Lee",
  "Sok Chantha",
  "Rithy Sok",
  "Dara Chhun",
  "Monika Sok",
];
const domains = [
  ["Languages", 18, "#3b88ff"],
  ["Mathematics", 12, "#ff5571"],
  ["Science", 14, "#13cb94"],
  ["Social Studies", 12, "#5265f5"],
  ["Arts", 10, "#9b5afa"],
  ["Physical Education", 8, "#7c9ac9"],
  ["ICT", 8, "#ffa45f"],
  ["Life Skills", 14, "#ff4265"],
] as const;
const levels = [
  "KG",
  ...Array.from({ length: 12 }, (_, i) => `Grade ${i + 1}`),
];
const fmtDate = (s: string) =>
  new Date(`${s}T12:00:00`).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
const tone = (status: string) =>
  ["Active", "Approved", "Complete"].includes(status)
    ? "green"
    : ["Draft", "Inactive"].includes(status)
      ? "blue"
      : status === "Needs Revision"
        ? "red"
        : "amber";
function Badge({ status }: { status: string }) {
  return <span className={`badge ${tone(status)}`}>{status}</span>;
}
function Avatar({ name, large = false }: { name: string; large?: boolean }) {
  return (
    <span
      className={`avatar avatar-${teachers.indexOf(name) % 6} ${large ? "large" : ""}`}
    >
      {name
        .split(" ")
        .map((s) => s[0])
        .join("")}
    </span>
  );
}
function Stat({
  title,
  value,
  note,
  color,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  note: string;
  color: string;
  icon: typeof BookOpen;
}) {
  return (
    <div className={`stat ${color}`}>
      <span className="stat-icon">
        <Icon size={26} strokeWidth={1.8} />
      </span>
      <div>
        <strong>{value}</strong>
        <h3>{title}</h3>
        <p>{note}</p>
      </div>
    </div>
  );
}

export default function Home() {
  const [page, setPage] = useState<Page>("Curriculum");
  const [showDashboard, setShowDashboard] = useState(false);
  const [planningPage, setPlanningPage] = useState<PlanningPage | null>(
    "School Overview",
  );
  const [planningCommand, setPlanningCommand] = useState("");
  const [academicYearOptions, setAcademicYearOptions] = useState([
    "2026 - 2027",
    "2025 - 2026",
    "2024 - 2025",
    "2023 - 2024",
    "2022 - 2023",
    "2021 - 2022",
    "2020 - 2021",
  ]);
  const [dashboardCommand, setDashboardCommand] = useState("");
  const [data, setData] = useState<Data>(initial);
  const [loaded, setLoaded] = useState(false);
  const [csrfToken, setCsrfToken] = useState("");
  const [saveStatus, setSaveStatus] = useState("Loading workspace...");
  const saveQueue = useRef(Promise.resolve());
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("All Levels");
  const [status, setStatus] = useState("All Status");
  const [teacher, setTeacher] = useState("All Teachers");
  const [subject, setSubject] = useState("All Subjects");
  const [tab, setTab] = useState("Curriculum List");
  const [year, setYear] = useState("2025 - 2026");
  const [term, setTerm] = useState("Term 1");
  const [modal, setModal] = useState<
    "create" | "edit" | "view" | "delete" | null
  >(null);
  const [draft, setDraft] = useState<Row>(base);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [notifications, setNotifications] = useState(false);
  const [profile, setProfile] = useState(false);
  const [filters, setFilters] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [sidebar, setSidebar] = useState(false);
  const [selectedCurriculum, setSelectedCurriculum] = useState("c1");
  const [calendarMonth, setCalendarMonth] = useState(9);
  const [calendarYear, setCalendarYear] = useState(2025);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    if (showDashboard || planningPage || loaded) return;
    let active = true;
    fetch("/api/workspace")
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load the database");
        const payload = await response.json();
        if (!active) return;
        if (payload.data)
          setData(
            Object.fromEntries(
              Object.entries(payload.data).map(([key, records]) => [
                key,
                (records as Row[]).map((record) => ({ ...base, ...record })),
              ]),
            ) as Data,
          );
        setCsrfToken(payload.csrfToken);
        setLoaded(true);
      })
      .catch(() => {
        if (active) {
          setSaveStatus("Database unavailable · refresh to reconnect");
          setToast(
            "Could not connect to the database. Changes cannot be saved yet.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, [showDashboard, planningPage]);
  useEffect(() => {
    if (!loaded || !csrfToken) return;
    setSaveStatus("Saving changes...");
    const timer = setTimeout(() => {
      saveQueue.current = saveQueue.current
        .catch(() => {})
        .then(async () => {
          try {
            const response = await fetch("/api/workspace", {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": csrfToken,
              },
              body: JSON.stringify({ data }),
            });
            if (!response.ok) throw new Error("Save failed");
            setSaveStatus("All changes saved");
          } catch {
            setSaveStatus("Changes not saved · check your connection");
            setToast(
              "Could not save changes to the database. Keep this page open and try editing again.",
            );
          }
        });
    }, 350);
    return () => clearTimeout(timer);
  }, [data, loaded, csrfToken]);
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(""), 3500);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  useEffect(() => {
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setModal(null);
        setActiveMenu(null);
        setNotifications(false);
        setProfile(false);
        setSidebar(false);
      }
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);
  const notify = (text: string) => setToast(text);
  const openSchool = (command = "") => {
    setPlanningPage(null);
    setShowDashboard(true);
    setDashboardCommand(command);
    setExpanded(false);
    setSidebar(false);
    setQuery("");
  };
  const navigate = (next: Page) => {
    setPlanningPage(null);
    setShowDashboard(false);
    setExpanded(true);
    setPage(next);
    setTab(
      next === "Curriculum"
        ? "Curriculum List"
        : next === "Subject Allocation"
          ? "Class View"
          : "All Lesson Plans",
    );
    setQuery("");
    setLevel(
      next === "Curriculum"
        ? "All Levels"
        : next === "Subject Allocation"
          ? "All Grades"
          : "All Classes",
    );
    setStatus("All Status");
    setTeacher("All Teachers");
    setSubject("All Subjects");
    setSelectedDay(null);
    setPageNumber(1);
    setSidebar(false);
    setFilters(false);
    setFromDate("");
    setToDate("");
  };
  const openPlanning = (next: PlanningPage, command = "") => {
    setPlanningPage(next);
    setPlanningCommand(command);
    setShowDashboard(false);
    setExpanded(next !== "School Overview");
    setSidebar(false);
    setQuery("");
  };
  const routeAcademic = (name: string) => {
    if (
      [
        "School Overview",
        "Academic Years",
        "Academics Overview",
        "Syllabus & Progress",
        "Academic Calendar",
      ].includes(name)
    )
      openPlanning(name as PlanningPage);
    else if (name === "Overview") openPlanning("Academics Overview");
    else if (["Subjects", "Grade Levels", "Terms & Semesters"].includes(name))
      openPlanning("Academics Overview", name);
    else navigate(name as Page);
  };
  const rows = useMemo(
    () =>
      data[page].filter((r) => {
        const matchesQuery = Object.values(r)
          .join(" ")
          .toLowerCase()
          .includes(query.toLowerCase());
        const matchesLevel = (() => {
          if (level.startsWith("All ")) return true;
          if (page === "Subject Allocation") return r.levels === level;
          if (page === "Lesson Plans")
            return new RegExp(`^${level}[A-Z]?$`).test(r.className);
          if (level === "KG") return r.levels.includes("KG");
          const target = Number(level.replace("Grade ", ""));
          const numbers = r.levels.match(/\d+/g)?.map(Number) || [];
          if (!numbers.length) return false;
          const minimum = r.levels.startsWith("KG") ? 0 : numbers[0];
          return target >= minimum && target <= numbers[numbers.length - 1];
        })();
        const matchesTab =
          page !== "Lesson Plans" ||
          ![
            "Pending Review",
            "Approved",
            "Needs Revision",
            "My Lesson Plans",
          ].includes(tab) ||
          (tab === "My Lesson Plans"
            ? r.teacher === "Sarah Kim"
            : r.status === (tab === "Pending Review" ? "Pending" : tab));
        const matchesDay =
          !selectedDay ||
          r.date ===
            `${calendarYear}-${String(calendarMonth + 1).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`;
        return (
          r.academicYear === year &&
          (page === "Curriculum" || r.term === term) &&
          (!fromDate || r.date >= fromDate) &&
          (!toDate || r.date <= toDate) &&
          matchesQuery &&
          matchesLevel &&
          (status === "All Status" || r.status === status) &&
          (teacher === "All Teachers" || r.teacher === teacher) &&
          (subject === "All Subjects" || r.subject === subject) &&
          matchesTab &&
          matchesDay
        );
      }),
    [
      data,
      page,
      query,
      level,
      status,
      teacher,
      subject,
      tab,
      selectedDay,
      calendarMonth,
      calendarYear,
      year,
      term,
      fromDate,
      toDate,
    ],
  );
  const pageSize = page === "Curriculum" ? 5 : 6;
  const visible = rows.slice(
    (pageNumber - 1) * pageSize,
    pageNumber * pageSize,
  );
  useEffect(
    () => setPageNumber(1),
    [
      query,
      level,
      status,
      teacher,
      subject,
      tab,
      selectedDay,
      year,
      term,
      fromDate,
      toDate,
    ],
  );
  const open = (mode: "view" | "edit" | "delete", r: Row) => {
    setDraft({ ...r });
    setModal(mode);
    setActiveMenu(null);
  };
  const create = () => {
    if (!loaded) {
      notify("Please wait for the database connection");
      return;
    }
    setDraft({
      ...base,
      academicYear: year,
      term,
      status:
        page === "Curriculum"
          ? "Draft"
          : page === "Subject Allocation"
            ? "Complete"
            : "Pending",
      date: "2025-10-06",
      name: "",
    });
    setModal("create");
  };
  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loaded) return;
    const item = {
      ...draft,
      id: modal === "create" ? `${Date.now()}` : draft.id,
    };
    setData((prev) => ({
      ...prev,
      [page]:
        modal === "create"
          ? [...prev[page], item]
          : prev[page].map((r) => (r.id === item.id ? item : r)),
    }));
    setModal(null);
    notify(
      `${page === "Curriculum" ? "Curriculum" : page === "Lesson Plans" ? "Lesson plan" : "Allocation"} ${modal === "create" ? "created" : "updated"} successfully`,
    );
  };
  const remove = () => {
    setData((prev) => ({
      ...prev,
      [page]: prev[page].filter((r) => r.id !== draft.id),
    }));
    setModal(null);
    notify("Record deleted");
  };
  const exportCsv = () => {
    const headers =
      page === "Curriculum"
        ? [
            "name",
            "code",
            "description",
            "levels",
            "subjects",
            "version",
            "status",
            "date",
          ]
        : page === "Subject Allocation"
          ? ["name", "levels", "subjects", "teacher", "room", "status"]
          : ["date", "name", "subject", "className", "teacher", "status"];
    const csv = [
      headers.join(","),
      ...rows.map((r) =>
        headers
          .map((k) => `"${String(r[k as keyof Row]).replaceAll('"', '""')}"`)
          .join(","),
      ),
    ].join("\r\n");
    const url = URL.createObjectURL(
      new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `edumanage-${page.toLowerCase().replaceAll(" ", "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    notify(`${rows.length} records exported`);
  };
  const tabs =
    page === "Curriculum"
      ? [
          "Curriculum List",
          "Subject Mapping",
          "Learning Areas",
          "Versions & History",
        ]
      : page === "Subject Allocation"
        ? ["Class View", "Teacher View", "Subject View"]
        : [
            "All Lesson Plans",
            "My Lesson Plans",
            "Pending Review",
            "Approved",
            "Needs Revision",
          ];
  const actionName =
    page === "Curriculum"
      ? "Add Curriculum"
      : page === "Subject Allocation"
        ? "Allocate Subject"
        : "Create Lesson Plan";
  const select = (
    label: string,
    value: string,
    change: (s: string) => void,
    options: string[],
  ) => (
    <div className="select-wrap">
      <select
        aria-label={label}
        value={value}
        onChange={(e) => change(e.target.value)}
      >
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
      <ChevronDown size={13} />
    </div>
  );
  const shiftMonth = (amount: number) => {
    const d = new Date(calendarYear, calendarMonth + amount, 1);
    setCalendarMonth(d.getMonth());
    setCalendarYear(d.getFullYear());
    setSelectedDay(null);
  };
  const curricula = data.Curriculum.filter((r) => r.academicYear === year);
  const allocations = data["Subject Allocation"].filter(
    (r) => r.academicYear === year && r.term === term,
  );
  const lessons = data["Lesson Plans"].filter(
    (r) => r.academicYear === year && r.term === term,
  );
  const activeCurr =
    curricula.find((c) => c.id === selectedCurriculum) || curricula[0];
  const totalSubjects = activeCurr?.subjects || 0;
  return (
    <div
      className={`app-shell ${planningPage === "School Overview" ? "blue-overview-shell" : planningPage ? "planning-shell" : showDashboard ? "dashboard-shell" : ""}`}
    >
      {sidebar && (
        <button
          className="sidebar-overlay"
          aria-label="Close navigation"
          onClick={() => setSidebar(false)}
        />
      )}
      <aside className={`sidebar ${sidebar ? "open" : ""}`}>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            openPlanning("School Overview");
          }}
        >
          <span className="brand-mark">
            <GraduationCap size={39} fill="currentColor" strokeWidth={1.3} />
          </span>
          <span>
            <strong>EduManage</strong>
            <small>School Management</small>
          </span>
        </a>
        <nav aria-label="Main navigation">
          <div className="nav-main">
            {[
              [LayoutDashboard, "Overview"],
              [LayoutDashboard, "Dashboard"],
              [Users, "Students"],
              [UserRound, "Teachers"],
              [ClipboardList, "Classes"],
            ].map(([Icon, label]) => {
              const I = Icon as typeof Users;
              return (
                <button
                  key={String(label)}
                  className={
                    (planningPage === "School Overview" &&
                      label === "Overview") ||
                    (showDashboard && !planningPage && label === "Dashboard")
                      ? planningPage === "School Overview"
                        ? "p-nav-active"
                        : "dashboard-nav-active"
                      : ""
                  }
                  onClick={() =>
                    label === "Overview"
                      ? openPlanning("School Overview")
                      : openSchool(label === "Dashboard" ? "" : String(label))
                  }
                >
                  <I size={18} />
                  <span>{String(label)}</span>
                </button>
              );
            })}
          </div>
          <button
            className={`academics ${showDashboard || planningPage === "School Overview" ? "" : "active"}`}
            onClick={() => setExpanded(!expanded)}
          >
            <CalendarDays size={18} />
            <span>Academics</span>
            <ChevronDown size={14} className={expanded ? "rotate" : ""} />
          </button>
          {expanded && (
            <div className="subnav">
              {[
                "Overview",
                "Academic Years",
                "Terms & Semesters",
                "Grade Levels",
                "Subjects",
                "Curriculum",
                "Subject Allocation",
                "Lesson Plans",
                "Syllabus & Progress",
                "Academic Calendar",
              ].map((label) => (
                <button
                  key={label}
                  className={
                    !showDashboard &&
                    (planningPage
                      ? planningPage === label ||
                        (planningPage === "Academics Overview" &&
                          label === "Overview")
                      : page === label)
                      ? "selected"
                      : ""
                  }
                  onClick={() => routeAcademic(label)}
                >
                  <span className="nav-plus">+</span>
                  {label}
                  {!showDashboard &&
                    (planningPage
                      ? planningPage === label ||
                        (planningPage === "Academics Overview" &&
                          label === "Overview")
                      : page === label) && <span className="nav-dot" />}
                </button>
              ))}
            </div>
          )}
          <div className="nav-secondary">
            {[
              [CalendarDays, "Examinations"],
              [Clock3, "Attendance"],
              [Wallet, "Fees & Finance"],
              [LibraryBig, "Library"],
              [Bus, "Transport"],
              [MessagesSquare, "Communication"],
              [CalendarDays, "Events"],
              [ChartNoAxesCombined, "Reports"],
              [Settings, "Settings"],
            ].map(([Icon, label]) => {
              const I = Icon as typeof Users;
              return (
                <button
                  key={String(label)}
                  className={
                    (planningPage === "School Overview" &&
                      label === "Overview") ||
                    (showDashboard && !planningPage && label === "Dashboard")
                      ? planningPage === "School Overview"
                        ? "p-nav-active"
                        : "dashboard-nav-active"
                      : ""
                  }
                  onClick={() =>
                    [
                      "Reports",
                      "Events",
                      "Attendance",
                      "Fees & Finance",
                      "Settings",
                    ].includes(String(label))
                      ? openSchool(String(label))
                      : notify(`${label} workspace is not available yet`)
                  }
                >
                  <I size={18} />
                  <span>{String(label)}</span>
                  {[
                    "Examinations",
                    "Attendance",
                    "Fees & Finance",
                    "Communication",
                    "Settings",
                  ].includes(String(label)) && <ChevronDown size={12} />}
                </button>
              );
            })}
          </div>
          {showDashboard && !planningPage && (
            <div className="sidebar-others">
              <small>OTHERS</small>
              <button
                onClick={() =>
                  notify(
                    "User management will be available when school login is configured",
                  )
                }
              >
                <Users size={18} />
                <span>User Management</span>
              </button>
              <button
                onClick={() =>
                  notify(
                    "Audit logs are not available in this local demonstration",
                  )
                }
              >
                <Clock3 size={18} />
                <span>Audit Logs</span>
              </button>
              <button
                onClick={() =>
                  notify(
                    "Use the quick actions to add records. Open Academics to manage curriculum and lesson plans.",
                  )
                }
              >
                <HelpCircle size={18} />
                <span>Help & Support</span>
              </button>
            </div>
          )}
        </nav>
        {(showDashboard ||
          (planningPage && planningPage !== "School Overview")) && (
          <div className="sidebar-promo">
            <strong>
              Bright Future
              <br />
              Starts Here
            </strong>
            <small>Education · Growth · Success</small>
          </div>
        )}
        {planningPage === "School Overview" && (
          <div className="p-blue-school-card">
            <span>
              <GraduationCap size={30} />
            </span>
            <div>
              <strong>Bright Future School</strong>
              <small>
                Academic Year {year}
                <br />
                Term 1
              </small>
            </div>
          </div>
        )}
        <div className="sidebar-bottom">
          <div className="school-symbol">
            <GraduationCap size={19} />
          </div>
          <div>
            <strong>Westbridge Academy</strong>
            <small>Academic workspace</small>
          </div>
          <span className="online-dot" />
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <button
            className="icon-button mobile-menu"
            aria-label="Open navigation"
            onClick={() => setSidebar(true)}
          >
            <Menu size={21} />
          </button>
          <div className="global-search">
            <Search size={19} />
            <input
              aria-label="Search academic workspace"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                showDashboard
                  ? "Search students, teachers, classes, fees..."
                  : "Search students, teachers, classes, subjects..."
              }
            />
            <kbd>⌘ K</kbd>
          </div>
          <div className="topbar-right">
            <label className="year-selector">
              <small>Academic Year</small>
              {select("Academic year", year, setYear, academicYearOptions)}
            </label>
            <div className="language">
              <span>🇺🇸</span>
              {select("Language", "English", () => {}, ["English"])}
            </div>
            <button
              className="icon-button fullscreen"
              aria-label="Toggle fullscreen"
              onClick={() => {
                if (document.fullscreenElement) document.exitFullscreen();
                else
                  document.documentElement
                    .requestFullscreen()
                    .catch(() =>
                      notify("Fullscreen is unavailable in this browser"),
                    );
              }}
            >
              <Maximize size={18} />
            </button>
            <div className="popover-anchor">
              <button
                className="icon-button bell"
                aria-label="Notifications"
                onClick={() => {
                  setNotifications(!notifications);
                  setProfile(false);
                }}
              >
                <Bell size={19} />
                <b>3</b>
              </button>
              {notifications && (
                <div className="popover notification-panel">
                  <h3>
                    Notifications <span className="badge blue">3 new</span>
                  </h3>
                  <p>
                    <FileCheck2 size={18} />
                    Lesson plans are ready for review.
                  </p>
                  <p>
                    <BookOpen size={18} />
                    National curriculum is up to date.
                  </p>
                  <p>
                    <CheckCheck size={18} />
                    Subject allocation is complete.
                  </p>
                  <button
                    onClick={() => {
                      navigate("Lesson Plans");
                      setTab("Pending Review");
                      setNotifications(false);
                    }}
                  >
                    Review lesson plans <ArrowUpRight size={14} />
                  </button>
                </div>
              )}
            </div>
            <div className="popover-anchor">
              <button
                className="profile"
                onClick={() => {
                  setProfile(!profile);
                  setNotifications(false);
                }}
              >
                <Avatar
                  name={
                    planningPage === "School Overview"
                      ? "Admin User"
                      : "John Doe"
                  }
                  large
                />
                <span>
                  <strong>
                    {planningPage === "School Overview"
                      ? "Admin User"
                      : "John Doe"}
                  </strong>
                  <small>
                    {planningPage === "School Overview"
                      ? "System Administrator"
                      : "Administrator"}
                  </small>
                </span>
                <ChevronDown size={14} />
              </button>
              {profile && (
                <div className="popover profile-panel">
                  <strong>
                    {planningPage === "School Overview"
                      ? "Admin User"
                      : "John Doe"}
                  </strong>
                  <p>School Administrator</p>
                  <span className="badge green">Academic workspace</span>
                  <p className="muted">
                    Your changes are saved to your school workspace.
                  </p>
                </div>
              )}
            </div>
          </div>
        </header>
        <main>
          {planningPage ? (
            <PlanningWorkspace
              page={planningPage}
              year={year}
              query={query}
              notify={notify}
              onNavigate={routeAcademic}
              onSchoolCommand={openSchool}
              onYearChange={setYear}
              onYearsChange={setAcademicYearOptions}
              command={planningCommand}
              onCommandHandled={() => setPlanningCommand("")}
            />
          ) : showDashboard ? (
            <Dashboard
              year={year}
              query={query}
              notify={notify}
              onNavigate={navigate}
              command={dashboardCommand}
              onCommandHandled={() => setDashboardCommand("")}
            />
          ) : (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">ACADEMIC MANAGEMENT</span>
                  <h1>{page}</h1>
                  <div className="breadcrumb">
                    <button onClick={() => openSchool()}>Dashboard</button>
                    <ChevronRight size={13} />
                    <span>
                      {page === "Curriculum"
                        ? "Add, structure, map subjects to grade levels and organize learning programs."
                        : page === "Subject Allocation"
                          ? "Assign subjects and teachers for each academic term."
                          : "Create and track teachers’ lesson plans and teaching materials."}
                    </span>
                  </div>
                </div>
                <div className="heading-actions">
                  {page === "Curriculum" && (
                    <label className="year-selector">
                      <small>Academic Year</small>
                      {select(
                        "Page academic year",
                        year,
                        setYear,
                        academicYearOptions,
                      )}
                    </label>
                  )}
                  <button className="primary" onClick={create}>
                    <Plus size={17} />
                    {actionName}
                  </button>
                </div>
              </div>
              <section className="stats-grid" aria-label="Academic summary">
                {page === "Curriculum" ? (
                  <>
                    <Stat
                      title="Active Curricula"
                      value={
                        curricula.filter((r) => r.status === "Active").length
                      }
                      note="Across All Levels"
                      color="blue"
                      icon={BookOpen}
                    />
                    <Stat
                      title="Grade Levels"
                      value="12"
                      note="With Curriculum"
                      color="green"
                      icon={Layers}
                    />
                    <Stat
                      title="Subjects Mapped"
                      value={totalSubjects}
                      note="In Curriculum"
                      color="orange"
                      icon={BookOpen}
                    />
                    <Stat
                      title="Learning Areas"
                      value="24"
                      note="Knowledge Domains"
                      color="purple"
                      icon={Shapes}
                    />
                  </>
                ) : page === "Subject Allocation" ? (
                  <>
                    <Stat
                      title="Total Classes"
                      value={allocations.length}
                      note="This Year"
                      color="blue"
                      icon={Users}
                    />
                    <Stat
                      title="Assigned Subjects"
                      value={allocations.reduce((n, r) => n + r.subjects, 0)}
                      note="Across Classes"
                      color="orange"
                      icon={CalendarDays}
                    />
                    <Stat
                      title="Teachers Involved"
                      value={new Set(allocations.map((r) => r.teacher)).size}
                      note="Across All Classes"
                      color="purple"
                      icon={Users}
                    />
                    <Stat
                      title="Allocation Completed"
                      value={`${Math.round((allocations.filter((r) => r.status === "Complete").length / Math.max(allocations.length, 1)) * 100)}%`}
                      note="Current Term"
                      color="green"
                      icon={ShieldCheck}
                    />
                  </>
                ) : (
                  <>
                    <Stat
                      title="Total Lesson Plans"
                      value={lessons.length}
                      note="This Term"
                      color="blue"
                      icon={BookOpen}
                    />
                    <Stat
                      title="Approved Plans"
                      value={
                        lessons.filter((r) => r.status === "Approved").length
                      }
                      note="Ready for the classroom"
                      color="green"
                      icon={ShieldCheck}
                    />
                    <Stat
                      title="Pending Review"
                      value={
                        lessons.filter((r) => r.status === "Pending").length
                      }
                      note="Awaiting approval"
                      color="orange"
                      icon={Users}
                    />
                    <Stat
                      title="Needs Revision"
                      value={
                        lessons.filter((r) => r.status === "Needs Revision")
                          .length
                      }
                      note="Feedback requested"
                      color="red"
                      icon={FileCheck2}
                    />
                  </>
                )}
              </section>
              <section className="panel records-panel">
                <div
                  className={`panel-toolbar ${page !== "Curriculum" ? "stacked" : ""}`}
                >
                  {page === "Curriculum" && (
                    <div
                      className="tabs"
                      role="tablist"
                      aria-label="Curriculum views"
                    >
                      {tabs.map((t) => (
                        <button
                          role="tab"
                          aria-selected={tab === t}
                          key={t}
                          className={tab === t ? "active" : ""}
                          onClick={() => setTab(t)}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="filters">
                    {page !== "Curriculum" && (
                      <>
                        {select("Term", term, setTerm, [
                          "Term 1",
                          "Term 2",
                          "Term 3",
                        ])}
                        {select("Grade or class", level, setLevel, [
                          page === "Subject Allocation"
                            ? "All Grades"
                            : "All Classes",
                          ...levels,
                        ])}
                        {select("Teacher", teacher, setTeacher, [
                          "All Teachers",
                          ...teachers,
                        ])}
                        {select("Subject", subject, setSubject, [
                          "All Subjects",
                          "Mathematics",
                          "Science",
                          "English",
                          "History",
                          "Chemistry",
                        ])}
                      </>
                    )}
                    <div className="table-search">
                      <Search size={15} />
                      <input
                        aria-label={`Search ${page.toLowerCase()}`}
                        placeholder={
                          page === "Curriculum"
                            ? "Search curriculum by name, code..."
                            : page === "Subject Allocation"
                              ? "Search by class, subject, or teacher..."
                              : "Search lesson plan by title, subject..."
                        }
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </div>
                    {page === "Curriculum" &&
                      select("Applicable level", level, setLevel, [
                        "All Levels",
                        ...levels,
                      ])}
                    {select("Status", status, setStatus, [
                      "All Status",
                      ...(page === "Curriculum"
                        ? ["Active", "Draft", "Inactive"]
                        : page === "Subject Allocation"
                          ? ["Complete", "Pending"]
                          : ["Approved", "Pending", "Needs Revision"]),
                    ])}
                    {page === "Curriculum" && (
                      <button
                        className={`secondary filter-button ${filters ? "chosen" : ""}`}
                        onClick={() => setFilters(!filters)}
                      >
                        <SlidersHorizontal size={14} />
                        More Filters
                      </button>
                    )}
                    <button className="secondary export" onClick={exportCsv}>
                      <Download size={14} />
                      Export
                    </button>
                  </div>
                </div>
                {filters && (
                  <div className="advanced-filters">
                    <span>
                      <SlidersHorizontal size={15} /> Effective date
                    </span>
                    <label>
                      From{" "}
                      <input
                        aria-label="Effective date from"
                        type="date"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        onInput={(e) => setFromDate(e.currentTarget.value)}
                      />
                    </label>
                    <label>
                      To{" "}
                      <input
                        aria-label="Effective date to"
                        type="date"
                        value={toDate}
                        min={fromDate}
                        onChange={(e) => setToDate(e.target.value)}
                        onInput={(e) => setToDate(e.currentTarget.value)}
                      />
                    </label>
                    <button
                      className="text-button"
                      onClick={() => {
                        setQuery("");
                        setLevel("All Levels");
                        setStatus("All Status");
                        setFromDate("");
                        setToDate("");
                      }}
                    >
                      Clear all filters
                    </button>
                    <span className="muted">
                      Showing {rows.length} matching curricula · {year}
                    </span>
                  </div>
                )}
                {page !== "Curriculum" && (
                  <div
                    className="tabs secondary-tabs"
                    role="tablist"
                    aria-label={`${page} views`}
                  >
                    {tabs.map((t) => (
                      <button
                        key={t}
                        role="tab"
                        aria-selected={tab === t}
                        className={tab === t ? "active" : ""}
                        onClick={() => setTab(t)}
                      >
                        {t}
                        {t === "Pending Review" && (
                          <span className="tab-count">
                            {
                              lessons.filter((r) => r.status === "Pending")
                                .length
                            }
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                <div className={page === "Lesson Plans" ? "lesson-layout" : ""}>
                  {page === "Lesson Plans" && (
                    <aside className="calendar-sidebar">
                      <div className="calendar-heading">
                        <button
                          aria-label="Previous month"
                          onClick={() => shiftMonth(-1)}
                        >
                          <ChevronLeft size={14} />
                        </button>
                        <strong>
                          {new Date(
                            calendarYear,
                            calendarMonth,
                          ).toLocaleDateString("en-US", {
                            month: "long",
                            year: "numeric",
                          })}
                        </strong>
                        <button
                          aria-label="Next month"
                          onClick={() => shiftMonth(1)}
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>
                      <div className="calendar-grid">
                        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                          <span className="day-label" key={d}>
                            {d}
                          </span>
                        ))}
                        {Array.from(
                          {
                            length: new Date(
                              calendarYear,
                              calendarMonth,
                              1,
                            ).getDay(),
                          },
                          (_, i) => (
                            <span key={`blank${i}`} />
                          ),
                        )}
                        {Array.from(
                          {
                            length: new Date(
                              calendarYear,
                              calendarMonth + 1,
                              0,
                            ).getDate(),
                          },
                          (_, i) => (
                            <button
                              key={i}
                              className={`${selectedDay === i + 1 ? "selected" : ""} ${[6, 7, 8].includes(i + 1) && calendarMonth === 9 ? "has-lesson" : ""}`}
                              onClick={() =>
                                setSelectedDay(
                                  selectedDay === i + 1 ? null : i + 1,
                                )
                              }
                            >
                              {i + 1}
                            </button>
                          ),
                        )}
                      </div>
                      {selectedDay && (
                        <button
                          className="text-button"
                          onClick={() => setSelectedDay(null)}
                        >
                          Clear date filter
                        </button>
                      )}
                      <h3>Upcoming Lessons</h3>
                      {lessons.slice(0, 4).map((r, i) => (
                        <button
                          className="upcoming"
                          key={r.id}
                          onClick={() => open("view", r)}
                        >
                          <time>{r.time}</time>
                          <span className={`mini-icon color-${i}`}>
                            <BookOpen size={12} />
                          </span>
                          <span>
                            <strong>
                              {r.className} · {r.subject}
                            </strong>
                            <small>{r.name}</small>
                          </span>
                        </button>
                      ))}
                      <div className="calendar-note">
                        <CalendarDays size={17} />
                        <span>
                          A little planning.
                          <br />
                          <strong>A lot of possibility.</strong>
                        </span>
                      </div>
                    </aside>
                  )}
                  {page === "Curriculum" && tab === "Learning Areas" ? (
                    <div className="learning-grid">
                      {domains.map(([name, count, color]) => (
                        <article key={name}>
                          <span style={{ color, background: `${color}15` }}>
                            <Shapes size={23} />
                          </span>
                          <h3>{name}</h3>
                          <p>{count} subjects in this learning area</p>
                          <button
                            className="text-button"
                            onClick={() => {
                              setTab("Subject Mapping");
                              setQuery("");
                            }}
                          >
                            View subject mapping <ArrowUpRight size={14} />
                          </button>
                        </article>
                      ))}
                    </div>
                  ) : page === "Curriculum" && tab === "Subject Mapping" ? (
                    <div className="mapping-view">
                      <div className="mapping-heading">
                        <h3>National Curriculum · Subject Mapping</h3>
                        <span className="muted">Subjects per grade level</span>
                      </div>
                      <div className="table-scroll">
                        <table>
                          <thead>
                            <tr>
                              <th>LEARNING AREA</th>
                              {[
                                "KG",
                                "G1",
                                "G2",
                                "G3",
                                "G4",
                                "G5",
                                "G6",
                                "G7",
                                "G8",
                                "G9",
                                "G10",
                                "G11",
                                "G12",
                              ].map((g) => (
                                <th key={g}>{g}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {domains.map(([name, , color], i) => (
                              <tr key={name}>
                                <td>
                                  <span
                                    className="legend-dot"
                                    style={{ background: color }}
                                  />
                                  {name}
                                </td>
                                {Array.from({ length: 13 }, (_, j) => (
                                  <td key={j}>
                                    {j === 0 && i > 3 ? (
                                      <span className="muted">—</span>
                                    ) : (
                                      <Check
                                        size={14}
                                        className="mapping-check"
                                      />
                                    )}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : page === "Curriculum" && tab === "Versions & History" ? (
                    <div className="history-view">
                      <h3>Curriculum version history</h3>
                      {curricula.map((r) => (
                        <div className="history-row" key={r.id}>
                          <span className="history-dot">
                            <Check size={14} />
                          </span>
                          <div>
                            <strong>{r.name}</strong>
                            <p>
                              {r.version} ·{" "}
                              {r.status === "Draft"
                                ? "Draft created"
                                : "Curriculum published"}{" "}
                              · {fmtDate(r.date)}
                            </p>
                          </div>
                          <Badge status={r.status} />
                          <button
                            className="secondary"
                            onClick={() => open("view", r)}
                          >
                            View version
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : page === "Subject Allocation" && tab !== "Class View" ? (
                    <div className="table-scroll">
                      <table>
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>
                              {tab === "Teacher View" ? "TEACHER" : "SUBJECT"}
                            </th>
                            <th>ASSIGNED CLASSES</th>
                            <th>TOTAL SUBJECTS</th>
                            <th>STATUS</th>
                            <th>ACTIONS</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(tab === "Teacher View"
                            ? teachers
                            : [
                                "Mathematics",
                                "Science",
                                "English",
                                "History",
                                "Chemistry",
                              ]
                          ).map((name, i) => {
                            const assignments =
                              tab === "Teacher View"
                                ? rows.filter((r) => r.teacher === name)
                                : rows.filter((r) => r.subject === name);
                            return (
                              <tr key={name}>
                                <td>{i + 1}</td>
                                <td>
                                  <span className="teacher-cell">
                                    {tab === "Teacher View" && (
                                      <Avatar name={name} />
                                    )}
                                    <strong>{name}</strong>
                                  </span>
                                </td>
                                <td>
                                  {assignments.map((r) => r.name).join(", ") ||
                                    "No assignments"}
                                </td>
                                <td>
                                  {assignments.reduce(
                                    (n, r) => n + r.subjects,
                                    0,
                                  )}
                                </td>
                                <td>
                                  <Badge
                                    status={
                                      assignments.length
                                        ? "Complete"
                                        : "Pending"
                                    }
                                  />
                                </td>
                                <td>
                                  <button
                                    className="secondary"
                                    onClick={create}
                                  >
                                    <Plus size={13} />
                                    Allocate
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="table-area">
                      <div className="table-scroll">
                        <table
                          className={
                            page === "Curriculum" ? "curriculum-table" : ""
                          }
                        >
                          <thead>
                            <tr>
                              <th>#</th>
                              {(page === "Curriculum"
                                ? [
                                    "CURRICULUM NAME",
                                    "CODE",
                                    "DESCRIPTION",
                                    "APPLICABLE LEVELS",
                                    "TOTAL SUBJECTS",
                                    "VERSION",
                                    "STATUS",
                                    "EFFECTIVE DATE",
                                  ]
                                : page === "Subject Allocation"
                                  ? [
                                      "CLASS",
                                      "GRADE",
                                      "SUBJECTS ASSIGNED",
                                      "MAIN TEACHER",
                                      "ROOM",
                                      "STATUS",
                                    ]
                                  : [
                                      "DATE",
                                      "TITLE",
                                      "SUBJECT",
                                      "CLASS",
                                      "TEACHER",
                                      "STATUS",
                                    ]
                              ).map((h) => (
                                <th key={h}>{h}</th>
                              ))}
                              <th className="actions-heading">ACTIONS</th>
                            </tr>
                          </thead>
                          <tbody>
                            {visible.map((r, index) => (
                              <tr key={r.id}>
                                <td>
                                  {(pageNumber - 1) * pageSize + index + 1}
                                </td>
                                {page === "Curriculum" ? (
                                  <>
                                    <td>
                                      <button
                                        className="name-cell"
                                        onClick={() => open("view", r)}
                                      >
                                        <span
                                          className={`mini-icon color-${index % 5}`}
                                        >
                                          <BookOpen size={12} />
                                        </span>
                                        <strong>{r.name}</strong>
                                      </button>
                                    </td>
                                    <td>{r.code}</td>
                                    <td className="description-cell">
                                      {r.description}
                                    </td>
                                    <td>{r.levels}</td>
                                    <td className="center">{r.subjects}</td>
                                    <td>{r.version}</td>
                                    <td>
                                      <Badge status={r.status} />
                                    </td>
                                    <td>{fmtDate(r.date)}</td>
                                  </>
                                ) : page === "Subject Allocation" ? (
                                  <>
                                    <td>
                                      <button
                                        className="name-cell"
                                        onClick={() => open("view", r)}
                                      >
                                        <strong>{r.name}</strong>
                                      </button>
                                    </td>
                                    <td>{r.levels.replace("Grade ", "")}</td>
                                    <td>{r.subjects} subjects</td>
                                    <td>
                                      <span className="teacher-cell">
                                        <Avatar name={r.teacher} />
                                        {r.teacher}
                                      </span>
                                    </td>
                                    <td>{r.room}</td>
                                    <td>
                                      <Badge status={r.status} />
                                    </td>
                                  </>
                                ) : (
                                  <>
                                    <td>{fmtDate(r.date)}</td>
                                    <td>
                                      <button
                                        className="name-cell"
                                        onClick={() => open("view", r)}
                                      >
                                        {r.name}
                                      </button>
                                    </td>
                                    <td>{r.subject}</td>
                                    <td>{r.className}</td>
                                    <td>
                                      <span className="teacher-cell">
                                        <Avatar name={r.teacher} />
                                        {r.teacher}
                                      </span>
                                    </td>
                                    <td>
                                      <Badge status={r.status} />
                                    </td>
                                  </>
                                )}
                                <td>
                                  <div className="row-actions">
                                    <button
                                      aria-label={`View ${r.name}`}
                                      title="View details"
                                      onClick={() => open("view", r)}
                                    >
                                      <Eye size={14} />
                                    </button>
                                    <button
                                      aria-label={`Edit ${r.name}`}
                                      title="Edit"
                                      onClick={() => open("edit", r)}
                                    >
                                      <Pencil size={13} />
                                    </button>
                                    <div className="popover-anchor">
                                      <button
                                        aria-label={`More actions for ${r.name}`}
                                        title="More actions"
                                        onClick={() =>
                                          setActiveMenu(
                                            activeMenu === r.id ? null : r.id,
                                          )
                                        }
                                      >
                                        <MoreVertical size={14} />
                                      </button>
                                      {activeMenu === r.id && (
                                        <div className="row-menu">
                                          <button
                                            onClick={() => {
                                              setData((prev) => ({
                                                ...prev,
                                                [page]: [
                                                  ...prev[page],
                                                  {
                                                    ...r,
                                                    id: `${Date.now()}`,
                                                    name: `${r.name} (copy)`,
                                                  },
                                                ],
                                              }));
                                              setActiveMenu(null);
                                              notify("Record duplicated");
                                            }}
                                          >
                                            <Layers size={14} />
                                            Duplicate
                                          </button>
                                          <button
                                            className="danger"
                                            onClick={() => open("delete", r)}
                                          >
                                            <Trash2 size={14} />
                                            Delete
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {!visible.length && (
                          <div className="empty-state">
                            <Search size={32} />
                            <h3>No matching records</h3>
                            <p>Try another search or clear your filters.</p>
                            <button
                              className="secondary"
                              onClick={() => {
                                setQuery("");
                                setLevel("All Levels");
                                setStatus("All Status");
                                setTeacher("All Teachers");
                                setSubject("All Subjects");
                                setSelectedDay(null);
                              }}
                            >
                              Clear filters
                            </button>
                          </div>
                        )}
                      </div>
                      {(page !== "Curriculum" || rows.length > pageSize) && (
                        <div className="pagination">
                          <span>
                            Showing{" "}
                            {rows.length ? (pageNumber - 1) * pageSize + 1 : 0}{" "}
                            to {Math.min(pageNumber * pageSize, rows.length)} of{" "}
                            {rows.length}{" "}
                            {page === "Lesson Plans"
                              ? "lesson plans"
                              : page === "Curriculum"
                                ? "curricula"
                                : "classes"}
                          </span>
                          <div>
                            <button
                              aria-label="Previous page"
                              disabled={pageNumber === 1}
                              onClick={() => setPageNumber((n) => n - 1)}
                            >
                              <ChevronLeft size={14} />
                            </button>
                            {Array.from(
                              {
                                length: Math.max(
                                  1,
                                  Math.ceil(rows.length / pageSize),
                                ),
                              },
                              (_, i) => (
                                <button
                                  className={
                                    pageNumber === i + 1 ? "current" : ""
                                  }
                                  key={i}
                                  onClick={() => setPageNumber(i + 1)}
                                >
                                  {i + 1}
                                </button>
                              ),
                            )}
                            <button
                              aria-label="Next page"
                              disabled={
                                pageNumber >= Math.ceil(rows.length / pageSize)
                              }
                              onClick={() => setPageNumber((n) => n + 1)}
                            >
                              <ChevronRight size={14} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </section>
              {page === "Curriculum" && (
                <section className="insights-grid">
                  <article className="panel structure-panel">
                    <div className="panel-title">
                      <h2>Curriculum Structure</h2>
                      <div className="select-wrap">
                        <select
                          aria-label="Curriculum structure"
                          value={activeCurr?.id || ""}
                          onChange={(e) =>
                            setSelectedCurriculum(e.target.value)
                          }
                        >
                          {curricula.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name}
                            </option>
                          ))}
                        </select>
                        <ChevronDown size={13} />
                      </div>
                    </div>
                    <div className="tree-heading">
                      <span />
                      <strong>Primary Education (Grade 1 - Grade 6)</strong>
                      <b>{Math.round(totalSubjects / 2)}</b>
                    </div>
                    <div className="structure-tree">
                      {[
                        ["Languages", 8],
                        ["Mathematics", 6],
                        ["Science", 6],
                        ["Social Studies", 6],
                        ["Arts & Physical Education", 8],
                        ["Life Skills", 14],
                      ].map(([name, count]) => (
                        <div key={name}>
                          <span className="tree-bullet">•</span>
                          <ClipboardList size={13} />
                          <span>{name}</span>
                          <b>{count}</b>
                        </div>
                      ))}
                    </div>
                  </article>
                  <article className="panel distribution-panel">
                    <div className="panel-title">
                      <h2>Subject Distribution</h2>
                      <span className="muted">By learning area</span>
                    </div>
                    <div className="distribution-content">
                      <div
                        className="donut"
                        style={{
                          background:
                            "conic-gradient(#3b88ff 0% 18.8%,#ffa45f 18.8% 27.1%,#13cb94 27.1% 41.7%,#5265f5 41.7% 54.2%,#7c9ac9 54.2% 62.5%,#9b5afa 62.5% 72.9%,#ff4265 72.9% 87.5%,#ff5571 87.5% 100%)",
                        }}
                      >
                        <div>
                          <strong>{totalSubjects}</strong>
                          <span>Subjects</span>
                        </div>
                      </div>
                      <div className="chart-legend">
                        {domains.map(([name, count, color]) => (
                          <div key={name}>
                            <span
                              className="legend-dot"
                              style={{ background: color }}
                            />
                            <span>{name}</span>
                            <strong>
                              {Math.round((count / 96) * totalSubjects)}
                            </strong>
                            <small>({((count / 96) * 100).toFixed(1)}%)</small>
                          </div>
                        ))}
                      </div>
                    </div>
                  </article>
                  <article className="panel coverage-panel">
                    <div className="panel-title">
                      <h2>Grade Level Coverage</h2>
                      <span className="badge blue">13 levels</span>
                    </div>
                    <div className="bar-chart">
                      <div className="axis-labels">
                        <span>20</span>
                        <span>15</span>
                        <span>10</span>
                        <span>5</span>
                        <span>0</span>
                      </div>
                      <div className="chart-bars">
                        {[
                          12, 14, 14, 14, 16, 16, 16, 18, 18, 18, 18, 18, 18,
                        ].map((n, i) => (
                          <div className="bar-column" key={i}>
                            <div className="bar-track">
                              <div
                                className="bar"
                                style={{ height: `${n * 5}%` }}
                              >
                                <strong>{n}</strong>
                              </div>
                            </div>
                            <span>{i === 0 ? "KG" : `G${i}`}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </article>
                </section>
              )}
              <footer className="page-footer">
                <span>
                  <span className="online-dot" />
                  {saveStatus}
                </span>
                <span>
                  EduManage <span className="footer-dot">·</span> {year}{" "}
                  <span className="footer-dot">·</span> Academic workspace
                </span>
              </footer>
            </>
          )}
        </main>
      </div>
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={18} />
          {toast}
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            <X size={15} />
          </button>
        </div>
      )}
      {modal && (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <section
            className={`modal ${modal === "delete" ? "small" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-label={
              modal === "create" ? actionName : `${modal} ${draft.name}`
            }
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <span className="eyebrow">{page.toUpperCase()}</span>
                <h2>
                  {modal === "create"
                    ? actionName
                    : modal === "delete"
                      ? "Delete this record?"
                      : modal === "edit"
                        ? `Edit ${page === "Lesson Plans" ? "Lesson Plan" : page === "Subject Allocation" ? "Allocation" : "Curriculum"}`
                        : draft.name}
                </h2>
              </div>
              <button
                className="icon-button"
                aria-label="Close dialog"
                onClick={() => setModal(null)}
              >
                <X size={20} />
              </button>
            </div>
            {modal === "delete" ? (
              <>
                <div className="modal-body">
                  <p>
                    Delete <strong>{draft.name}</strong>? This removes it from
                    your academic workspace.
                  </p>
                </div>
                <div className="modal-footer">
                  <button className="secondary" onClick={() => setModal(null)}>
                    Cancel
                  </button>
                  <button className="danger-button" onClick={remove}>
                    <Trash2 size={15} />
                    Delete record
                  </button>
                </div>
              </>
            ) : modal === "view" ? (
              <>
                <div className="modal-body">
                  <div className="detail-status">
                    <Badge status={draft.status} />
                    <span className="muted">
                      Academic year {draft.academicYear}
                    </span>
                  </div>
                  <p className="detail-description">
                    {draft.description ||
                      `${draft.subjects} subjects assigned to ${draft.name} for ${term}.`}
                  </p>
                  <dl className="detail-grid">
                    {(page === "Curriculum"
                      ? [
                          ["Code", draft.code],
                          ["Applicable Levels", draft.levels],
                          ["Total Subjects", draft.subjects],
                          ["Version", draft.version],
                          ["Effective Date", fmtDate(draft.date)],
                        ]
                      : page === "Subject Allocation"
                        ? [
                            ["Class", draft.name],
                            ["Grade", draft.levels],
                            ["Main Teacher", draft.teacher],
                            ["Room", draft.room],
                            ["Subjects Assigned", draft.subjects],
                            ["Term", term],
                          ]
                        : [
                            ["Subject", draft.subject],
                            ["Class", draft.className],
                            ["Teacher", draft.teacher],
                            ["Lesson Date", fmtDate(draft.date)],
                            ["Time", draft.time],
                          ]
                    ).map(([label, value]) => (
                      <div key={label}>
                        <dt>{label}</dt>
                        <dd>{value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
                <div className="modal-footer">
                  <button className="secondary" onClick={() => setModal(null)}>
                    Close
                  </button>
                  {page === "Lesson Plans" && draft.status !== "Approved" && (
                    <button
                      className="secondary approve"
                      onClick={() => {
                        setData((prev) => ({
                          ...prev,
                          [page]: prev[page].map((r) =>
                            r.id === draft.id
                              ? { ...r, status: "Approved" }
                              : r,
                          ),
                        }));
                        setModal(null);
                        notify("Lesson plan approved");
                      }}
                    >
                      <Check size={15} />
                      Approve plan
                    </button>
                  )}
                  <button className="primary" onClick={() => setModal("edit")}>
                    <Pencil size={15} />
                    Edit details
                  </button>
                </div>
              </>
            ) : (
              <form onSubmit={save}>
                <div className="modal-body form-grid">
                  <label className="span-2">
                    {page === "Curriculum"
                      ? "Curriculum name"
                      : page === "Subject Allocation"
                        ? "Class name"
                        : "Lesson title"}
                    <input
                      required
                      autoFocus
                      value={draft.name}
                      onChange={(e) =>
                        setDraft({ ...draft, name: e.target.value })
                      }
                      placeholder={
                        page === "Curriculum"
                          ? "e.g. National Curriculum"
                          : page === "Subject Allocation"
                            ? "e.g. Grade 10A"
                            : "e.g. Quadratic Functions"
                      }
                    />
                  </label>
                  {page === "Curriculum" ? (
                    <>
                      <label>
                        Curriculum code
                        <input
                          required
                          value={draft.code}
                          onChange={(e) =>
                            setDraft({ ...draft, code: e.target.value })
                          }
                          placeholder="e.g. NC-GEN"
                        />
                      </label>
                      <label>
                        Version
                        <input
                          required
                          value={draft.version}
                          onChange={(e) =>
                            setDraft({ ...draft, version: e.target.value })
                          }
                        />
                      </label>
                      <label>
                        Applicable levels
                        <input
                          required
                          value={draft.levels}
                          onChange={(e) =>
                            setDraft({ ...draft, levels: e.target.value })
                          }
                        />
                      </label>
                      <label>
                        Total subjects
                        <input
                          required
                          type="number"
                          min="0"
                          max="1000"
                          value={draft.subjects}
                          onChange={(e) =>
                            setDraft({
                              ...draft,
                              subjects: Number(e.target.value),
                            })
                          }
                        />
                      </label>
                    </>
                  ) : (
                    <>
                      <label>
                        {page === "Subject Allocation" ? "Grade" : "Class"}
                        <input
                          required
                          value={
                            page === "Subject Allocation"
                              ? draft.levels
                              : draft.className
                          }
                          onChange={(e) =>
                            setDraft({
                              ...draft,
                              [page === "Subject Allocation"
                                ? "levels"
                                : "className"]: e.target.value,
                            })
                          }
                        />
                      </label>
                      <label>
                        Teacher
                        <select
                          value={draft.teacher}
                          onChange={(e) =>
                            setDraft({ ...draft, teacher: e.target.value })
                          }
                        >
                          {teachers.map((t) => (
                            <option key={t}>{t}</option>
                          ))}
                        </select>
                      </label>
                      {page === "Subject Allocation" ? (
                        <>
                          <label>
                            Number of subjects
                            <input
                              type="number"
                              min="1"
                              max="100"
                              required
                              value={draft.subjects}
                              onChange={(e) =>
                                setDraft({
                                  ...draft,
                                  subjects: Number(e.target.value),
                                })
                              }
                            />
                          </label>
                          <label>
                            Room
                            <input
                              required
                              value={draft.room}
                              onChange={(e) =>
                                setDraft({ ...draft, room: e.target.value })
                              }
                            />
                          </label>
                        </>
                      ) : (
                        <>
                          <label>
                            Subject
                            <input
                              required
                              value={draft.subject}
                              onChange={(e) =>
                                setDraft({ ...draft, subject: e.target.value })
                              }
                            />
                          </label>
                          <label>
                            Time
                            <input
                              required
                              type="time"
                              value={draft.time}
                              onChange={(e) =>
                                setDraft({ ...draft, time: e.target.value })
                              }
                            />
                          </label>
                        </>
                      )}
                    </>
                  )}
                  <label>
                    {page === "Lesson Plans" ? "Lesson date" : "Effective date"}
                    <input
                      required
                      type="date"
                      value={draft.date}
                      onChange={(e) =>
                        setDraft({ ...draft, date: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Status
                    <select
                      value={draft.status}
                      onChange={(e) =>
                        setDraft({ ...draft, status: e.target.value })
                      }
                    >
                      {(page === "Curriculum"
                        ? ["Active", "Draft", "Inactive"]
                        : page === "Subject Allocation"
                          ? ["Complete", "Pending"]
                          : ["Pending", "Approved", "Needs Revision"]
                      ).map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </label>
                  <label className="span-2">
                    {page === "Lesson Plans"
                      ? "Learning objectives & lesson notes"
                      : "Description"}
                    <textarea
                      rows={3}
                      value={draft.description}
                      onChange={(e) =>
                        setDraft({ ...draft, description: e.target.value })
                      }
                      placeholder="Add helpful details..."
                    />
                  </label>
                  <p className="form-note span-2">
                    <ShieldCheck size={14} />
                    Academic year {draft.academicYear} · {draft.term} · Saved to
                    your school workspace.
                  </p>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => setModal(null)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="primary">
                    <Check size={16} />
                    {modal === "create" ? "Create record" : "Save changes"}
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
