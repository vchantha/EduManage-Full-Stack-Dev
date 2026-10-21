"use client";
import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  Users,
  Clock3,
  ChartNoAxesColumnIncreasing,
  ChartPie,
  Search,
  Plus,
  ChevronDown,
  UserRoundPlus,
  BookUp,
  Undo2,
  Trophy,
  MoreVertical,
  X,
  Check,
  Download,
  ArrowLeft,
  Bell,
  LibraryBig,
  Pencil,
} from "lucide-react";
import {
  Book,
  Borrower,
  Loan,
  LibraryData,
  LibrarySection,
  initialLibrary,
  categories,
  colors,
  displayDate,
  daysLate,
  availableCopies,
} from "./library-data";
type Dialog = {
  kind: "book" | "borrower" | "issue" | "return" | "loan" | "reminder";
  id?: string;
} | null;
const TODAY = "2026-10-21";
const number = (value: number) => value.toLocaleString("en-US");
function Cover({ book }: { book?: Book }) {
  return (
    <span className={`lib-cover ${book?.color || "blue"}`} aria-hidden="true">
      <span>{book?.title.split(" ").slice(0, 2).join(" ")}</span>
      <i />
      <i />
      <BookOpen size={12} />
    </span>
  );
}
function Panel({
  title,
  icon: Icon,
  children,
  action,
  className = "",
}: {
  title: string;
  icon: typeof BookOpen;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`lib-panel ${className}`}>
      <div className="lib-panel-head">
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
function exportCSV(name: string, rows: (string | number)[][]) {
  const text = rows
    .map((row) =>
      row
        .map((value) => {
          const s = String(value);
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
  const url = URL.createObjectURL(
    new Blob(["\ufeff" + text], { type: "text/csv;charset=utf-8" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}
export default function LibraryWorkspace({
  year,
  query,
  notify,
}: {
  year: string;
  query: string;
  notify: (message: string) => void;
}) {
  const [data, setData] = useState<LibraryData>(initialLibrary),
    [ready, setReady] = useState(false),
    [saveStatus, setSaveStatus] = useState("Loading library..."),
    [section, setSection] = useState<LibrarySection>("Overview"),
    [dialog, setDialog] = useState<Dialog>(null),
    [form, setForm] = useState<Record<string, string>>({}),
    [error, setError] = useState(""),
    [confirmRemove, setConfirmRemove] = useState(false),
    [menu, setMenu] = useState(false),
    [localQuery, setLocalQuery] = useState(""),
    [searchDraft, setSearchDraft] = useState(""),
    [category, setCategory] = useState("All Categories"),
    [availability, setAvailability] = useState("All Books"),
    [trendPeriod, setTrendPeriod] = useState("Last 6 months"),
    [topPeriod, setTopPeriod] = useState("This Year"),
    [categoryPeriod, setCategoryPeriod] = useState("All Stock");
  const csrf = useRef(""),
    current = useRef(data),
    queue = useRef(Promise.resolve()),
    alive = useRef(true),
    failed = useRef(false);
  useEffect(() => {
    alive.current = true;
    fetch("/api/library")
      .then(async (response) => {
        if (!response.ok) throw Error("Could not load the library");
        const payload = await response.json();
        if (alive.current) {
          if (payload.data) {
            setData(payload.data);
            current.current = payload.data;
          }
          csrf.current = payload.csrfToken;
          setReady(true);
          setSaveStatus("All changes saved");
        }
      })
      .catch(() => {
        if (alive.current)
          setSaveStatus("Connection unavailable · refresh to reconnect");
      });
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    setDialog(null);
    setMenu(false);
    setLocalQuery("");
  }, [year]);
  useEffect(() => {
    if (query.trim()) {
      setSection("Books");
      setLocalQuery("");
    }
  }, [query]);
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
  const persist = (next: LibraryData) => {
    failed.current = false;
    setSaveStatus("Saving changes...");
    queue.current = queue.current
      .catch(() => {})
      .then(async () => {
        try {
          const response = await fetch("/api/library", {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "X-CSRFToken": csrf.current,
            },
            body: JSON.stringify({ data: next }),
          });
          if (!response.ok) {
            const payload = await response.json();
            throw Error(payload.error || "Could not save library records");
          }
          failed.current = false;
          if (alive.current) setSaveStatus("All changes saved");
        } catch (e) {
          failed.current = true;
          if (alive.current) {
            setSaveStatus("Changes not saved · retry");
            notify(
              e instanceof Error ? e.message : "Could not save library records",
            );
          }
        }
      });
  };
  const update = (next: LibraryData) => {
    if (!ready) {
      notify("Please wait for the library connection");
      return;
    }
    current.current = next;
    setData(next);
    persist(next);
  };
  const go = (next: LibrarySection, text = "") => {
    setSection(next);
    setLocalQuery(text);
    setMenu(false);
    setDialog(null);
    setCategory("All Categories");
    setAvailability("All Books");
  };
  const loans = data.loans.filter((l) => l.year === year),
    active = loans.filter((l) => !l.returnedDate),
    overdue = active.filter((l) => daysLate(l, TODAY) > 0),
    returns = loans
      .filter((l) => l.returnedDate)
      .sort((a, b) => b.returnedDate.localeCompare(a.returnedDate));
  const baseline = year === "2025 - 2026",
    totalBooks = data.books.reduce((sum, b) => sum + b.copies, 0),
    totalBorrowed =
      (baseline
        ? data.books.reduce((sum, b) => sum + b.historicalBorrowed, 0)
        : 0) + loans.length;
  const book = (id: string) => data.books.find((b) => b.id === id),
    borrower = (id: string) => data.borrowers.find((b) => b.id === id);
  const search = (query || localQuery).trim().toLowerCase();
  const matchesLoan = (loan: Loan) =>
    `${book(loan.bookId)?.title} ${book(loan.bookId)?.author} ${book(loan.bookId)?.isbn} ${borrower(loan.borrowerId)?.name} ${loan.borrowerId}`
      .toLowerCase()
      .includes(search);
  const filteredBooks = data.books.filter(
    (b) =>
      (`${b.title} ${b.author} ${b.isbn}`.toLowerCase().includes(search) ||
        data.loans.some(
          (l) =>
            l.bookId === b.id &&
            `${borrower(l.borrowerId)?.name} ${l.borrowerId}`
              .toLowerCase()
              .includes(search),
        )) &&
      (category === "All Categories" || b.category === category) &&
      (availability === "All Books" ||
        (availability === "Available"
          ? availableCopies(data, b.id) > 0
          : availableCopies(data, b.id) < b.copies)),
  );
  const filteredBorrowers = data.borrowers.filter((b) =>
    `${b.id} ${b.name} ${b.type} ${b.className} ${b.email}`
      .toLowerCase()
      .includes(search),
  );
  const filteredLoans = (
    section === "Overdue Books"
      ? overdue
      : section === "Returns"
        ? returns
        : loans
  ).filter(matchesLoan);
  const categoryStats = categories.map((name, i) => {
    const titles = data.books.filter((b) => b.category === name),
      copies = titles.reduce((sum, b) => sum + b.copies, 0);
    const onLoan = titles.reduce(
      (sum, b) =>
        sum +
        (categoryPeriod === "All Stock" ? b.openingLoans : 0) +
        data.loans.filter(
          (l) =>
            l.bookId === b.id &&
            !l.returnedDate &&
            (categoryPeriod === "All Stock" || l.year === year),
        ).length,
      0,
    );
    return {
      name,
      total: copies,
      onLoan,
      available: Math.max(0, copies - onLoan),
      color: colors[i],
    };
  });
  const topBooks = data.books
    .map((b) => ({
      ...b,
      borrowed:
        (topPeriod === "This Year" && baseline ? b.historicalBorrowed : 0) +
        loans.filter((l) => l.bookId === b.id).length,
    }))
    .sort((a, b) => b.borrowed - a.borrowed)
    .slice(0, 5);
  const open = (kind: NonNullable<Dialog>["kind"], id?: string) => {
    if (!ready) {
      notify("Please wait for the library connection");
      return;
    }
    setError("");
    setConfirmRemove(false);
    setMenu(false);
    const loan = id ? data.loans.find((l) => l.id === id) : active[0];
    const firstBook = data.books.find((b) => availableCopies(data, b.id) > 0);
    const defaults: Record<string, string> = {
      title: "",
      author: "",
      isbn: "",
      category: "Textbooks",
      copies: "1",
      historicalBorrowed: "0",
      openingLoans: "0",
      color: "blue",
      name: "",
      type: "Student",
      className: "",
      email: "",
      bookId: firstBook?.id || "",
      borrowerId: data.borrowers[0]?.id || "",
      borrowedDate: TODAY,
      dueDate: "2026-11-04",
      returnedDate: TODAY,
      loanId: loan?.id || "",
      note: "Please return this overdue book to the school library.",
    };
    let item: Book | Borrower | undefined;
    if (kind === "book" && id) item = book(id);
    if (kind === "borrower" && id) item = borrower(id);
    if (item)
      Object.assign(
        defaults,
        Object.fromEntries(
          Object.entries(item).map(([k, v]) => [k, String(v)]),
        ),
      );
    setForm(defaults);
    setDialog({ kind, id });
  };
  const save = (event: React.FormEvent) => {
    event.preventDefault();
    if (!dialog || !ready) return;
    let next = current.current;
    const id = dialog.id || crypto.randomUUID();
    if (dialog.kind === "book") {
      const copies = Number(form.copies),
        historicalBorrowed = Number(form.historicalBorrowed),
        openingLoans = Number(form.openingLoans);
      if (
        !form.title.trim() ||
        ![copies, historicalBorrowed, openingLoans].every(
          (n) => Number.isInteger(n) && n >= 0 && n <= 1000000,
        )
      ) {
        setError("Enter a book title and whole counts from 0 to 1,000,000.");
        return;
      }
      const activeCount = next.loans.filter(
        (l) => l.bookId === id && !l.returnedDate,
      ).length;
      if (copies < openingLoans + activeCount) {
        setError(
          "Total copies cannot be less than the opening balance plus active loans.",
        );
        return;
      }
      const row: Book = {
        id,
        title: form.title.trim(),
        author: form.author.trim(),
        isbn: form.isbn.trim(),
        category: form.category,
        copies,
        historicalBorrowed,
        openingLoans,
        color: form.color,
      };
      next = {
        ...next,
        books: dialog.id
          ? next.books.map((b) => (b.id === id ? row : b))
          : [row, ...next.books],
      };
    } else if (dialog.kind === "borrower") {
      if (!form.name.trim()) {
        setError("Enter the borrower name.");
        return;
      }
      const row: Borrower = {
        id,
        name: form.name.trim(),
        type: form.type,
        className: form.className.trim(),
        email: form.email.trim(),
      };
      next = {
        ...next,
        borrowers: dialog.id
          ? next.borrowers.map((b) => (b.id === id ? row : b))
          : [...next.borrowers, row],
      };
    } else if (dialog.kind === "issue") {
      if (
        !next.books.some((b) => b.id === form.bookId) ||
        !next.borrowers.some((b) => b.id === form.borrowerId)
      ) {
        setError("Select a book and registered borrower.");
        return;
      }
      if (availableCopies(next, form.bookId) < 1) {
        setError("There are no copies available for this book.");
        return;
      }
      if (
        !form.borrowedDate ||
        !form.dueDate ||
        form.dueDate < form.borrowedDate
      ) {
        setError("The due date must be on or after the borrowing date.");
        return;
      }
      if (
        next.loans.some(
          (l) =>
            l.bookId === form.bookId &&
            l.borrowerId === form.borrowerId &&
            !l.returnedDate,
        )
      ) {
        setError(
          "This borrower already has this book. Return the existing loan first.",
        );
        return;
      }
      next = {
        ...next,
        loans: [
          {
            id,
            bookId: form.bookId,
            borrowerId: form.borrowerId,
            borrowedDate: form.borrowedDate,
            dueDate: form.dueDate,
            returnedDate: "",
            year,
          },
          ...next.loans,
        ],
      };
    } else if (dialog.kind === "return") {
      const loan = next.loans.find((l) => l.id === form.loanId);
      if (!loan || loan.returnedDate) {
        setError("Select an active loan.");
        return;
      }
      if (!form.returnedDate || form.returnedDate < loan.borrowedDate) {
        setError("Return date must be on or after the borrowing date.");
        return;
      }
      next = {
        ...next,
        loans: next.loans.map((l) =>
          l.id === loan.id ? { ...l, returnedDate: form.returnedDate } : l,
        ),
      };
    } else if (dialog.kind === "reminder") {
      if (!dialog.id || !form.note.trim()) {
        setError("Enter a reminder note.");
        return;
      }
      next = {
        ...next,
        reminders: [
          ...next.reminders,
          {
            id: crypto.randomUUID(),
            loanId: dialog.id,
            date: TODAY,
            note: form.note.trim(),
          },
        ],
      };
    } else return;
    update(next);
    setDialog(null);
    notify(
      dialog.kind === "reminder"
        ? "Reminder logged in the library. No message was sent."
        : "Changes queued for saving",
    );
  };
  const remove = () => {
    if (!dialog?.id) return;
    if (!confirmRemove) {
      setConfirmRemove(true);
      return;
    }
    let next = current.current;
    if (dialog.kind === "book") {
      if (next.loans.some((l) => l.bookId === dialog.id)) {
        setError(
          "This book has borrowing history. Keep the book record to preserve those loans.",
        );
        return;
      }
      next = { ...next, books: next.books.filter((b) => b.id !== dialog.id) };
    } else if (dialog.kind === "borrower") {
      if (next.loans.some((l) => l.borrowerId === dialog.id)) {
        setError(
          "This borrower has loan history. Keep the borrower record to preserve it.",
        );
        return;
      }
      next = {
        ...next,
        borrowers: next.borrowers.filter((b) => b.id !== dialog.id),
      };
    } else if (dialog.kind === "loan")
      next = {
        ...next,
        loans: next.loans.filter((l) => l.id !== dialog.id),
        reminders: next.reminders.filter((r) => r.loanId !== dialog.id),
      };
    else return;
    update(next);
    setDialog(null);
    notify("Record removed");
  };
  const field = (
    key: string,
    label: string,
    type = "text",
    required = false,
  ) => (
    <label className="lib-field" key={key}>
      <span>{label}</span>
      <input
        type={type}
        value={form[key] ?? ""}
        onInput={(e) => {
          const value = e.currentTarget.value;
          setForm((previous) => ({ ...previous, [key]: value }));
        }}
        onChange={(e) =>
          setForm((previous) => ({ ...previous, [key]: e.target.value }))
        }
        required={required}
        min={type === "number" ? 0 : undefined}
        step={type === "number" ? 1 : undefined}
      />
    </label>
  );
  const select = (
    key: string,
    label: string,
    options: { value: string; label: string }[],
  ) => (
    <label className="lib-field">
      <span>{label}</span>
      <select
        value={form[key] || ""}
        required
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
      >
        <option value="" disabled>
          Select {label.toLowerCase()}
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
  const bookTitle = (id: string) => (
    <span className="lib-title">
      <Cover book={book(id)} />
      <span>{book(id)?.title || "Unknown book"}</span>
    </span>
  );
  const loanStatus = (loan: Loan) =>
    loan.returnedDate
      ? "Returned"
      : daysLate(loan, TODAY) > 0
        ? "Overdue"
        : "On Time";
  const loanTable = (rows: Loan[], compact = false) => (
    <div className="lib-table-scroll">
      <table className="lib-table">
        <thead>
          <tr>
            {[
              "#",
              "Book Title",
              "Borrower",
              "Type",
              "Borrowed Date",
              "Due Date",
              "Status",
              ...(compact ? [""] : ["Actions"]),
            ].map((h, i) => (
              <th key={i}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((l, i) => (
            <tr key={l.id}>
              <td>{i + 1}</td>
              <td>
                <button className="lib-text" onClick={() => open("loan", l.id)}>
                  {bookTitle(l.bookId)}
                </button>
              </td>
              <td>{borrower(l.borrowerId)?.name}</td>
              <td>
                <span
                  className={`lib-pill ${borrower(l.borrowerId)?.type?.toLowerCase()}`}
                >
                  {borrower(l.borrowerId)?.type}
                </span>
              </td>
              <td>{displayDate(l.borrowedDate)}</td>
              <td>{displayDate(l.dueDate)}</td>
              <td>
                <span
                  className={`lib-pill ${loanStatus(l) === "Overdue" ? "overdue" : "ontime"}`}
                >
                  {loanStatus(l)}
                </span>
              </td>
              <td>
                <button
                  className="lib-row-more"
                  aria-label={`View loan for ${book(l.bookId)?.title} by ${borrower(l.borrowerId)?.name}`}
                  onClick={() => open("loan", l.id)}
                >
                  <MoreVertical size={15} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && (
        <p className="lib-empty">No borrowings match your filters.</p>
      )}
    </div>
  );
  const exportRecords = () => {
    if (section === "Books")
      exportCSV("edumanage-books.csv", [
        ["Title", "Author", "ISBN", "Category", "Copies", "Available"],
        ...filteredBooks.map((b) => [
          b.title,
          b.author,
          b.isbn,
          b.category,
          b.copies,
          availableCopies(data, b.id),
        ]),
      ]);
    else if (section === "Borrowers")
      exportCSV("edumanage-borrowers.csv", [
        ["ID", "Name", "Type", "Class / Department", "Email"],
        ...filteredBorrowers.map((b) => [
          b.id,
          b.name,
          b.type,
          b.className,
          b.email,
        ]),
      ]);
    else
      exportCSV("edumanage-library-loans.csv", [
        [
          "Book",
          "Borrower",
          "Type",
          "Borrowed Date",
          "Due Date",
          "Returned Date",
          "Status",
        ],
        ...filteredLoans.map((l) => [
          book(l.bookId)?.title || "",
          borrower(l.borrowerId)?.name || "",
          borrower(l.borrowerId)?.type || "",
          l.borrowedDate,
          l.dueDate,
          l.returnedDate,
          loanStatus(l),
        ]),
      ]);
  };
  const selectedLoan = dialog?.id
    ? data.loans.find((l) => l.id === dialog.id)
    : undefined;
  const selectedBook = selectedLoan ? book(selectedLoan.bookId) : undefined,
    selectedBorrower = selectedLoan
      ? borrower(selectedLoan.borrowerId)
      : undefined;
  const trendLabels =
    trendPeriod === "Last 6 months"
      ? ["Apr", "May", "Jun", "Jul", "Aug", "Sep"]
      : [
          "Nov",
          "Dec",
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
        ];
  const historicalBorrowed =
    trendPeriod === "Last 6 months"
      ? [115, 148, 160, 174, 187, 215]
      : [42, 60, 79, 88, 90, 115, 148, 160, 174, 187, 215, 0];
  const historicalReturned =
    trendPeriod === "Last 6 months"
      ? [90, 112, 124, 140, 157, 178]
      : [30, 48, 60, 70, 75, 90, 112, 124, 140, 157, 178, 0];
  const trend = trendLabels.map((label, i) => {
    const month =
      trendPeriod === "Last 6 months"
        ? i + 4
        : [11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10][i];
    const chartYear =
      trendPeriod !== "Last 6 months" && i < 2 ? "2025" : "2026";
    return {
      label,
      borrowed:
        (baseline ? historicalBorrowed[i] : 0) +
        loans.filter((l) =>
          l.borrowedDate.startsWith(
            `${chartYear}-${String(month).padStart(2, "0")}`,
          ),
        ).length,
      returned:
        (baseline ? historicalReturned[i] : 0) +
        returns.filter((l) =>
          l.returnedDate.startsWith(
            `${chartYear}-${String(month).padStart(2, "0")}`,
          ),
        ).length,
    };
  });
  return (
    <div className="lib-workspace">
      <div className="lib-breadcrumb">
        Library <span>›</span> {section}
      </div>
      <div className="lib-heading">
        <div>
          <h1>
            {section === "Overview"
              ? "Library Management"
              : section === "Books"
                ? "Book Catalog"
                : section}
          </h1>
          <p>
            {section === "Overview"
              ? "Manage books, borrowers, and library resources efficiently."
              : section === "Books"
                ? "Find, add, and organize the school’s book collection."
                : section === "Borrowers"
                  ? "Manage students, teachers, and staff registered with the library."
                  : section === "Overdue Books"
                    ? "Review overdue loans and record follow-up reminders."
                    : section === "Returns"
                      ? "Review returned books and their borrowing history."
                      : "Manage issued books, due dates, and returns."}
          </p>
        </div>
        <div className="lib-create">
          <button className="primary" onClick={() => open("book")}>
            <Plus size={21} />
            Add Book
          </button>
          <button
            className="primary"
            aria-label="More library actions"
            onClick={() => setMenu(!menu)}
          >
            <ChevronDown size={16} />
          </button>
          {menu && (
            <div className="lib-menu">
              {(
                [
                  "Books",
                  "Borrowers",
                  "Borrowings",
                  "Overdue Books",
                  "Returns",
                ] as LibrarySection[]
              ).map((name) => (
                <button key={name} onClick={() => go(name)}>
                  {name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      {section === "Overview" ? (
        <>
          <div className="lib-metrics">
            {[
              {
                title: "Total Books",
                value: totalBooks,
                note: "Copies in the library",
                icon: BookOpen,
                color: "blue",
                growth: "12%",
                action: () => go("Books"),
              },
              {
                title: "Total Borrowers",
                value: (baseline ? 832 : 0) + data.borrowers.length,
                note: "Students, Teachers & Staff",
                icon: Users,
                color: "green",
                growth: "8%",
                action: () => go("Borrowers"),
              },
              {
                title: "Books Borrowed",
                value: totalBorrowed,
                note: "This Academic Year",
                icon: BookOpen,
                color: "purple",
                growth: "15%",
                action: () => go("Borrowings"),
              },
              {
                title: "Overdue Books",
                value: (baseline ? 82 : 0) + overdue.length,
                note: "Need attention",
                icon: Clock3,
                color: "orange",
                growth: "5%",
                action: () => go("Overdue Books"),
              },
            ].map(
              ({ title, value, note, icon: Icon, color, growth, action }) => (
                <button
                  className={`lib-metric ${color}`}
                  key={title}
                  onClick={action}
                >
                  <span className="lib-metric-icon">
                    <Icon size={31} />
                  </span>
                  <span>
                    <strong>{number(value)}</strong>
                    <b>{title}</b>
                    <small>{note}</small>
                  </span>
                  {baseline && (
                    <em title="Growth in the supplied demonstration reference">
                      ↑ {growth}
                    </em>
                  )}
                </button>
              ),
            )}
          </div>
          <div className="lib-top">
            <Panel
              title="Book Borrowing Trend"
              icon={ChartNoAxesColumnIncreasing}
              className="lib-trend-panel"
              action={
                <select
                  aria-label="Borrowing trend period"
                  value={trendPeriod}
                  onChange={(e) => setTrendPeriod(e.target.value)}
                >
                  <option>Last 6 months</option>
                  <option>Last 12 months</option>
                </select>
              }
            >
              <p className="lib-chart-note">
                {trendPeriod === "Last 6 months"
                  ? "Reference borrowing history · April–September 2026"
                  : "Reference history and recorded loans · November 2025–October 2026"}
              </p>
              <BorrowChart rows={trend} />
              <div className="lib-chart-legend">
                <span>
                  <i />
                  Books Borrowed
                </span>
                <span>
                  <i />
                  Books Returned
                </span>
              </div>
            </Panel>
            <Panel title="Book Category Distribution" icon={ChartPie}>
              <div className="lib-category">
                <div
                  className="lib-donut"
                  role="img"
                  aria-label={`${number(totalBooks)} books by category`}
                  style={{
                    background: `conic-gradient(${categories
                      .map((name, i) => {
                        const before = data.books
                          .filter((b) => categories.indexOf(b.category) < i)
                          .reduce((sum, b) => sum + b.copies, 0);
                        const count = data.books
                          .filter((b) => b.category === name)
                          .reduce((sum, b) => sum + b.copies, 0);
                        return `${colors[i]} ${totalBooks ? (before / totalBooks) * 100 : 0}% ${totalBooks ? ((before + count) / totalBooks) * 100 : 0}%`;
                      })
                      .join(",")})`,
                  }}
                >
                  <div>
                    <strong>{number(totalBooks)}</strong>
                    <small>Total Books</small>
                  </div>
                </div>
                <div className="lib-category-legend">
                  {categoryStats.map((c) => (
                    <button
                      key={c.name}
                      onClick={() => {
                        go("Books");
                        setCategory(c.name);
                      }}
                    >
                      <i style={{ background: c.color }} />
                      <span>{c.name}</span>
                      <b>
                        {totalBooks
                          ? Math.round((c.total / totalBooks) * 100)
                          : 0}
                        %
                      </b>
                    </button>
                  ))}
                </div>
              </div>
            </Panel>
            <div className="lib-tools">
              <Panel title="Quick Actions" icon={Search}>
                <div className="lib-quick">
                  {[
                    {
                      name: "Add Book",
                      icon: BookOpen,
                      color: "orange",
                      action: () => open("book"),
                    },
                    {
                      name: "Register Borrower",
                      icon: UserRoundPlus,
                      color: "blue",
                      action: () => open("borrower"),
                    },
                    {
                      name: "Issue Book",
                      icon: BookUp,
                      color: "green",
                      action: () => open("issue"),
                    },
                    {
                      name: "Return Book",
                      icon: Undo2,
                      color: "green",
                      action: () => open("return"),
                    },
                  ].map(({ name, icon: Icon, color, action }) => (
                    <button key={name} className={color} onClick={action}>
                      <Icon size={27} />
                      <span>{name}</span>
                    </button>
                  ))}
                </div>
              </Panel>
              <Panel title="Search Library" icon={Search}>
                <form
                  className="lib-search-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    go("Books", searchDraft);
                  }}
                >
                  <label>
                    <Search size={17} />
                    <input
                      aria-label="Search library books"
                      placeholder="Search by title, author, ISBN..."
                      value={searchDraft}
                      onChange={(e) => setSearchDraft(e.target.value)}
                    />
                  </label>
                  <button type="submit">Search</button>
                </form>
              </Panel>
            </div>
          </div>
          <div className="lib-middle">
            <Panel
              title="Recent Borrowings"
              icon={BookOpen}
              action={
                <button className="lib-link" onClick={() => go("Borrowings")}>
                  View All
                </button>
              }
            >
              {loanTable(active.filter(matchesLoan).slice(0, 5), true)}
            </Panel>
            <Panel
              title="Overdue Books"
              icon={Clock3}
              className="lib-overdue-panel"
              action={
                <button
                  className="lib-link"
                  onClick={() => go("Overdue Books")}
                >
                  View All
                </button>
              }
            >
              <div className="lib-table-scroll">
                <table className="lib-table">
                  <thead>
                    <tr>
                      {[
                        "#",
                        "Book Title",
                        "Borrower",
                        "Days Overdue",
                        "Action",
                      ].map((h) => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {overdue
                      .filter(matchesLoan)
                      .slice(0, 5)
                      .map((l, i) => (
                        <tr key={l.id}>
                          <td>{i + 1}</td>
                          <td>
                            <button
                              className="lib-text"
                              onClick={() => open("loan", l.id)}
                            >
                              {bookTitle(l.bookId)}
                            </button>
                          </td>
                          <td>{borrower(l.borrowerId)?.name}</td>
                          <td>
                            <span className="lib-pill overdue">
                              {daysLate(l, TODAY)} days
                            </span>
                          </td>
                          <td>
                            <button
                              className="lib-view"
                              onClick={() => open("reminder", l.id)}
                            >
                              Remind
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                {!overdue.length && (
                  <p className="lib-empty">
                    No overdue records for this academic year.
                  </p>
                )}
              </div>
            </Panel>
          </div>
          <div className="lib-bottom">
            <Panel
              title="Top Borrowed Books"
              icon={Trophy}
              action={
                <select
                  aria-label="Top books period"
                  value={topPeriod}
                  onChange={(e) => setTopPeriod(e.target.value)}
                >
                  <option>This Year</option>
                  <option>Recorded Loans</option>
                </select>
              }
            >
              <div className="lib-table-scroll">
                <table className="lib-table">
                  <thead>
                    <tr>
                      {["#", "Book Title", "Author", "Total Borrowed"].map(
                        (h) => (
                          <th key={h}>{h}</th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {topBooks.map((b, i) => (
                      <tr key={b.id}>
                        <td>{i + 1}</td>
                        <td>
                          <button
                            className="lib-text"
                            onClick={() => open("book", b.id)}
                          >
                            <span className="lib-title">
                              <Cover book={b} />
                              {b.title}
                            </span>
                          </button>
                        </td>
                        <td>{b.author}</td>
                        <td>
                          <strong>{b.borrowed}</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
            <Panel
              title="Popular Categories"
              icon={ChartNoAxesColumnIncreasing}
              action={
                <select
                  aria-label="Category availability scope"
                  value={categoryPeriod}
                  onChange={(e) => setCategoryPeriod(e.target.value)}
                >
                  <option>All Stock</option>
                  <option>Recorded Loans</option>
                </select>
              }
            >
              <div className="lib-table-scroll">
                <table className="lib-table">
                  <thead>
                    <tr>
                      {[
                        "Category",
                        "Total Books",
                        "Borrowed",
                        "Availability",
                      ].map((h) => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {categoryStats.map((c) => (
                      <tr key={c.name}>
                        <td>
                          <button
                            className="lib-text"
                            onClick={() => {
                              go("Books");
                              setCategory(c.name);
                            }}
                          >
                            {c.name}
                          </button>
                        </td>
                        <td>{number(c.total)}</td>
                        <td>{number(c.onLoan)}</td>
                        <td>
                          <div className="lib-availability">
                            <i>
                              <b
                                style={{
                                  width: `${c.total ? (c.available / c.total) * 100 : 0}%`,
                                  background: c.color,
                                }}
                              />
                            </i>
                            <span>
                              {c.total
                                ? Math.round((c.available / c.total) * 100)
                                : 0}
                              %
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
            <Panel
              title="Recent Returns"
              icon={Undo2}
              action={
                <button className="lib-link" onClick={() => go("Returns")}>
                  View All
                </button>
              }
            >
              <div className="lib-table-scroll">
                <table className="lib-table">
                  <thead>
                    <tr>
                      {["#", "Book Title", "Returned By", "Returned Date"].map(
                        (h) => (
                          <th key={h}>{h}</th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {returns
                      .filter(matchesLoan)
                      .slice(0, 5)
                      .map((l, i) => (
                        <tr key={l.id}>
                          <td>{i + 1}</td>
                          <td>
                            <button
                              className="lib-text"
                              onClick={() => open("loan", l.id)}
                            >
                              {bookTitle(l.bookId)}
                            </button>
                          </td>
                          <td>{borrower(l.borrowerId)?.name}</td>
                          <td>{displayDate(l.returnedDate)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                {!returns.length && (
                  <p className="lib-empty">No returned books recorded.</p>
                )}
              </div>
            </Panel>
          </div>
        </>
      ) : (
        <Panel
          title={section === "Books" ? "Books in the Library" : section}
          icon={
            section === "Borrowers"
              ? Users
              : section === "Returns"
                ? Undo2
                : BookOpen
          }
          action={
            <button className="lib-link" onClick={() => go("Overview")}>
              <ArrowLeft size={14} />
              Back to Overview
            </button>
          }
        >
          <div className="lib-directory-tools">
            <label>
              <Search size={17} />
              <input
                aria-label={`Search ${section}`}
                placeholder="Search books, borrowers, authors, ISBN..."
                value={localQuery}
                onChange={(e) => setLocalQuery(e.target.value)}
              />
            </label>
            {section === "Books" && (
              <>
                <select
                  aria-label="Book category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {["All Categories", ...categories].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
                <select
                  aria-label="Book availability"
                  value={availability}
                  onChange={(e) => setAvailability(e.target.value)}
                >
                  <option>All Books</option>
                  <option>Available</option>
                  <option>On Loan</option>
                </select>
              </>
            )}
            <button className="lib-secondary" onClick={exportRecords}>
              <Download size={15} />
              Export CSV
            </button>
            <button
              className="primary"
              onClick={() =>
                open(
                  section === "Books"
                    ? "book"
                    : section === "Borrowers"
                      ? "borrower"
                      : section === "Returns"
                        ? "return"
                        : "issue",
                )
              }
            >
              <Plus size={16} />
              {section === "Books"
                ? "Add Book"
                : section === "Borrowers"
                  ? "Register Borrower"
                  : section === "Returns"
                    ? "Return Book"
                    : "Issue Book"}
            </button>
          </div>
          {section === "Books" ? (
            <div className="lib-table-scroll">
              <table className="lib-table">
                <thead>
                  <tr>
                    {[
                      "Book Title",
                      "Author",
                      "ISBN",
                      "Category",
                      "Copies",
                      "Available",
                      "Actions",
                    ].map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredBooks.map((b) => (
                    <tr key={b.id}>
                      <td>
                        <button
                          className="lib-text"
                          onClick={() => open("book", b.id)}
                        >
                          <span className="lib-title">
                            <Cover book={b} />
                            {b.title}
                          </span>
                        </button>
                      </td>
                      <td>{b.author}</td>
                      <td>{b.isbn}</td>
                      <td>{b.category}</td>
                      <td>{b.copies}</td>
                      <td>{availableCopies(data, b.id)}</td>
                      <td>
                        <div className="lib-row-actions">
                          <button
                            className="lib-view"
                            onClick={() => open("book", b.id)}
                          >
                            Edit
                          </button>
                          <button
                            className="lib-view"
                            disabled={availableCopies(data, b.id) < 1}
                            onClick={() => {
                              open("issue");
                              setForm((previous) => ({
                                ...previous,
                                bookId: b.id,
                              }));
                            }}
                          >
                            Issue
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!filteredBooks.length && (
                <p className="lib-empty">
                  No books match your search or filters.
                </p>
              )}
            </div>
          ) : section === "Borrowers" ? (
            <div className="lib-table-scroll">
              <table className="lib-table">
                <thead>
                  <tr>
                    {[
                      "Borrower ID",
                      "Name",
                      "Type",
                      "Class / Department",
                      "Email",
                      "Active Loans",
                      "Actions",
                    ].map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredBorrowers.map((b) => (
                    <tr key={b.id}>
                      <td>{b.id}</td>
                      <td>{b.name}</td>
                      <td>
                        <span className={`lib-pill ${b.type.toLowerCase()}`}>
                          {b.type}
                        </span>
                      </td>
                      <td>{b.className || "—"}</td>
                      <td>{b.email || "—"}</td>
                      <td>
                        {
                          data.loans.filter(
                            (l) => l.borrowerId === b.id && !l.returnedDate,
                          ).length
                        }
                      </td>
                      <td>
                        <button
                          className="lib-view"
                          onClick={() => open("borrower", b.id)}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!filteredBorrowers.length && (
                <p className="lib-empty">No borrowers match your search.</p>
              )}
            </div>
          ) : (
            loanTable(filteredLoans)
          )}
        </Panel>
      )}
      <footer className="lib-footer">
        <span aria-live="polite">{saveStatus}</span>
        {failed.current && (
          <button onClick={() => persist(current.current)}>Retry save</button>
        )}
        <span>
          Demonstration library · Reference opening balances; tables show
          tracked records · {TODAY}
        </span>
      </footer>
      {dialog && (
        <div
          className="lib-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDialog(null);
          }}
        >
          <div
            className="lib-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="lib-dialog-title"
          >
            <div className="lib-dialog-head">
              <div>
                <small>EDUMANAGE LIBRARY · {year}</small>
                <h2 id="lib-dialog-title">
                  {dialog.kind === "book"
                    ? dialog.id
                      ? "Edit Book"
                      : "Add Book"
                    : dialog.kind === "borrower"
                      ? dialog.id
                        ? "Edit Borrower"
                        : "Register Borrower"
                      : dialog.kind === "issue"
                        ? "Issue Book"
                        : dialog.kind === "return"
                          ? "Return Book"
                          : dialog.kind === "reminder"
                            ? "Overdue Reminder"
                            : "Borrowing Details"}
                </h2>
              </div>
              <button
                aria-label="Close library dialog"
                onClick={() => setDialog(null)}
              >
                <X size={21} />
              </button>
            </div>
            {dialog.kind === "loan" && selectedLoan ? (
              <div className="lib-dialog-body">
                <div className="lib-loan-hero">
                  <Cover book={selectedBook} />
                  <div>
                    <h3>{selectedBook?.title}</h3>
                    <p>
                      {selectedBorrower?.name} · {selectedBorrower?.type}
                    </p>
                  </div>
                  <span
                    className={`lib-pill ${daysLate(selectedLoan, TODAY) > 0 ? "overdue" : "ontime"}`}
                  >
                    {loanStatus(selectedLoan)}
                  </span>
                </div>
                <div className="lib-detail-grid">
                  {[
                    ["Borrower ID", selectedLoan.borrowerId],
                    ["Borrowed", displayDate(selectedLoan.borrowedDate)],
                    ["Due", displayDate(selectedLoan.dueDate)],
                    [
                      "Returned",
                      selectedLoan.returnedDate
                        ? displayDate(selectedLoan.returnedDate)
                        : "Not returned",
                    ],
                    [
                      "Available copies",
                      availableCopies(data, selectedLoan.bookId),
                    ],
                    [
                      "Reminders logged",
                      data.reminders.filter((r) => r.loanId === selectedLoan.id)
                        .length,
                    ],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <small>{label}</small>
                      <strong>{value}</strong>
                    </div>
                  ))}
                </div>
                {data.reminders
                  .filter((r) => r.loanId === selectedLoan.id)
                  .map((r) => (
                    <p className="lib-reminder" key={r.id}>
                      <Bell size={14} />
                      {displayDate(r.date)} · {r.note}
                    </p>
                  ))}
                {error && (
                  <p role="alert" className="lib-error">
                    {error}
                  </p>
                )}
                <div className="lib-dialog-actions">
                  {!selectedLoan.returnedDate && (
                    <>
                      <button
                        className="primary"
                        onClick={() => open("return", selectedLoan.id)}
                      >
                        Return Book
                      </button>
                      <button
                        className="lib-secondary"
                        onClick={() => open("reminder", selectedLoan.id)}
                      >
                        Log Reminder
                      </button>
                    </>
                  )}
                  <button className="lib-secondary" onClick={remove}>
                    {confirmRemove
                      ? "Confirm Remove Loan Record"
                      : "Remove Loan Record"}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={save}>
                <div className="lib-form-grid">
                  {dialog.kind === "book" ? (
                    <>
                      {field("title", "Book title", "text", true)}
                      {field("author", "Author")}
                      {field("isbn", "ISBN")}
                      {select(
                        "category",
                        "Category",
                        categories.map((c) => ({ value: c, label: c })),
                      )}
                      {field("copies", "Total copies", "number", true)}
                      {field(
                        "openingLoans",
                        "Opening loan balance",
                        "number",
                        true,
                      )}
                      {field(
                        "historicalBorrowed",
                        "Earlier borrowings (2025–2026)",
                        "number",
                        true,
                      )}
                      {select(
                        "color",
                        "Cover color",
                        [
                          "blue",
                          "teal",
                          "navy",
                          "amber",
                          "olive",
                          "cream",
                          "red",
                        ].map((c) => ({ value: c, label: c })),
                      )}
                      <p className="lib-form-note">
                        Opening loans are copies already on loan when this
                        catalog starts. Tracked loans are added separately.
                      </p>
                    </>
                  ) : dialog.kind === "borrower" ? (
                    <>
                      {field("name", "Borrower name", "text", true)}
                      {select(
                        "type",
                        "Borrower type",
                        ["Student", "Teacher", "Staff"].map((c) => ({
                          value: c,
                          label: c,
                        })),
                      )}
                      {field("className", "Class / Department")}
                      {field("email", "Email", "email")}
                    </>
                  ) : dialog.kind === "issue" ? (
                    <>
                      {select(
                        "bookId",
                        "Book",
                        data.books
                          .filter((b) => availableCopies(data, b.id) > 0)
                          .map((b) => ({
                            value: b.id,
                            label: `${b.title} · ${availableCopies(data, b.id)} available`,
                          })),
                      )}
                      {select(
                        "borrowerId",
                        "Borrower",
                        data.borrowers.map((b) => ({
                          value: b.id,
                          label: `${b.name} · ${b.id}`,
                        })),
                      )}
                      {field("borrowedDate", "Borrowed date", "date", true)}
                      {field("dueDate", "Due date", "date", true)}
                      {(!data.books.length || !data.borrowers.length) && (
                        <p className="lib-form-note">
                          Add a book and register a borrower before issuing a
                          loan.
                        </p>
                      )}
                    </>
                  ) : dialog.kind === "return" ? (
                    <>
                      {select(
                        "loanId",
                        "Active loan",
                        active.map((l) => ({
                          value: l.id,
                          label: `${book(l.bookId)?.title} · ${borrower(l.borrowerId)?.name}`,
                        })),
                      )}
                      {field("returnedDate", "Return date", "date", true)}
                      {!active.length && (
                        <p className="lib-form-note">
                          There are no active tracked loans for this academic
                          year.
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="lib-form-note">
                        <strong>{selectedBook?.title}</strong>
                        <br />
                        {selectedBorrower?.name} · Due{" "}
                        {selectedLoan ? displayDate(selectedLoan.dueDate) : ""}
                        <br />
                        This records a follow-up note in the library. It does
                        not send an email or notification to the borrower.
                      </div>
                      <label className="lib-field lib-full">
                        <span>Reminder note</span>
                        <textarea
                          value={form.note}
                          onChange={(e) =>
                            setForm({ ...form, note: e.target.value })
                          }
                          required
                          rows={4}
                        />
                      </label>
                    </>
                  )}
                </div>
                {error && (
                  <p role="alert" className="lib-error">
                    {error}
                  </p>
                )}
                <div className="lib-dialog-actions">
                  {dialog.id && ["book", "borrower"].includes(dialog.kind) && (
                    <button
                      type="button"
                      className="lib-secondary lib-remove"
                      onClick={remove}
                    >
                      {confirmRemove
                        ? "Confirm Remove Record"
                        : "Remove Record"}
                    </button>
                  )}
                  <button
                    type="button"
                    className="lib-secondary"
                    onClick={() => setDialog(null)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="primary">
                    <Check size={16} />
                    {dialog.kind === "reminder"
                      ? "Log Reminder"
                      : "Save Changes"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
function BorrowChart({
  rows,
}: {
  rows: { label: string; borrowed: number; returned: number }[];
}) {
  const max = Math.max(250, ...rows.flatMap((r) => [r.borrowed, r.returned])),
    step = 520 / rows.length;
  return (
    <svg
      className="lib-trend"
      viewBox="0 0 570 150"
      role="img"
      aria-label="Books borrowed and returned by month"
    >
      <defs>
        <linearGradient id="lib-blue" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#197aff" />
          <stop offset="1" stopColor="#7cb2ff" />
        </linearGradient>
        <linearGradient id="lib-orange" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#ff9a27" />
          <stop offset="1" stopColor="#ffdbac" />
        </linearGradient>
      </defs>
      {Array.from({ length: 6 }, (_, i) => (i * max) / 5).map((n) => (
        <g key={n}>
          <line
            x1="35"
            x2="555"
            y1={120 - (n / max) * 110}
            y2={120 - (n / max) * 110}
            stroke="#e8eef7"
          />
          <text x="27" y={123 - (n / max) * 110} textAnchor="end">
            {Math.round(n)}
          </text>
        </g>
      ))}
      {rows.map((r, i) => {
        const x = 35 + i * step + step * 0.17,
          w = step * 0.3;
        return (
          <g key={r.label}>
            <rect
              x={x}
              y={120 - (r.borrowed / max) * 110}
              width={w}
              height={(r.borrowed / max) * 110}
              rx="2"
              fill="url(#lib-blue)"
            >
              <title>{`${r.label}: ${r.borrowed} books borrowed`}</title>
            </rect>
            <rect
              x={x + w + 4}
              y={120 - (r.returned / max) * 110}
              width={w}
              height={(r.returned / max) * 110}
              rx="2"
              fill="url(#lib-orange)"
            >
              <title>{`${r.label}: ${r.returned} books returned`}</title>
            </rect>
            <text x={35 + i * step + step / 2} y="137" textAnchor="middle">
              {r.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
