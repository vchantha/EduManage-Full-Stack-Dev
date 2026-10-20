export type PlanningPage =
  | "School Overview"
  | "Academic Years"
  | "Academics Overview"
  | "Syllabus & Progress"
  | "Academic Calendar";
export type AcademicYear = {
  id: string;
  name: string;
  start: string;
  end: string;
  status: string;
  students: number;
  description: string;
};
export type Term = {
  id: string;
  yearId: string;
  name: string;
  start: string;
  end: string;
  status: string;
  weeks: number;
  classes: number;
  students: number;
};
export type Subject = {
  id: string;
  name: string;
  code: string;
  grade: string;
  teacher: string;
};
export type Topic = {
  id: string;
  yearId: string;
  chapter: string;
  title: string;
  objectives: string;
  periods: number;
  start: string;
  end: string;
  progress: number;
  subject: string;
  grade: string;
  term: string;
};
export type AcademicEvent = {
  id: string;
  yearId: string;
  title: string;
  date: string;
  endDate: string;
  time: string;
  type: string;
  description: string;
};
export type Material = {
  id: string;
  topicId: string;
  title: string;
  url: string;
  type: string;
};
export type PlanningData = {
  years: AcademicYear[];
  terms: Term[];
  subjects: Subject[];
  topics: Topic[];
  events: AcademicEvent[];
  materials: Material[];
};
export type SchoolData = {
  students: {
    id: string;
    name: string;
    className: string;
    status: string;
    email: string;
    year: string;
  }[];
  teachers: {
    id: string;
    name: string;
    subject: string;
    email: string;
    year: string;
  }[];
  classes: {
    id: string;
    name: string;
    teacher: string;
    room: string;
    year: string;
  }[];
  attendance: {
    id: string;
    studentId: string;
    date: string;
    status: string;
    year: string;
  }[];
  events: {
    id: string;
    title: string;
    date: string;
    time: string;
    kind: string;
    year: string;
  }[];
};
export const eventTypes = [
  "Teaching Day",
  "Examination",
  "Holiday",
  "School Event",
  "Term Dates",
];
export const eventColors: Record<string, string> = {
  "Teaching Day": "blue",
  Examination: "red",
  Holiday: "green",
  "School Event": "purple",
  "Term Dates": "orange",
};
export const grades = [
  "KG",
  ...Array.from({ length: 12 }, (_, i) => `Grade ${i + 1}`),
];
export const dateLabel = (value: string, long = false) =>
  new Date(value + "T12:00:00").toLocaleDateString("en-GB", {
    day: "2-digit",
    month: long ? "long" : "short",
    year: "numeric",
  });
export const topicStatus = (progress: number) =>
  progress === 100
    ? "Completed"
    : progress === 0
      ? "Not Started"
      : "In Progress";
export const initialPlanning: PlanningData = {
  years: [7842, 7580, 7120, 6450, 5860, 5120].map((students, i) => ({
    id: `year-${2025 - i}`,
    name: `${2025 - i} - ${2026 - i}`,
    start: `${2025 - i}-08-01`,
    end: `${2026 - i}-07-31`,
    status: i === 0 ? "Active" : "Completed",
    students,
    description: `Academic year ${2025 - i}-${2026 - i} for all grades and programs.`,
  })),
  terms: [7842, 7580, 7120, 6450, 5860, 5120].flatMap((students, i) =>
    [1, 2].map((n) => ({
      id: `term-${2025 - i}-${n}`,
      yearId: `year-${2025 - i}`,
      name: `Term ${n}`,
      start: n === 1 ? `${2025 - i}-08-01` : `${2026 - i}-01-05`,
      end: n === 1 ? `${2025 - i}-12-31` : `${2026 - i}-07-31`,
      status: i === 0 ? (n === 1 ? "Ongoing" : "Upcoming") : "Completed",
      weeks: n === 1 ? 12 : 14,
      classes: n === 1 ? 245 : 248,
      students: Math.floor(students / 2) + (n === 2 ? students % 2 : 0),
    })),
  ),
  subjects: [
    ["Mathematics", 16],
    ["English", 12],
    ["Science", 14],
    ["Social Studies", 10],
    ["Languages", 8],
    ["Arts", 8],
    ["Physical Education", 8],
    ["Others", 20],
  ].flatMap(([category, count], i) =>
    Array.from({ length: Number(count) }, (_, j) => ({
      id: `subject-${i}-${j}`,
      name:
        category === "Others"
          ? ["History", "Geography", "Computer", "Khmer", "Life Skills"][j % 5]
          : String(category),
      code: `SUB-${i + 1}-${String(j + 1).padStart(2, "0")}`,
      grade: grades[(i + j) % grades.length],
      teacher: ["Sarah Kim", "David Lee", "Sok Chantha", "Rithy Sok"][j % 4],
    })),
  ),
  topics: [
    ["Algebra and Functions", "Real Numbers", 100],
    ["Algebra and Functions", "Algebraic Expressions", 100],
    ["Algebra and Functions", "Linear Equations", 80],
    ["Algebra and Functions", "Quadratic Functions", 40],
    ["Algebra and Functions", "Functions and Graphs", 0],
    ["Algebra and Functions", "Polynomials", 100],
    ["Algebra and Functions", "Factorization", 100],
    ["Algebra and Functions", "Inequalities", 100],
    ["Algebra and Functions", "Sequences", 100],
    ["Algebra and Functions", "Simultaneous Equations", 100],
    ["Geometry", "Angles and Lines", 100],
    ["Geometry", "Triangles", 100],
    ["Geometry", "Congruence", 100],
    ["Geometry", "Similarity", 100],
    ["Geometry", "Circles", 60],
    ["Geometry", "Area and Volume", 100],
    ["Trigonometry", "Trigonometric Ratios", 100],
    ["Trigonometry", "Sine Rule", 100],
    ["Trigonometry", "Cosine Rule", 50],
    ["Trigonometry", "Trigonometric Graphs", 20],
    ["Statistics", "Data Collection", 100],
    ["Statistics", "Measures of Center", 100],
    ["Statistics", "Probability", 0],
    ["Statistics", "Data Interpretation", 0],
  ].map(([chapter, title, progress], i) => ({
    id: `topic-${i + 1}`,
    yearId: "year-2025",
    chapter: String(chapter),
    title: String(title),
    objectives:
      title === "Quadratic Functions"
        ? "Understand quadratic functions and their graphs\nSolve quadratic equations using different methods\nApply quadratic functions in real-world problems"
        : `Understand ${String(title).toLowerCase()}\nApply concepts through guided exercises\nDemonstrate learning through practice and assessment`,
    periods: 4,
    start: "2025-09-15",
    end: "2025-09-30",
    progress: Number(progress),
    subject: "Mathematics",
    grade: "Grade 10",
    term: "Term 1",
  })),
  events: [
    [
      "Term 1 Start",
      "2025-10-01",
      "08:00",
      "Term Dates",
      "Welcome to the first academic term.",
    ],
    [
      "Teachers Meeting",
      "2025-10-03",
      "10:00",
      "School Event",
      "Staff planning and collaboration meeting.",
    ],
    [
      "Mathematics Examination",
      "2025-10-06",
      "09:00",
      "Examination",
      "Grade 10 mathematics assessment.",
    ],
    [
      "Public Holiday",
      "2025-10-09",
      "All Day",
      "Holiday",
      "School closed for a public holiday.",
    ],
    [
      "Science Fair",
      "2025-10-13",
      "09:00",
      "School Event",
      "Student science projects and demonstrations.",
    ],
    [
      "Mid Term Exam",
      "2025-10-20",
      "08:00",
      "Examination",
      "Midterm examinations for all secondary grades.",
    ],
    [
      "Sports Day",
      "2025-10-24",
      "All Day",
      "School Event",
      "School-wide sports and team activities.",
    ],
    [
      "Halloween",
      "2025-10-31",
      "All Day",
      "School Event",
      "Creative classroom activities.",
    ],
    [
      "School Opening",
      "2025-08-01",
      "08:00",
      "Term Dates",
      "Academic year opening.",
    ],
    [
      "Teaching Workshop",
      "2025-09-15",
      "09:00",
      "Teaching Day",
      "Teaching methods and classroom planning.",
    ],
    [
      "Term 2 Starts",
      "2026-01-05",
      "08:00",
      "Term Dates",
      "Start of the second term.",
    ],
    [
      "Reading Day",
      "2026-02-14",
      "All Day",
      "Teaching Day",
      "School reading program.",
    ],
    ["Spring Holiday", "2026-04-10", "All Day", "Holiday", "School holiday."],
    [
      "Final Examinations",
      "2026-05-20",
      "08:00",
      "Examination",
      "End-of-year assessments.",
    ],
    [
      "Project Exhibition",
      "2026-06-15",
      "10:00",
      "School Event",
      "Student project presentations.",
    ],
    [
      "Academic Year Ends",
      "2026-07-31",
      "12:00",
      "Term Dates",
      "Last day of the academic year.",
    ],
    [
      "Teacher Training",
      "2025-10-25",
      "09:00",
      "Teaching Day",
      "Lesson planning and assessment workshop.",
    ],
    [
      "Curriculum Review",
      "2025-10-15",
      "14:00",
      "School Event",
      "Academic committee curriculum review.",
    ],
  ].map(([title, date, time, type, description], i) => ({
    id: `academic-event-${i + 1}`,
    yearId: "year-2025",
    title,
    date,
    endDate: date,
    time,
    type,
    description,
  })),
  materials: [
    {
      id: "material-1",
      topicId: "topic-4",
      title: "Lecture Slides",
      url: "/learning/quadratic-lesson.html",
      type: "Lesson Guide",
    },
    {
      id: "material-2",
      topicId: "topic-4",
      title: "Practice Worksheet",
      url: "/learning/quadratic-practice.html",
      type: "Worksheet",
    },
  ],
};
