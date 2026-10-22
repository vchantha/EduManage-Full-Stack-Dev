"use client";
import { useEffect, useRef, useState } from "react";
import {
  Pencil,
  Banknote,
  HandCoins,
  CalendarClock,
  Users,
  ChartNoAxesColumnIncreasing,
  Settings,
  FileText,
  CreditCard,
  ClipboardList,
  BookOpen,
  Bus,
  Activity,
  Shield,
  Plus,
  ChevronDown,
  MoreVertical,
  X,
  Check,
  Download,
  ArrowLeft,
  Search,
  Zap,
  ChartPie,
  Receipt,
  AlertCircle,
  Wallet,
} from "lucide-react";
import {
  FinanceData,
  FinanceSection,
  Invoice,
  Payment,
  FeeType,
  FeeStudent,
  initialFinance,
  financeColors,
  money,
  toCents,
  inputAmount,
  paidFor,
  balanceFor,
  lateDays,
  invoiceStatus,
  feeDate,
} from "./finance-data";
type Dialog = {
  kind:
    | "invoice"
    | "payment"
    | "details"
    | "receipt"
    | "fee"
    | "student"
    | "report"
    | "void"
    | "cancel";
  id?: string;
} | null;
type Tab =
  | "Recent Invoices"
  | "Recent Payments"
  | "Outstanding Fees"
  | "Overdue Accounts";
const TODAY = "2026-10-22";
const percent = (part: number, total: number) =>
  total ? Math.round((part / total) * 100) : 0;
function Chip({ text }: { text: string }) {
  return (
    <span className={`fin-chip ${text.toLowerCase().replaceAll(" ", "-")}`}>
      {text}
    </span>
  );
}
function Panel({
  title,
  icon: Icon,
  action,
  children,
  className = "",
}: {
  title: string;
  icon: typeof FileText;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`fin-panel ${className}`}>
      <div className="fin-panel-head">
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
function saveFile(name: string, body: string, type: string) {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
function csv(name: string, rows: (string | number)[][]) {
  saveFile(
    name,
    "\ufeff" +
      rows
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
        .join("\r\n"),
    "text/csv;charset=utf-8",
  );
}
const escapeHTML = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
const allocate = (amount: number) => {
  const weights = [8, 8, 8, 9, 9, 8, 10, 12, 10, 8, 5, 5],
    values = weights.map((weight) => Math.floor((amount * weight) / 100));
  values[11] += amount - values.reduce((sum, n) => sum + n, 0);
  return values;
};
export default function FinanceWorkspace({
  year,
  term,
  query,
  notify,
}: {
  year: string;
  term: string;
  query: string;
  notify: (message: string) => void;
}) {
  const [data, setData] = useState<FinanceData>(initialFinance),
    [ready, setReady] = useState(false),
    [saveStatus, setSaveStatus] = useState("Loading finance records..."),
    [section, setSection] = useState<FinanceSection>("Overview"),
    [tab, setTab] = useState<Tab>("Recent Invoices"),
    [dialog, setDialog] = useState<Dialog>(null),
    [form, setForm] = useState<Record<string, string>>({}),
    [error, setError] = useState(""),
    [menu, setMenu] = useState(false),
    [allRows, setAllRows] = useState(false),
    [history, setHistory] = useState(false),
    [localQuery, setLocalQuery] = useState(""),
    [selected, setSelected] = useState<string[]>([]),
    [chartYear, setChartYear] = useState(year);
  const csrf = useRef(""),
    current = useRef(data),
    queue = useRef(Promise.resolve()),
    alive = useRef(true),
    failed = useRef(false);
  useEffect(() => {
    alive.current = true;
    fetch("/api/finance")
      .then(async (response) => {
        if (!response.ok) throw Error("Could not load finance records");
        const payload = await response.json();
        if (alive.current) {
          if (payload.data) {
            current.current = payload.data;
            setData(payload.data);
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
    setSelected([]);
    setChartYear(year);
    setAllRows(false);
  }, [year, term]);
  useEffect(() => {
    if (query.trim()) {
      setSection("Overview");
      setAllRows(true);
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
  const persist = (next: FinanceData) => {
    failed.current = false;
    setSaveStatus("Saving changes...");
    queue.current = queue.current
      .catch(() => {})
      .then(async () => {
        try {
          const response = await fetch("/api/finance", {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "X-CSRFToken": csrf.current,
            },
            body: JSON.stringify({ data: next }),
          });
          if (!response.ok) {
            const body = await response.json();
            throw Error(body.error || "Could not save finance records");
          }
          failed.current = false;
          if (alive.current) setSaveStatus("All changes saved");
        } catch (e) {
          failed.current = true;
          if (alive.current) {
            setSaveStatus("Changes not saved · retry");
            notify(
              e instanceof Error ? e.message : "Could not save finance records",
            );
          }
        }
      });
  };
  const update = (next: FinanceData) => {
    if (!ready) {
      notify("Please wait for the finance connection");
      return;
    }
    current.current = next;
    setData(next);
    persist(next);
  };
  const student = (id: string) => data.students.find((s) => s.id === id),
    fee = (id: string) => data.feeTypes.find((f) => f.id === id),
    invoice = (id: string) => data.invoices.find((i) => i.id === id);
  const baseline = year === "2025 - 2026" && term === "Term 1",
    periodInvoices = data.invoices.filter(
      (i) => i.year === year && i.term === term,
    ),
    activeInvoices = periodInvoices.filter((i) => !i.cancelled),
    payments = data.payments.filter((p) =>
      periodInvoices.some((i) => i.id === p.invoiceId),
    ),
    activePayments = payments.filter((p) => !p.voided);
  const openingExpected = baseline
      ? data.feeTypes.reduce((sum, f) => sum + f.openingExpectedCents, 0)
      : 0,
    openingCollected = baseline
      ? data.feeTypes.reduce((sum, f) => sum + f.openingCollectedCents, 0)
      : 0,
    openingOverdue = baseline
      ? data.feeTypes.reduce((sum, f) => sum + f.openingOverdueCents, 0)
      : 0;
  const expected =
      openingExpected +
      activeInvoices.reduce((sum, i) => sum + i.amountCents, 0),
    collected =
      openingCollected +
      activePayments.reduce((sum, p) => sum + p.amountCents, 0),
    outstanding = expected - collected;
  const overdueInvoices = activeInvoices.filter(
      (i) => invoiceStatus(data, i, TODAY) === "Overdue",
    ),
    overdue =
      openingOverdue +
      overdueInvoices.reduce((sum, i) => sum + balanceFor(data, i), 0),
    currentOutstanding = outstanding - overdue;
  const search = (query || localQuery).trim().toLowerCase();
  const matches = (i: Invoice) =>
    `${i.number} ${student(i.studentId)?.name} ${i.studentId} ${student(i.studentId)?.className} ${fee(i.feeTypeId)?.name} ${data.payments
      .filter((p) => p.invoiceId === i.id)
      .map((p) => p.receipt + " " + p.reference + " " + p.method)
      .join(" ")}`
      .toLowerCase()
      .includes(search);
  const invoiceRows = periodInvoices.filter(
    (i) =>
      (history || !i.cancelled) &&
      matches(i) &&
      (tab === "Outstanding Fees"
        ? balanceFor(data, i) > 0
        : tab === "Overdue Accounts"
          ? invoiceStatus(data, i, TODAY) === "Overdue"
          : true),
  );
  const paymentRows = payments
    .filter(
      (p) =>
        (history || !p.voided) &&
        `${p.receipt} ${p.reference} ${p.method} ${invoice(p.invoiceId)?.number} ${student(invoice(p.invoiceId)?.studentId || "")?.name}`
          .toLowerCase()
          .includes(search),
    )
    .sort((a, b) => b.date.localeCompare(a.date));
  const unpaid = activeInvoices
    .filter(
      (i) => paidFor(data, i.id) === 0 && balanceFor(data, i) > 0 && matches(i),
    )
    .sort((a, b) => balanceFor(data, b) - balanceFor(data, a));
  const feeStats = data.feeTypes.map((f, index) => {
    const rows = activeInvoices.filter((i) => i.feeTypeId === f.id),
      amount =
        (baseline ? f.openingExpectedCents : 0) +
        rows.reduce((sum, i) => sum + i.amountCents, 0);
    return {
      ...f,
      amount,
      collected:
        (baseline ? f.openingCollectedCents : 0) +
        activePayments
          .filter((p) => rows.some((i) => i.id === p.invoiceId))
          .reduce((sum, p) => sum + p.amountCents, 0),
      chartColor: financeColors[index % financeColors.length],
    };
  });
  const go = (next: FinanceSection) => {
    setSection(next);
    setDialog(null);
    setMenu(false);
    setLocalQuery("");
    setSelected([]);
  };
  const open = (kind: NonNullable<Dialog>["kind"], id?: string) => {
    if (!ready) {
      notify("Please wait for the finance connection");
      return;
    }
    setError("");
    setMenu(false);
    const selectedInvoice = id
        ? invoice(id)
        : activeInvoices.find((i) => balanceFor(data, i) > 0),
      selectedFee = id ? fee(id) : undefined,
      selectedStudent = id ? student(id) : undefined;
    const defaults: Record<string, string> = {
      studentId: data.students[0]?.id || "",
      feeTypeId: data.feeTypes[0]?.id || "",
      amount: "",
      issueDate: TODAY,
      dueDate: "2026-11-05",
      note: "",
      invoiceId: selectedInvoice?.id || "",
      date: TODAY,
      method: "Bank Transfer",
      reference: "",
      name: "",
      color: "green",
      openingExpected: "0.00",
      openingCollected: "0.00",
      openingOverdue: "0.00",
      studentCode: "",
      className: "",
      reason: "",
    };
    if (kind === "invoice" && id && selectedInvoice) {
      Object.assign(defaults, {
        studentId: selectedInvoice.studentId,
        feeTypeId: selectedInvoice.feeTypeId,
        amount: inputAmount(selectedInvoice.amountCents),
        issueDate: selectedInvoice.issueDate,
        dueDate: selectedInvoice.dueDate,
        note: selectedInvoice.note,
      });
    }
    if (kind === "payment" && selectedInvoice)
      defaults.amount = inputAmount(balanceFor(data, selectedInvoice));
    if (kind === "fee" && selectedFee)
      Object.assign(defaults, {
        name: selectedFee.name,
        color: selectedFee.color,
        openingExpected: inputAmount(selectedFee.openingExpectedCents),
        openingCollected: inputAmount(selectedFee.openingCollectedCents),
        openingOverdue: inputAmount(selectedFee.openingOverdueCents),
      });
    if (kind === "student" && selectedStudent)
      Object.assign(defaults, {
        name: selectedStudent.name,
        className: selectedStudent.className,
        studentCode: selectedStudent.id,
      });
    setForm(defaults);
    setDialog({ kind, id });
  };
  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dialog || !ready) return;
    let next = current.current;
    const id = dialog.id || crypto.randomUUID();
    if (dialog.kind === "invoice") {
      const amount = toCents(form.amount);
      if (
        !Number.isFinite(amount) ||
        amount <= 0 ||
        !form.studentId ||
        !form.feeTypeId ||
        !form.issueDate ||
        !form.dueDate ||
        form.dueDate < form.issueDate
      ) {
        setError(
          "Choose a student and fee type, enter a positive amount with at most two decimal places, and a due date on or after the invoice date.",
        );
        return;
      }
      if (amount < paidFor(next, id)) {
        setError(
          "Invoice amount cannot be less than the payments already recorded.",
        );
        return;
      }
      const old = next.invoices.find((i) => i.id === id);
      let serial = next.invoices.length + 1;
      const prefix = `INV-${TODAY.replaceAll("-", "")}-`;
      while (
        next.invoices.some(
          (i) => i.number === prefix + String(serial).padStart(4, "0"),
        )
      )
        serial++;
      const row: Invoice = {
        id,
        number: old?.number || prefix + String(serial).padStart(4, "0"),
        studentId: form.studentId,
        feeTypeId: form.feeTypeId,
        amountCents: amount,
        issueDate: form.issueDate,
        dueDate: form.dueDate,
        year: old?.year || year,
        term: old?.term || term,
        note: form.note,
        cancelled: old?.cancelled || false,
      };
      if (
        next.payments.some((p) => p.invoiceId === id && p.date < row.issueDate)
      ) {
        setError(
          "Invoice date cannot be later than a payment already recorded.",
        );
        return;
      }
      next = {
        ...next,
        invoices: old
          ? next.invoices.map((i) => (i.id === id ? row : i))
          : [row, ...next.invoices],
      };
    } else if (dialog.kind === "payment") {
      const target = next.invoices.find((i) => i.id === form.invoiceId),
        amount = toCents(form.amount);
      if (
        !target ||
        target.cancelled ||
        !Number.isFinite(amount) ||
        amount <= 0 ||
        amount > balanceFor(next, target)
      ) {
        setError(
          "Select an open invoice and enter a positive payment no greater than its outstanding balance.",
        );
        return;
      }
      if (!form.date || form.date < target.issueDate) {
        setError("Payment date cannot precede the invoice date.");
        return;
      }
      next = {
        ...next,
        payments: [
          ...next.payments,
          {
            id: crypto.randomUUID(),
            invoiceId: target.id,
            amountCents: amount,
            date: form.date,
            method: form.method,
            reference: form.reference.trim(),
            receipt: `RCP-${TODAY.replaceAll("-", "")}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
            voided: false,
            voidReason: "",
          },
        ],
      };
    } else if (dialog.kind === "fee") {
      const a = toCents(form.openingExpected),
        b = toCents(form.openingCollected),
        c = toCents(form.openingOverdue);
      if (!form.name.trim() || ![a, b, c].every(Number.isFinite) || b + c > a) {
        setError(
          "Enter a fee name and valid opening amounts. Collected plus overdue cannot exceed expected fees.",
        );
        return;
      }
      if (
        next.feeTypes.some(
          (f) =>
            f.id !== id &&
            f.name.toLowerCase() === form.name.trim().toLowerCase(),
        )
      ) {
        setError("That fee type already exists.");
        return;
      }
      const row: FeeType = {
        id,
        name: form.name.trim(),
        color: form.color,
        openingExpectedCents: a,
        openingCollectedCents: b,
        openingOverdueCents: c,
      };
      next = {
        ...next,
        feeTypes: dialog.id
          ? next.feeTypes.map((f) => (f.id === id ? row : f))
          : [...next.feeTypes, row],
      };
    } else if (dialog.kind === "student") {
      const code = dialog.id || form.studentCode.trim();
      if (!code || !form.name.trim() || !form.className.trim()) {
        setError("Enter a student ID, name, and class.");
        return;
      }
      if (
        !dialog.id &&
        next.students.some((s) => s.id.toLowerCase() === code.toLowerCase())
      ) {
        setError("That student ID already exists.");
        return;
      }
      const row: FeeStudent = {
        id: code,
        name: form.name.trim(),
        className: form.className.trim(),
      };
      next = {
        ...next,
        students: dialog.id
          ? next.students.map((s) => (s.id === code ? row : s))
          : [...next.students, row],
      };
    } else if (dialog.kind === "void") {
      if (!form.reason.trim()) {
        setError("Enter a reason for voiding this payment record.");
        return;
      }
      next = {
        ...next,
        payments: next.payments.map((p) =>
          p.id === id
            ? { ...p, voided: true, voidReason: form.reason.trim() }
            : p,
        ),
      };
    } else if (dialog.kind === "cancel") {
      if (paidFor(next, id) > 0) {
        setError("Void the recorded payments before cancelling this invoice.");
        return;
      }
      if (!form.reason.trim()) {
        setError("Enter a cancellation reason.");
        return;
      }
      next = {
        ...next,
        invoices: next.invoices.map((i) =>
          i.id === id
            ? {
                ...i,
                cancelled: true,
                note: `${i.note}\nCancelled: ${form.reason.trim()}`.trim(),
              }
            : i,
        ),
      };
    } else return;
    update(next);
    setDialog(null);
    notify(
      dialog.kind === "payment"
        ? "Payment recorded in the school ledger"
        : dialog.kind === "void"
          ? "Payment record voided; history retained"
          : dialog.kind === "cancel"
            ? "Invoice cancelled; history retained"
            : "Changes queued for saving",
    );
  };
  const field = (
    key: string,
    label: string,
    type = "text",
    required = true,
  ) => (
    <label className="fin-field">
      <span>{label}</span>
      <input
        type={type}
        value={form[key] ?? ""}
        onInput={(e) => {
          const value = e.currentTarget.value;
          setForm((previous) => ({ ...previous, [key]: value }));
        }}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        required={required}
        min={type === "number" ? 0 : undefined}
        step={type === "number" ? "0.01" : undefined}
        readOnly={key === "studentCode" && !!dialog?.id}
      />
    </label>
  );
  const select = (
    key: string,
    label: string,
    options: { value: string; label: string }[],
  ) => (
    <label className="fin-field">
      <span>{label}</span>
      <select
        required
        value={form[key] || ""}
        onChange={(e) => {
          const value = e.target.value;
          setForm((previous) => ({
            ...previous,
            [key]: value,
            ...(key === "invoiceId"
              ? { amount: inputAmount(balanceFor(data, invoice(value)!)) }
              : {}),
          }));
        }}
      >
        <option value="" disabled>
          Select {label.toLowerCase()}
        </option>
        {options.map((o) => (
          <option value={o.value} key={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
  const avatar = (id: string) => (
    <span className="fin-student">
      <i>
        {student(id)
          ?.name.split(" ")
          .map((n) => n[0])
          .join("")
          .slice(0, 2)}
      </i>
      <span>
        <strong>{student(id)?.name}</strong>
        <small>{id}</small>
      </span>
    </span>
  );
  const toggleSelected = (id: string) =>
    setSelected((previous) =>
      previous.includes(id)
        ? previous.filter((v) => v !== id)
        : [...previous, id],
    );
  const exportInvoices = (rows: Invoice[] = invoiceRows) =>
    csv("edumanage-finance-report.csv", [
      [
        "Invoice",
        "Student ID",
        "Student",
        "Class",
        "Fee Type",
        "Amount USD",
        "Collected USD",
        "Outstanding USD",
        "Issue Date",
        "Due Date",
        "Status",
      ],
      ...rows.map((i) => [
        i.number,
        i.studentId,
        student(i.studentId)?.name || "",
        student(i.studentId)?.className || "",
        fee(i.feeTypeId)?.name || "",
        inputAmount(i.amountCents),
        inputAmount(paidFor(data, i.id)),
        inputAmount(balanceFor(data, i)),
        i.issueDate,
        i.dueDate,
        invoiceStatus(data, i, TODAY),
      ]),
    ]);
  const downloadReceipt = (payment: Payment) => {
    const inv = invoice(payment.invoiceId);
    if (!inv) return;
    const s = student(inv.studentId);
    const rows = [
      ["Receipt", payment.receipt],
      ["Student", `${s?.name || ""} · ${inv.studentId}`],
      ["Class", s?.className || ""],
      ["Invoice", inv.number],
      ["Fee type", fee(inv.feeTypeId)?.name || ""],
      ["Recorded amount", money(payment.amountCents)],
      ["Payment method", payment.method],
      ["Date", feeDate(payment.date)],
      ["Reference", payment.reference || "—"],
      ["Status", payment.voided ? "VOID" : "Recorded"],
      ["Void reason", payment.voidReason || "—"],
    ];
    saveFile(
      `${payment.receipt}.html`,
      `<!doctype html><html lang="en"><meta charset="utf-8"><title>${escapeHTML(payment.receipt)}</title><style>body{font:16px Arial;color:#102449;max-width:680px;margin:50px auto;padding:25px}h1{color:#ff8314}table{width:100%;border-collapse:collapse}td{padding:12px;border-bottom:1px solid #dde5ef}td:first-child{width:35%;color:#617595}footer{font-size:12px;color:#687d99;margin-top:30px}@media print{body{margin:0}}</style><h1>EduManage</h1><h2>Bright Future School · Payment Record Receipt</h2><table>${rows.map(([k, v]) => `<tr><td>${escapeHTML(k)}</td><td>${escapeHTML(v)}</td></tr>`).join("")}</table><footer>Local school ledger record. This receipt records a payment entry; it does not initiate or confirm a bank transaction.</footer></html>`,
      "text/html;charset=utf-8",
    );
  };
  const invoiceTable = (rows: Invoice[]) => (
    <div className="fin-table-scroll">
      <table className="fin-table fin-invoice-table">
        <thead>
          <tr>
            <th>
              <input
                aria-label="Select displayed invoices"
                type="checkbox"
                checked={
                  rows.length > 0 && rows.every((i) => selected.includes(i.id))
                }
                onChange={(e) =>
                  setSelected(e.target.checked ? rows.map((i) => i.id) : [])
                }
              />
            </th>
            {[
              "#",
              "Invoice No.",
              "Student",
              "Class",
              "Fee Type",
              "Amount",
              "Status",
              "Due Date",
              "Actions",
            ].map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((i, n) => (
            <tr key={i.id}>
              <td>
                <input
                  aria-label={`Select ${i.number}`}
                  type="checkbox"
                  checked={selected.includes(i.id)}
                  onChange={() => toggleSelected(i.id)}
                />
              </td>
              <td>{n + 1}</td>
              <td>
                <button
                  className="fin-text"
                  onClick={() => open("details", i.id)}
                >
                  {i.number}
                </button>
              </td>
              <td>
                <button
                  className="fin-text"
                  onClick={() => open("student", i.studentId)}
                >
                  {avatar(i.studentId)}
                </button>
              </td>
              <td>{student(i.studentId)?.className}</td>
              <td>{fee(i.feeTypeId)?.name}</td>
              <td>{money(i.amountCents)}</td>
              <td>
                <Chip text={invoiceStatus(data, i, TODAY)} />
              </td>
              <td>{feeDate(i.dueDate)}</td>
              <td>
                <button
                  className="fin-more"
                  aria-label={`View invoice ${i.number}`}
                  onClick={() => open("details", i.id)}
                >
                  <MoreVertical size={15} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && (
        <p className="fin-empty">
          No invoices match the selected year, term, or search.
        </p>
      )}
    </div>
  );
  const paymentTable = (rows: Payment[], compact = false) => (
    <div className="fin-table-scroll">
      <table className="fin-table">
        <thead>
          <tr>
            {[
              "#",
              "Student",
              "Amount",
              "Payment Method",
              "Date",
              "Status",
              ...(compact ? [] : ["Receipt"]),
            ].map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((p, n) => (
            <tr key={p.id}>
              <td>{n + 1}</td>
              <td>
                <button
                  className="fin-text"
                  onClick={() => open("receipt", p.id)}
                >
                  {student(invoice(p.invoiceId)?.studentId || "")?.name}
                </button>
              </td>
              <td>{money(p.amountCents)}</td>
              <td>{p.method}</td>
              <td>{feeDate(p.date)}</td>
              <td>
                <Chip text={p.voided ? "Voided" : "Completed"} />
              </td>
              {!compact && (
                <td>
                  <button
                    className="fin-view"
                    onClick={() => open("receipt", p.id)}
                  >
                    View
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && (
        <p className="fin-empty">No payment records match your filters.</p>
      )}
    </div>
  );
  const chartInvoices = data.invoices.filter(
      (i) => i.year === chartYear && i.term === term && !i.cancelled,
    ),
    chartPayments = data.payments.filter(
      (p) => !p.voided && chartInvoices.some((i) => i.id === p.invoiceId),
    ),
    chartBaseline = chartYear === "2025 - 2026" && term === "Term 1";
  const monthlyExpected = allocate(
      chartBaseline
        ? data.feeTypes.reduce((sum, f) => sum + f.openingExpectedCents, 0)
        : 0,
    ),
    monthlyCollected = allocate(
      chartBaseline
        ? data.feeTypes.reduce((sum, f) => sum + f.openingCollectedCents, 0)
        : 0,
    );
  for (const inv of chartInvoices)
    monthlyExpected[Number(inv.issueDate.slice(5, 7)) - 1] += inv.amountCents;
  for (const p of chartPayments)
    monthlyCollected[Number(p.date.slice(5, 7)) - 1] += p.amountCents;
  const targetInvoice = dialog?.id ? invoice(dialog.id) : undefined,
    targetPayment = dialog?.id
      ? data.payments.find((p) => p.id === dialog.id)
      : undefined;
  const donutPaid = expected ? (collected / expected) * 100 : 0,
    donutCurrent = expected ? (currentOutstanding / expected) * 100 : 0;
  const FeeIcon = (index: number) =>
    [FileText, Bus, BookOpen, Activity, Shield][index % 5];
  return (
    <div className="fin-workspace">
      <div className="fin-breadcrumb">
        Fees & Finance <span>›</span>
        {section}
      </div>
      <div className="fin-heading">
        <div>
          <h1>
            {section === "Overview"
              ? "Fees & Finance"
              : section === "Fee Types"
                ? "Manage Fee Types"
                : "Fee Payers"}
          </h1>
          <p>
            {section === "Overview"
              ? "Manage school fees, payments, and financial records efficiently."
              : section === "Fee Types"
                ? "Manage fee categories and opening balances for the school ledger."
                : "Manage students registered in the fee ledger."}
          </p>
        </div>
        <div className="fin-heading-actions">
          <div className="fin-create">
            <button className="primary" onClick={() => open("invoice")}>
              <Plus size={21} />
              Create Invoice
            </button>
            <button
              className="primary"
              aria-label="More finance actions"
              onClick={() => setMenu(!menu)}
            >
              <ChevronDown size={15} />
            </button>
            {menu && (
              <div className="fin-menu">
                <button onClick={() => go("Fee Types")}>
                  Manage Fee Types
                </button>
                <button onClick={() => go("Fee Payers")}>Fee Payers</button>
                <button onClick={() => open("report")}>Generate Report</button>
              </div>
            )}
          </div>
          <button className="fin-secondary" onClick={() => open("payment")}>
            <Receipt size={17} />
            Record Payment
          </button>
          <button className="fin-secondary" onClick={() => open("report")}>
            <ClipboardList size={18} />
            Generate Report
          </button>
        </div>
      </div>
      {section === "Overview" ? (
        <>
          <div className="fin-metrics">
            {[
              {
                title: "Total Expected Fees",
                value: money(expected),
                note: "This Academic Year",
                color: "green",
                icon: Banknote,
                action: () => {
                  setTab("Recent Invoices");
                  setAllRows(true);
                },
              },
              {
                title: "Total Collected",
                value: money(collected),
                note: `${percent(collected, expected)}% Collection Rate`,
                color: "blue",
                icon: HandCoins,
                action: () => {
                  setTab("Recent Payments");
                  setAllRows(true);
                },
              },
              {
                title: "Outstanding Fees",
                value: money(outstanding),
                note: `${percent(outstanding, expected)}% Pending`,
                color: "red",
                icon: CalendarClock,
                action: () => {
                  setTab("Outstanding Fees");
                  setAllRows(true);
                },
              },
              {
                title: "Fee Payers",
                value: (
                  (baseline ? 1238 : 0) + data.students.length
                ).toLocaleString("en-US"),
                note: "Total Students",
                color: "purple",
                icon: Users,
                action: () => go("Fee Payers"),
              },
            ].map(({ title, value, note, color, icon: Icon, action }) => (
              <button
                className={`fin-metric ${color}`}
                key={title}
                onClick={action}
              >
                <span className="fin-metric-icon">
                  <Icon size={29} />
                </span>
                <span>
                  <strong>{value}</strong>
                  <b>{title}</b>
                  <small>{note}</small>
                </span>
              </button>
            ))}
          </div>
          <div className="fin-top">
            <Panel
              title="Fees Collection Trend"
              icon={ChartNoAxesColumnIncreasing}
              className="fin-trend-panel"
              action={
                <select
                  aria-label="Fees trend academic year"
                  value={chartYear}
                  onChange={(e) => setChartYear(e.target.value)}
                >
                  {[...new Set([year, ...data.invoices.map((i) => i.year)])]
                    .sort()
                    .reverse()
                    .map((y) => (
                      <option key={y}>{y}</option>
                    ))}
                </select>
              }
            >
              <p className="fin-chart-note">
                Monthly collected vs expected fees
              </p>
              <div className="fin-chart-legend">
                <span>
                  <i />
                  Collected
                </span>
                <span>
                  <i />
                  Expected
                </span>
              </div>
              <CollectionChart
                expected={monthlyExpected}
                collected={monthlyCollected}
              />
            </Panel>
            <Panel title="Fees Status Overview" icon={Settings}>
              <div className="fin-status-layout">
                <div
                  className="fin-donut"
                  role="img"
                  aria-label={`${money(expected)} total expected fees; ${money(collected)} collected; ${money(outstanding)} outstanding`}
                  style={{
                    background: expected
                      ? `conic-gradient(#06c48c 0 ${donutPaid}%,#ffab32 ${donutPaid}% ${donutPaid + donutCurrent}%,#8098b8 ${donutPaid + donutCurrent}% 100%)`
                      : "#edf2f8",
                  }}
                >
                  <div>
                    <strong>{money(expected)}</strong>
                    <small>Total Fees</small>
                  </div>
                </div>
                <div className="fin-status-legend">
                  {[
                    { name: "Paid", amount: collected, color: "#04c68d" },
                    {
                      name: "Outstanding",
                      amount: outstanding,
                      color: "#ff5e7e",
                    },
                    {
                      name: "Current / Partial",
                      amount: currentOutstanding,
                      color: "#ffa330",
                    },
                    { name: "Overdue", amount: overdue, color: "#8098b8" },
                  ].map((item) => (
                    <button
                      key={item.name}
                      onClick={() => {
                        setTab(
                          item.name === "Paid"
                            ? "Recent Payments"
                            : item.name === "Overdue"
                              ? "Overdue Accounts"
                              : "Outstanding Fees",
                        );
                        setAllRows(true);
                      }}
                    >
                      <i style={{ background: item.color }} />
                      <span>
                        <b>{item.name}</b>
                        <small>
                          {money(item.amount)} ({percent(item.amount, expected)}
                          %)
                        </small>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </Panel>
            <Panel title="Quick Actions" icon={Zap} className="fin-quick-panel">
              <div className="fin-quick">
                {[
                  {
                    name: "Create Invoice",
                    note: "Generate fee invoice",
                    color: "green",
                    icon: FileText,
                    action: () => open("invoice"),
                  },
                  {
                    name: "Record Payment",
                    note: "Add student payment",
                    color: "blue",
                    icon: CreditCard,
                    action: () => open("payment"),
                  },
                  {
                    name: "Manage Fee Types",
                    note: "Tuition, transport, etc.",
                    color: "purple",
                    icon: Wallet,
                    action: () => go("Fee Types"),
                  },
                  {
                    name: "Generate Report",
                    note: "Collection, outstanding",
                    color: "orange",
                    icon: ChartNoAxesColumnIncreasing,
                    action: () => open("report"),
                  },
                ].map(({ name, note, color, icon: Icon, action }) => (
                  <button key={name} className={color} onClick={action}>
                    <Icon size={28} />
                    <strong>{name}</strong>
                    <small>{note}</small>
                  </button>
                ))}
              </div>
            </Panel>
          </div>
          <div className="fin-middle">
            <Panel
              title=""
              icon={FileText}
              className="fin-ledger-panel"
              action={<></>}
            >
              <div className="fin-ledger-tabs">
                {(
                  [
                    "Recent Invoices",
                    "Recent Payments",
                    "Outstanding Fees",
                    "Overdue Accounts",
                  ] as Tab[]
                ).map((name) => (
                  <button
                    key={name}
                    className={tab === name ? "active" : ""}
                    onClick={() => {
                      setTab(name);
                      setSelected([]);
                    }}
                  >
                    {name}
                  </button>
                ))}
                <button
                  className="fin-link"
                  onClick={() => setAllRows(!allRows)}
                >
                  {allRows ? "Show Recent" : "View All"}
                </button>
              </div>
              {allRows && (
                <div className="fin-ledger-tools">
                  <label>
                    <Search size={16} />
                    <input
                      aria-label="Search finance records"
                      placeholder="Search invoices, students, payments..."
                      value={localQuery}
                      onChange={(e) => setLocalQuery(e.target.value)}
                    />
                  </label>
                  <label className="fin-history">
                    <input
                      type="checkbox"
                      checked={history}
                      onChange={(e) => setHistory(e.target.checked)}
                    />
                    Include cancelled / voided
                  </label>
                  <button
                    className="fin-link"
                    onClick={() =>
                      tab === "Recent Payments"
                        ? csv("edumanage-payments.csv", [
                            [
                              "Receipt",
                              "Invoice",
                              "Student",
                              "Amount USD",
                              "Date",
                              "Method",
                              "Status",
                            ],
                            ...paymentRows.map((p) => [
                              p.receipt,
                              invoice(p.invoiceId)?.number || "",
                              student(invoice(p.invoiceId)?.studentId || "")
                                ?.name || "",
                              inputAmount(p.amountCents),
                              p.date,
                              p.method,
                              p.voided ? "Voided" : "Completed",
                            ]),
                          ])
                        : exportInvoices()
                    }
                  >
                    <Download size={14} />
                    Export CSV
                  </button>
                </div>
              )}
              {selected.length > 0 && tab !== "Recent Payments" && (
                <div className="fin-selection">
                  {selected.length} invoices selected
                  <button
                    onClick={() =>
                      exportInvoices(
                        invoiceRows.filter((i) => selected.includes(i.id)),
                      )
                    }
                  >
                    Export selected
                  </button>
                </div>
              )}
              {tab === "Recent Payments"
                ? paymentTable(allRows ? paymentRows : paymentRows.slice(0, 5))
                : invoiceTable(allRows ? invoiceRows : invoiceRows.slice(0, 5))}
            </Panel>
            <Panel
              title="Fee Categories"
              icon={ChartPie}
              action={
                <button className="fin-link" onClick={() => go("Fee Types")}>
                  View All
                </button>
              }
            >
              <div className="fin-categories">
                {feeStats.map((f, index) => {
                  const Icon = FeeIcon(index);
                  return (
                    <button key={f.id} onClick={() => open("fee", f.id)}>
                      <span className={`fin-category-icon ${f.color}`}>
                        <Icon size={18} />
                      </span>
                      <span>
                        <strong>{f.name}</strong>
                        <small>
                          {money(f.amount)} ({percent(f.amount, expected)}%)
                        </small>
                      </span>
                      <i>
                        <b
                          style={{
                            background: f.chartColor,
                            width: `${percent(f.amount, expected)}%`,
                          }}
                        />
                      </i>
                    </button>
                  );
                })}
              </div>
            </Panel>
          </div>
          <div className="fin-bottom">
            <Panel
              title="Outstanding Fees"
              icon={AlertCircle}
              className="fin-outstanding-panel"
              action={
                <button
                  className="fin-link"
                  onClick={() => {
                    setTab("Outstanding Fees");
                    setAllRows(true);
                  }}
                >
                  View All
                </button>
              }
            >
              <div className="fin-table-scroll">
                <table className="fin-table">
                  <thead>
                    <tr>
                      {[
                        "#",
                        "Student",
                        "Class",
                        "Outstanding Amount",
                        "Days Overdue",
                        "Status",
                        "Actions",
                      ].map((h) => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {unpaid.slice(0, 3).map((i, n) => (
                      <tr key={i.id}>
                        <td>{n + 1}</td>
                        <td>{avatar(i.studentId)}</td>
                        <td>{student(i.studentId)?.className}</td>
                        <td>{money(balanceFor(data, i))}</td>
                        <td>
                          <span
                            className={
                              lateDays(i.dueDate, TODAY) > 0 ? "fin-late" : ""
                            }
                          >
                            {lateDays(i.dueDate, TODAY)} days
                          </span>
                        </td>
                        <td>
                          <Chip text={invoiceStatus(data, i, TODAY)} />
                        </td>
                        <td>
                          <button
                            className="fin-more"
                            aria-label={`View outstanding ${i.number}`}
                            onClick={() => open("details", i.id)}
                          >
                            <MoreVertical size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!unpaid.length && (
                  <p className="fin-empty">No unpaid tracked invoices.</p>
                )}
              </div>
            </Panel>
            <Panel
              title="Recent Payments"
              icon={CreditCard}
              className="fin-recent-payments"
              action={
                <button
                  className="fin-link"
                  onClick={() => {
                    setTab("Recent Payments");
                    setAllRows(true);
                  }}
                >
                  View All
                </button>
              }
            >
              {paymentTable(
                activePayments
                  .filter((p) => paymentRows.some((r) => r.id === p.id))
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .slice(0, 4),
                true,
              )}
            </Panel>
          </div>
        </>
      ) : (
        <Panel
          title={
            section === "Fee Types"
              ? "Fee Types & Opening Balances"
              : "Student Fee Payers"
          }
          icon={section === "Fee Types" ? Wallet : Users}
          action={
            <button className="fin-link" onClick={() => go("Overview")}>
              <ArrowLeft size={14} />
              Back to Overview
            </button>
          }
        >
          <div className="fin-directory-tools">
            <label>
              <Search size={16} />
              <input
                aria-label={`Search ${section}`}
                placeholder="Search by name or student ID..."
                value={localQuery}
                onChange={(e) => setLocalQuery(e.target.value)}
              />
            </label>
            <button
              className="primary"
              onClick={() => open(section === "Fee Types" ? "fee" : "student")}
            >
              <Plus size={16} />
              {section === "Fee Types" ? "Add Fee Type" : "Add Fee Payer"}
            </button>
          </div>
          <div className="fin-table-scroll">
            <table className="fin-table">
              <thead>
                <tr>
                  {(section === "Fee Types"
                    ? [
                        "Fee Type",
                        "Opening Expected",
                        "Opening Collected",
                        "Opening Overdue",
                        "Actions",
                      ]
                    : [
                        "Student ID",
                        "Student",
                        "Class",
                        "Tracked Invoices",
                        "Outstanding",
                        "Actions",
                      ]
                  ).map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {section === "Fee Types"
                  ? data.feeTypes
                      .filter((f) => f.name.toLowerCase().includes(search))
                      .map((f) => (
                        <tr key={f.id}>
                          <td>{f.name}</td>
                          <td>{money(f.openingExpectedCents)}</td>
                          <td>{money(f.openingCollectedCents)}</td>
                          <td>{money(f.openingOverdueCents)}</td>
                          <td>
                            <button
                              className="fin-view"
                              onClick={() => open("fee", f.id)}
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      ))
                  : data.students
                      .filter((s) =>
                        `${s.id} ${s.name} ${s.className}`
                          .toLowerCase()
                          .includes(search),
                      )
                      .map((s) => (
                        <tr key={s.id}>
                          <td>{s.id}</td>
                          <td>{s.name}</td>
                          <td>{s.className}</td>
                          <td>
                            {
                              activeInvoices.filter((i) => i.studentId === s.id)
                                .length
                            }
                          </td>
                          <td>
                            {money(
                              activeInvoices
                                .filter((i) => i.studentId === s.id)
                                .reduce(
                                  (sum, i) => sum + balanceFor(data, i),
                                  0,
                                ),
                            )}
                          </td>
                          <td>
                            <button
                              className="fin-view"
                              onClick={() => open("student", s.id)}
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      ))}
              </tbody>
            </table>
          </div>
          {section === "Fee Types" && (
            <p className="fin-form-note fin-directory-note">
              Opening balances apply to 2025–2026, Term 1. New invoice and
              payment entries are added to those balances.
            </p>
          )}
        </Panel>
      )}
      <footer className="fin-footer">
        <span aria-live="polite">{saveStatus}</span>
        {failed.current && (
          <button onClick={() => persist(current.current)}>Retry save</button>
        )}
        <span>
          Demonstration ledger · USD · Reference opening balances plus tracked
          records · {TODAY}
        </span>
      </footer>
      {dialog && (
        <div
          className="fin-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDialog(null);
          }}
        >
          <div
            className="fin-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="fin-dialog-title"
          >
            <div className="fin-dialog-head">
              <div>
                <small>
                  EDUMANAGE FINANCE · {year} · {term}
                </small>
                <h2 id="fin-dialog-title">
                  {dialog.kind === "invoice"
                    ? dialog.id
                      ? "Edit Invoice"
                      : "Create Invoice"
                    : dialog.kind === "payment"
                      ? "Record Payment"
                      : dialog.kind === "details"
                        ? "Invoice Details"
                        : dialog.kind === "receipt"
                          ? "Payment Record & Receipt"
                          : dialog.kind === "fee"
                            ? dialog.id
                              ? "Edit Fee Type"
                              : "Add Fee Type"
                            : dialog.kind === "student"
                              ? dialog.id
                                ? "Edit Fee Payer"
                                : "Add Fee Payer"
                              : dialog.kind === "void"
                                ? "Void Payment Record"
                                : dialog.kind === "cancel"
                                  ? "Cancel Invoice"
                                  : "Finance Report"}
                </h2>
              </div>
              <button
                aria-label="Close finance dialog"
                onClick={() => setDialog(null)}
              >
                <X size={21} />
              </button>
            </div>
            {[
              "invoice",
              "payment",
              "fee",
              "student",
              "void",
              "cancel",
            ].includes(dialog.kind) ? (
              <form onSubmit={save}>
                <div className="fin-form-grid">
                  {dialog.kind === "invoice" ? (
                    <>
                      {select(
                        "studentId",
                        "Student",
                        data.students.map((s) => ({
                          value: s.id,
                          label: `${s.name} · ${s.id}`,
                        })),
                      )}
                      {select(
                        "feeTypeId",
                        "Fee type",
                        data.feeTypes.map((f) => ({
                          value: f.id,
                          label: f.name,
                        })),
                      )}
                      {field("amount", "Invoice amount (USD)", "number")}
                      {field("issueDate", "Invoice date", "date")}
                      {field("dueDate", "Due date", "date")}
                      {field("note", "Note", "text", false)}
                    </>
                  ) : dialog.kind === "payment" ? (
                    <>
                      {select(
                        "invoiceId",
                        "Invoice",
                        activeInvoices
                          .filter((i) => balanceFor(data, i) > 0)
                          .map((i) => ({
                            value: i.id,
                            label: `${i.number} · ${student(i.studentId)?.name} · ${money(balanceFor(data, i))} due`,
                          })),
                      )}
                      {field("amount", "Payment amount (USD)", "number")}
                      {field("date", "Payment date", "date")}
                      {select(
                        "method",
                        "Payment method",
                        ["Bank Transfer", "Cash", "Credit Card", "Other"].map(
                          (m) => ({ value: m, label: m }),
                        ),
                      )}
                      {field("reference", "Reference", "text", false)}
                      <p className="fin-form-note">
                        Record a payment already received by the school. This
                        form does not charge a card or transfer money.
                      </p>
                    </>
                  ) : dialog.kind === "fee" ? (
                    <>
                      {field("name", "Fee type name")}
                      {select(
                        "color",
                        "Color",
                        ["green", "blue", "purple", "orange", "slate"].map(
                          (c) => ({ value: c, label: c }),
                        ),
                      )}
                      {field(
                        "openingExpected",
                        "Opening expected (USD)",
                        "number",
                      )}
                      {field(
                        "openingCollected",
                        "Opening collected (USD)",
                        "number",
                      )}
                      {field(
                        "openingOverdue",
                        "Opening overdue (USD)",
                        "number",
                      )}
                      <p className="fin-form-note">
                        Opening balances belong to 2025–2026, Term 1. Opening
                        collected plus overdue must not exceed expected fees.
                      </p>
                    </>
                  ) : dialog.kind === "student" ? (
                    <>
                      {field("studentCode", "Student ID")}
                      {field("name", "Student name")}
                      {field("className", "Class")}
                    </>
                  ) : (
                    <>
                      <p className="fin-form-note">
                        {dialog.kind === "void"
                          ? "This voids a ledger entry and restores the invoice balance. The original payment record remains in history; no funds are refunded."
                          : "This removes the invoice from active totals and keeps it in history. Invoices with active payment records must have those entries voided first."}
                      </p>
                      {field(
                        "reason",
                        dialog.kind === "void"
                          ? "Reason for voiding"
                          : "Cancellation reason",
                      )}
                    </>
                  )}
                </div>
                {error && (
                  <p role="alert" className="fin-error">
                    {error}
                  </p>
                )}
                <div className="fin-dialog-actions">
                  <button
                    type="button"
                    className="fin-secondary"
                    onClick={() => setDialog(null)}
                  >
                    Cancel
                  </button>
                  <button className="primary" type="submit">
                    <Check size={16} />
                    {dialog.kind === "void"
                      ? "Confirm Void Record"
                      : dialog.kind === "cancel"
                        ? "Confirm Cancel Invoice"
                        : "Save Changes"}
                  </button>
                </div>
              </form>
            ) : dialog.kind === "details" && targetInvoice ? (
              <div className="fin-dialog-body">
                <div className="fin-detail-title">
                  <h3>{targetInvoice.number}</h3>
                  <Chip text={invoiceStatus(data, targetInvoice, TODAY)} />
                </div>
                <div className="fin-detail-grid">
                  {[
                    [
                      "Student",
                      `${student(targetInvoice.studentId)?.name} · ${targetInvoice.studentId}`,
                    ],
                    [
                      "Class",
                      student(targetInvoice.studentId)?.className || "",
                    ],
                    ["Fee type", fee(targetInvoice.feeTypeId)?.name || ""],
                    ["Amount", money(targetInvoice.amountCents)],
                    ["Collected", money(paidFor(data, targetInvoice.id))],
                    ["Outstanding", money(balanceFor(data, targetInvoice))],
                    ["Invoice date", feeDate(targetInvoice.issueDate)],
                    ["Due date", feeDate(targetInvoice.dueDate)],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <small>{label}</small>
                      <strong>{value}</strong>
                    </div>
                  ))}
                </div>
                {targetInvoice.note && (
                  <p className="fin-form-note">{targetInvoice.note}</p>
                )}
                <h3 className="fin-subheading">Payment History</h3>
                {paymentTable(
                  data.payments.filter((p) => p.invoiceId === targetInvoice.id),
                )}
                <div className="fin-dialog-actions">
                  {!targetInvoice.cancelled && (
                    <>
                      <button
                        className="fin-secondary"
                        onClick={() => open("invoice", targetInvoice.id)}
                      >
                        <Pencil size={15} />
                        Edit Invoice
                      </button>
                      {balanceFor(data, targetInvoice) > 0 && (
                        <button
                          className="primary"
                          onClick={() => open("payment", targetInvoice.id)}
                        >
                          Record Payment
                        </button>
                      )}
                      <button
                        className="fin-secondary"
                        onClick={() => open("cancel", targetInvoice.id)}
                      >
                        Cancel Invoice
                      </button>
                    </>
                  )}
                </div>
              </div>
            ) : dialog.kind === "receipt" && targetPayment ? (
              <div className="fin-dialog-body">
                <Chip text={targetPayment.voided ? "Voided" : "Completed"} />
                <div className="fin-detail-grid">
                  {[
                    ["Receipt", targetPayment.receipt],
                    ["Invoice", invoice(targetPayment.invoiceId)?.number || ""],
                    [
                      "Student",
                      student(invoice(targetPayment.invoiceId)?.studentId || "")
                        ?.name || "",
                    ],
                    ["Amount", money(targetPayment.amountCents)],
                    ["Date", feeDate(targetPayment.date)],
                    ["Method", targetPayment.method],
                    ["Reference", targetPayment.reference || "—"],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <small>{label}</small>
                      <strong>{value}</strong>
                    </div>
                  ))}
                </div>
                {targetPayment.voided && (
                  <p className="fin-form-note">
                    Void reason: {targetPayment.voidReason}
                  </p>
                )}
                <div className="fin-dialog-actions">
                  <button
                    className="primary"
                    onClick={() => downloadReceipt(targetPayment)}
                  >
                    <Download size={16} />
                    Download Receipt
                  </button>
                  {!targetPayment.voided && (
                    <button
                      className="fin-secondary"
                      onClick={() => open("void", targetPayment.id)}
                    >
                      Void Payment Record
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="fin-dialog-body">
                <p className="fin-form-note">
                  {year} · {term}. Totals include the reference opening balances
                  and active tracked records. Voided payments and cancelled
                  invoices are excluded.
                </p>
                <div className="fin-report-metrics">
                  {[
                    ["Expected", expected],
                    ["Collected", collected],
                    ["Outstanding", outstanding],
                    ["Overdue", overdue],
                  ].map(([name, amount]) => (
                    <div key={name}>
                      <small>{name}</small>
                      <strong>{money(Number(amount))}</strong>
                    </div>
                  ))}
                </div>
                <div className="fin-table-scroll">
                  <table className="fin-table">
                    <thead>
                      <tr>
                        <th>Fee Category</th>
                        <th>Expected</th>
                        <th>Collected</th>
                        <th>Outstanding</th>
                      </tr>
                    </thead>
                    <tbody>
                      {feeStats.map((f) => (
                        <tr key={f.id}>
                          <td>{f.name}</td>
                          <td>{money(f.amount)}</td>
                          <td>{money(f.collected)}</td>
                          <td>{money(f.amount - f.collected)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="fin-dialog-actions">
                  <button
                    className="fin-secondary"
                    onClick={() =>
                      csv("edumanage-fee-summary.csv", [
                        [
                          "Year",
                          "Term",
                          "Fee Type",
                          "Expected USD",
                          "Collected USD",
                          "Outstanding USD",
                        ],
                        ...feeStats.map((f) => [
                          year,
                          term,
                          f.name,
                          inputAmount(f.amount),
                          inputAmount(f.collected),
                          inputAmount(f.amount - f.collected),
                        ]),
                      ])
                    }
                  >
                    <Download size={16} />
                    Export Summary
                  </button>
                  <button
                    className="primary"
                    onClick={() => exportInvoices(activeInvoices)}
                  >
                    <Download size={16} />
                    Export Invoice Ledger
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
function CollectionChart({
  expected,
  collected,
}: {
  expected: number[];
  collected: number[];
}) {
  const max = Math.max(100000, ...expected, ...collected),
    axisMax = Math.ceil(max / 500000) * 500000 || 500000;
  return (
    <svg
      className="fin-trend"
      viewBox="0 0 570 160"
      role="img"
      aria-label="Monthly recorded collection and expected fees, including allocated reference opening balances"
    >
      <defs>
        <linearGradient id="fin-green" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#03c48a" />
          <stop offset="1" stopColor="#25d5a2" />
        </linearGradient>
        <linearGradient id="fin-blue" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#b9d8ff" />
          <stop offset="1" stopColor="#e9f2ff" />
        </linearGradient>
      </defs>
      {Array.from({ length: 5 }, (_, i) => (i * axisMax) / 4).map((n) => (
        <g key={n}>
          <line
            x1="35"
            x2="558"
            y1={130 - (n / axisMax) * 112}
            y2={130 - (n / axisMax) * 112}
            stroke="#e6edf7"
          />
          <text
            x="27"
            y={133 - (n / axisMax) * 112}
            textAnchor="end"
          >{`${Number((n / 100000).toFixed(1))}K`}</text>
        </g>
      ))}
      {[
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
      ].map((month, i) => {
        const x = 44 + i * 43;
        return (
          <g key={month}>
            <rect
              x={x}
              y={130 - (collected[i] / axisMax) * 112}
              height={(collected[i] / axisMax) * 112}
              width="12"
              rx="4"
              fill="url(#fin-green)"
            >
              <title>{`${month}: ${money(collected[i])} collected`}</title>
            </rect>
            <rect
              x={x + 14}
              y={130 - (expected[i] / axisMax) * 112}
              height={(expected[i] / axisMax) * 112}
              width="12"
              rx="4"
              fill="url(#fin-blue)"
            >
              <title>{`${month}: ${money(expected[i])} expected`}</title>
            </rect>
            <text x={x + 13} y="148" textAnchor="middle">
              {month}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
