export type Book = {
  id: string;
  title: string;
  author: string;
  isbn: string;
  category: string;
  copies: number;
  historicalBorrowed: number;
  openingLoans: number;
  color: string;
};
export type Borrower = {
  id: string;
  name: string;
  type: string;
  className: string;
  email: string;
};
export type Loan = {
  id: string;
  bookId: string;
  borrowerId: string;
  borrowedDate: string;
  dueDate: string;
  returnedDate: string;
  year: string;
};
export type LibraryData = {
  books: Book[];
  borrowers: Borrower[];
  loans: Loan[];
  reminders: { id: string; loanId: string; date: string; note: string }[];
};
export type LibrarySection =
  | "Overview"
  | "Books"
  | "Borrowers"
  | "Borrowings"
  | "Overdue Books"
  | "Returns";
export const categories = [
  "Textbooks",
  "Reference",
  "Fiction",
  "Science",
  "History",
  "Others",
];
export const colors = [
  "#247dff",
  "#13bd91",
  "#9364ff",
  "#ffa52c",
  "#ff5969",
  "#a4b2c8",
];
const books: [string, string, string, number, number, string][] = [
  [
    "Mathematics Grade 10",
    "Ministry of Education",
    "Textbooks",
    600,
    155,
    "blue",
  ],
  ["Science Explorer", "Pearson", "Textbooks", 620, 127, "teal"],
  ["English for High School", "Oxford", "Reference", 314, 142, "navy"],
  ["Computer Fundamentals", "Microsoft", "Reference", 314, 104, "navy"],
  ["History of Cambodia", "MoE", "History", 140, 115, "amber"],
  ["World History", "School Press", "History", 139, 75, "olive"],
  ["Physics Fundamentals", "Pearson", "Science", 140, 90, "navy"],
  ["Chemistry Guide", "Oxford", "Science", 139, 65, "cream"],
  ["Biology Essentials", "Pearson", "Science", 139, 60, "teal"],
  ["English Grammar", "Oxford", "Fiction", 261, 80, "red"],
  ["Khmer Literature", "MoE", "Fiction", 261, 70, "amber"],
  ["Digital Technology", "School Press", "Others", 100, 45, "teal"],
  ["Advanced Mathematics", "Pearson", "Others", 100, 35, "red"],
  ["Computer Science", "Microsoft", "Others", 100, 30, "navy"],
  ["Geography Today", "Oxford", "Others", 60, 25, "blue"],
  ["Art & Design", "School Press", "Others", 55, 23, "red"],
];
export const initialLibrary: LibraryData = {
  books: books.map(
    ([title, author, category, copies, historicalBorrowed, color], i) => ({
      id: `book-${i + 1}`,
      title,
      author,
      category,
      copies,
      historicalBorrowed,
      openingLoans: [
        240, 238, 160, 160, 46, 47, 59, 59, 60, 105, 104, 20, 20, 20, 14, 13,
      ][i],
      color,
      isbn: `978000000${String(i + 1).padStart(4, "0")}`,
    }),
  ),
  borrowers: [
    "Sok Piseth",
    "Chan Sreymom",
    "Lim Dara",
    "Kong Vannara",
    "Chea Raksmey",
    "Dara Kim",
    "Sophea Chan",
    "Sreyneang Lim",
    "Visal Chhun",
    "Monika Sok",
  ].map((name, i) => ({
    id: `LIB-${String(i + 1).padStart(4, "0")}`,
    name,
    type: i === 3 ? "Teacher" : "Student",
    className: i === 3 ? "Teaching Staff" : `Grade ${7 + (i % 6)}`,
    email: "",
  })),
  loans: [
    ...[1, 2, 5, 10, 12].map((book, i) => ({
      id: `loan-${i + 1}`,
      bookId: `book-${book}`,
      borrowerId: `LIB-${String(i + 1).padStart(4, "0")}`,
      borrowedDate: `2026-10-0${1 + (i % 3)}`,
      dueDate: `2026-11-0${1 + (i % 3)}`,
      returnedDate: "",
      year: "2025 - 2026",
    })),
    ...[7, 6, 13, 8, 14].map((book, i) => ({
      id: `loan-${i + 6}`,
      bookId: `book-${book}`,
      borrowerId: `LIB-${String(i + 6).padStart(4, "0")}`,
      borrowedDate: "2026-09-20",
      dueDate: [
        "2026-10-09",
        "2026-10-13",
        "2026-10-15",
        "2026-10-16",
        "2026-10-18",
      ][i],
      returnedDate: "",
      year: "2025 - 2026",
    })),
    ...[9, 11, 10, 15, 16].map((book, i) => ({
      id: `loan-${i + 11}`,
      bookId: `book-${book}`,
      borrowerId: `LIB-${String(i + 1).padStart(4, "0")}`,
      borrowedDate: "2026-09-20",
      dueDate: "2026-10-15",
      returnedDate: [
        "2026-10-10",
        "2026-10-10",
        "2026-10-09",
        "2026-10-09",
        "2026-10-08",
      ][i],
      year: "2025 - 2026",
    })),
  ],
  reminders: [],
};
export const displayDate = (value: string) =>
  new Date(value + "T12:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
export const daysLate = (loan: Loan, today: string) =>
  loan.returnedDate
    ? 0
    : Math.max(
        0,
        Math.floor(
          (new Date(today + "T12:00:00").getTime() -
            new Date(loan.dueDate + "T12:00:00").getTime()) /
            86400000,
        ),
      );
export function availableCopies(data: LibraryData, bookId: string) {
  const book = data.books.find((b) => b.id === bookId);
  return (
    (book?.copies || 0) -
    (book?.openingLoans || 0) -
    data.loans.filter((l) => l.bookId === bookId && !l.returnedDate).length
  );
}
