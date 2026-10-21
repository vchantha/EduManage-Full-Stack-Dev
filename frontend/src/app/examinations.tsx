"use client";
import { useEffect, useRef, useState } from "react";
import {
  FileText,
  Users,
  ChartNoAxesColumnIncreasing,
  Trophy,
  CalendarDays,
  Plus,
  ChevronDown,
  MoreVertical,
  ClipboardList,
  BookOpen,
  Settings,
  Zap,
  ArrowUp,
  Search,
  X,
  Download,
  Pencil,
  Check,
  ArrowLeft,
  Clock,
  Eye,
} from "lucide-react";
import {
  Exam,
  ExamData,
  ExamSubject,
  ExamSection,
  Result,
  initialExaminations,
  classNames,
  classReference,
  subjectColors,
  subjectReference,
  dateText,
  summarize,
} from "./examination-data";
type Dialog = {
  kind: "exam" | "grade" | "subject" | "details" | "class" | "report";
  item?: Exam | Result | ExamSubject;
  className?: string;
} | null;
const today = "2026-10-21";
const mean = (values: number[]) =>
  values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0;
const decimal = (value: number) =>
  Number(value.toFixed(1)).toLocaleString("en-US");
function Status({ value }: { value: string }) {
  return <span className={`ex-status ${value.toLowerCase()}`}>{value}</span>;
}
function Panel({
  title,
  icon: Icon,
  children,
  action,
  className = "",
}: {
  title: string;
  icon: typeof FileText;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`ex-panel ${className}`}>
      <div className="ex-panel-head">
        <h2>
          <Icon size={20} />
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}
function csvFile(filename: string, rows: (string | number)[][]) {
  const csv = rows
    .map((row) =>
      row
        .map((value) => {
          const text = String(value);
          return (
            '"' +
            (/^[=+@\-\t\r]/.test(text) ? "'" : "") +
            text.replaceAll('"', '""') +
            '"'
          );
        })
        .join(","),
    )
    .join("\r\n");
  const url = URL.createObjectURL(
    new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
export default function Examinations({
  year,
  term,
  section,
  onSection,
  query,
  notify,
  onCalendar,
}: {
  year: string;
  term: string;
  section: ExamSection;
  onSection: (section: ExamSection) => void;
  query: string;
  notify: (message: string) => void;
  onCalendar: () => void;
}) {
  const [data, setData] = useState<ExamData>(initialExaminations),
    [ready, setReady] = useState(false),
    [saveStatus, setSaveStatus] = useState("Loading examinations..."),
    [dialog, setDialog] = useState<Dialog>(null),
    [form, setForm] = useState<Record<string, string>>({}),
    [localQuery, setLocalQuery] = useState(""),
    [classFilter, setClassFilter] = useState("All Classes"),
    [chartYear, setChartYear] = useState(year),
    [gradePeriod, setGradePeriod] = useState("This Term"),
    [subjectPeriod, setSubjectPeriod] = useState("This Term"),
    [classPeriod, setClassPeriod] = useState("This Term"),
    [allExams, setAllExams] = useState(false),
    [allUpcoming, setAllUpcoming] = useState(false),
    [menu, setMenu] = useState(false),
    [confirmDelete, setConfirmDelete] = useState(false),
    [error, setError] = useState("");
  const csrf = useRef(""),
    queue = useRef(Promise.resolve()),
    dataRef = useRef(data),
    failed = useRef<ExamData | null>(null),
    live = useRef(true);
  useEffect(() => {
    live.current = true;
    fetch("/api/examinations")
      .then(async (r) => {
        if (!r.ok) throw Error("Could not load examinations");
        const payload = await r.json();
        if (live.current) {
          if (payload.data) {
            setData(payload.data);
            dataRef.current = payload.data;
          }
          csrf.current = payload.csrfToken;
          setReady(true);
          setSaveStatus("All changes saved");
        }
      })
      .catch(() => {
        if (live.current)
          setSaveStatus("Connection unavailable · refresh to reconnect");
      });
    return () => {
      live.current = false;
    };
  }, []);
  useEffect(() => {
    setChartYear(year);
  }, [year]);
  useEffect(() => {
    setLocalQuery("");
    setDialog(null);
    setMenu(false);
    setError("");
  }, [section]);
  useEffect(() => {
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDialog(null);
        setMenu(false);
        setError("");
      }
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);
  const persist = (next: ExamData) => {
    failed.current = null;
    setSaveStatus("Saving changes...");
    queue.current = queue.current
      .catch(() => {})
      .then(async () => {
        try {
          const response = await fetch("/api/examinations", {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "X-CSRFToken": csrf.current,
            },
            body: JSON.stringify({ data: next }),
          });
          if (!response.ok) {
            const body = await response.json();
            throw Error(body.error || "Could not save changes");
          }
          if (live.current) setSaveStatus("All changes saved");
        } catch (e) {
          failed.current = next;
          if (live.current) {
            setSaveStatus("Changes not saved · retry");
            notify(
              e instanceof Error ? e.message : "Could not save examinations",
            );
          }
        }
      });
  };
  const update = (next: ExamData) => {
    if (!ready) {
      notify("Wait for the examinations connection");
      return;
    }
    dataRef.current = next;
    setData(next);
    persist(next);
  };
  const exams = data.exams.filter((e) => e.year === year && e.term === term),
    results = data.results.filter((r) => exams.some((e) => e.id === r.examId));
  const search = (query || localQuery).toLowerCase();
  const listed = exams.filter(
    (e) =>
      `${e.name} ${e.className} ${e.subjects} ${e.status}`
        .toLowerCase()
        .includes(search) &&
      (classFilter === "All Classes" || e.className === classFilter),
  );
  const graded = exams.filter((e) => e.submissions > 0),
    totalSubmissions = exams.reduce((s, e) => s + e.submissions, 0),
    passRate = mean(graded.map((e) => e.passRate));
  const classes = [
    ...new Set([...classNames, ...exams.map((e) => e.className)]),
  ];
  const enrolled = classes.reduce((sum, name) => {
    const current = exams.filter((e) => e.className === name);
    return (
      sum + (current.length ? Math.max(...current.map((e) => e.students)) : 0)
    );
  }, 0);
  const scheduled = listed
    .filter((e) => e.status === "Scheduled")
    .sort((a, b) => a.date.localeCompare(b.date));
  const tops = Object.values(
    results.reduce(
      (groups, r) => {
        const key = r.studentId.toLowerCase();
        if (!groups[key]) groups[key] = { student: r, scores: [] };
        groups[key].scores.push(r.score);
        return groups;
      },
      {} as Record<string, { student: Result; scores: number[] }>,
    ),
  )
    .map((item) => ({ ...item.student, score: mean(item.scores) }))
    .sort((a, b) => b.score - a.score);
  const classStats = (period: string) =>
    classes
      .map((name) => {
        const selected = data.exams.filter(
          (e) =>
            e.year === year &&
            (period === "This Year" || e.term === term) &&
            e.className === name,
        );
        const entered = data.results.filter((r) =>
          selected.some((e) => e.id === r.examId && e.submissions > 0 && e.submissions === data.results.filter(mark => mark.examId === e.id).length),
        );
        const sample = classReference.find((c) => c.name === name);
        const calculated = summarize(entered, data.subjects);
        return {
          name,
          students: selected.length
            ? Math.max(...selected.map((e) => e.students))
            : 0,
          average: entered.length
            ? calculated.average
            : graded.some((e) => e.className === name)
              ? sample?.average ||
                mean(
                  selected.filter((e) => e.submissions).map((e) => e.average),
                )
              : 0,
          pass: entered.length
            ? calculated.passRate
            : graded.some((e) => e.className === name)
              ? sample?.pass ||
                mean(
                  selected.filter((e) => e.submissions).map((e) => e.passRate),
                )
              : 0,
          recorded: entered.length,
        };
      })
      .filter((c) => c.students > 0);
  const open = (
    kind: NonNullable<Dialog>["kind"],
    item?: Exam | Result | ExamSubject,
    className?: string,
  ) => {
    if (!ready) {
      notify("Wait for the examinations connection");
      return;
    }
    setError("");
    setConfirmDelete(false);
    setMenu(false);
    setDialog({ kind, item, className });
    const first = exams.find((e) => e.status === "Grading") || exams[0];
    let defaults: Record<string, string> = {
      name: "",
      subjects: "Mathematics",
      className: className || "Grade 10",
      date: today,
      time: "08:00 - 10:00",
      year,
      term,
      status: "Draft",
      students: "30",
      examId: first?.id || "",
      studentId: "",
      studentName: "",
      subject: data.subjects[0]?.name || "",
      score: "",
      code: "",
      passMark: "50",
    };
    if (item)
      defaults = {
        ...defaults,
        ...Object.fromEntries(
          Object.entries(item).map(([key, value]) => [key, String(value)]),
        ),
      };
    setForm(defaults);
  };
  const change = (key: string, value: string) =>
    setForm((previous) => ({ ...previous, [key]: value }));
  const recalculate = (next: ExamData, id: string) => {
    const recorded = next.results.filter((r) => r.examId === id);
    return {
      ...next,
      exams: next.exams.map((e) =>
        e.id === id
          ? {
              ...e,
              ...summarize(recorded, next.subjects),
              status:
                e.status === "Draft" || e.status === "Scheduled"
                  ? "Grading"
                  : e.status,
            }
          : e,
      ),
    };
  };
  const save = (event: React.FormEvent) => {
    event.preventDefault();
    if (!dialog || !ready) return;
    let next = dataRef.current;
    const id = dialog.item?.id || crypto.randomUUID();
    if (dialog.kind === "exam") {
      if (!form.name.trim() || !form.subjects.trim() || !form.date) {
        setError("Enter the exam name, subjects, and date.");
        return;
      }
      const exam: Exam = {
        id,
        name: form.name.trim(),
        subjects: form.subjects.trim(),
        className: form.className,
        date: form.date,
        time: form.time,
        year,
        term,
        status: form.status,
        students: Number(form.students),
        submissions: (dialog.item as Exam)?.submissions || 0,
        average: (dialog.item as Exam)?.average || 0,
        passRate: (dialog.item as Exam)?.passRate || 0,
      };
      if (
        !Number.isInteger(exam.students) ||
        exam.students < 0 ||
        exam.students > 100000
      ) {
        setError("Enter a whole student count from 0 to 100,000.");
        return;
      }
      if (
        next.results.some(
          (r) => r.examId === id && r.className !== exam.className,
        )
      ) {
        setError(
          "This exam already has marks. Keep its class or create another exam.",
        );
        return;
      }
      next = {
        ...next,
        exams: dialog.item
          ? next.exams.map((e) => (e.id === id ? exam : e))
          : [exam, ...next.exams],
      };
    } else if (dialog.kind === "grade") {
      const exam = next.exams.find((e) => e.id === form.examId),
        score = Number(form.score);
      if (
        !exam ||
        !form.studentId.trim() ||
        !form.studentName.trim() ||
        !form.subject ||
        !form.score.trim() ||
        !Number.isFinite(score) ||
        score < 0 ||
        score > 100
      ) {
        setError(
          "Select an exam and subject, enter a student ID and name, and a mark from 0 to 100.",
        );
        return;
      }
      const duplicate = next.results.find(
        (r) =>
          r.examId === exam.id &&
          r.studentId.trim().toLowerCase() ===
            form.studentId.trim().toLowerCase() &&
          r.subject === form.subject,
      );
      const result: Result = {
        id: duplicate?.id || id,
        examId: exam.id,
        studentId: form.studentId.trim(),
        studentName: form.studentName.trim(),
        className: exam.className,
        subject: form.subject,
        score,
      };
      if (dialog.item && duplicate && duplicate.id !== dialog.item.id) {
        setError(
          "That student already has a mark for this exam and subject. Open that mark to edit it.",
        );
        return;
      }
      if (!duplicate && next.results.some((r) => r.id === id))
        next = { ...next, results: next.results.filter((r) => r.id !== id) };
      next = {
        ...next,
        results: next.results.some((r) => r.id === result.id)
          ? next.results.map((r) => (r.id === result.id ? result : r))
          : [...next.results, result],
      };
      next = recalculate(next, exam.id);
      if (dialog.item && (dialog.item as Result).examId !== exam.id)
        next = recalculate(next, (dialog.item as Result).examId);
    } else if (dialog.kind === "subject") {
      if (
        !form.name.trim() ||
        !form.passMark.trim() ||
        Number(form.passMark) < 0 ||
        Number(form.passMark) > 100
      ) {
        setError("Enter a subject name and a pass mark between 0 and 100.");
        return;
      }
      if (
        next.subjects.some(
          (s) =>
            s.id !== id &&
            s.name.toLowerCase() === form.name.trim().toLowerCase(),
        )
      ) {
        setError("This subject already exists.");
        return;
      }
      const subject: ExamSubject = {
        id,
        name: form.name.trim(),
        code: form.code.trim(),
        passMark: Number(form.passMark),
      };
      const old = (dialog.item as ExamSubject)?.name;
      next = {
        ...next,
        subjects: dialog.item
          ? next.subjects.map((s) => (s.id === id ? subject : s))
          : [...next.subjects, subject],
        results: next.results.map((r) =>
          r.subject === old ? { ...r, subject: subject.name } : r,
        ),
      };
      for (const examId of new Set(
        next.results
          .filter((r) => r.subject === subject.name)
          .map((r) => r.examId),
      ))
        next = recalculate(next, examId);
    } else return;
    update(next);
    setDialog(null);
    notify("Changes queued for saving");
  };
  const exportExams = () =>
    csvFile("edumanage-examinations.csv", [
      [
        "Exam",
        "Subjects",
        "Class",
        "Date",
        "Time",
        "Status",
        "Students",
        "Submissions",
        "Average",
        "Pass rate",
      ],
      ...listed.map((e) => [
        e.name,
        e.subjects,
        e.className,
        e.date,
        e.time,
        e.status,
        e.students,
        e.submissions,
        e.average,
        e.passRate,
      ]),
    ]);
  const exportGrades = () =>
    csvFile("edumanage-report-cards.csv", [
      [
        "Student ID",
        "Student",
        "Class",
        "Exam",
        "Subject",
        "Mark",
        "Pass mark",
        "Result",
      ],
      ...results
        .filter((r) => classFilter === "All Classes" || r.className === classFilter).filter((r) =>
          `${r.studentName} ${r.studentId} ${r.className}`
            .toLowerCase()
            .includes(search),
        )
        .map((r) => {
          const pass =
            data.subjects.find((s) => s.name === r.subject)?.passMark ?? 50;
          return [
            r.studentId,
            r.studentName,
            r.className,
            exams.find((e) => e.id === r.examId)?.name || "",
            r.subject,
            r.score,
            pass,
            r.score >= pass ? "Pass" : "Needs improvement",
          ];
        }),
    ]);
  const field = (
    key: string,
    label: string,
    options?: string[],
    type = "text",
  ) => (
    <label className="ex-field" key={key}>
      <span>{label}</span>
      {options ? (
        <select
          value={form[key] || ""}
          onChange={(e) => change(key, e.target.value)}
          required
        >
          <option value="" disabled>
            Select {label.toLowerCase()}
          </option>
          {options.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          value={form[key] ?? ""}
          onInput={(e) => change(key, e.currentTarget.value)}
          onChange={(e) => change(key, e.target.value)}
          required={[
            "name",
            "subjects",
            "date",
            "studentId",
            "studentName",
            "score",
            "passMark",
            "students",
          ].includes(key)}
          min={type === "number" ? 0 : undefined}
          max={["score", "passMark"].includes(key) ? 100 : undefined}
          step={["score", "passMark"].includes(key) ? "0.1" : undefined}
        />
      )}
    </label>
  );
  const examTable = (rows: Exam[]) => (
    <div className="ex-table-scroll">
      <table className="ex-table">
        <thead>
          <tr>
            {[
              "#",
              "Exam Name",
              "Subject(s)",
              "Class(es)",
              "Exam Date",
              "Status",
              "Actions",
            ].map((label) => (
              <th key={label}>{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((exam, i) => (
            <tr key={exam.id}>
              <td>{i + 1}</td>
              <td>
                <button
                  className="ex-text"
                  onClick={() => open("details", exam)}
                >
                  {exam.name}
                </button>
              </td>
              <td>{exam.subjects}</td>
              <td>{exam.className}</td>
              <td>{dateText(exam.date)}</td>
              <td>
                <Status value={exam.status} />
              </td>
              <td>
                <div className="ex-row-actions">
                  <button
                    onClick={() =>
                      open(exam.status === "Draft" ? "exam" : "details", exam)
                    }
                  >
                    {exam.status === "Draft" ? "Edit" : "View"}
                  </button>
                  <button
                    aria-label={`More actions for ${exam.name} ${exam.className}`}
                    onClick={() => open("details", exam)}
                  >
                    <MoreVertical size={16} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && (
        <p className="ex-empty">
          No examinations match the selected year, term, class, or search.
        </p>
      )}
    </div>
  );
  const gradeRows = results.filter(
    (r) =>
      `${r.studentName} ${r.studentId} ${r.className} ${r.subject}`
        .toLowerCase()
        .includes(search) &&
      (classFilter === "All Classes" || r.className === classFilter),
  );
  const trendExams = data.exams.filter(
      (e) =>
        e.year === chartYear &&
        e.term === term &&
        (classFilter === "All Classes" || e.className === classFilter) &&
        e.submissions > 0,
    ),
    months = ["Aug", "Sep", "Oct", "Nov", "Dec", "Jan"];
  const trend = months.map((label, i) => {
    const m = i === 5 ? 1 : i + 8;
    const group = trendExams.filter((e) => Number(e.date.slice(5, 7)) === m);
    return {
      label: `${label} ${i === 5 ? chartYear.slice(-4) : chartYear.slice(0, 4)}`,
      average: group.length ? mean(group.map((e) => e.average)) : null,
      pass: group.length ? mean(group.map((e) => e.passRate)) : null,
    };
  });
  const metricRows = [
    {
      icon: FileText,
      value: exams.length,
      title: "Total Exams",
      note: "This Academic Term",
      color: "orange",
    },
    {
      icon: Users,
      value: enrolled.toLocaleString("en-US"),
      title: "Students Enrolled",
      note: "Across selected classes",
      color: "purple",
    },
    {
      icon: ChartNoAxesColumnIncreasing,
      value: totalSubmissions.toLocaleString("en-US"),
      title: "Total Submissions",
      note: "All examinations",
      color: "green",
    },
    {
      icon: Trophy,
      value: `${decimal(passRate)}%`,
      title: "Average Pass Rate",
      note: "Across graded examinations",
      color: "blue",
    },
  ];
  const sectionTitle = section === "Examinations" ? "Examinations" : section;
  return (
    <div className="ex-workspace">
      <div className="ex-breadcrumb">
        Academics <span>›</span> {sectionTitle}
      </div>
      <div className="ex-heading">
        <div>
          <h1>{sectionTitle}</h1>
          <p>
            {section === "Examinations"
              ? "Manage exams, grades, and academic performance across all classes."
              : section === "Grade Management"
                ? "Enter and review student marks for each examination."
                : section === "Report Cards"
                  ? "Review recorded results and export student report cards."
                  : section === "Timetable"
                    ? "Plan examination dates, times, and classes."
                    : "Manage examination subjects and their passing marks."}
          </p>
        </div>
        <div className="ex-heading-actions">
          <button className="ex-secondary" onClick={onCalendar}>
            <CalendarDays size={18} />
            View Academic Calendar
          </button>
          <div className="ex-create">
            <button
              className="primary"
              onClick={() => open(section === "Subjects" ? "subject" : "exam")}
            >
              <Plus size={20} />
              {section === "Subjects" ? "Add Subject" : "Create Exam"}
            </button>
            <button
              className="primary ex-create-menu"
              aria-label="More examination actions"
              onClick={() => setMenu(!menu)}
            >
              <ChevronDown size={15} />
            </button>
            {menu && (
              <div className="ex-menu">
                {(
                  [
                    "Grade Management",
                    "Report Cards",
                    "Timetable",
                    "Subjects",
                  ] as ExamSection[]
                ).map((name) => (
                  <button
                    key={name}
                    onClick={() => {
                      onSection(name);
                      setMenu(false);
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
      {section === "Examinations" ? (
        <>
          <div className="ex-metrics">
            {metricRows.map(({ icon: Icon, ...metric }) => (
              <button
                className={`ex-metric ${metric.color}`}
                key={metric.title}
                onClick={() =>
                  metric.title === "Students Enrolled"
                    ? open("class", undefined)
                    : metric.title === "Average Pass Rate"
                      ? open("report")
                      : setAllExams(true)
                }
              >
                <span className="ex-metric-icon">
                  <Icon size={31} />
                </span>
                <span>
                  <strong>{metric.value}</strong>
                  <b>{metric.title}</b>
                  <small>{metric.note}</small>
                </span>
              </button>
            ))}
          </div>
          <div className="ex-charts">
            <Panel
              title="Examination Performance Trend"
              icon={ChartNoAxesColumnIncreasing}
              className="ex-trend-panel"
              action={
                <div className="ex-filters">
                  <select
                    aria-label="Trend academic year"
                    value={chartYear}
                    onChange={(e) => setChartYear(e.target.value)}
                  >
                    {[...new Set([year, ...data.exams.map((e) => e.year)])]
                      .sort()
                      .reverse()
                      .map((value) => (
                        <option key={value}>{value}</option>
                      ))}
                  </select>
                  <select
                    aria-label="Trend class"
                    value={classFilter}
                    onChange={(e) => setClassFilter(e.target.value)}
                  >
                    {["All Classes", ...classes].map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </div>
              }
            >
              <p className="ex-chart-note">
                Average score and pass rate across recent examinations
              </p>
              <TrendChart points={trend} />
              <div className="ex-chart-legend">
                <span>
                  <i />
                  Average Score
                </span>
                <span>
                  <i />
                  Pass Rate (%)
                </span>
              </div>
            </Panel>
            <Panel
              title="Performance by Grade"
              icon={BookOpen}
              action={
                <select
                  aria-label="Grade performance period"
                  value={gradePeriod}
                  onChange={(e) => setGradePeriod(e.target.value)}
                >
                  <option>This Term</option>
                  <option>This Year</option>
                </select>
              }
            >
              <div className="ex-grade-chart">
                <div className="ex-percent-axis">
                  {[100, 80, 60, 40, 20, 0].map((n) => (
                    <span key={n}>{n}%</span>
                  ))}
                </div>
                <div className="ex-grade-bars">
                  {classStats(gradePeriod).map((item, i) => (
                    <button
                      key={item.name}
                      onClick={() => open("class", undefined, item.name)}
                      aria-label={`${item.name} pass rate ${decimal(item.pass)} percent`}
                    >
                      <div>
                        <span
                          style={{
                            height: `${item.pass}%`,
                            background: `linear-gradient(${subjectColors[i % 6]},${subjectColors[i % 6]}99)`,
                          }}
                        >
                          <b>{decimal(item.pass)}%</b>
                        </span>
                      </div>
                      <small>{item.name}</small>
                    </button>
                  ))}
                </div>
              </div>
            </Panel>
            <Panel
              title="Subject Performance"
              icon={ClipboardList}
              action={
                <select
                  aria-label="Subject performance period"
                  value={subjectPeriod}
                  onChange={(e) => setSubjectPeriod(e.target.value)}
                >
                  <option>This Term</option>
                  <option>This Year</option>
                </select>
              }
            >
              <div className="ex-subject-bars">
                {data.subjects.slice(0, 6).map((s, i) => {
                  const entered = data.results.filter(
                    (r) =>
                      r.subject === s.name &&
                      data.exams.some(
                        (e) =>
                          e.id === r.examId &&
                          e.submissions === data.results.filter(mark => mark.examId === e.id).length &&
                          e.year === year &&
                          (subjectPeriod === "This Year" || e.term === term),
                      ),
                  );
                  const score = entered.length
                    ? mean(entered.map((r) => r.score))
                    : graded.length
                      ? subjectReference[i] || 0
                      : 0;
                  return (
                    <button
                      key={s.id}
                      onClick={() => {
                        open("grade");
                        setForm((previous) => ({
                          ...previous,
                          subject: s.name,
                        }));
                      }}
                    >
                      <span>{s.name}</span>
                      <i>
                        <b
                          style={{
                            width: `${score}%`,
                            background: subjectColors[i % 6],
                          }}
                        />
                      </i>
                      <strong>{decimal(score)}</strong>
                    </button>
                  );
                })}
              </div>
            </Panel>
          </div>
          <div className="ex-main-grid">
            <div className="ex-left">
              <Panel
                title="Recent Examinations"
                icon={FileText}
                action={
                  <button
                    className="ex-link"
                    onClick={() => setAllExams(!allExams)}
                  >
                    {allExams ? "Show Recent" : "View All"}
                  </button>
                }
              >
                {examTable(
                  allExams
                    ? listed
                    : listed
                        .filter((e) => e.status !== "Scheduled")
                        .slice(0, 5),
                )}
              </Panel>
              <div className="ex-lower">
                <Panel
                  title="Class Performance"
                  icon={Users}
                  action={
                    <select
                      aria-label="Class performance period"
                      value={classPeriod}
                      onChange={(e) => setClassPeriod(e.target.value)}
                    >
                      <option>This Term</option>
                      <option>This Year</option>
                    </select>
                  }
                >
                  <div className="ex-table-scroll">
                    <table className="ex-table">
                      <thead>
                        <tr>
                          {[
                            "Class",
                            "Students",
                            "Average Score",
                            "Pass Rate",
                            "Rank",
                            "Actions",
                          ].map((t) => (
                            <th key={t}>{t}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {classStats(classPeriod).map((item) => (
                          <tr key={item.name}>
                            <td>{item.name}</td>
                            <td>{item.students}</td>
                            <td>{decimal(item.average)}</td>
                            <td>{decimal(item.pass)}%</td>
                            <td>
                              {[...classStats(classPeriod)]
                                .sort((a, b) => b.average - a.average)
                                .findIndex((c) => c.name === item.name) + 1}
                            </td>
                            <td>
                              <button
                                className="ex-view"
                                onClick={() =>
                                  open("class", undefined, item.name)
                                }
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Panel>
                <Panel
                  title="Top Performing Students"
                  icon={Trophy}
                  action={
                    <button
                      className="ex-link"
                      onClick={() => onSection("Report Cards")}
                    >
                      View All
                    </button>
                  }
                >
                  <div className="ex-table-scroll">
                    <table className="ex-table">
                      <thead>
                        <tr>
                          {["#", "Student Name", "Class", "Average Score"].map(
                            (t) => (
                              <th key={t}>{t}</th>
                            ),
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {tops.slice(0, 5).map((r, i) => (
                          <tr key={r.studentId}>
                            <td>{i + 1}</td>
                            <td>
                              <button
                                className="ex-student"
                                onClick={() => open("report", r)}
                              >
                                <span>
                                  {r.studentName
                                    .split(" ")
                                    .map((s) => s[0])
                                    .join("")
                                    .slice(0, 2)}
                                </span>
                                {r.studentName}
                              </button>
                            </td>
                            <td>{r.className}</td>
                            <td>
                              <strong>{decimal(r.score)}</strong>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {!tops.length && (
                      <p className="ex-empty">
                        No recorded marks for this term.
                      </p>
                    )}
                  </div>
                </Panel>
              </div>
            </div>
            <div className="ex-right">
              <Panel
                title="Upcoming Examinations"
                icon={CalendarDays}
                action={
                  <button
                    className="ex-link"
                    onClick={() => setAllUpcoming(!allUpcoming)}
                  >
                    {allUpcoming ? "Show Fewer" : "View All"}
                  </button>
                }
              >
                <div className="ex-upcoming">
                  {scheduled.slice(0, allUpcoming ? 2000 : 5).map((exam) => {
                    const days = Math.ceil(
                      (new Date(exam.date + "T12:00:00").getTime() -
                        new Date(today + "T12:00:00").getTime()) /
                        86400000,
                    );
                    return (
                      <button
                        key={exam.id}
                        onClick={() => open("details", exam)}
                      >
                        <span className="ex-date">
                          <small>
                            {new Date(
                              exam.date + "T12:00:00",
                            ).toLocaleDateString("en-US", { month: "short" })}
                          </small>
                          <strong>{exam.date.slice(8)}</strong>
                        </span>
                        <span>
                          <b>{exam.name}</b>
                          <small>
                            {exam.className} · {exam.subjects}
                          </small>
                        </span>
                        <em className={days < 15 ? "urgent" : ""}>
                          {days < 0
                            ? "Past date"
                            : days === 0
                              ? "Today"
                              : `${days} days`}
                        </em>
                      </button>
                    );
                  })}
                  {!scheduled.length && (
                    <p className="ex-empty">
                      No scheduled examinations. Create an exam to add one.
                    </p>
                  )}
                </div>
              </Panel>
              <Panel title="Quick Actions" icon={Zap}>
                <div className="ex-quick">
                  {[
                    {
                      label: "Create Exam",
                      note: "Set up a new examination",
                      icon: FileText,
                      color: "orange",
                      action: () => open("exam"),
                    },
                    {
                      label: "Enter Grades",
                      note: "Input student marks",
                      icon: ChartNoAxesColumnIncreasing,
                      color: "purple",
                      action: () => onSection("Grade Management"),
                    },
                    {
                      label: "Generate Reports",
                      note: "View exam results",
                      icon: ChartNoAxesColumnIncreasing,
                      color: "green",
                      action: () => onSection("Report Cards"),
                    },
                    {
                      label: "Manage Subjects",
                      note: "Configure exam settings",
                      icon: Settings,
                      color: "blue",
                      action: () => onSection("Subjects"),
                    },
                  ].map(({ label, note, icon: Icon, color, action }) => (
                    <button key={label} className={color} onClick={action}>
                      <span>
                        <Icon size={29} />
                      </span>
                      <div>
                        <b>{label}</b>
                        <small>{note}</small>
                      </div>
                    </button>
                  ))}
                </div>
              </Panel>
            </div>
          </div>
        </>
      ) : (
        <Panel
          title={sectionTitle}
          icon={
            section === "Subjects"
              ? BookOpen
              : section === "Timetable"
                ? CalendarDays
                : ClipboardList
          }
          action={
            <button
              className="ex-link"
              onClick={() => onSection("Examinations")}
            >
              <ArrowLeft size={14} /> Back to Examinations
            </button>
          }
        >
          <div className="ex-directory-tools">
            <label>
              <Search size={17} />
              <input
                aria-label={`Search ${sectionTitle}`}
                placeholder="Search by name, class, or subject..."
                value={localQuery}
                onChange={(e) => setLocalQuery(e.target.value)}
              />
            </label>
            <select
              aria-label="Examination class filter"
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
            >
              {["All Classes", ...classes].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
            <button
              className="ex-secondary"
              onClick={
                section === "Subjects"
                  ? () =>
                      csvFile("edumanage-exam-subjects.csv", [
                        ["Subject", "Code", "Pass Mark"],
                        ...data.subjects.map((s) => [
                          s.name,
                          s.code,
                          s.passMark,
                        ]),
                      ])
                  : section === "Timetable"
                    ? exportExams
                    : exportGrades
              }
            >
              <Download size={16} />
              Export CSV
            </button>
            {section === "Grade Management" && (
              <button
                className="primary"
                onClick={() => open("grade")}
                disabled={!exams.length}
              >
                <Plus size={17} />
                Enter Grades
              </button>
            )}
          </div>
          {section === "Timetable" ? (
            examTable([...listed].sort((a, b) => a.date.localeCompare(b.date)))
          ) : section === "Subjects" ? (
            <div className="ex-table-scroll">
              <table className="ex-table">
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Code</th>
                    <th>Pass Mark</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.subjects
                    .filter((s) =>
                      `${s.name} ${s.code}`.toLowerCase().includes(search),
                    )
                    .map((s) => (
                      <tr key={s.id}>
                        <td>{s.name}</td>
                        <td>{s.code}</td>
                        <td>{s.passMark}%</td>
                        <td>
                          <button
                            className="ex-view"
                            onClick={() => open("subject", s)}
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="ex-table-scroll">
              <table className="ex-table">
                <thead>
                  <tr>
                    {[
                      "Student ID",
                      "Student",
                      "Class",
                      "Examination",
                      "Subject",
                      "Mark",
                      "Result",
                      "Actions",
                    ].map((t) => (
                      <th key={t}>{t}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {gradeRows.map((r) => (
                    <tr key={r.id}>
                      <td>{r.studentId}</td>
                      <td>{r.studentName}</td>
                      <td>{r.className}</td>
                      <td>{exams.find((e) => e.id === r.examId)?.name}</td>
                      <td>{r.subject}</td>
                      <td>{r.score}</td>
                      <td>
                        <Status
                          value={
                            r.score >=
                            (data.subjects.find((s) => s.name === r.subject)
                              ?.passMark ?? 50)
                              ? "Completed"
                              : "Grading"
                          }
                        />
                      </td>
                      <td>
                        <button
                          className="ex-view"
                          onClick={() =>
                            open(
                              section === "Grade Management"
                                ? "grade"
                                : "report",
                              r,
                            )
                          }
                        >
                          {section === "Grade Management" ? "Edit" : "View"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!gradeRows.length && (
                <p className="ex-empty">
                  No recorded marks match your filters. Use Enter Grades to
                  record marks.
                </p>
              )}
            </div>
          )}
        </Panel>
      )}
      <footer className="ex-footer">
        <span aria-live="polite">{saveStatus}</span>
        {failed.current && (
          <button onClick={() => persist(dataRef.current)}>Retry save</button>
        )}
        <span>
          Demonstration school · Reference summaries and example marks · Dates
          shown in school local time
        </span>
      </footer>
      {dialog && (
        <div
          className="modal-overlay ex-overlay"
          onClick={(event) => {
            if (event.target === event.currentTarget) setDialog(null);
          }}
        >
          <div
            className="ex-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ex-dialog-title"
          >
            <div className="ex-dialog-head">
              <div>
                <small>
                  EDUMANAGE · {year} · {term}
                </small>
                <h2 id="ex-dialog-title">
                  {dialog.kind === "exam"
                    ? dialog.item
                      ? "Edit Examination"
                      : "Create Examination"
                    : dialog.kind === "grade"
                      ? dialog.item
                        ? "Edit Student Mark"
                        : "Enter Student Mark"
                      : dialog.kind === "subject"
                        ? dialog.item
                          ? "Edit Subject"
                          : "Add Subject"
                        : dialog.kind === "details"
                          ? (dialog.item as Exam).name
                          : dialog.kind === "class"
                            ? `${dialog.className || "Class"} Performance`
                            : "Examination Report"}
                </h2>
              </div>
              <button
                aria-label="Close examination dialog"
                onClick={() => setDialog(null)}
              >
                <X size={21} />
              </button>
            </div>
            {["exam", "grade", "subject"].includes(dialog.kind) ? (
              <form onSubmit={save}>
                <div className="ex-form-grid">
                  {dialog.kind === "exam" ? (
                    <>
                      {field("name", "Exam name")}
                      {field("subjects", "Subject(s)")}
                      {field("className", "Class", classes)}
                      {field("date", "Exam date", undefined, "date")}
                      {field("time", "Time")}
                      {field("status", "Status", [
                        "Draft",
                        "Scheduled",
                        "Grading",
                        "Completed",
                      ])}
                      {field(
                        "students",
                        "Students enrolled",
                        undefined,
                        "number",
                      )}
                    </>
                  ) : dialog.kind === "grade" ? (
                    <>
                      <label className="ex-field">
                        <span>Examination</span>
                        <select
                          required
                          value={form.examId}
                          onChange={(e) => change("examId", e.target.value)}
                        >
                          <option value="" disabled>
                            Select an exam
                          </option>
                          {exams.map((e) => (
                            <option key={e.id} value={e.id}>
                              {e.name} · {e.className}
                            </option>
                          ))}
                        </select>
                      </label>
                      {field("studentId", "Student ID")}
                      {field("studentName", "Student name")}
                      {field(
                        "subject",
                        "Subject",
                        data.subjects.map((s) => s.name),
                      )}
                      {field("score", "Mark (out of 100)", undefined, "number")}
                      <p className="ex-form-note">
                        A repeated student ID, exam, and subject updates that
                        existing mark. Class follows the selected exam.
                      </p>
                    </>
                  ) : (
                    <>
                      {field("name", "Subject name")}
                      {field("code", "Subject code")}
                      {field("passMark", "Pass mark (%)", undefined, "number")}
                    </>
                  )}
                </div>
                {error && (
                  <p role="alert" className="ex-error">
                    {error}
                  </p>
                )}
                <div className="ex-dialog-actions">
                  <button
                    type="button"
                    className="ex-secondary"
                    onClick={() => setDialog(null)}
                  >
                    Cancel
                  </button>
                  <button className="primary" type="submit">
                    <Check size={16} />
                    Save Changes
                  </button>
                </div>
              </form>
            ) : dialog.kind === "details" ? (
              (() => {
                const exam = dialog.item as Exam,
                  recorded = data.results.filter((r) => r.examId === exam.id);
                return (
                  <div className="ex-dialog-body">
                    <Status value={exam.status} />
                    <div className="ex-detail-grid">
                      {[
                        ["Class", exam.className],
                        ["Subjects", exam.subjects],
                        ["Date", dateText(exam.date)],
                        ["Time", exam.time],
                        ["Students", exam.students],
                        ["Submissions", exam.submissions],
                        ["Average", `${decimal(exam.average)}%`],
                        ["Pass rate", `${decimal(exam.passRate)}%`],
                      ].map(([label, value]) => (
                        <div key={label}>
                          <small>{label}</small>
                          <strong>{value}</strong>
                        </div>
                      ))}
                    </div>
                    <p className="ex-form-note">
                      {recorded.length} individual marks available. Reference
                      summaries are replaced with recorded marks when you enter
                      or edit grades.
                    </p>
                    <div className="ex-dialog-actions">
                      <button
                        className="ex-secondary"
                        onClick={() => open("exam", exam)}
                      >
                        <Pencil size={16} />
                        Edit Exam
                      </button>
                      <button
                        className="primary"
                        onClick={() => {
                          open("grade");
                          setForm((previous) => ({
                            ...previous,
                            examId: exam.id,
                          }));
                        }}
                      >
                        Enter Grades
                      </button>
                      <button
                        className="ex-secondary"
                        onClick={() => {
                          if (!confirmDelete) {
                            setConfirmDelete(true);
                            return;
                          }
                          update({
                            ...dataRef.current,
                            exams: dataRef.current.exams.filter(
                              (e) => e.id !== exam.id,
                            ),
                            results: dataRef.current.results.filter(
                              (r) => r.examId !== exam.id,
                            ),
                          });
                          setDialog(null);
                          notify("Examination and its recorded marks removed");
                        }}
                      >
                        {confirmDelete
                          ? "Confirm Delete Exam and Marks"
                          : "Delete Exam"}
                      </button>
                    </div>
                  </div>
                );
              })()
            ) : dialog.kind === "class" ? (
              <div className="ex-dialog-body">
                <p>
                  Selected year: {year} · {term}. Student counts are enrollment
                  per class; recorded marks drive calculated scores when
                  available.
                </p>
                <div className="ex-table-scroll">
                  <table className="ex-table">
                    <thead>
                      <tr>
                        <th>Class</th>
                        <th>Students</th>
                        <th>Average</th>
                        <th>Pass Rate</th>
                        <th>Recorded Marks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classStats("This Term")
                        .filter(
                          (c) =>
                            !dialog.className || c.name === dialog.className,
                        )
                        .map((c) => (
                          <tr key={c.name}>
                            <td>{c.name}</td>
                            <td>{c.students}</td>
                            <td>{decimal(c.average)}</td>
                            <td>{decimal(c.pass)}%</td>
                            <td>{c.recorded}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
                <div className="ex-dialog-actions">
                  <button
                    className="primary"
                    onClick={() => {
                      setDialog(null);
                      onSection("Grade Management");
                      setClassFilter(dialog.className || "All Classes");
                    }}
                  >
                    Open Grade Management
                  </button>
                </div>
              </div>
            ) : (
              <div className="ex-dialog-body">
                <p>
                  {dialog.item
                    ? `${(dialog.item as Result).studentName} · ${(dialog.item as Result).studentId}`
                    : `${year} · ${term}`}
                </p>
                <div className="ex-detail-grid">
                  <div>
                    <small>Examinations</small>
                    <strong>{exams.length}</strong>
                  </div>
                  <div>
                    <small>Recorded marks</small>
                    <strong>
                      {
                        results.filter(
                          (r) =>
                            !dialog.item ||
                            r.studentId === (dialog.item as Result).studentId,
                        ).length
                      }
                    </strong>
                  </div>
                </div>
                <div className="ex-table-scroll">
                  <table className="ex-table">
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Subject</th>
                        <th>Score</th>
                        <th>Pass Mark</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results
                        .filter(
                          (r) =>
                            !dialog.item ||
                            r.studentId === (dialog.item as Result).studentId,
                        )
                        .map((r) => (
                          <tr key={r.id}>
                            <td>{r.studentName}</td>
                            <td>{r.subject}</td>
                            <td>{r.score}</td>
                            <td>
                              {data.subjects.find((s) => s.name === r.subject)
                                ?.passMark ?? 50}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
                <div className="ex-dialog-actions">
                  <button
                    className="primary"
                    onClick={() => {
                      const selected = results.filter(
                        (r) =>
                          !dialog.item ||
                          r.studentId === (dialog.item as Result).studentId,
                      );
                      csvFile("edumanage-student-report.csv", [
                        ["Student ID", "Student", "Class", "Subject", "Score"],
                        ...selected.map((r) => [
                          r.studentId,
                          r.studentName,
                          r.className,
                          r.subject,
                          r.score,
                        ]),
                      ]);
                    }}
                  >
                    <Download size={16} />
                    Export Report
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
function TrendChart({
  points,
}: {
  points: { label: string; average: number | null; pass: number | null }[];
}) {
  const plotted = points.map((p, i) => ({ ...p, x: 55 + i * 79 })),
    valid = plotted.filter((p) => p.pass !== null);
  return (
    <svg
      className="ex-trend"
      viewBox="0 0 520 170"
      role="img"
      aria-label="Average scores and pass rates by month. Months without submissions are omitted."
    >
      <defs>
        <linearGradient id="exam-orange-bars" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#ff9435" />
          <stop offset="1" stopColor="#ffdfb9" />
        </linearGradient>
      </defs>
      {[0, 20, 40, 60, 80, 100].map((n) => (
        <g key={n}>
          <line
            x1="25"
            x2="490"
            y1={140 - n * 1.2}
            y2={140 - n * 1.2}
            stroke="#e8eef6"
          />
          <text x="17" y={143 - n * 1.2} textAnchor="end">
            {n}
          </text>
          <text x="504" y={143 - n * 1.2}>
            {n}%
          </text>
        </g>
      ))}
      {plotted.map((p) => (
        <g key={p.label}>
          {p.average !== null && (
            <rect
              x={p.x - 19}
              y={140 - p.average * 1.2}
              height={p.average * 1.2}
              width="38"
              rx="5"
              fill="url(#exam-orange-bars)"
            >
              <title>{`${p.label}: average ${decimal(p.average)} percent`}</title>
            </rect>
          )}
          <text x={p.x} y="158" textAnchor="middle">
            {p.label}
          </text>
        </g>
      ))}
      <polyline
        points={valid.map((p) => `${p.x},${140 - p.pass! * 1.2}`).join(" ")}
        fill="none"
        stroke="#1677ff"
        strokeWidth="2"
      />
      {valid.map((p) => (
        <circle
          key={p.label}
          cx={p.x}
          cy={140 - p.pass! * 1.2}
          r="4"
          fill="#187bff"
          stroke="white"
          strokeWidth="1.5"
        >
          <title>{`${p.label}: pass rate ${decimal(p.pass!)} percent`}</title>
        </circle>
      ))}
    </svg>
  );
}
