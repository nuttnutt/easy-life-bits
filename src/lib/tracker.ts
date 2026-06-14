import { useCallback, useEffect, useState } from "react";

export type Category =
  | "Food"
  | "Transport"
  | "Shopping"
  | "Bills"
  | "Health"
  | "Fun"
  | "Other";

export const CATEGORIES: Category[] = [
  "Food",
  "Transport",
  "Shopping",
  "Bills",
  "Health",
  "Fun",
  "Other",
];

export type IncomeCategory = "Salary" | "Bonus" | "Gift" | "OtherIncome";

export const INCOME_CATEGORIES: IncomeCategory[] = [
  "Salary",
  "Bonus",
  "Gift",
  "OtherIncome",
];

export type Flow = "in" | "out";

export interface Expense {
  id: string;
  type: "expense";
  flow: Flow;
  amount: number;
  category: Category | IncomeCategory;
  description: string;
  date: string; // ISO
}

export interface HabitDef {
  id: string;
  name: string;
  createdAt: string;
}

export interface HabitLog {
  id: string;
  type: "habit";
  habitId: string;
  habitName: string;
  date: string; // ISO
  day: string; // YYYY-MM-DD
}

export type HistoryItem = Expense | HabitLog;

interface TrackerData {
  expenses: Expense[];
  habits: HabitDef[];
  logs: HabitLog[];
}

const STORAGE_KEY = "daily-life-tracker:v1";

const DEFAULT_DATA: TrackerData = {
  expenses: [],
  habits: [
    { id: "h-exercise", name: "ออกกำลังกาย", createdAt: new Date().toISOString() },
    { id: "h-read", name: "อ่านหนังสือ", createdAt: new Date().toISOString() },
  ],
  logs: [],
};

function load(): TrackerData {
  if (typeof window === "undefined") return DEFAULT_DATA;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_DATA;
    const parsed = JSON.parse(raw) as Partial<TrackerData>;
    return {
      expenses: (parsed.expenses ?? []).map((e) => ({
        ...e,
        flow: e.flow ?? "out",
      })),
      habits: parsed.habits?.length ? parsed.habits : DEFAULT_DATA.habits,
      logs: parsed.logs ?? [],
    };
  } catch {
    return DEFAULT_DATA;
  }
}

export const uid = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const dayKey = (d: Date | string = new Date()) =>
  new Date(d).toLocaleDateString("en-CA"); // YYYY-MM-DD local

export function useTracker() {
  const [data, setData] = useState<TrackerData>(DEFAULT_DATA);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setData(load());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data, hydrated]);

  const addTransaction = useCallback(
    (
      flow: Flow,
      amount: number,
      category: Category | IncomeCategory,
      description: string,
    ) => {
      const expense: Expense = {
        id: uid(),
        type: "expense",
        flow,
        amount,
        category,
        description,
        date: new Date().toISOString(),
      };
      setData((d) => ({ ...d, expenses: [expense, ...d.expenses] }));
    },
    [],
  );

  const toggleHabit = useCallback((habitId: string) => {
    const today = dayKey();
    setData((d) => {
      const existing = d.logs.find(
        (l) => l.habitId === habitId && l.day === today,
      );
      const habit = d.habits.find((h) => h.id === habitId);
      if (existing) {
        return { ...d, logs: d.logs.filter((l) => l.id !== existing.id) };
      }
      const log: HabitLog = {
        id: uid(),
        type: "habit",
        habitId,
        habitName: habit?.name ?? "Habit",
        date: new Date().toISOString(),
        day: today,
      };
      return { ...d, logs: [log, ...d.logs] };
    });
  }, []);

  const addHabit = useCallback((name: string) => {
    setData((d) => ({
      ...d,
      habits: [...d.habits, { id: uid(), name, createdAt: new Date().toISOString() }],
    }));
  }, []);

  const removeItem = useCallback((id: string) => {
    setData((d) => ({
      ...d,
      expenses: d.expenses.filter((e) => e.id !== id),
      logs: d.logs.filter((l) => l.id !== id),
    }));
  }, []);

  return { data, hydrated, addTransaction, toggleHabit, addHabit, removeItem };
}

// Month key in YYYY-MM (local).
export function monthKey(d: Date | string = new Date()): string {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(mk: string): string {
  const [y, m] = mk.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("th-TH", {
    month: "long",
    year: "numeric",
  });
}

// Shift a month key by `delta` months.
export function shiftMonth(mk: string, delta: number): string {
  const [y, m] = mk.split("-").map(Number);
  return monthKey(new Date(y, m - 1 + delta, 1));
}

function inMonth(dateStr: string, mk: string): boolean {
  return monthKey(dateStr) === mk;
}

// Sorted list (newest -> oldest) of month keys that have any transaction,
// always including the current month.
export function availableMonths(expenses: Expense[]): string[] {
  const set = new Set<string>([monthKey()]);
  for (const e of expenses) set.add(monthKey(e.date));
  return [...set].sort((a, b) => (a < b ? 1 : -1));
}

export function monthTotal(
  expenses: Expense[],
  flow: Flow = "out",
  mk: string = monthKey(),
): number {
  return expenses
    .filter((e) => e.flow === flow && inMonth(e.date, mk))
    .reduce((sum, e) => sum + e.amount, 0);
}

export function monthBalance(
  expenses: Expense[],
  mk: string = monthKey(),
): number {
  return monthTotal(expenses, "in", mk) - monthTotal(expenses, "out", mk);
}

export interface CategorySlice {
  category: Category;
  amount: number;
  pct: number;
}

export function categoryBreakdown(
  expenses: Expense[],
  mk: string = monthKey(),
): CategorySlice[] {
  const out = expenses.filter((e) => e.flow === "out" && inMonth(e.date, mk));
  const total = out.reduce((s, e) => s + e.amount, 0);
  const map = new Map<Category, number>();
  for (const e of out) {
    const c = e.category as Category;
    map.set(c, (map.get(c) ?? 0) + e.amount);
  }
  return [...map.entries()]
    .map(([category, amount]) => ({
      category,
      amount,
      pct: total > 0 ? Math.round((amount / total) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}

// Best current streak across all habits: count consecutive days (ending today
// or yesterday) where at least one habit was completed.
export function habitStreak(logs: HabitLog[]): number {
  if (logs.length === 0) return 0;
  const days = new Set(logs.map((l) => l.day));
  let streak = 0;
  const cursor = new Date();
  // allow streak to count even if today not yet done
  if (!days.has(dayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!days.has(dayKey(cursor))) return 0;
  }
  while (days.has(dayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function isHabitDoneToday(logs: HabitLog[], habitId: string): boolean {
  const today = dayKey();
  return logs.some((l) => l.habitId === habitId && l.day === today);
}

// Streak for a single habit: consecutive days ending today/yesterday.
export function habitStreakFor(logs: HabitLog[], habitId: string): number {
  const days = new Set(
    logs.filter((l) => l.habitId === habitId).map((l) => l.day),
  );
  if (days.size === 0) return 0;
  let streak = 0;
  const cursor = new Date();
  if (!days.has(dayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!days.has(dayKey(cursor))) return 0;
  }
  while (days.has(dayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export interface DayCell {
  date: Date;
  day: string; // YYYY-MM-DD
  label: string; // weekday short
  num: number; // date number
  done?: boolean;
  isToday: boolean;
}

// Last `n` days (oldest -> newest) with done state for a habit.
export function lastNDaysFor(
  logs: HabitLog[],
  habitId: string,
  n = 7,
): DayCell[] {
  const done = new Set(
    logs.filter((l) => l.habitId === habitId).map((l) => l.day),
  );
  const todayKey = dayKey();
  const cells: DayCell[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = dayKey(d);
    cells.push({
      date: d,
      day: key,
      label: d.toLocaleDateString("th-TH", { weekday: "narrow" }),
      num: d.getDate(),
      done: done.has(key),
      isToday: key === todayKey,
    });
  }
  return cells;
}

// Current calendar week (Mon-Sun) for the strip.
export function currentWeek(logs: HabitLog[]): DayCell[] {
  const anyDone = new Set(logs.map((l) => l.day));
  const todayKey = dayKey();
  const now = new Date();
  const dow = (now.getDay() + 6) % 7; // 0 = Monday
  const monday = new Date(now);
  monday.setDate(now.getDate() - dow);
  const cells: DayCell[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const key = dayKey(d);
    cells.push({
      date: d,
      day: key,
      label: d.toLocaleDateString("th-TH", { weekday: "narrow" }),
      num: d.getDate(),
      done: anyDone.has(key),
      isToday: key === todayKey,
    });
  }
  return cells;
}

export function formatMoney(n: number): string {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 2,
  }).format(n);
}

export function buildHistory(
  expenses: Expense[],
  logs: HabitLog[],
): HistoryItem[] {
  return [...expenses, ...logs].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}

export interface TrendPoint {
  label: string;
  amount: number;
  habits: number;
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
}

// Daily totals for the last `days` days (oldest -> newest).
export function dailyTrend(
  expenses: Expense[],
  logs: HabitLog[],
  days = 7,
): TrendPoint[] {
  const result: TrendPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = dayKey(d);
    const amount = expenses
      .filter((e) => e.flow === "out" && dayKey(e.date) === key)
      .reduce((s, e) => s + e.amount, 0);
    const habits = logs.filter((l) => l.day === key).length;
    result.push({
      label: d.toLocaleDateString("th-TH", { weekday: "short" }),
      amount: Math.round(amount * 100) / 100,
      habits,
      from: key,
      to: key,
    });
  }
  return result;
}

// Weekly totals for the last `weeks` weeks (oldest -> newest).
export function weeklyTrend(
  expenses: Expense[],
  logs: HabitLog[],
  weeks = 6,
): TrendPoint[] {
  const result: TrendPoint[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const end = new Date();
    end.setDate(end.getDate() - i * 7);
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    const inRange = (dateStr: string) => {
      const k = dayKey(dateStr);
      return k >= dayKey(start) && k <= dayKey(end);
    };
    const amount = expenses
      .filter((e) => e.flow === "out" && inRange(e.date))
      .reduce((s, e) => s + e.amount, 0);
    const habits = logs.filter((l) => inRange(l.date)).length;
    result.push({
      label:
        i === 0
          ? "สัปดาห์นี้"
          : start.toLocaleDateString("th-TH", { day: "numeric", month: "short" }),
      amount: Math.round(amount * 100) / 100,
      habits,
      from: dayKey(start),
      to: dayKey(end),
    });
  }
  return result;
}