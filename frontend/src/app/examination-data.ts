export type Exam = {
  id: string;
  name: string;
  subjects: string;
  className: string;
  date: string;
  time: string;
  year: string;
  term: string;
  status: string;
  students: number;
  submissions: number;
  average: number;
  passRate: number;
};
export type Result = {
  id: string;
  examId: string;
  studentId: string;
  studentName: string;
  className: string;
  subject: string;
  score: number;
};
export type ExamSubject = {
  id: string;
  name: string;
  code: string;
  passMark: number;
};
export type ExamData = {
  exams: Exam[];
  results: Result[];
  subjects: ExamSubject[];
};
export type ExamSection =
  | "Examinations"
  | "Grade Management"
  | "Report Cards"
  | "Timetable"
  | "Subjects";
export const classNames = Array.from({ length: 6 }, (_, i) => `Grade ${i + 7}`);
export const classReference = [
  { name: "Grade 7", students: 210, average: 87.5, pass: 95 },
  { name: "Grade 8", students: 198, average: 84.2, pass: 92 },
  { name: "Grade 9", students: 205, average: 81.6, pass: 88 },
  { name: "Grade 10", students: 212, average: 79.3, pass: 85 },
  { name: "Grade 11", students: 208, average: 83.4, pass: 90 },
  { name: "Grade 12", students: 215, average: 86.8, pass: 93 },
];
const rows: [
  string,
  string,
  string,
  string,
  string,
  number,
  number,
  number,
  number,
][] = [
  [
    "Mid-term Examination",
    "Math, English, Science",
    "Grade 10",
    "2025-10-15",
    "Completed",
    212,
    450,
    62,
    94,
  ],
  [
    "Unit Test 2",
    "Mathematics",
    "Grade 8",
    "2025-10-10",
    "Grading",
    198,
    198,
    60,
    92,
  ],
  [
    "Monthly Test",
    "English",
    "Grade 9",
    "2025-10-05",
    "Completed",
    205,
    205,
    64,
    90,
  ],
  [
    "Quarter 1 Exam",
    "All Subjects",
    "Grade 7",
    "2025-09-28",
    "Completed",
    210,
    420,
    61,
    95,
  ],
  ["Practice Test", "Science", "Grade 11", "2025-09-20", "Draft", 208, 0, 0, 0],
  [
    "Final Examination (Term 1)",
    "All Subjects",
    "Grade 12",
    "2025-10-25",
    "Scheduled",
    215,
    0,
    0,
    0,
  ],
  [
    "Mid-term Examination",
    "Mathematics",
    "Grade 9",
    "2025-11-05",
    "Scheduled",
    205,
    0,
    0,
    0,
  ],
  [
    "Unit Test 3",
    "Science",
    "Grade 7",
    "2025-11-12",
    "Scheduled",
    210,
    0,
    0,
    0,
  ],
  [
    "Monthly Assessment",
    "English",
    "Grade 8",
    "2025-11-18",
    "Scheduled",
    198,
    0,
    0,
    0,
  ],
  [
    "Practical Examination",
    "Computer",
    "Grade 11",
    "2025-11-25",
    "Scheduled",
    208,
    0,
    0,
    0,
  ],
  [
    "Summer Assessment",
    "All Subjects",
    "Grade 12",
    "2025-08-20",
    "Completed",
    215,
    600,
    70,
    93,
  ],
  [
    "January Assessment",
    "All Subjects",
    "Grade 11",
    "2026-01-20",
    "Completed",
    208,
    613,
    80,
    91,
  ],
];
export const initialExaminations: ExamData = {
  exams: rows.map(
    (
      [
        name,
        subjects,
        className,
        date,
        status,
        students,
        submissions,
        average,
        passRate,
      ],
      i,
    ) => ({
      id: `exam-${i + 1}`,
      name,
      subjects,
      className,
      date,
      time: "08:00 - 10:00",
      year: "2025 - 2026",
      term: "Term 1",
      status,
      students,
      submissions,
      average,
      passRate,
    }),
  ),
  subjects: [
    "Mathematics",
    "English",
    "Science",
    "Khmer",
    "Computer",
    "History",
  ].map((name, i) => ({
    id: `subject-${i + 1}`,
    name,
    code: ["MAT", "ENG", "SCI", "KHM", "ICT", "HIS"][i],
    passMark: 50,
  })),
  results: [
    ["Sok Piseth", "Grade 12", "exam-11", 98.5],
    ["Chan Sreymom", "Grade 11", "exam-12", 97.8],
    ["Lim Dara", "Grade 12", "exam-11", 96.3],
    ["Kong Vannara", "Grade 10", "exam-1", 95.7],
    ["Chea Raksmey", "Grade 11", "exam-12", 95.2],
  ].map(([studentName, className, examId, score], i) => ({
    id: `result-${i + 1}`,
    studentId: `STU-2025-00${i + 1}`,
    studentName: String(studentName),
    className: String(className),
    examId: String(examId),
    subject: "Mathematics",
    score: Number(score),
  })),
};
export const subjectColors = [
  "#2784ff",
  "#22be9c",
  "#a268ff",
  "#ffa335",
  "#ff626e",
  "#14b9bd",
];
export const subjectReference = [92, 88, 85, 90, 95, 82];
export const dateText = (date: string) =>
  new Date(date + "T12:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
export function summarize(results: Result[], subjects: ExamSubject[]) {
  return {
    submissions: results.length,
    average: results.length
      ? results.reduce((sum, r) => sum + r.score, 0) / results.length
      : 0,
    passRate: results.length
      ? (100 *
          results.filter(
            (r) =>
              r.score >=
              (subjects.find((s) => s.name === r.subject)?.passMark ?? 50),
          ).length) /
        results.length
      : 0,
  };
}
