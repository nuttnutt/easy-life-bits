import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingUp, BarChart3 } from "lucide-react";
import {
  type Expense,
  type HabitLog,
  dailyTrend,
  weeklyTrend,
  formatMoney,
} from "@/lib/tracker";

type Range = "daily" | "weekly";

export function TrendCharts({
  expenses,
  logs,
}: {
  expenses: Expense[];
  logs: HabitLog[];
}) {
  const [range, setRange] = useState<Range>("daily");

  const data = useMemo(
    () =>
      range === "daily"
        ? dailyTrend(expenses, logs, 7)
        : weeklyTrend(expenses, logs, 6),
    [range, expenses, logs],
  );

  const totalHabits = useMemo(
    () => data.reduce((s, d) => s + d.habits, 0),
    [data],
  );

  return (
    <section className="mt-6">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
          <TrendingUp className="h-4 w-4 text-primary" /> แนวโน้มสรุป
        </h2>
        <div className="grid grid-cols-2 gap-1 rounded-full bg-muted p-1 text-xs font-semibold">
          {(["daily", "weekly"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded-full px-3 py-1 transition-colors ${
                range === r
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              {r === "daily" ? "รายวัน" : "รายสัปดาห์"}
            </button>
          ))}
        </div>
      </div>

      <div className="card-soft p-4">
        <p className="text-xs font-semibold text-muted-foreground">
          รายจ่าย ({range === "daily" ? "7 วันล่าสุด" : "6 สัปดาห์ล่าสุด"})
        </p>
        <div className="mt-2 h-40 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="spendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                width={40}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid var(--color-border)",
                  fontSize: 12,
                }}
                formatter={(value: number) => [formatMoney(value), "รายจ่าย"]}
              />
              <Area
                type="monotone"
                dataKey="amount"
                stroke="var(--color-primary)"
                strokeWidth={2.5}
                fill="url(#spendFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card-soft mt-3 p-4">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <BarChart3 className="h-3.5 w-3.5 text-primary" /> การทำกิจนิสัย
          </p>
          <span className="text-xs font-semibold text-foreground">
            รวม {totalHabits} ครั้ง
          </span>
        </div>
        <div className="mt-2 h-36 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                width={40}
              />
              <Tooltip
                cursor={{ fill: "var(--color-muted)" }}
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid var(--color-border)",
                  fontSize: 12,
                }}
                formatter={(value: number) => [`${value} ครั้ง`, "กิจนิสัย"]}
              />
              <Bar dataKey="habits" fill="var(--color-primary)" radius={[6, 6, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}