export const attendanceStatuses = [
  "Present",
  "Absent",
  "Late",
  "Not Marked",
] as const;
export type AttendanceStatus = (typeof attendanceStatuses)[number];
export type AttendanceMark = {
  studentId: string;
  status: AttendanceStatus;
  remarks: string;
};
export type AttendanceClass = {
  id: string;
  name: string;
  grade: string;
  teacher: string;
  year: string;
  term: string;
  subjects: string[];
};
export type AttendanceStudent = { id: string; name: string; classId: string };
export type AttendanceSession = {
  id: string;
  classId: string;
  date: string;
  subject: string;
  teacher: string;
  year: string;
  term: string;
  marks: AttendanceMark[];
  updatedAt: string;
};
export type SessionDraft = Omit<AttendanceSession, "id" | "updatedAt">;
export type AttendanceData = {
  classes: AttendanceClass[];
  students: AttendanceStudent[];
  sessions: AttendanceSession[];
  opening: {
    date: string;
    year: string;
    term: string;
    total: number;
    present: number;
    absent: number;
    late: number;
  };
};
export const sessionKey = (s: {
  classId: string;
  date: string;
  subject: string;
  year: string;
  term: string;
}) => [s.year, s.term, s.classId, s.date, s.subject].join("|");
export function counts(marks: AttendanceMark[]) {
  return {
    total: marks.length,
    present: marks.filter((m) => m.status === "Present").length,
    absent: marks.filter((m) => m.status === "Absent").length,
    late: marks.filter((m) => m.status === "Late").length,
    unmarked: marks.filter((m) => m.status === "Not Marked").length,
  };
}
export const percent = (n: number, total: number) =>
  total ? `${((100 * n) / total).toFixed(1)}%` : "0%";
export const attendanceDate = (date: string) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
export function dailyMarks(sessions: AttendanceSession[], date: string) {
  const marks = new Map<string, AttendanceMark>();
  for (const s of [...sessions]
    .filter((s) => s.date === date)
    .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt)))
    for (const mark of s.marks) marks.set(mark.studentId, mark);
  return [...marks.values()];
}
export function attendanceCsv(name: string, rows: (string | number)[][]) {
  const text =
    "\ufeff" +
    rows
      .map((row) =>
        row
          .map((v) => {
            const s = String(v);
            return (
              '"' +
              (/^[=+@\-\t\r]/.test(s) ? "'" : "") +
              s.replaceAll('"', '""') +
              '"'
            );
          })
          .join(","),
      )
      .join("\r\n");
  const u = URL.createObjectURL(
    new Blob([text], { type: "text/csv;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = u;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(u), 1000);
}
export function parseAttendanceCsv(
  text: string,
  roster: AttendanceStudent[],
  current: AttendanceMark[],
) {
  text = text.replace(/^\ufeff/, "");
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (!quoted && cell !== "") throw Error("Invalid CSV quote");
      else quoted = !quoted;
    } else if (ch === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((ch === "\n" || ch === "\r") && !quoted) {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((c) => c.trim())) rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (quoted) throw Error("Unclosed CSV quote");
  row.push(cell);
  if (row.some((c) => c.trim())) rows.push(row);
  const header = rows.shift()?.map((s) =>
    s
      .replace(/^\ufeff/, "")
      .trim()
      .toLowerCase(),
  );
  if (!header || header.join(",") !== "studentid,status,remarks")
    throw Error("Use the template columns: studentId,status,remarks");
  if (!rows.length || rows.length > roster.length)
    throw Error("Import must contain 1 row per student at most");
  const seen = new Set<string>(),
    updates = new Map<string, AttendanceMark>();
  for (const r of rows) {
    if (r.length !== 3) throw Error("Each CSV row needs exactly three columns");
    const id = r[0].trim(),
      status = r[1].trim() as AttendanceStatus;
    if (!roster.some((s) => s.id === id) || seen.has(id))
      throw Error("Student IDs must belong to this class and appear only once");
    if (!attendanceStatuses.includes(status) || r[2].length > 500)
      throw Error(
        "Use a valid attendance status and remarks up to 500 characters",
      );
    seen.add(id);
    updates.set(id, { studentId: id, status, remarks: r[2] });
  }
  return current.map((mark) => updates.get(mark.studentId) || mark);
}
