import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Menu,
  Bell,
  Plus,
  CheckCircle2,
  Circle,
  Trash2,
  Home,
  ClipboardList,
  Heart,
  BarChart3,
  X,
  ChevronRight,
  Trophy,
  Wallet,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { Search } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";
import {
  CATEGORIES,
  INCOME_CATEGORIES,
  type Category,
  type IncomeCategory,
  type Expense,
  type HabitLog,
  buildHistory,
  categoryBreakdown,
  currentWeek,
  formatMoney,
  habitStreakFor,
  isHabitDoneToday,
  lastNDaysFor,
  monthBalance,
  monthTotal,
  useTracker,
} from "@/lib/tracker";
import { TrendCharts } from "@/components/TrendCharts";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ตัวติดตามรายจ่ายและนิสัยประจำวัน" },
      {
        name: "description",
        content:
          "ติดตามรายรับ-รายจ่ายและสร้างนิสัยที่ดีในแดชบอร์ดเดียวที่ออกแบบมาเพื่อมือถือ ข้อมูลถูกเก็บไว้บนเครื่องของคุณ",
      },
      { property: "og:title", content: "ตัวติดตามรายจ่ายและนิสัยประจำวัน" },
      {
        property: "og:description",
        content: "แอปติดตามรายรับ-รายจ่ายและนิสัยประจำวันแบบเรียบง่ายสำหรับมือถือ",
      },
    ],
  }),
  component: Index,
});

const categoryLabel: Record<Category, string> = {
  Food: "อาหาร",
  Transport: "เดินทาง",
  Shopping: "ช้อปปิ้ง",
  Bills: "บิล/ค่าใช้จ่าย",
  Health: "สุขภาพ",
  Fun: "บันเทิง",
  Other: "อื่นๆ",
};

const categoryEmoji: Record<Category, string> = {
  Food: "🍜",
  Transport: "🚌",
  Shopping: "🛍️",
  Bills: "🧾",
  Health: "💊",
  Fun: "🎉",
  Other: "✨",
};

const incomeLabel: Record<IncomeCategory, string> = {
  Salary: "เงินเดือน",
  Bonus: "โบนัส",
  Gift: "ของขวัญ",
  OtherIncome: "รายได้อื่น",
};

const incomeEmoji: Record<IncomeCategory, string> = {
  Salary: "💼",
  Bonus: "🎁",
  Gift: "💝",
  OtherIncome: "💰",
};

const DONUT_COLORS = [
  "var(--color-chart-2)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
  "var(--color-chart-1)",
  "var(--color-chart-3)",
  "var(--color-muted-foreground)",
  "var(--color-border)",
];

function labelFor(e: Expense): string {
  return e.flow === "in"
    ? incomeLabel[e.category as IncomeCategory]
    : categoryLabel[e.category as Category];
}

function emojiFor(e: Expense): string {
  return e.flow === "in"
    ? incomeEmoji[e.category as IncomeCategory]
    : categoryEmoji[e.category as Category];
}

type Tab = "home" | "habits" | "stats";

function Index() {
  const {
    data,
    hydrated,
    addTransaction,
    toggleHabit,
    addHabit,
    removeItem,
  } = useTracker();
  const [sheet, setSheet] = useState(false);
  const [tab, setTab] = useState<Tab>("home");

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="mx-auto w-full max-w-md">
        {tab === "home" && (
          <HomeTab data={data} hydrated={hydrated} onRemove={removeItem} />
        )}
        {tab === "habits" && (
          <HabitsTab data={data} onToggle={toggleHabit} />
        )}
        {tab === "stats" && (
          <div className="px-4">
            <TopBar title="สถิติ" />
            <TrendCharts expenses={data.expenses} logs={data.logs} />
          </div>
        )}
      </div>

      <BottomNav tab={tab} setTab={setTab} onAdd={() => setSheet(true)} />

      {sheet && (
        <EntrySheet
          onClose={() => setSheet(false)}
          onAddTransaction={(flow, a, c, d) => {
            addTransaction(flow, a, c, d);
            setSheet(false);
          }}
          onAddHabit={(n) => {
            addHabit(n);
            setSheet(false);
          }}
        />
      )}
    </div>
  );
}

function TopBar({ title }: { title: string }) {
  return (
    <header className="flex items-center justify-between pt-7 pb-4">
      <button className="text-muted-foreground" aria-label="เมนู">
        <Menu className="h-5 w-5" />
      </button>
      <h1 className="text-base font-bold text-foreground">{title}</h1>
      <button className="text-muted-foreground" aria-label="แจ้งเตือน">
        <Bell className="h-5 w-5" />
      </button>
    </header>
  );
}

/* ---------------- Home ---------------- */

function HomeTab({
  data,
  hydrated,
  onRemove,
}: {
  data: { expenses: Expense[]; logs: HabitLog[] };
  hydrated: boolean;
  onRemove: (id: string) => void;
}) {
  const income = useMemo(() => monthTotal(data.expenses, "in"), [data.expenses]);
  const expense = useMemo(() => monthTotal(data.expenses, "out"), [data.expenses]);
  const balance = useMemo(() => monthBalance(data.expenses), [data.expenses]);
  const slices = useMemo(() => categoryBreakdown(data.expenses), [data.expenses]);
  const [query, setQuery] = useState("");
  const [flowFilter, setFlowFilter] = useState<"all" | "in" | "out">("all");
  const [catFilter, setCatFilter] = useState<string>("all");
  const [sort, setSort] = useState<"newest" | "oldest" | "amount">("newest");

  const allTxns = useMemo(
    () =>
      buildHistory(data.expenses, []).filter(
        (i): i is Expense => i.type === "expense",
      ),
    [data.expenses],
  );

  const catOptions = useMemo(() => {
    if (flowFilter === "in") return [...INCOME_CATEGORIES];
    if (flowFilter === "out") return [...CATEGORIES];
    return [...CATEGORIES, ...INCOME_CATEGORIES];
  }, [flowFilter]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = allTxns.filter((e) => {
      if (flowFilter !== "all" && e.flow !== flowFilter) return false;
      if (catFilter !== "all" && e.category !== catFilter) return false;
      if (q) {
        const hay = `${e.description ?? ""} ${labelFor(e)}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    const sorted = [...list];
    if (sort === "amount") {
      sorted.sort((a, b) => b.amount - a.amount);
    } else if (sort === "oldest") {
      sorted.sort((a, b) => +new Date(a.date) - +new Date(b.date));
    } else {
      sorted.sort((a, b) => +new Date(b.date) - +new Date(a.date));
    }
    return sorted;
  }, [allTxns, query, flowFilter, catFilter, sort]);

  const isFiltering =
    query.trim() !== "" ||
    flowFilter !== "all" ||
    catFilter !== "all" ||
    sort !== "newest";
  const recent = isFiltering ? filtered : filtered.slice(0, 5);

  return (
    <div className="px-4">
      <TopBar title="ภาพรวมวันนี้" />

      {/* Balance card */}
      <div className="balance-gradient relative overflow-hidden rounded-3xl p-5 text-primary-foreground shadow-lg">
        <div className="relative z-10">
          <p className="text-sm font-medium opacity-90">ยอดคงเหลือสุทธิ</p>
          <p className="mt-1 text-3xl font-extrabold tracking-tight">
            {formatMoney(balance)}
          </p>
          <div className="mt-5 flex gap-6">
            <div>
              <p className="flex items-center gap-1 text-xs opacity-90">
                <TrendingUp className="h-3.5 w-3.5" /> รายรับ
              </p>
              <p className="mt-0.5 text-base font-bold">{formatMoney(income)}</p>
            </div>
            <div>
              <p className="flex items-center gap-1 text-xs opacity-90">
                <TrendingDown className="h-3.5 w-3.5" /> รายจ่าย
              </p>
              <p className="mt-0.5 text-base font-bold">{formatMoney(expense)}</p>
            </div>
          </div>
        </div>
        <Wallet className="absolute -right-3 -bottom-3 h-28 w-28 opacity-15" />
      </div>

      {/* Category breakdown */}
      <section className="card-soft mt-4 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground">
            สรุปรายจ่ายแยกหมวดหมู่
          </h2>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
        {slices.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            ยังไม่มีรายจ่ายในเดือนนี้
          </p>
        ) : (
          <div className="flex items-center gap-4">
            <div className="relative h-32 w-32 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={slices}
                    dataKey="amount"
                    innerRadius={42}
                    outerRadius={62}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {slices.map((_, i) => (
                      <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[10px] text-muted-foreground">รายจ่ายรวม</span>
                <span className="text-sm font-extrabold text-foreground">
                  {formatMoney(expense)}
                </span>
              </div>
            </div>
            <ul className="flex-1 space-y-1.5">
              {slices.map((s, i) => (
                <li
                  key={s.category}
                  className="flex items-center gap-2 text-xs"
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }}
                  />
                  <span className="flex-1 text-foreground">
                    {categoryLabel[s.category]}
                  </span>
                  <span className="font-semibold text-muted-foreground">
                    {s.pct}%
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Recent transactions */}
      <section className="mt-5">
        <h2 className="mb-2 text-sm font-bold text-foreground">รายการล่าสุด</h2>

        {/* Search */}
        <div className="relative mb-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหารายการ..."
            className="w-full rounded-xl border border-border bg-card py-2 pl-9 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
          />
        </div>

        {/* Flow filter */}
        <div className="mb-2 flex gap-1.5">
          {([
            ["all", "ทั้งหมด"],
            ["in", "รายรับ"],
            ["out", "รายจ่าย"],
          ] as const).map(([val, label]) => (
            <button
              key={val}
              onClick={() => {
                setFlowFilter(val);
                setCatFilter("all");
              }}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                flowFilter === val
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Category filter */}
        <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setCatFilter("all")}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              catFilter === "all"
                ? "bg-foreground text-background"
                : "bg-secondary text-muted-foreground"
            }`}
          >
            ทุกหมวดหมู่
          </button>
          {catOptions.map((c) => (
            <button
              key={c}
              onClick={() => setCatFilter(c)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                catFilter === c
                  ? "bg-foreground text-background"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              {INCOME_CATEGORIES.includes(c as IncomeCategory)
                ? incomeLabel[c as IncomeCategory]
                : categoryLabel[c as Category]}
            </button>
          ))}
        </div>

        {hydrated && recent.length === 0 ? (
          <></>
        ) : null}
        {/* Sort */}
        <div className="mb-3 flex gap-1.5">
          {([
            ["newest", "ใหม่สุด"],
            ["oldest", "เก่าสุด"],
            ["amount", "ยอดมากไปน้อย"],
          ] as const).map(([val, label]) => (
            <button
              key={val}
              onClick={() => setSort(val)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                sort === val
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {hydrated && recent.length === 0 ? (
          <div className="card-soft p-8 text-center">
            <p className="text-sm text-muted-foreground">
              {isFiltering
                ? "ไม่พบรายการที่ตรงกับเงื่อนไข"
                : "ยังไม่มีรายการ แตะปุ่ม + เพื่อเพิ่มรายรับหรือรายจ่ายแรกของคุณ"}
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {recent.map((e) => (
              <TxnRow key={e.id} e={e} onRemove={onRemove} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function TxnRow({ e, onRemove }: { e: Expense; onRemove: (id: string) => void }) {
  const time = new Date(e.date).toLocaleString("th-TH", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  const isIncome = e.flow === "in";
  return (
    <li className="card-soft group flex items-center gap-3 p-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-lg">
        {emojiFor(e)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">
          {e.description || labelFor(e)}
        </p>
        <p className="text-xs text-muted-foreground">
          {labelFor(e)} · {time}
        </p>
      </div>
      <span
        className={`shrink-0 text-sm font-bold ${
          isIncome ? "text-primary" : "text-foreground"
        }`}
      >
        {isIncome ? "+" : "-"}
        {formatMoney(e.amount)}
      </span>
      <button
        onClick={() => onRemove(e.id)}
        className="shrink-0 rounded-full p-1.5 text-muted-foreground/40 transition-colors hover:bg-destructive/10 hover:text-destructive"
        aria-label="ลบ"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  );
}

/* ---------------- Habits ---------------- */

function HabitsTab({
  data,
  onToggle,
}: {
  data: { habits: { id: string; name: string }[]; logs: HabitLog[] };
  onToggle: (id: string) => void;
}) {
  const week = useMemo(() => currentWeek(data.logs), [data.logs]);
  const monthLabel = new Date().toLocaleDateString("th-TH", {
    month: "long",
    year: "numeric",
  });
  const anyDoneToday = data.habits.some((h) =>
    isHabitDoneToday(data.logs, h.id),
  );

  return (
    <div className="px-4">
      <TopBar title="ติดตามนิสัย" />

      {/* Week strip */}
      <section className="card-soft p-4">
        <p className="mb-3 text-sm font-bold text-foreground">{monthLabel}</p>
        <div className="flex justify-between">
          {week.map((c) => (
            <div key={c.day} className="flex flex-col items-center gap-1.5">
              <span className="text-[11px] text-muted-foreground">{c.label}</span>
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold ${
                  c.isToday
                    ? "bg-primary text-primary-foreground"
                    : c.done
                      ? "bg-primary/15 text-primary"
                      : "text-foreground"
                }`}
              >
                {c.num}
              </span>
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  c.done ? "bg-primary" : "bg-transparent"
                }`}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Habit cards */}
      <section className="mt-4 space-y-3">
        {data.habits.map((h) => (
          <HabitCard
            key={h.id}
            name={h.name}
            done={isHabitDoneToday(data.logs, h.id)}
            streak={habitStreakFor(data.logs, h.id)}
            days={lastNDaysFor(data.logs, h.id, 7)}
            onToggle={() => onToggle(h.id)}
          />
        ))}
      </section>

      {/* Achievement banner */}
      <section className="mt-4 flex items-center gap-3 rounded-2xl bg-primary/10 p-4">
        <Trophy className="h-9 w-9 shrink-0 text-accent-foreground" />
        <div>
          <p className="text-sm font-bold text-foreground">
            {anyDoneToday ? "เยี่ยมเลย!" : "เริ่มต้นวันนี้กันเถอะ"}
          </p>
          <p className="text-xs text-muted-foreground">
            {anyDoneToday
              ? "คุณทำได้ยอดเยี่ยม มุ่งมั่นต่อไปนะ! 💚"
              : "แตะที่นิสัยเพื่อทำเครื่องหมายว่าทำสำเร็จ"}
          </p>
        </div>
      </section>
    </div>
  );
}

function HabitCard({
  name,
  done,
  streak,
  days,
  onToggle,
}: {
  name: string;
  done: boolean;
  streak: number;
  days: { day: string; done?: boolean }[];
  onToggle: () => void;
}) {
  return (
    <div className="card-soft p-4">
      <div className="flex items-start gap-3">
        <button onClick={onToggle} className="mt-0.5 shrink-0" aria-label={name}>
          {done ? (
            <CheckCircle2 className="h-6 w-6 text-primary" />
          ) : (
            <Circle className="h-6 w-6 text-muted-foreground/40" />
          )}
        </button>
        <div className="flex-1">
          <p className="text-sm font-bold text-foreground">{name}</p>
          <p className="text-xs text-muted-foreground">ทุกวัน</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-extrabold text-primary">{streak}</p>
          <p className="text-[10px] text-muted-foreground">วันต่อเนื่อง</p>
        </div>
      </div>
      <div className="mt-3 flex gap-1.5">
        {days.map((d) => (
          <span
            key={d.day}
            className={`flex h-6 w-6 items-center justify-center rounded-full ${
              d.done
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground/40"
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Bottom nav ---------------- */

function BottomNav({
  tab,
  setTab,
  onAdd,
}: {
  tab: Tab;
  setTab: (t: Tab) => void;
  onAdd: () => void;
}) {
  const item = (
    key: Tab,
    label: string,
    Icon: typeof Home,
  ) => (
    <button
      onClick={() => setTab(key)}
      className={`flex flex-1 flex-col items-center gap-0.5 py-1 text-[11px] font-medium transition-colors ${
        tab === key ? "text-primary" : "text-muted-foreground"
      }`}
    >
      <Icon className="h-5 w-5" />
      {label}
    </button>
  );

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card/95 backdrop-blur">
      <div className="mx-auto flex max-w-md items-center px-2 pb-[env(safe-area-inset-bottom)]">
        {item("home", "หน้าหลัก", Home)}
        {item("stats", "รายจ่าย", ClipboardList)}
        <div className="flex flex-1 justify-center">
          <button
            onClick={onAdd}
            className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-background transition-transform active:scale-95"
            aria-label="เพิ่มรายการ"
          >
            <Plus className="h-7 w-7" />
          </button>
        </div>
        {item("habits", "นิสัย", Heart)}
        {item("stats", "สถิติ", BarChart3)}
      </div>
    </nav>
  );
}

/* ---------------- Entry sheet ---------------- */

type SheetTab = "out" | "in" | "habit";

function EntrySheet({
  onClose,
  onAddTransaction,
  onAddHabit,
}: {
  onClose: () => void;
  onAddTransaction: (
    flow: "in" | "out",
    amount: number,
    category: Category | IncomeCategory,
    description: string,
  ) => void;
  onAddHabit: (name: string) => void;
}) {
  const [tab, setTab] = useState<SheetTab>("out");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<Category>("Food");
  const [incomeCat, setIncomeCat] = useState<IncomeCategory>("Salary");
  const [description, setDescription] = useState("");
  const [habitName, setHabitName] = useState("");

  const submit = () => {
    if (tab === "habit") {
      if (!habitName.trim()) return;
      onAddHabit(habitName.trim());
      return;
    }
    const value = parseFloat(amount);
    if (!value || value <= 0) return;
    if (tab === "in") onAddTransaction("in", value, incomeCat, description.trim());
    else onAddTransaction("out", value, category, description.trim());
  };

  const tabs: { key: SheetTab; label: string }[] = [
    { key: "out", label: "รายจ่าย" },
    { key: "in", label: "รายรับ" },
    { key: "habit", label: "นิสัยใหม่" },
  ];

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center">
      <div
        className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md rounded-t-3xl bg-card p-5 pb-8 shadow-2xl">
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-border" />
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground">เพิ่มรายการด่วน</h3>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-muted"
            aria-label="ปิด"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-5 grid grid-cols-3 gap-1 rounded-full bg-muted p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-full py-2 text-sm font-semibold transition-colors ${
                tab === t.key
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "habit" ? (
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
              ชื่อนิสัย
            </label>
            <input
              autoFocus
              value={habitName}
              onChange={(e) => setHabitName(e.target.value)}
              placeholder="เช่น นั่งสมาธิ 10 นาที"
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              จะปรากฏในรายการนิสัยประจำวันของคุณ
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                จำนวนเงิน
              </label>
              <div className="flex items-center rounded-xl border border-input bg-background px-4 focus-within:ring-2 focus-within:ring-ring">
                <span className="text-lg font-bold text-muted-foreground">฿</span>
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
                หมวดหมู่
              </label>
              <div className="flex flex-wrap gap-2">
                {tab === "out"
                  ? CATEGORIES.map((c) => (
                      <button
                        key={c}
                        onClick={() => setCategory(c)}
                        className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                          category === c
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-secondary-foreground"
                        }`}
                      >
                        {categoryEmoji[c]} {categoryLabel[c]}
                      </button>
                    ))
                  : INCOME_CATEGORIES.map((c) => (
                      <button
                        key={c}
                        onClick={() => setIncomeCat(c)}
                        className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                          incomeCat === c
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-secondary-foreground"
                        }`}
                      >
                        {incomeEmoji[c]} {incomeLabel[c]}
                      </button>
                    ))}
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                รายละเอียด (ไม่บังคับ)
              </label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={tab === "in" ? "เช่น เงินเดือนเดือนนี้" : "เช่น ข้าวเที่ยงกับเพื่อน"}
                className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        )}

        <button
          onClick={submit}
          className="mt-6 w-full rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground transition-transform active:scale-[0.98]"
        >
          {tab === "habit" ? "เพิ่มนิสัย" : tab === "in" ? "เพิ่มรายรับ" : "เพิ่มรายจ่าย"}
        </button>
      </div>
    </div>
  );
}
