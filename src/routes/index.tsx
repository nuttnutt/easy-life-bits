import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Wallet,
  Flame,
  Plus,
  CheckCircle2,
  Circle,
  Trash2,
  Receipt,
  ListChecks,
  X,
  CalendarDays,
} from "lucide-react";
import {
  CATEGORIES,
  type Category,
  type HistoryItem,
  buildHistory,
  formatMoney,
  habitStreak,
  isHabitDoneToday,
  monthTotal,
  useTracker,
} from "@/lib/tracker";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ตัวติดตามรายจ่ายและนิสัยประจำวัน" },
      {
        name: "description",
        content:
          "ติดตามรายจ่ายและสร้างนิสัยที่ดีในแดชบอร์ดเดียวที่ออกแบบมาเพื่อมือถือ ข้อมูลทั้งหมดถูกเก็บไว้บนเครื่องของคุณ",
      },
      { property: "og:title", content: "ตัวติดตามรายจ่ายและนิสัยประจำวัน" },
      {
        property: "og:description",
        content: "แอปติดตามรายจ่ายและนิสัยประจำวันแบบเรียบง่ายสำหรับมือถือ",
      },
    ],
  }),
  component: Index,
});

const monthLabel = new Date().toLocaleDateString("th-TH", {
  month: "long",
  year: "numeric",
});

const categoryEmoji: Record<Category, string> = {
  Food: "🍜",
  Transport: "🚌",
  Shopping: "🛍️",
  Bills: "🧾",
  Health: "💊",
  Fun: "🎉",
  Other: "✨",
};

const categoryLabel: Record<Category, string> = {
  Food: "อาหาร",
  Transport: "เดินทาง",
  Shopping: "ช้อปปิ้ง",
  Bills: "บิล/ค่าใช้จ่าย",
  Health: "สุขภาพ",
  Fun: "บันเทิง",
  Other: "อื่นๆ",
};

function Index() {
  const { data, hydrated, addExpense, toggleHabit, addHabit, removeItem } =
    useTracker();
  const [sheet, setSheet] = useState<null | "expense" | "habit">(null);

  const total = useMemo(() => monthTotal(data.expenses), [data.expenses]);
  const streak = useMemo(() => habitStreak(data.logs), [data.logs]);
  const history = useMemo(
    () => buildHistory(data.expenses, data.logs).slice(0, 30),
    [data.expenses, data.logs],
  );

  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="mx-auto w-full max-w-md px-4">
        <header className="pt-8 pb-5">
          <p className="text-sm font-medium text-muted-foreground">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              day: "numeric",
              month: "short",
            })}
          </p>
          <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-foreground">
            Daily Life Tracker
          </h1>
        </header>

        {/* Dashboard */}
        <section className="grid grid-cols-2 gap-3">
          <div className="card-soft p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Wallet className="h-4 w-4" />
              </span>
              <span className="text-xs font-semibold">Spent</span>
            </div>
            <p className="mt-3 text-2xl font-extrabold text-foreground">
              {formatMoney(total)}
            </p>
            <p className="text-xs text-muted-foreground">{monthLabel}</p>
          </div>
          <div className="card-soft p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/40 text-accent-foreground">
                <Flame className="h-4 w-4" />
              </span>
              <span className="text-xs font-semibold">Streak</span>
            </div>
            <p className="mt-3 text-2xl font-extrabold text-foreground">
              {streak} <span className="text-base font-semibold">days</span>
            </p>
            <p className="text-xs text-muted-foreground">Keep it going!</p>
          </div>
        </section>

        {/* Today's habits */}
        <section className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
              <ListChecks className="h-4 w-4 text-primary" /> Today's habits
            </h2>
          </div>
          <div className="card-soft divide-y divide-border p-1">
            {data.habits.map((h) => {
              const done = isHabitDoneToday(data.logs, h.id);
              return (
                <button
                  key={h.id}
                  onClick={() => toggleHabit(h.id)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-muted/60"
                >
                  {done ? (
                    <CheckCircle2 className="h-6 w-6 shrink-0 text-primary" />
                  ) : (
                    <Circle className="h-6 w-6 shrink-0 text-muted-foreground/50" />
                  )}
                  <span
                    className={`text-sm font-medium ${
                      done
                        ? "text-muted-foreground line-through"
                        : "text-foreground"
                    }`}
                  >
                    {h.name}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* History */}
        <section className="mt-6">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-bold text-foreground">
            <CalendarDays className="h-4 w-4 text-primary" /> Recent activity
          </h2>
          {hydrated && history.length === 0 ? (
            <div className="card-soft p-8 text-center">
              <p className="text-sm text-muted-foreground">
                Nothing yet. Tap the + button to add your first expense or
                check off a habit.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {history.map((item) => (
                <HistoryRow key={item.id} item={item} onRemove={removeItem} />
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Floating actions */}
      <div className="fixed inset-x-0 bottom-0 z-20">
        <div className="mx-auto flex max-w-md items-center justify-end gap-3 px-4 pb-6">
          <button
            onClick={() => setSheet("habit")}
            className="flex h-12 items-center gap-2 rounded-full bg-card px-5 text-sm font-bold text-foreground shadow-lg ring-1 ring-border transition-transform active:scale-95"
          >
            <ListChecks className="h-4 w-4 text-primary" /> Habit
          </button>
          <button
            onClick={() => setSheet("expense")}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl transition-transform active:scale-95"
            aria-label="Add expense"
          >
            <Plus className="h-7 w-7" />
          </button>
        </div>
      </div>

      {sheet && (
        <EntrySheet
          mode={sheet}
          onClose={() => setSheet(null)}
          onAddExpense={(a, c, d) => {
            addExpense(a, c, d);
            setSheet(null);
          }}
          onAddHabit={(n) => {
            addHabit(n);
            setSheet(null);
          }}
        />
      )}
    </div>
  );
}

function HistoryRow({
  item,
  onRemove,
}: {
  item: HistoryItem;
  onRemove: (id: string) => void;
}) {
  const time = new Date(item.date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  return (
    <li className="card-soft group flex items-center gap-3 p-3">
      {item.type === "expense" ? (
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-lg">
          {categoryEmoji[item.category]}
        </span>
      ) : (
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <CheckCircle2 className="h-5 w-5" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">
          {item.type === "expense"
            ? item.description || item.category
            : item.habitName}
        </p>
        <p className="text-xs text-muted-foreground">
          {item.type === "expense" ? item.category : "Habit done"} · {time}
        </p>
      </div>
      {item.type === "expense" ? (
        <span className="shrink-0 text-sm font-bold text-foreground">
          {formatMoney(item.amount)}
        </span>
      ) : (
        <Receipt className="h-0 w-0 opacity-0" />
      )}
      <button
        onClick={() => onRemove(item.id)}
        className="shrink-0 rounded-full p-1.5 text-muted-foreground/50 transition-colors hover:bg-destructive/10 hover:text-destructive"
        aria-label="Delete"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  );
}

function EntrySheet({
  mode,
  onClose,
  onAddExpense,
  onAddHabit,
}: {
  mode: "expense" | "habit";
  onClose: () => void;
  onAddExpense: (amount: number, category: Category, description: string) => void;
  onAddHabit: (name: string) => void;
}) {
  const [tab, setTab] = useState<"expense" | "habit">(mode);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<Category>("Food");
  const [description, setDescription] = useState("");
  const [habitName, setHabitName] = useState("");

  const submit = () => {
    if (tab === "expense") {
      const value = parseFloat(amount);
      if (!value || value <= 0) return;
      onAddExpense(value, category, description.trim());
    } else {
      if (!habitName.trim()) return;
      onAddHabit(habitName.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center">
      <div
        className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md rounded-t-3xl bg-card p-5 pb-8 shadow-2xl">
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-border" />
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground">Quick entry</h3>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-muted"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-1 rounded-full bg-muted p-1">
          {(["expense", "habit"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full py-2 text-sm font-semibold capitalize transition-colors ${
                tab === t
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              {t === "expense" ? "Expense" : "New habit"}
            </button>
          ))}
        </div>

        {tab === "expense" ? (
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                Amount
              </label>
              <div className="flex items-center rounded-xl border border-input bg-background px-4 focus-within:ring-2 focus-within:ring-ring">
                <span className="text-lg font-bold text-muted-foreground">$</span>
                <input
                  type="number"
                  inputMode="decimal"
                  autoFocus
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-transparent py-3 pl-2 text-lg font-bold text-foreground outline-none"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                Category
              </label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                      category === c
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    {categoryEmoji[c]} {c}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                Description (optional)
              </label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Lunch with friends"
                className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        ) : (
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
              Habit name
            </label>
            <input
              autoFocus
              value={habitName}
              onChange={(e) => setHabitName(e.target.value)}
              placeholder="e.g. Meditate 10 min"
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              It will appear in your daily checklist.
            </p>
          </div>
        )}

        <button
          onClick={submit}
          className="mt-6 w-full rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground transition-transform active:scale-[0.98]"
        >
          {tab === "expense" ? "Add expense" : "Add habit"}
        </button>
      </div>
    </div>
  );
}
