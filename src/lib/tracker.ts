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

export interface Expense {
  id: string;
  type: "expense";
  amount: number;
  category: Category;
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
    { id: "h-water", name: "Drink water", createdAt: new Date().toISOString() },
    { id: "h-exercise", name: "Exercise", createdAt: new Date().toISOString() },
    { id: "h-read", name: "Read", createdAt: new Date().toISOString() },
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
      expenses: parsed.expenses ?? [],
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

  const addExpense = useCallback(
    (amount: number, category: Category, description: string) => {
      const expense: Expense = {
        id: uid(),
        type: "expense",
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

  return { data, hydrated, addExpense, toggleHabit, addHabit, removeItem };
}

export function monthTotal(expenses: Expense[]): number {
  const now = new Date();
  return expenses
    .filter((e) => {
      const d = new Date(e.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((sum, e) => sum + e.amount, 0);
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

export function formatMoney(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
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