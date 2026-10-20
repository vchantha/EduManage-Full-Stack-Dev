"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  BookOpen,
  Layers,
  Users,
  GraduationCap,
  CheckCircle2,
  Clock3,
  BarChart3,
  Plus,
  Search,
  Eye,
  Pencil,
  MoreVertical,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Download,
  FileText,
  Link2,
  ClipboardList,
  ArrowRight,
  UserPlus,
  UserRoundPlus,
  Settings,
  Megaphone,
  Info,
  Home,
  Check,
  Trash2,
  ExternalLink,
  Target,
  School,
  LayoutDashboard,
} from "lucide-react";
import {
  AcademicYear,
  Term,
  Topic,
  AcademicEvent,
  Material,
  PlanningData,
  PlanningPage,
  SchoolData,
  initialPlanning,
  eventTypes,
  eventColors,
  grades,
  dateLabel,
  topicStatus,
} from "./planning-data";
import {
  Pill,
  Metric,
  Bars,
  Donut,
  LineChart,
  PageHeader,
  Picker,
  palette,
} from "./planning-widgets";
type Editor = {
  kind: "years" | "terms" | "subjects" | "topics" | "events" | "materials";
  id?: string;
} | null;
type AcademicRow = {
  id: string;
  name: string;
  teacher: string;
  subject: string;
  className: string;
  date: string;
  status: string;
  version: string;
};
const schedule = [
  ["08:00", "Mathematics · Grade 10A", "Room A101 · Sarah Kim"],
  ["09:30", "English · Grade 9B", "Room B201 · Sok Chantha"],
  ["11:00", "Science · Grade 11A", "Room A202 · David Lee"],
  ["13:00", "History · Grade 8A", "Room C101 · Rithy Sok"],
  ["14:30", "Computer · Grade 12A", "Room Lab 1 · Monika Sok"],
];
const noticeRows = [
  {
    title: "Mid-term Examination",
    text: "Prepare students and review assessment schedules for the mid-term examinations.",
    date: "2025-07-15",
    priority: "High",
  },
  {
    title: "Parent-Teacher Meeting",
    text: "Meet families and discuss student learning and progress.",
    date: "2025-07-20",
    priority: "Medium",
  },
];
const today = "2026-10-20";
const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export default function PlanningWorkspace({
  page,
  year,
  query,
  notify,
  onNavigate,
  onSchoolCommand,
  onYearChange,
  onYearsChange,
  command,
  onCommandHandled,
}: {
  page: PlanningPage;
  year: string;
  query: string;
  notify: (message: string) => void;
  onNavigate: (page: string) => void;
  onSchoolCommand: (command: string) => void;
  onYearChange: (year: string) => void;
  onYearsChange: (years: string[]) => void;
  command: string;
  onCommandHandled: () => void;
}) {
  const [data, setData] = useState<PlanningData>(initialPlanning),
    [ready, setReady] = useState(false),
    [csrf, setCsrf] = useState(""),
    [saveStatus, setSaveStatus] = useState("Loading planning workspace...");
  const queue = useRef(Promise.resolve());
  const [school, setSchool] = useState<SchoolData | null>(null),
    [academic, setAcademic] = useState<Record<string, AcademicRow[]>>({});
  const [selectedYearId, setSelectedYearId] = useState("year-2025"),
    [yearTab, setYearTab] = useState("Overview"),
    [filterStatus, setFilterStatus] = useState("All Status"),
    [localQuery, setLocalQuery] = useState("");
  const [grade, setGrade] = useState("Grade 10"),
    [subject, setSubject] = useState("Mathematics"),
    [term, setTerm] = useState("Term 1"),
    [progressPeriod, setProgressPeriod] = useState("Weekly");
  const [selectedTopicId, setSelectedTopicId] = useState("topic-4"),
    [expanded, setExpanded] = useState<string[]>(["Algebra and Functions"]),
    [allTopics, setAllTopics] = useState(false);
  const [editor, setEditor] = useState<Editor>(null),
    [form, setForm] = useState<Record<string, string>>({}),
    [info, setInfo] = useState<string | null>(null),
    [detail, setDetail] = useState<AcademicEvent | null>(null),
    [deleteItem, setDeleteItem] = useState<{
      kind: NonNullable<Editor>["kind"];
      id: string;
      name: string;
    } | null>(null);
  const [calendarDate, setCalendarDate] = useState("2025-10-01"),
    [calendarView, setCalendarView] = useState("Month"),
    [enabledTypes, setEnabledTypes] = useState(eventTypes),
    [quickOpen, setQuickOpen] = useState(false),
    [range, setRange] = useState("Last 6 months");
  useEffect(() => {
    let live = true;
    fetch("/api/planning")
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const payload = await response.json();
        if (live) {
          if (payload.data) setData(payload.data);
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
          const response = await fetch("/api/planning", {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "X-CSRFToken": csrf,
            },
            body: JSON.stringify({ data }),
          });
          if (!response.ok) {
            const payload = await response.json();
            throw new Error(payload.error || "Could not save");
          }
          setSaveStatus("All changes saved");
        } catch (error) {
          setSaveStatus("Changes not saved");
          notify(
            error instanceof Error
              ? error.message
              : "Could not save planning data",
          );
        }
      });
  }, [data, ready, csrf]);
  useEffect(() => {
    if (!ready) return;
    let live = true;
    Promise.all([
      fetch("/api/dashboard").then((r) => r.json()),
      fetch("/api/workspace").then((r) => r.json()),
    ])
      .then(([schoolPayload, academicPayload]) => {
        if (live) {
          setSchool(schoolPayload.data);
          setAcademic(academicPayload.data || {});
        }
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [ready]);
  useEffect(() => {
    const match = data.years.find((item) => item.name === year);
    if (match) setSelectedYearId(match.id);
  }, [year, data.years]);
  useEffect(() => {
    onYearsChange(
      [...new Set([...data.years.map((item) => item.name), "2026 - 2027"])]
        .sort()
        .reverse(),
    );
  }, [data.years]);
  useEffect(() => {
    setLocalQuery("");
    setFilterStatus("All Status");
    setInfo(null);
    setEditor(null);
    setDetail(null);
  }, [page]);
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setEditor(null);
        setInfo(null);
        setDetail(null);
        setDeleteItem(null);
        setQuickOpen(false);
      }
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);
  const selectedYear =
    data.years.find((item) => item.id === selectedYearId) ||
    data.years.find((item) => item.status === "Active") ||
    data.years[0];
  const activeYear =
    data.years.find((item) => item.status === "Active") || selectedYear;
  const yearTerms = data.terms.filter(
    (item) => item.yearId === selectedYear?.id,
  );
  const yearEvents = data.events.filter(
    (item) => item.yearId === selectedYear?.id,
  );
  const topicRows = data.topics.filter(
    (item) =>
      item.yearId === selectedYear?.id &&
      item.subject === subject &&
      item.grade === grade &&
      item.term === term,
  );
  const selectedTopic =
    topicRows.find((item) => item.id === selectedTopicId) || topicRows[0];
  const chapters = [...new Set(topicRows.map((item) => item.chapter))];
  const average = topicRows.length
    ? Math.round(
        topicRows.reduce((sum, item) => sum + item.progress, 0) /
          topicRows.length,
      )
    : 0;
  const completed = topicRows.filter((item) => item.progress === 100).length,
    inProgress = topicRows.filter(
      (item) => item.progress > 0 && item.progress < 100,
    ).length,
    notStarted = topicRows.filter((item) => item.progress === 0).length;
  const schoolStudents = (school?.students || []).filter(
      (item) => item.year === year,
    ),
    schoolAttendance = (school?.attendance || []).filter(
      (item) => item.year === year,
    );
  const search = (query || localQuery).toLowerCase();
  const yearRows = data.years.filter(
    (item) =>
      `${item.name} ${item.description}`.toLowerCase().includes(search) &&
      (filterStatus === "All Status" || item.status === filterStatus),
  );
  const filteredTopics = topicRows.filter((item) =>
    `${item.title} ${item.chapter}`.toLowerCase().includes(search),
  );
  const monthDate = new Date(calendarDate + "T12:00:00"),
    monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1),
    monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
  const calendarEvents = yearEvents.filter(
    (item) =>
      enabledTypes.includes(item.type) &&
      `${item.title} ${item.description}`.toLowerCase().includes(search),
  );
  const shownEvents = calendarEvents
    .filter(
      (item) => item.endDate >= iso(monthStart) && item.date <= iso(monthEnd),
    )
    .sort((a, b) => a.date.localeCompare(b.date));
  const chartYears = [...data.years].sort((a, b) =>
    a.start.localeCompare(b.start),
  );
  const totalDays = selectedYear
    ? Math.round(
        (new Date(selectedYear.end).getTime() -
          new Date(selectedYear.start).getTime()) /
          86400000,
      ) + 1
    : 0;
  const goYear = (item: AcademicYear) => {
    setSelectedYearId(item.id);
    onYearChange(item.name);
    setYearTab("Overview");
  };
  const openEditor = (
    kind: NonNullable<Editor>["kind"],
    item?: Record<string, unknown>,
  ) => {
    if (!ready) {
      notify("Please wait for the school connection");
      return;
    }
    const defaults: Record<string, string> = {
      yearId: selectedYear?.id || "",
      name: "",
      title: "",
      start: selectedYear?.start || "2026-08-01",
      end: selectedYear?.end || "2027-07-31",
      date: calendarDate,
      endDate: calendarDate,
      status: kind === "years" ? "Upcoming" : "Upcoming",
      students: "0",
      weeks: "12",
      classes: "0",
      description: "",
      chapter: chapters[0] || "Algebra and Functions",
      objectives: "",
      periods: "4",
      progress: "0",
      subject,
      grade,
      term,
      code: "",
      teacher: "Sarah Kim",
      type: kind === "materials" ? "Lesson Guide" : "School Event",
      time: "09:00",
      topicId: selectedTopic?.id || "",
      url: "",
    };
    if (kind === "years") {
      defaults.name = "2026 - 2027";
      defaults.start = "2026-08-01";
      defaults.end = "2027-07-31";
    }
    if (kind === "terms") defaults.name = `Term ${yearTerms.length + 1}`;
    setForm(
      item
        ? Object.fromEntries(
            Object.entries(item).map(([key, value]) => [key, String(value)]),
          )
        : defaults,
    );
    setEditor({ kind, id: item?.id ? String(item.id) : undefined });
    setInfo(null);
    setDetail(null);
  };
  useEffect(() => {
    if (!command || !ready) return;
    const kinds: Record<string, NonNullable<Editor>["kind"]> = {
      Subjects: "subjects",
      "Terms & Semesters": "terms",
    };
    if (kinds[command]) openEditor(kinds[command]);
    else setInfo(command === "Grade Levels" ? "grades" : command);
    onCommandHandled();
  }, [command, ready]);
  const save = (event: React.FormEvent) => {
    event.preventDefault();
    if (!editor || !ready) return;
    const id = editor.id || crypto.randomUUID();
    const n = (key: string) => Number(form[key] || 0);
    let record:
      | AcademicYear
      | Term
      | Topic
      | AcademicEvent
      | Material
      | PlanningData["subjects"][number];
    if (
      ["years", "terms", "subjects"].includes(editor.kind) &&
      !form.name.trim()
    ) {
      notify("Please enter a name");
      return;
    }
    if (
      ["topics", "events", "materials"].includes(editor.kind) &&
      !form.title.trim()
    ) {
      notify("Please enter a title");
      return;
    }
    if (form.start && form.end && form.start > form.end) {
      notify("End date must follow start date");
      return;
    }
    if (editor.kind === "years") {
      if (
        data.years.some(
          (item) => item.id !== id && item.name === form.name.trim(),
        )
      ) {
        notify("An academic year with that name already exists");
        return;
      }
      record = {
        id,
        name: form.name.trim(),
        start: form.start,
        end: form.end,
        status: form.status,
        students: n("students"),
        description: form.description,
      };
    } else if (editor.kind === "terms")
      record = {
        id,
        yearId: form.yearId || selectedYear.id,
        name: form.name,
        start: form.start,
        end: form.end,
        status: form.status,
        weeks: n("weeks"),
        classes: n("classes"),
        students: n("students"),
      };
    else if (editor.kind === "subjects")
      record = {
        id,
        name: form.name.trim(),
        code: form.code,
        grade: form.grade,
        teacher: form.teacher,
      };
    else if (editor.kind === "topics")
      record = {
        id,
        yearId: form.yearId || selectedYear.id,
        chapter: form.chapter,
        title: form.title.trim(),
        objectives: form.objectives,
        periods: n("periods"),
        start: form.start,
        end: form.end,
        progress: n("progress"),
        subject: form.subject,
        grade: form.grade,
        term: form.term,
      };
    else if (editor.kind === "events") {
      if (form.date > form.endDate) {
        notify("Event end date must follow start date");
        return;
      }
      record = {
        id,
        yearId: form.yearId || selectedYear.id,
        title: form.title.trim(),
        date: form.date,
        endDate: form.endDate,
        time: form.time,
        type: form.type,
        description: form.description,
      };
    } else {
      if (!form.url.startsWith("https://") && !form.url.startsWith("http://")) {
        notify("Please enter an HTTP or HTTPS material link");
        return;
      }
      record = {
        id,
        topicId: form.topicId,
        title: form.title.trim(),
        url: form.url,
        type: form.type,
      };
    }
    const collection = editor.kind;
    setData((previous) => {
      const next = {
        ...previous,
        [collection]: editor.id
          ? previous[collection].map((item) => (item.id === id ? record : item))
          : [...previous[collection], record],
      } as PlanningData;
      if (collection === "years" && form.status === "Active")
        next.years = next.years.map((item) =>
          item.id !== id && item.status === "Active"
            ? { ...item, status: "Completed" }
            : item,
        );
      return next;
    });
    if (editor.kind === "topics") {
      setSelectedTopicId(id);
      setExpanded((previous) => [...new Set([...previous, form.chapter])]);
    }
    setEditor(null);
    notify(editor.id ? "Changes saved" : "Record created");
  };
  const remove = () => {
    if (!deleteItem) return;
    const { kind, id } = deleteItem;
    setData((previous) => {
      const next = {
        ...previous,
        [kind]: previous[kind].filter((item) => item.id !== id),
      } as PlanningData;
      if (kind === "topics")
        next.materials = next.materials.filter((item) => item.topicId !== id);
      return next;
    });
    setDeleteItem(null);
    notify("Record removed");
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
          onChange={(event) => setForm({ ...form, [key]: event.target.value })}
        >
          {options.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      ) : (
        <input
          required={required}
          type={type}
          min={type === "number" ? 0 : undefined}
          max={key === "progress" ? 100 : undefined}
          value={form[key] || ""}
          onChange={(event) => setForm({ ...form, [key]: event.target.value })}
          onInput={(event) =>
            setForm({ ...form, [key]: event.currentTarget.value })
          }
        />
      )}
    </label>
  );
  const actionButtons = (
    kind: NonNullable<Editor>["kind"],
    item: { id: string; name?: string; title?: string },
    view: () => void,
  ) => (
    <div className="row-actions">
      <button aria-label={`View ${item.name || item.title}`} onClick={view}>
        <Eye size={14} />
      </button>
      <button
        aria-label={`Edit ${item.name || item.title}`}
        onClick={() => openEditor(kind, item)}
      >
        <Pencil size={13} />
      </button>
      <button
        aria-label={`More actions for ${item.name || item.title}`}
        onClick={() => {
          if (kind === "years") {
            goYear(item as AcademicYear);
            setInfo("year-actions");
          } else
            setDeleteItem({
              kind,
              id: item.id,
              name: item.name || item.title || "record",
            });
        }}
      >
        <MoreVertical size={14} />
      </button>
    </div>
  );
  const calendarMove = (amount: number) => {
    const date = new Date(calendarDate + "T12:00:00");
    if (calendarView === "Week") date.setDate(date.getDate() + amount * 7);
    else date.setMonth(date.getMonth() + amount, 1);
    setCalendarDate(iso(date));
  };
  const selectEvent = (item: AcademicEvent) => setDetail(item);
  const termCards = (compact = false) => (
    <div className={`p-term-cards ${compact ? "compact" : ""}`}>
      {yearTerms.map((item, i) => (
        <article key={item.id}>
          <span className={`p-term-symbol ${i % 2 ? "red" : "orange"}`}>
            T{i + 1}
          </span>
          <div>
            <div className="p-term-title">
              <h3>{item.name}</h3>
              <Pill text={item.status} />
              <button
                aria-label={`Edit ${item.name}`}
                onClick={() => openEditor("terms", item)}
              >
                <MoreVertical size={15} />
              </button>
            </div>
            <p>
              {dateLabel(item.start)} - {dateLabel(item.end)}
            </p>
            <div className="p-term-numbers">
              <span>
                <Users size={17} />
                <strong>{item.students.toLocaleString("en-US")}</strong>
                <small>Students</small>
              </span>
              <span>
                <CalendarDays size={17} />
                <strong>{item.weeks}</strong>
                <small>Weeks</small>
              </span>
              <span>
                <ClipboardList size={17} />
                <strong>{item.classes}</strong>
                <small>Classes</small>
              </span>
            </div>
          </div>
        </article>
      ))}
      {!yearTerms.length && (
        <div className="p-empty">
          <Layers size={25} />
          <p>No terms have been created for this year.</p>
          <button className="text-button" onClick={() => openEditor("terms")}>
            Add the first term
          </button>
        </div>
      )}
    </div>
  );
  const eventRows = (items: AcademicEvent[], limit = 5) => (
    <div className="p-event-rows">
      {items.slice(0, limit).map((item) => (
        <button key={item.id} onClick={() => selectEvent(item)}>
          <span className="p-date-square">
            <small>
              {new Date(item.date + "T12:00:00").toLocaleDateString("en-US", {
                month: "short",
              })}
            </small>
            <strong>{item.date.slice(8)}</strong>
          </span>
          <span>
            <strong>{item.title}</strong>
            <small>{item.description || item.time}</small>
          </span>
          <span className={`p-pill ${eventColors[item.type]}`}>
            {item.type === "School Event" ? "Event" : item.type}
          </span>
        </button>
      ))}
      {!items.length && (
        <div className="p-empty">
          <CalendarDays size={24} />
          <p>No matching activities.</p>
        </div>
      )}
    </div>
  );
  const subjectNames = [...new Set(data.subjects.map((item) => item.name))];
  const subjectDistribution = [
    ["Mathematics", 16],
    ["English", 12],
    ["Science", 14],
    ["Social Studies", 10],
    ["Languages", 8],
    ["Arts", 8],
    ["Physical Education", 8],
    ["Others", 20],
  ].map(([label], i) => ({
    label: String(label),
    value: data.subjects.filter((item) =>
      label === "Others"
        ? ![
            "Mathematics",
            "English",
            "Science",
            "Social Studies",
            "Languages",
            "Arts",
            "Physical Education",
          ].includes(item.name)
        : item.name === label,
    ).length,
    color: palette[i],
  }));
  const title = page === "School Overview" ? "Overview" : page;
  return (
    <div
      className={`planning-workspace ${page === "School Overview" ? "p-blue" : ""}`}
    >
      {page === "School Overview" ? (
        <>
          <div className="p-overview-heading">
            <div>
              <h1>Overview</h1>
              <p>Welcome back! Here’s what’s happening at your school today.</p>
            </div>
            <div className="p-overview-heading-right">
              <div className="p-today">
                <CalendarDays size={23} />
                <span>
                  <strong>Tuesday, 20 October 2026</strong>
                  <small>
                    Academic Year {year} <span> | </span> {term}
                  </small>
                </span>
              </div>
              <div className="popover-anchor">
                <button
                  className="primary"
                  onClick={() => setQuickOpen(!quickOpen)}
                >
                  <Plus size={18} />
                  Quick Action
                  <ChevronDown size={15} />
                </button>
                {quickOpen && (
                  <div className="p-quick-menu">
                    {[
                      "Add Student",
                      "Add Teacher",
                      "Create Class",
                      "Take Attendance",
                    ].map((name, i) => (
                      <button
                        key={name}
                        onClick={() => {
                          setQuickOpen(false);
                          onSchoolCommand(
                            [
                              "Add Student",
                              "Add Teacher",
                              "Create Class",
                              "Attendance",
                            ][i],
                          );
                        }}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="p-school-layout">
            <div className="p-school-main">
              <section className="p-overview-stats">
                {[
                  {
                    title: "Total Students",
                    value: school
                      ? (year === "2025 - 2026" ? 1240 : 0) +
                        schoolStudents.filter(
                          (item) => item.status === "Active",
                        ).length
                      : 1245,
                    note: "Active students",
                    icon: Users,
                    color: "blue",
                    change: "+12%",
                    action: "Students",
                  },
                  {
                    title: "Total Teachers",
                    value: school
                      ? (year === "2025 - 2026" ? 84 : 0) +
                        school.teachers.filter((item) => item.year === year)
                          .length
                      : 86,
                    note: "+4 this semester",
                    icon: UserRoundPlus,
                    color: "green",
                    change: "+5%",
                    action: "Teachers",
                  },
                  {
                    title: "Total Classes",
                    value: school
                      ? (year === "2025 - 2026" ? 45 : 0) +
                        school.classes.filter((item) => item.year === year)
                          .length
                      : 48,
                    note: "+3 this semester",
                    icon: BookOpen,
                    color: "purple",
                    change: "+8%",
                    action: "Classes",
                  },
                  {
                    title: "Subjects",
                    value: data.subjects.length,
                    note: "Across all grades",
                    icon: GraduationCap,
                    color: "orange",
                    change: "0%",
                    action: "subjects",
                  },
                ].map(
                  ({
                    title,
                    value,
                    note,
                    icon: Icon,
                    color,
                    change,
                    action,
                  }) => (
                    <button
                      key={title}
                      className={`p-blue-stat ${color}`}
                      onClick={() =>
                        action === "subjects"
                          ? setInfo("subjects")
                          : onSchoolCommand(action)
                      }
                    >
                      <span>
                        <Icon size={29} />
                      </span>
                      <div>
                        <strong>{Number(value).toLocaleString("en-US")}</strong>
                        <p>{title}</p>
                        <small>{note}</small>
                      </div>
                      <b>{change}</b>
                    </button>
                  ),
                )}
              </section>
              <section className="p-overview-charts">
                <article className="p-card">
                  <div className="p-card-title">
                    <div>
                      <h2>
                        <BarChart3 size={20} />
                        Student Enrollment Trend
                      </h2>
                      <p>Total active students over the last 6 months</p>
                    </div>
                    <Picker
                      label="Enrollment trend period"
                      value={range}
                      onChange={setRange}
                      options={["Last 6 months", "Last 12 months"]}
                    />
                  </div>
                  <LineChart
                    blue
                    max={1400}
                    values={
                      range === "Last 6 months"
                        ? [1000, 1075, 1148, 1212, 1278, 1340]
                        : [
                            620, 705, 790, 890, 980, 1055, 1100, 1148, 1190,
                            1240, 1290, 1340,
                          ]
                    }
                    labels={
                      range === "Last 6 months"
                        ? ["Jan", "Feb", "Mar", "Apr", "May", "Jun"]
                        : [
                            "Jul",
                            "Aug",
                            "Sep",
                            "Oct",
                            "Nov",
                            "Dec",
                            "Jan",
                            "Feb",
                            "Mar",
                            "Apr",
                            "May",
                            "Jun",
                          ]
                    }
                    id="overview-enrollment"
                  />
                </article>
                <article className="p-card p-attendance-card">
                  <div className="p-card-title">
                    <h2>
                      <ClipboardList size={20} />
                      Attendance Rate
                    </h2>
                  </div>
                  <Donut
                    compact
                    items={[
                      {
                        label: "Present",
                        value:
                          1148 +
                          schoolAttendance.filter(
                            (item) => item.status === "Present",
                          ).length,
                        color: "#1cc788",
                      },
                      {
                        label: "Late",
                        value:
                          56 +
                          schoolAttendance.filter(
                            (item) => item.status === "Late",
                          ).length,
                        color: "#ffb135",
                      },
                      {
                        label: "Absent",
                        value:
                          44 +
                          schoolAttendance.filter(
                            (item) => item.status === "Absent",
                          ).length,
                        color: "#ff5979",
                      },
                    ]}
                    value="92%"
                    caption="Present Today"
                  />
                </article>
              </section>
              <section className="p-overview-tables">
                <article className="p-card">
                  <div className="p-card-title">
                    <h2>
                      <Users size={19} />
                      Recent Students
                    </h2>
                    <button onClick={() => onSchoolCommand("Students")}>
                      View All
                    </button>
                  </div>
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          {[
                            "#",
                            "Student ID",
                            "Name",
                            "Class",
                            "Status",
                            "Enrolled",
                          ].map((label) => (
                            <th key={label}>{label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {schoolStudents
                          .filter((item) =>
                            `${item.name} ${item.id} ${item.className}`
                              .toLowerCase()
                              .includes(query.toLowerCase()),
                          )
                          .slice(0, 5)
                          .map((item, i) => (
                            <tr key={item.id}>
                              <td>{i + 1}</td>
                              <td>{item.id}</td>
                              <td>
                                <span className="p-person">
                                  <b className={`p-avatar avatar-${i}`}>
                                    {item.name
                                      .split(" ")
                                      .map((s) => s[0])
                                      .join("")}
                                  </b>
                                  {item.name}
                                </span>
                              </td>
                              <td>{item.className}</td>
                              <td>
                                <Pill text={item.status} />
                              </td>
                              <td>Jul {5 - Math.floor(i / 2)}, 2025</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                    {!schoolStudents.length && (
                      <div className="p-empty">
                        Student directory is loading or has no records.
                      </div>
                    )}
                  </div>
                </article>
                <article className="p-card">
                  <div className="p-card-title">
                    <h2>
                      <ClipboardList size={19} />
                      Recent Attendance
                    </h2>
                    <button onClick={() => setInfo("attendance")}>
                      View All
                    </button>
                  </div>
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          {["#", "Name", "Class", "Time", "Status"].map(
                            (label) => (
                              <th key={label}>{label}</th>
                            ),
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {schoolStudents.slice(0, 5).map((item, i) => (
                          <tr key={item.id}>
                            <td>{i + 1}</td>
                            <td>
                              <span className="p-person">
                                <b className="p-avatar">
                                  {item.name
                                    .split(" ")
                                    .map((s) => s[0])
                                    .join("")}
                                </b>
                                {item.name}
                              </span>
                            </td>
                            <td>{item.className}</td>
                            <td>
                              {["07:55", "07:58", "08:05", "—", "07:50"][i]}
                            </td>
                            <td>
                              <Pill
                                text={
                                  schoolAttendance.find(
                                    (record) => record.studentId === item.id,
                                  )?.status ||
                                  [
                                    "Present",
                                    "Present",
                                    "Late",
                                    "Absent",
                                    "Present",
                                  ][i]
                                }
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </article>
              </section>
            </div>
            <aside className="p-school-aside">
              <article className="p-card">
                <div className="p-card-title">
                  <h2>
                    <CalendarDays size={19} />
                    Today’s Schedule
                  </h2>
                  <button onClick={() => setInfo("schedule")}>View All</button>
                </div>
                <div className="p-schedule">
                  {schedule.map(([time, title, description], i) => (
                    <button key={time} onClick={() => setInfo("schedule")}>
                      <time>{time}</time>
                      <i style={{ background: palette[i] }} />
                      <span>
                        <strong>{title}</strong>
                        <small>{description}</small>
                      </span>
                    </button>
                  ))}
                </div>
              </article>
              <article className="p-card">
                <div className="p-card-title">
                  <h2>
                    <Megaphone size={19} />
                    Important Notice
                  </h2>
                  <button onClick={() => setInfo("notices")}>View All</button>
                </div>
                <div className="p-notices">
                  {noticeRows.map((item, i) => (
                    <button key={item.title} onClick={() => setInfo("notices")}>
                      <span className={i ? "blue" : "red"}>
                        {i ? <Info size={23} /> : <CalendarDays size={23} />}
                      </span>
                      <div>
                        <strong>{item.title}</strong>
                        <p>{item.text}</p>
                        <small>{dateLabel(item.date)}</small>
                      </div>
                      <Pill text={item.priority} />
                    </button>
                  ))}
                </div>
              </article>
            </aside>
          </div>
          <section className="p-school-bottom">
            <article className="p-card">
              <div className="p-card-title">
                <h2>
                  <BarChart3 size={19} />
                  Class Distribution
                </h2>
              </div>
              <Donut
                items={[6, 7, 7, 8, 7, 7].map((value, i) => ({
                  label: `Grade ${i + 7}`,
                  value,
                  color: palette[i],
                }))}
                value="42"
                caption="Total Classes"
              />
            </article>
            <article className="p-card">
              <div className="p-card-title">
                <div>
                  <h2>
                    <BarChart3 size={19} />
                    Top 5 Subjects
                  </h2>
                  <p>By total classes</p>
                </div>
                <button onClick={() => setInfo("subjects")}>View All</button>
              </div>
              <div className="p-subject-progress">
                {["Mathematics", "English", "Science", "Khmer", "Computer"].map(
                  (label, i) => (
                    <button
                      key={label}
                      onClick={() => {
                        setSubject(label);
                        onNavigate("Syllabus & Progress");
                      }}
                    >
                      <span>{label}</span>
                      <div>
                        <i
                          style={{
                            width: `${[78, 78, 56, 42, 42][i]}%`,
                            background: palette[i],
                          }}
                        />
                      </div>
                      <b>{[8, 8, 6, 5, 5][i]}</b>
                    </button>
                  ),
                )}
              </div>
            </article>
            <article className="p-card">
              <div className="p-card-title">
                <h2>
                  <Link2 size={19} />
                  Quick Links
                </h2>
              </div>
              <div className="p-blue-quick">
                {[
                  [UserPlus, "Add Student", "Add Student"],
                  [UserRoundPlus, "Add Teacher", "Add Teacher"],
                  [BookOpen, "Create Class", "Create Class"],
                  [CalendarDays, "Take Attendance", "Attendance"],
                ].map(([Icon, label, command], i) => {
                  const I = Icon as typeof BookOpen;
                  return (
                    <button
                      className={["blue", "green", "purple", "orange"][i]}
                      key={String(label)}
                      onClick={() => onSchoolCommand(String(command))}
                    >
                      <I size={24} />
                      {String(label)}
                    </button>
                  );
                })}
              </div>
            </article>
          </section>
        </>
      ) : page === "Academics Overview" ? (
        <>
          <section className="p-academic-banner">
            <div>
              <h1>Academics Overview</h1>
              <p>
                Plan, organize and monitor your school’s academic
                <br /> programs, curriculum and learning progress.
              </p>
            </div>
            <aside>
              “A well planned
              <br /> curriculum builds a<br /> brighter tomorrow.”
              <GraduationCap size={36} />
            </aside>
          </section>
          <section className="p-metrics">
            <Metric
              title="Academic Year"
              value={activeYear?.name || "Not configured"}
              note="Active Academic Year"
              color="orange"
              icon={CalendarDays}
              onClick={() => onNavigate("Academic Years")}
            />
            <Metric
              title="Terms / Semesters"
              value={yearTerms.length}
              note={`Current: ${term}`}
              color="purple"
              icon={Layers}
              onClick={() => setInfo("terms")}
            />
            <Metric
              title="Grade Levels"
              value={grades.length}
              note="KG - Grade 12"
              color="blue"
              icon={BookOpen}
              onClick={() => setInfo("grades")}
            />
            <Metric
              title="Total Subjects"
              value={data.subjects.length}
              note="Across All Grades"
              color="green"
              icon={BookOpen}
              onClick={() => setInfo("subjects")}
            />
          </section>
          <section className="p-academic-charts">
            <article className="p-card">
              <div className="p-card-title">
                <h2>Student Enrollment by Grade</h2>
                <Picker
                  label="Grade enrollment year"
                  value={year}
                  onChange={onYearChange}
                  options={data.years.map((item) => item.name)}
                />
              </div>
              <Bars
                max={250}
                values={[
                  120, 135, 142, 156, 168, 172, 180, 176, 160, 148, 132, 118,
                  98,
                ]}
                labels={[
                  "KG",
                  ...Array.from({ length: 12 }, (_, i) => `G${i + 1}`),
                ]}
              />
            </article>
            <article className="p-card">
              <div className="p-card-title">
                <h2>Subjects Distribution</h2>
              </div>
              <Donut
                items={subjectDistribution}
                value={data.subjects.length}
                caption="Subjects"
              />
            </article>
            <article className="p-card">
              <div className="p-card-title">
                <h2>Teaching Progress</h2>
                <Picker
                  label="Teaching progress term"
                  value={term}
                  onChange={setTerm}
                  options={
                    yearTerms.length
                      ? yearTerms.map((item) => item.name)
                      : ["Term 1", "Term 2"]
                  }
                />
              </div>
              <div className="p-teaching-progress">
                {[
                  "Mathematics",
                  "English",
                  "Science",
                  "History",
                  "Geography",
                  "Computer",
                ].map((label, i) => {
                  const value =
                    label === "Mathematics"
                      ? average
                      : [78, 82, 65, 71, 68, 79][i];
                  return (
                    <button
                      key={label}
                      onClick={() => {
                        setSubject(label);
                        onNavigate("Syllabus & Progress");
                      }}
                    >
                      <span
                        className="p-tiny-icon"
                        style={{ background: palette[i] }}
                      >
                        <ClipboardList size={12} />
                      </span>
                      <span>{label}</span>
                      <div>
                        <i
                          style={{ width: `${value}%`, background: palette[i] }}
                        />
                      </div>
                      <strong>{value}%</strong>
                    </button>
                  );
                })}
              </div>
            </article>
          </section>
          <section className="p-academic-bottom">
            <article className="p-card">
              <div className="p-card-title">
                <h2>Upcoming Academic Activities</h2>
                <button onClick={() => onNavigate("Academic Calendar")}>
                  View All
                </button>
              </div>
              {eventRows(
                yearEvents
                  .filter((item) => item.date >= "2025-10-01")
                  .sort((a, b) => a.date.localeCompare(b.date)),
              )}
            </article>
            <article className="p-card">
              <div className="p-card-title">
                <h2>Recently Updated</h2>
                <button onClick={() => onNavigate("Curriculum")}>
                  View All
                </button>
              </div>
              <div className="p-updates">
                {[
                  ...(academic.Curriculum || [])
                    .slice(0, 3)
                    .map((item) => ({ ...item, kind: "Curriculum" })),
                  ...(academic["Lesson Plans"] || [])
                    .slice(0, 2)
                    .map((item) => ({ ...item, kind: "Lesson Plans" })),
                ].map((item, i) => (
                  <button key={item.id} onClick={() => onNavigate(item.kind)}>
                    <span
                      className={["orange", "blue", "green", "purple"][i % 4]}
                    >
                      <ClipboardList size={19} />
                    </span>
                    <div>
                      <strong>{item.name}</strong>
                      <small>
                        {item.kind} · {item.version || item.status}
                      </small>
                    </div>
                  </button>
                ))}
                {!Object.keys(academic).length && (
                  <div className="p-empty">Academic records are loading.</div>
                )}
              </div>
            </article>
            <article className="p-card">
              <div className="p-card-title">
                <h2>Quick Actions</h2>
                <button
                  aria-label="Academic quick action help"
                  onClick={() => setInfo("quick-help")}
                >
                  <Settings size={16} />
                </button>
              </div>
              <div className="p-academic-quick">
                {[
                  [BookOpen, "Add Subject", "subject"],
                  [Layers, "Create Curriculum", "Curriculum"],
                  [UserPlus, "Assign Teacher", "Subject Allocation"],
                  [FileText, "Create Lesson Plan", "Lesson Plans"],
                  [ClipboardList, "Manage Academic Year", "Academic Years"],
                  [CalendarDays, "View Academic Calendar", "Academic Calendar"],
                ].map(([Icon, label, target], i) => {
                  const I = Icon as typeof BookOpen;
                  return (
                    <button
                      className={
                        ["orange", "purple", "blue", "green", "red", "blue"][i]
                      }
                      key={String(label)}
                      onClick={() =>
                        target === "subject"
                          ? openEditor("subjects")
                          : onNavigate(String(target))
                      }
                    >
                      <I size={24} />
                      <span>{String(label)}</span>
                    </button>
                  );
                })}
              </div>
            </article>
          </section>
        </>
      ) : page === "Academic Years" ? (
        <>
          <PageHeader title="Academic Years" crumb="Academic Years">
            <button className="primary" onClick={() => openEditor("years")}>
              <Plus size={17} />
              Add Academic Year
            </button>
          </PageHeader>
          <section className="p-metrics">
            <Metric
              title="Total Academic Years"
              value={data.years.length}
              note="All Years in System"
              color="orange"
              icon={CalendarDays}
            />
            <Metric
              title="Active Year"
              value={activeYear?.name || "None"}
              note="Current Academic Year"
              color="green"
              icon={CheckCircle2}
            />
            <Metric
              title="Total Terms"
              value={data.terms.length}
              note="Across All Years"
              color="purple"
              icon={Layers}
            />
            <Metric
              title="Total Students"
              value={(activeYear?.students || 0).toLocaleString("en-US")}
              note="In Current Year"
              color="red"
              icon={BarChart3}
            />
          </section>
          <div className="p-years-layout">
            <div className="p-years-main">
              <article className="p-card p-years-chart">
                <div className="p-card-title">
                  <h2>Student Enrollment Trend by Academic Year</h2>
                  <Picker
                    label="Year chart measure"
                    value="Student Enrollment"
                    onChange={() => {}}
                    options={["Student Enrollment"]}
                  />
                </div>
                <Bars
                  values={chartYears.map((item) => item.students)}
                  labels={chartYears.map((item) => item.name)}
                  max={Math.max(
                    10000,
                    ...chartYears.map(
                      (item) => Math.ceil(item.students / 1000) * 1000,
                    ),
                  )}
                />
              </article>
              <article className="p-card">
                <div className="p-card-title">
                  <h2>Academic Years</h2>
                  <div className="p-inline-filters">
                    <div className="table-search">
                      <Search size={15} />
                      <input
                        aria-label="Search academic years"
                        placeholder="Search academic year..."
                        value={localQuery}
                        onChange={(event) => setLocalQuery(event.target.value)}
                      />
                    </div>
                    <Picker
                      label="Academic year status"
                      value={filterStatus}
                      onChange={setFilterStatus}
                      options={[
                        "All Status",
                        "Active",
                        "Completed",
                        "Upcoming",
                      ]}
                    />
                  </div>
                </div>
                <div className="table-scroll">
                  <table className="p-year-table">
                    <thead>
                      <tr>
                        {[
                          "#",
                          "ACADEMIC YEAR",
                          "START DATE",
                          "END DATE",
                          "TERMS",
                          "STUDENTS",
                          "STATUS",
                          "ACTIONS",
                        ].map((label) => (
                          <th key={label}>{label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {yearRows.map((item, i) => (
                        <tr
                          key={item.id}
                          className={
                            item.id === selectedYearId ? "selected" : ""
                          }
                        >
                          <td>{i + 1}</td>
                          <td>
                            <button
                              className="name-cell"
                              onClick={() => goYear(item)}
                            >
                              <strong>{item.name}</strong>
                            </button>
                          </td>
                          <td>{dateLabel(item.start)}</td>
                          <td>{dateLabel(item.end)}</td>
                          <td>
                            {
                              data.terms.filter(
                                (term) => term.yearId === item.id,
                              ).length
                            }
                          </td>
                          <td>{item.students.toLocaleString("en-US")}</td>
                          <td>
                            <Pill text={item.status} />
                          </td>
                          <td>
                            {actionButtons("years", item, () => goYear(item))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!yearRows.length && (
                    <div className="p-empty">No matching academic years.</div>
                  )}
                </div>
              </article>
            </div>
            <aside className="p-year-details">
              <article className="p-card">
                <div className="p-year-photo">
                  <button
                    className="secondary"
                    onClick={() => openEditor("years", selectedYear)}
                  >
                    <Pencil size={13} />
                    Edit Year
                  </button>
                  <h2>
                    {selectedYear?.name}
                    <Pill text={selectedYear?.status || "Upcoming"} />
                  </h2>
                  <p>Current Academic Year Configuration</p>
                </div>
                <div className="tabs p-year-tabs">
                  {[
                    "Overview",
                    "Terms & Semesters",
                    "Schedule",
                    "Statistics",
                  ].map((tab) => (
                    <button
                      key={tab}
                      className={yearTab === tab ? "active" : ""}
                      onClick={() => setYearTab(tab)}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
                {selectedYear &&
                  (yearTab === "Overview" ? (
                    <div className="p-year-facts">
                      <div>
                        <span>
                          <CalendarDays size={21} />
                        </span>
                        <dl>
                          <dt>Academic Year</dt>
                          <dd>{selectedYear.name}</dd>
                        </dl>
                      </div>
                      <div>
                        <span>
                          <FileText size={21} />
                        </span>
                        <dl>
                          <dt>Description</dt>
                          <dd className="light">
                            {selectedYear.description ||
                              "No description provided."}
                          </dd>
                        </dl>
                      </div>
                      <div>
                        <span className="green">
                          <CalendarDays size={21} />
                        </span>
                        <dl>
                          <dt>Start Date</dt>
                          <dd>{dateLabel(selectedYear.start)}</dd>
                        </dl>
                      </div>
                      <div>
                        <span>
                          <Users size={21} />
                        </span>
                        <dl>
                          <dt>School Workspace</dt>
                          <dd>Administrator</dd>
                        </dl>
                      </div>
                      <div>
                        <span className="red">
                          <CalendarDays size={21} />
                        </span>
                        <dl>
                          <dt>End Date</dt>
                          <dd>{dateLabel(selectedYear.end)}</dd>
                        </dl>
                      </div>
                      <div>
                        <span>
                          <Clock3 size={21} />
                        </span>
                        <dl>
                          <dt>School Year Length</dt>
                          <dd>{totalDays} days</dd>
                        </dl>
                      </div>
                      <div>
                        <span className="green">
                          <CheckCircle2 size={21} />
                        </span>
                        <dl>
                          <dt>Status</dt>
                          <dd>
                            <Pill text={selectedYear.status} />
                          </dd>
                        </dl>
                      </div>
                    </div>
                  ) : yearTab === "Terms & Semesters" ? (
                    termCards(true)
                  ) : yearTab === "Schedule" ? (
                    <div className="p-year-schedule">
                      {eventRows(yearEvents.slice(0, 4))}
                      <button
                        className="text-button"
                        onClick={() => onNavigate("Academic Calendar")}
                      >
                        Open Academic Calendar <ArrowRight size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="p-year-statistics">
                      <Metric
                        title="Enrolled Students"
                        value={selectedYear.students.toLocaleString("en-US")}
                        note="For selected academic year"
                        color="blue"
                        icon={Users}
                      />
                      <Metric
                        title="Terms / Semesters"
                        value={yearTerms.length}
                        note={`${totalDays} days in school year`}
                        color="purple"
                        icon={Layers}
                      />
                    </div>
                  ))}
              </article>
              <article className="p-card">
                <div className="p-card-title">
                  <h2>Terms / Semesters ({yearTerms.length})</h2>
                  <button onClick={() => openEditor("terms")}>
                    <Plus size={14} />
                    Add Term
                  </button>
                </div>
                {termCards()}
              </article>
            </aside>
          </div>
        </>
      ) : page === "Syllabus & Progress" ? (
        <>
          <PageHeader title="Syllabus & Progress" crumb="Syllabus & Progress">
            <Picker
              label="Syllabus term"
              value={term}
              onChange={setTerm}
              options={
                yearTerms.length
                  ? yearTerms.map((item) => item.name)
                  : ["Term 1", "Term 2"]
              }
            />
            <Picker
              label="Syllabus grade"
              value={grade}
              onChange={setGrade}
              options={grades}
            />
            <Picker
              label="Syllabus subject"
              value={subject}
              onChange={setSubject}
              options={subjectNames}
            />
            <button className="primary" onClick={() => openEditor("topics")}>
              <Plus size={16} />
              Add Syllabus
            </button>
          </PageHeader>
          <section className="p-metrics">
            <Metric
              title="Total Topics"
              value={topicRows.length}
              note="In This Subject"
              color="blue"
              icon={BookOpen}
            />
            <Metric
              title="Completed Topics"
              value={completed}
              note={`${topicRows.length ? ((completed / topicRows.length) * 100).toFixed(1) : 0}% Completed`}
              color="green"
              icon={CheckCircle2}
              percent={
                topicRows.length
                  ? Math.round((completed / topicRows.length) * 100)
                  : 0
              }
            />
            <Metric
              title="In Progress"
              value={inProgress}
              note={`${topicRows.length ? ((inProgress / topicRows.length) * 100).toFixed(1) : 0}% In Progress`}
              color="orange"
              icon={Clock3}
              percent={
                topicRows.length
                  ? Math.round((inProgress / topicRows.length) * 100)
                  : 0
              }
            />
            <Metric
              title="Not Started"
              value={notStarted}
              note={`${topicRows.length ? ((notStarted / topicRows.length) * 100).toFixed(1) : 0}% Not Started`}
              color="red"
              icon={CalendarDays}
              percent={
                topicRows.length
                  ? Math.round((notStarted / topicRows.length) * 100)
                  : 0
              }
            />
          </section>
          <div className="p-syllabus-layout">
            <article className="p-card p-tree-card">
              <div className="p-card-title">
                <h2>Syllabus Structure</h2>
                <button
                  className="secondary"
                  onClick={() => {
                    setExpanded(
                      expanded.length === chapters.length ? [] : chapters,
                    );
                    setAllTopics(true);
                  }}
                >
                  {expanded.length === chapters.length
                    ? "Collapse All"
                    : "Expand All"}
                </button>
              </div>
              <div className="p-syllabus-tree">
                {chapters.map((chapter, i) => {
                  const items = filteredTopics.filter(
                      (item) => item.chapter === chapter,
                    ),
                    percent = Math.round(
                      items.reduce((sum, item) => sum + item.progress, 0) /
                        Math.max(items.length, 1),
                    );
                  return (
                    <div key={chapter}>
                      <button
                        className="p-chapter-button"
                        onClick={() =>
                          setExpanded(
                            expanded.includes(chapter)
                              ? expanded.filter((value) => value !== chapter)
                              : [...expanded, chapter],
                          )
                        }
                      >
                        <ChevronRight
                          className={expanded.includes(chapter) ? "open" : ""}
                          size={14}
                        />
                        <span
                          className="p-tiny-icon"
                          style={{ background: palette[i] }}
                        >
                          <ClipboardList size={11} />
                        </span>
                        <strong>
                          {i + 1}. {chapter}
                        </strong>
                        <Pill text={`${percent}%`} />
                        <small>
                          {items.filter((item) => item.progress === 100).length}
                          /{items.length}
                        </small>
                      </button>
                      {expanded.includes(chapter) && (
                        <div className="p-topic-list">
                          {items
                            .slice(0, allTopics ? items.length : 5)
                            .map((item, j) => (
                              <button
                                key={item.id}
                                className={
                                  selectedTopic?.id === item.id
                                    ? "selected"
                                    : ""
                                }
                                onClick={() => setSelectedTopicId(item.id)}
                              >
                                <span
                                  className={`p-topic-icon ${item.progress === 100 ? "green" : item.progress === 0 ? "red" : "blue"}`}
                                >
                                  <ClipboardList size={11} />
                                </span>
                                <span>
                                  {i + 1}.{j + 1} {item.title}
                                </span>
                                <Pill text={`${item.progress}%`} />
                              </button>
                            ))}
                          {items.length > 5 && !allTopics && (
                            <button
                              className="p-more-topics"
                              onClick={() => setAllTopics(true)}
                            >
                              Show {items.length - 5} more topics
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                {!filteredTopics.length && (
                  <div className="p-empty">
                    <BookOpen size={28} />
                    <p>No syllabus topics for these filters.</p>
                    <button
                      className="text-button"
                      onClick={() => openEditor("topics")}
                    >
                      Create a syllabus topic
                    </button>
                  </div>
                )}
              </div>
            </article>
            <article className="p-card p-topic-details">
              <div className="p-card-title">
                <h2>Topic Details</h2>
                {selectedTopic && (
                  <button
                    className="secondary"
                    onClick={() => openEditor("topics", selectedTopic)}
                  >
                    <Pencil size={13} />
                    Edit Topic
                  </button>
                )}
              </div>
              {selectedTopic ? (
                <>
                  <h3>
                    <span className="p-tiny-icon blue">
                      <ClipboardList size={14} />
                    </span>
                    {selectedTopic.title}
                  </h3>
                  <dl className="p-topic-facts">
                    <div>
                      <dt>Chapter</dt>
                      <dd>{selectedTopic.chapter}</dd>
                    </div>
                    <div>
                      <dt>Learning Objectives</dt>
                      <dd>
                        <ul>
                          {selectedTopic.objectives
                            .split("\n")
                            .filter(Boolean)
                            .map((value) => (
                              <li key={value}>{value}</li>
                            ))}
                        </ul>
                      </dd>
                    </div>
                    <div>
                      <dt>Planned Periods</dt>
                      <dd>{selectedTopic.periods} periods</dd>
                    </div>
                    <div>
                      <dt>Start Date</dt>
                      <dd>{dateLabel(selectedTopic.start)}</dd>
                    </div>
                    <div>
                      <dt>End Date</dt>
                      <dd>{dateLabel(selectedTopic.end)}</dd>
                    </div>
                    <div>
                      <dt>Status</dt>
                      <dd>
                        <Pill text={topicStatus(selectedTopic.progress)} />
                      </dd>
                    </div>
                  </dl>
                  <div className="p-topic-progress">
                    <label htmlFor="topic-progress">
                      Completion <strong>{selectedTopic.progress}%</strong>
                    </label>
                    <input
                      id="topic-progress"
                      aria-label="Topic completion"
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={selectedTopic.progress}
                      onChange={(event) =>
                        setData((previous) => ({
                          ...previous,
                          topics: previous.topics.map((item) =>
                            item.id === selectedTopic.id
                              ? {
                                  ...item,
                                  progress: Number(event.target.value),
                                }
                              : item,
                          ),
                        }))
                      }
                    />
                  </div>
                  <div className="p-materials">
                    <h4>Teaching Materials</h4>
                    <div>
                      {data.materials
                        .filter((item) => item.topicId === selectedTopic.id)
                        .map((item) => (
                          <a
                            key={item.id}
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <FileText size={22} />
                            <span>
                              <strong>{item.title}</strong>
                              <small>
                                {item.type} <ExternalLink size={10} />
                              </small>
                            </span>
                          </a>
                        ))}
                      <button
                        className="secondary"
                        onClick={() => openEditor("materials")}
                      >
                        <Plus size={13} />
                        Add Material
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-empty">
                  Select or add a topic to see its details.
                </div>
              )}
            </article>
            <div className="p-syllabus-side">
              <article className="p-card">
                <div className="p-card-title">
                  <h2>Teaching Progress</h2>
                  <span className="p-line-legend">
                    <i />
                    Planned <i />
                    Completed
                  </span>
                  <Picker
                    label="Progress chart period"
                    value={progressPeriod}
                    onChange={setProgressPeriod}
                    options={["Weekly", "Monthly"]}
                  />
                </div>
                <LineChart
                  values={
                    progressPeriod === "Weekly"
                      ? [10, 20, 28, 36, 45, 54, 64, 70, 76, 83, 91, 98]
                      : [20, 35, 52, 70, 85, 100]
                  }
                  second={(progressPeriod === "Weekly"
                    ? [6, 14, 20, 25, 32, 38, 43, 48, 54, 61, 68, 75]
                    : [12, 23, 35, 49, 62, 75]
                  ).map((value) => Math.round((value / 75) * average))}
                  labels={
                    progressPeriod === "Weekly"
                      ? Array.from({ length: 12 }, (_, i) => `W${i + 1}`)
                      : ["Aug", "Sep", "Oct", "Nov", "Dec", "Jan"]
                  }
                  id="syllabus-progress"
                />
              </article>
              <article className="p-card">
                <div className="p-card-title">
                  <h2>Recent Lessons</h2>
                  <button onClick={() => onNavigate("Lesson Plans")}>
                    View All
                  </button>
                </div>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        {["DATE", "TOPIC", "TEACHER", "STATUS", "ACTIONS"].map(
                          (value) => (
                            <th key={value}>{value}</th>
                          ),
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {(academic["Lesson Plans"] || [])
                        .slice(0, 4)
                        .map((item) => (
                          <tr key={item.id}>
                            <td>{dateLabel(item.date)}</td>
                            <td>{item.name}</td>
                            <td>{item.teacher}</td>
                            <td>
                              <Pill text={item.status} />
                            </td>
                            <td>
                              <button
                                aria-label={`View lesson ${item.name}`}
                                onClick={() => onNavigate("Lesson Plans")}
                              >
                                <Eye size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </article>
            </div>
          </div>
        </>
      ) : (
        <>
          <PageHeader title="Academic Calendar" crumb="Academic Calendar">
            <Picker
              label="Calendar academic year"
              value={selectedYear?.name || year}
              onChange={(value) => {
                const match = data.years.find((item) => item.name === value);
                if (match) goYear(match);
              }}
              options={data.years.map((item) => item.name)}
            />
            <div className="p-view-switch">
              {["Month", "Week", "List"].map((value) => (
                <button
                  className={calendarView === value ? "active" : ""}
                  key={value}
                  onClick={() => setCalendarView(value)}
                >
                  {value}
                </button>
              ))}
            </div>
            <button className="primary" onClick={() => openEditor("events")}>
              <Plus size={16} />
              Add Event
            </button>
          </PageHeader>
          <section className="p-metrics p-five-metrics">
            <Metric
              title="Total Days"
              value={totalDays}
              note="In Academic Year"
              color="red"
              icon={CalendarDays}
            />
            <Metric
              title="Teaching Days"
              value="180"
              note="Planned school days"
              color="green"
              icon={BookOpen}
            />
            <Metric
              title="Examination Days"
              value={
                yearEvents.filter((item) => item.type === "Examination").length
              }
              note="Scheduled assessments"
              color="purple"
              icon={Layers}
            />
            <Metric
              title="Holidays"
              value={
                yearEvents.filter((item) => item.type === "Holiday").length
              }
              note="Scheduled holidays"
              color="orange"
              icon={CalendarDays}
            />
            <Metric
              title="Events"
              value={yearEvents.length}
              note="School Events"
              color="blue"
              icon={GraduationCap}
            />
          </section>
          <div className="p-calendar-layout">
            <aside className="p-calendar-left">
              <article className="p-card">
                <h2>Event Types</h2>
                {eventTypes.map((type) => (
                  <label key={type}>
                    <input
                      type="checkbox"
                      checked={enabledTypes.includes(type)}
                      onChange={(event) =>
                        setEnabledTypes(
                          event.target.checked
                            ? [...enabledTypes, type]
                            : enabledTypes.filter((value) => value !== type),
                        )
                      }
                    />
                    <span className={`p-event-type-dot ${eventColors[type]}`} />
                    {type}
                  </label>
                ))}
              </article>
              <article className="p-card">
                <h2>Quick Statistics</h2>
                <dl>
                  <div>
                    <dt>Start Date</dt>
                    <dd>
                      {selectedYear ? dateLabel(selectedYear.start) : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt>End Date</dt>
                    <dd>{selectedYear ? dateLabel(selectedYear.end) : "—"}</dd>
                  </div>
                  <div>
                    <dt>Total Weeks</dt>
                    <dd>{Math.ceil(totalDays / 7)} weeks</dd>
                  </div>
                  <div>
                    <dt>Total Days</dt>
                    <dd>{totalDays} days</dd>
                  </div>
                </dl>
              </article>
            </aside>
            <article className="p-card p-calendar-main">
              <div className="p-calendar-toolbar">
                <div>
                  <button
                    aria-label="Previous calendar period"
                    onClick={() => calendarMove(-1)}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    aria-label="Next calendar period"
                    onClick={() => calendarMove(1)}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
                <h2>
                  {monthDate.toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}
                </h2>
                <button
                  className="secondary"
                  onClick={() => setCalendarDate(today)}
                >
                  Today
                </button>
              </div>
              {calendarView === "List" ? (
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        {["DATE", "EVENT", "TYPE", "TIME", "ACTIONS"].map(
                          (value) => (
                            <th key={value}>{value}</th>
                          ),
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {shownEvents.map((item) => (
                        <tr key={item.id}>
                          <td>{dateLabel(item.date)}</td>
                          <td>
                            <button
                              className="name-cell"
                              onClick={() => selectEvent(item)}
                            >
                              {item.title}
                            </button>
                          </td>
                          <td>
                            <span
                              className={`p-pill ${eventColors[item.type]}`}
                            >
                              {item.type}
                            </span>
                          </td>
                          <td>{item.time}</td>
                          <td>
                            {actionButtons("events", item, () =>
                              selectEvent(item),
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!shownEvents.length && (
                    <div className="p-empty">
                      No events match these filters.
                    </div>
                  )}
                </div>
              ) : (
                <div
                  className={`p-calendar-grid ${calendarView === "Week" ? "week" : ""}`}
                >
                  <div className="p-calendar-weekdays">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                      (day) => (
                        <strong key={day}>{day}</strong>
                      ),
                    )}
                  </div>
                  <div className="p-calendar-days">
                    {Array.from(
                      { length: calendarView === "Week" ? 7 : 42 },
                      (_, i) => {
                        const date = new Date(monthStart);
                        if (calendarView === "Week") {
                          date.setTime(monthDate.getTime());
                          date.setDate(date.getDate() - date.getDay() + i);
                        } else date.setDate(1 - monthStart.getDay() + i);
                        const dateValue = iso(date),
                          items = calendarEvents.filter(
                            (item) =>
                              item.date <= dateValue &&
                              item.endDate >= dateValue,
                          );
                        return (
                          <div
                            key={dateValue}
                            className={`${date.getMonth() !== monthDate.getMonth() ? "outside" : ""} ${dateValue === today ? "today" : ""}`}
                          >
                            <button
                              className="p-calendar-day-number"
                              aria-label={`Add event on ${dateValue}`}
                              onClick={() => {
                                openEditor("events");
                                setForm((previous) => ({
                                  ...previous,
                                  date: dateValue,
                                  endDate: dateValue,
                                }));
                              }}
                            >
                              {date.getDate()}
                            </button>
                            {items
                              .slice(0, calendarView === "Week" ? 10 : 2)
                              .map((item) => (
                                <button
                                  key={item.id}
                                  className={`p-calendar-event ${eventColors[item.type]}`}
                                  onClick={() => selectEvent(item)}
                                >
                                  {calendarView === "Week" && (
                                    <small>{item.time}</small>
                                  )}
                                  {item.title}
                                </button>
                              ))}
                            {items.length > 2 && calendarView !== "Week" && (
                              <button
                                className="p-calendar-more"
                                onClick={() => setInfo(`date:${dateValue}`)}
                              >
                                +{items.length - 2} more
                              </button>
                            )}
                          </div>
                        );
                      },
                    )}
                  </div>
                </div>
              )}
            </article>
            <aside className="p-calendar-right p-card">
              <div className="p-card-title">
                <h2>Upcoming Events</h2>
                <button onClick={() => setCalendarView("List")}>
                  View All
                </button>
              </div>
              {eventRows(shownEvents, 8)}
            </aside>
          </div>
        </>
      )}
      <footer className="p-footer">
        <span>
          <i />
          {saveStatus}
        </span>
        <span>Demonstration school data · {selectedYear?.name || year}</span>
      </footer>
      {(editor || info || detail || deleteItem) && (
        <div
          className="modal-backdrop"
          onClick={() => {
            setEditor(null);
            setInfo(null);
            setDetail(null);
            setDeleteItem(null);
          }}
        >
          <section
            className={`modal p-modal ${info ? "wide" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-label={
              editor
                ? `${editor.id ? "Edit" : "Add"} ${editor.kind === "years" ? "Academic Year" : editor.kind === "terms" ? "Term" : editor.kind === "subjects" ? "Subject" : editor.kind === "topics" ? "Syllabus Topic" : editor.kind === "events" ? "Event" : "Teaching Material"}`
                : detail
                  ? "Academic Event Details"
                  : deleteItem
                    ? "Remove Record"
                    : info === "terms"
                      ? "Terms & Semesters"
                      : info === "subjects"
                        ? "Subject Directory"
                        : info === "grades"
                          ? "Grade Levels"
                          : info === "schedule"
                            ? "Today’s Schedule"
                            : info === "notices"
                              ? "Important Notices"
                              : info === "attendance"
                                ? "Attendance Records"
                                : info === "year-actions"
                                  ? "Academic Year Actions"
                                  : "School Workspace"
            }
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <span className="eyebrow">
                  EDUMANAGE · {selectedYear?.name || year}
                </span>
                <h2>
                  {editor
                    ? `${editor.id ? "Edit" : "Add"} ${editor.kind === "years" ? "Academic Year" : editor.kind === "terms" ? "Term" : editor.kind === "subjects" ? "Subject" : editor.kind === "topics" ? "Syllabus Topic" : editor.kind === "events" ? "Event" : "Teaching Material"}`
                    : detail
                      ? detail.title
                      : deleteItem
                        ? "Remove this record?"
                        : info === "terms"
                          ? "Terms & Semesters"
                          : info === "subjects"
                            ? "Subject Directory"
                            : info === "grades"
                              ? "Grade Levels"
                              : info === "schedule"
                                ? "Today’s Schedule"
                                : info === "notices"
                                  ? "Important Notices"
                                  : info === "attendance"
                                    ? "Attendance Records"
                                    : info === "year-actions"
                                      ? "Academic Year Actions"
                                      : "School Workspace"}
                </h2>
              </div>
              <button
                className="icon-button"
                aria-label="Close dialog"
                onClick={() => {
                  setEditor(null);
                  setInfo(null);
                  setDetail(null);
                  setDeleteItem(null);
                }}
              >
                <X size={20} />
              </button>
            </div>
            {editor ? (
              <form onSubmit={save}>
                <div className="modal-body form-grid">
                  {editor.kind === "years" ? (
                    <>
                      {field("Academic year name", "name")}
                      {field("Status", "status", [
                        "Active",
                        "Completed",
                        "Upcoming",
                      ])}
                      {field("Start date", "start", undefined, "date")}
                      {field("End date", "end", undefined, "date")}
                      {field(
                        "Enrolled students",
                        "students",
                        undefined,
                        "number",
                      )}
                      <label className="span-2">
                        Description
                        <textarea
                          rows={3}
                          value={form.description || ""}
                          onChange={(event) =>
                            setForm({
                              ...form,
                              description: event.target.value,
                            })
                          }
                        />
                      </label>
                    </>
                  ) : editor.kind === "terms" ? (
                    <>
                      {field("Term name", "name")}
                      {field("Status", "status", [
                        "Upcoming",
                        "Ongoing",
                        "Completed",
                      ])}
                      {field("Start date", "start", undefined, "date")}
                      {field("End date", "end", undefined, "date")}
                      {field("Students", "students", undefined, "number")}
                      {field("Weeks", "weeks", undefined, "number")}
                      {field("Classes", "classes", undefined, "number")}
                    </>
                  ) : editor.kind === "subjects" ? (
                    <>
                      {field("Subject name", "name")}
                      {field("Subject code", "code")}
                      {field("Grade", "grade", grades)}
                      {field("Teacher", "teacher")}
                    </>
                  ) : editor.kind === "topics" ? (
                    <>
                      {field("Topic title", "title")}
                      {field("Chapter", "chapter")}
                      {field("Subject", "subject", subjectNames)}
                      {field("Grade", "grade", grades)}
                      {field(
                        "Term",
                        "term",
                        yearTerms.length
                          ? yearTerms.map((item) => item.name)
                          : ["Term 1", "Term 2"],
                      )}
                      {field("Planned periods", "periods", undefined, "number")}
                      {field("Start date", "start", undefined, "date")}
                      {field("End date", "end", undefined, "date")}
                      {field(
                        "Completion percent",
                        "progress",
                        undefined,
                        "number",
                      )}
                      <label className="span-2">
                        Learning objectives (one per line)
                        <textarea
                          rows={4}
                          value={form.objectives || ""}
                          onChange={(event) =>
                            setForm({ ...form, objectives: event.target.value })
                          }
                        />
                      </label>
                    </>
                  ) : editor.kind === "events" ? (
                    <>
                      {field("Event title", "title")}
                      {field("Event type", "type", eventTypes)}
                      {field("Start date", "date", undefined, "date")}
                      {field("End date", "endDate", undefined, "date")}
                      {field("Time", "time")}
                      <label className="span-2">
                        Description
                        <textarea
                          rows={3}
                          value={form.description || ""}
                          onChange={(event) =>
                            setForm({
                              ...form,
                              description: event.target.value,
                            })
                          }
                        />
                      </label>
                    </>
                  ) : (
                    <>
                      {field("Material title", "title")}
                      {field("Material type", "type", [
                        "Lesson Guide",
                        "Worksheet",
                        "Video",
                        "Reference",
                      ])}
                      {field("Material URL", "url", undefined, "url")}
                    </>
                  )}
                  <p className="form-note span-2">
                    <CheckCircle2 size={14} />
                    Saved to your school planning workspace.
                  </p>
                </div>
                <div className="modal-footer">
                  <button
                    className="secondary"
                    type="button"
                    onClick={() => setEditor(null)}
                  >
                    Cancel
                  </button>
                  <button className="primary" type="submit">
                    <Check size={15} />
                    {editor.id ? "Save Changes" : "Create Record"}
                  </button>
                </div>
              </form>
            ) : deleteItem ? (
              <>
                <div className="modal-body">
                  <p>
                    Remove <strong>{deleteItem.name}</strong> from your planning
                    workspace?
                  </p>
                </div>
                <div className="modal-footer">
                  <button
                    className="secondary"
                    onClick={() => setDeleteItem(null)}
                  >
                    Cancel
                  </button>
                  <button className="danger-button" onClick={remove}>
                    Remove Record
                  </button>
                </div>
              </>
            ) : detail ? (
              <>
                <div className="modal-body">
                  <div className="detail-status">
                    <span className={`p-pill ${eventColors[detail.type]}`}>
                      {detail.type}
                    </span>
                    <span>{dateLabel(detail.date)}</span>
                  </div>
                  <p>{detail.description || "School academic event."}</p>
                  <dl className="detail-grid" style={{ marginTop: 24 }}>
                    <div>
                      <dt>Start Date</dt>
                      <dd>{dateLabel(detail.date)}</dd>
                    </div>
                    <div>
                      <dt>End Date</dt>
                      <dd>{dateLabel(detail.endDate)}</dd>
                    </div>
                    <div>
                      <dt>Time</dt>
                      <dd>{detail.time}</dd>
                    </div>
                  </dl>
                </div>
                <div className="modal-footer">
                  <button
                    className="secondary"
                    onClick={() => {
                      setDetail(null);
                      setDeleteItem({
                        kind: "events",
                        id: detail.id,
                        name: detail.title,
                      });
                    }}
                  >
                    <Trash2 size={14} />
                    Remove
                  </button>
                  <button
                    className="primary"
                    onClick={() => openEditor("events", detail)}
                  >
                    <Pencil size={14} />
                    Edit Event
                  </button>
                </div>
              </>
            ) : info === "terms" ? (
              <>
                <div className="directory-toolbar">
                  <span>{selectedYear?.name}</span>
                  <button
                    className="primary"
                    onClick={() => openEditor("terms")}
                  >
                    <Plus size={14} />
                    Add Term
                  </button>
                </div>
                {termCards()}
              </>
            ) : info === "subjects" ? (
              <>
                <div className="directory-toolbar">
                  <div className="table-search">
                    <Search size={14} />
                    <input
                      aria-label="Search subject directory"
                      placeholder="Search subject or code..."
                      value={localQuery}
                      onChange={(event) => setLocalQuery(event.target.value)}
                    />
                  </div>
                  <button
                    className="primary"
                    onClick={() => openEditor("subjects")}
                  >
                    <Plus size={14} />
                    Add Subject
                  </button>
                </div>
                <div className="table-scroll p-directory-table">
                  <table>
                    <thead>
                      <tr>
                        {["SUBJECT", "CODE", "GRADE", "TEACHER", "ACTIONS"].map(
                          (value) => (
                            <th key={value}>{value}</th>
                          ),
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {data.subjects
                        .filter((item) =>
                          `${item.name} ${item.code} ${item.grade}`
                            .toLowerCase()
                            .includes(localQuery.toLowerCase()),
                        )
                        .map((item) => (
                          <tr key={item.id}>
                            <td>{item.name}</td>
                            <td>{item.code}</td>
                            <td>{item.grade}</td>
                            <td>{item.teacher}</td>
                            <td>
                              <button
                                aria-label={`Edit subject ${item.code}`}
                                onClick={() => openEditor("subjects", item)}
                              >
                                <Pencil size={13} />
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : info === "grades" ? (
              <div className="p-grade-grid">
                {grades.map((value) => (
                  <button
                    key={value}
                    onClick={() => {
                      setGrade(value);
                      setInfo(null);
                      onNavigate("Syllabus & Progress");
                    }}
                  >
                    <BookOpen size={22} />
                    <strong>{value}</strong>
                    <span>
                      {
                        data.subjects.filter((item) => item.grade === value)
                          .length
                      }{" "}
                      subjects
                    </span>
                  </button>
                ))}
              </div>
            ) : info === "schedule" ? (
              <div className="p-schedule p-full-schedule">
                {schedule.map(([time, title, description], i) => (
                  <button
                    key={time}
                    onClick={() => {
                      setInfo(null);
                      onNavigate("Academic Calendar");
                    }}
                  >
                    <time>{time}</time>
                    <i style={{ background: palette[i] }} />
                    <span>
                      <strong>{title}</strong>
                      <small>{description}</small>
                    </span>
                    <ChevronRight size={15} />
                  </button>
                ))}
              </div>
            ) : info === "notices" ? (
              <div className="p-notice-directory">
                {noticeRows.map((item) => (
                  <article key={item.title}>
                    <Pill text={item.priority} />
                    <h3>{item.title}</h3>
                    <p>{item.text}</p>
                    <small>{dateLabel(item.date)}</small>
                  </article>
                ))}
              </div>
            ) : info === "attendance" ? (
              <>
                <div className="directory-toolbar">
                  <p>Saved attendance records</p>
                  <button
                    className="primary"
                    onClick={() => onSchoolCommand("Attendance")}
                  >
                    Record Attendance
                  </button>
                </div>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>STUDENT</th>
                        <th>DATE</th>
                        <th>STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {schoolAttendance.map((item) => (
                        <tr key={item.id}>
                          <td>
                            {schoolStudents.find(
                              (student) => student.id === item.studentId,
                            )?.name || item.studentId}
                          </td>
                          <td>{dateLabel(item.date)}</td>
                          <td>
                            <Pill text={item.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!schoolAttendance.length && (
                    <div className="p-empty">
                      No attendance has been recorded yet.
                    </div>
                  )}
                </div>
              </>
            ) : info === "year-actions" ? (
              <div className="p-year-action-list">
                <button
                  onClick={() => {
                    setData((previous) => ({
                      ...previous,
                      years: previous.years.map((item) => ({
                        ...item,
                        status:
                          item.id === selectedYear.id
                            ? "Active"
                            : item.status === "Active"
                              ? "Completed"
                              : item.status,
                      })),
                    }));
                    setInfo(null);
                    notify("Active academic year updated");
                  }}
                >
                  <CheckCircle2 size={20} />
                  Set {selectedYear?.name} as active year
                </button>
                <button onClick={() => openEditor("years", selectedYear)}>
                  <Pencil size={20} />
                  Edit academic year details
                </button>
                <button onClick={() => openEditor("terms")}>
                  <Plus size={20} />
                  Add term or semester
                </button>
              </div>
            ) : info?.startsWith("date:") ? (
              <div className="modal-body">
                {eventRows(
                  calendarEvents.filter(
                    (item) =>
                      item.date <= info.slice(5) &&
                      item.endDate >= info.slice(5),
                  ),
                  100,
                )}
              </div>
            ) : (
              <div className="modal-body">
                <p>
                  Use the quick actions to create subjects and syllabus topics,
                  manage academic years and terms, and plan academic events.
                  Changes are saved to your school workspace.
                </p>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
