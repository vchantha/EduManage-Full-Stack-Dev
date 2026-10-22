export type FeeStudent = { id: string; name: string; className: string };
export type FeeType = {
  id: string;
  name: string;
  color: string;
  openingExpectedCents: number;
  openingCollectedCents: number;
  openingOverdueCents: number;
};
export type Invoice = {
  id: string;
  number: string;
  studentId: string;
  feeTypeId: string;
  amountCents: number;
  issueDate: string;
  dueDate: string;
  year: string;
  term: string;
  note: string;
  cancelled: boolean;
};
export type Payment = {
  id: string;
  invoiceId: string;
  amountCents: number;
  date: string;
  method: string;
  reference: string;
  receipt: string;
  voided: boolean;
  voidReason: string;
};
export type FinanceData = {
  students: FeeStudent[];
  feeTypes: FeeType[];
  invoices: Invoice[];
  payments: Payment[];
};
export type FinanceSection = "Overview" | "Fee Types" | "Fee Payers";
export const financeColors = [
  "#06c38b",
  "#2984ff",
  "#9859ff",
  "#ff981d",
  "#7892b4",
];
export const initialFinance: FinanceData = {
  students: [
    ["STU00123", "Sophea Chan", "Grade 10A"],
    ["STU00124", "Dara Kim", "Grade 9B"],
    ["STU00125", "Sreyneang Lim", "Grade 11A"],
    ["STU00126", "Visal Chhun", "Grade 8A"],
    ["STU00127", "Monika Sok", "Grade 12B"],
    ["STU00130", "Chan Rothana", "Grade 10A"],
    ["STU00135", "Kim Sokha", "Grade 9A"],
  ].map(([id, name, className]) => ({ id, name, className })),
  feeTypes: [
    ["Tuition Fee", "green", 7600000, 6000000, 800000],
    ["Transport Fee", "blue", 1820000, 1400000, 320000],
    ["Library Fee", "purple", 590000, 475000, 75000],
    ["Activity Fee", "orange", 480000, 360000, 80000],
    ["Other Fees", "slate", 1448000, 415000, 853000],
  ].map(
    (
      [
        name,
        color,
        openingExpectedCents,
        openingCollectedCents,
        openingOverdueCents,
      ],
      i,
    ) => ({
      id: `fee-${i + 1}`,
      name: String(name),
      color: String(color),
      openingExpectedCents: Number(openingExpectedCents),
      openingCollectedCents: Number(openingCollectedCents),
      openingOverdueCents: Number(openingOverdueCents),
    }),
  ),
  invoices: [
    [
      "INV-20261003-001",
      "STU00123",
      "fee-1",
      120000,
      "2026-10-01",
      "2026-10-10",
    ],
    [
      "INV-20261003-002",
      "STU00124",
      "fee-1",
      120000,
      "2026-10-01",
      "2026-10-10",
    ],
    [
      "INV-20261003-003",
      "STU00125",
      "fee-2",
      30000,
      "2026-10-01",
      "2026-10-15",
    ],
    [
      "INV-20261002-005",
      "STU00126",
      "fee-1",
      100000,
      "2026-10-01",
      "2026-10-10",
    ],
    [
      "INV-20260901-006",
      "STU00127",
      "fee-3",
      15000,
      "2026-09-01",
      "2026-09-30",
    ],
    [
      "INV-20260920-007",
      "STU00125",
      "fee-1",
      120000,
      "2026-09-20",
      "2026-10-07",
    ],
    [
      "INV-20261001-008",
      "STU00130",
      "fee-1",
      80000,
      "2026-10-01",
      "2026-10-14",
    ],
    [
      "INV-20261002-009",
      "STU00135",
      "fee-1",
      60000,
      "2026-10-02",
      "2026-10-19",
    ],
    [
      "INV-20261001-010",
      "STU00127",
      "fee-3",
      15000,
      "2026-10-01",
      "2026-10-10",
    ],
  ].map(
    ([number, studentId, feeTypeId, amountCents, issueDate, dueDate], i) => ({
      id: `invoice-${i + 1}`,
      number: String(number),
      studentId: String(studentId),
      feeTypeId: String(feeTypeId),
      amountCents: Number(amountCents),
      issueDate: String(issueDate),
      dueDate: String(dueDate),
      year: "2025 - 2026",
      term: "Term 1",
      note: "",
      cancelled: false,
    }),
  ),
  payments: [
    ["invoice-1", 120000, "2026-10-03", "Bank Transfer"],
    ["invoice-2", 60000, "2026-10-02", "Cash"],
    ["invoice-4", 100000, "2026-10-02", "Credit Card"],
    ["invoice-9", 15000, "2026-10-01", "Cash"],
  ].map(([invoiceId, amountCents, date, method], i) => ({
    id: `payment-${i + 1}`,
    invoiceId: String(invoiceId),
    amountCents: Number(amountCents),
    date: String(date),
    method: String(method),
    reference: "",
    receipt: `RCP-2026100${i + 1}-00${i + 1}`,
    voided: false,
    voidReason: "",
  })),
};
export const money = (cents: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
export function toCents(value: string) {
  if (!/^\d+(\.\d{1,2})?$/.test(value.trim())) return NaN;
  const [whole, fraction = ""] = value.trim().split(".");
  const result = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(result) && result <= 1000000000000 ? result : NaN;
}
export const inputAmount = (cents: number) => (cents / 100).toFixed(2);
export const paidFor = (data: FinanceData, id: string) =>
  data.payments
    .filter((p) => p.invoiceId === id && !p.voided)
    .reduce((sum, p) => sum + p.amountCents, 0);
export const balanceFor = (data: FinanceData, invoice: Invoice) =>
  invoice.cancelled ? 0 : invoice.amountCents - paidFor(data, invoice.id);
export const lateDays = (due: string, today: string) =>
  Math.max(
    0,
    Math.floor(
      (Date.parse(today + "T00:00:00Z") - Date.parse(due + "T00:00:00Z")) /
        86400000,
    ),
  );
export function invoiceStatus(
  data: FinanceData,
  invoice: Invoice,
  today: string,
) {
  if (invoice.cancelled) return "Cancelled";
  if (balanceFor(data, invoice) === 0) return "Paid";
  if (paidFor(data, invoice.id) > 0) return "Partial";
  return invoice.dueDate < today ? "Overdue" : "Pending";
}
export const feeDate = (value: string) =>
  new Date(value + "T12:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
