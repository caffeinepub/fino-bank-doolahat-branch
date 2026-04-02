import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Download } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import LoadingSpinner from "../components/LoadingSpinner";
import { useDailyPLByDateRange } from "../hooks/useQueries";
import { downloadPLReport } from "../utils/excelExport";
import {
  formatDate,
  formatINR,
  formatINRShort,
  getLast7DaysRange,
  getMonthRange,
  todayISO,
} from "../utils/helpers";

const CHART_COLORS = [
  "#B91C1C",
  "#2563EB",
  "#15803D",
  "#D97706",
  "#7C3AED",
  "#0891B2",
];

type FilterMode = "daily" | "weekly" | "monthly" | "custom";

function getInitialRange(mode: FilterMode): { start: string; end: string } {
  const today = todayISO();
  if (mode === "daily") return { start: today, end: today };
  if (mode === "weekly") return getLast7DaysRange();
  return getMonthRange(0);
}

export default function PLReports() {
  const [mode, setMode] = useState<FilterMode>("weekly");
  const [customStart, setCustomStart] = useState(getLast7DaysRange().start);
  const [customEnd, setCustomEnd] = useState(todayISO());

  const range = useMemo(() => {
    if (mode === "custom") return { start: customStart, end: customEnd };
    return getInitialRange(mode);
  }, [mode, customStart, customEnd]);

  const { data: pls, isLoading } = useDailyPLByDateRange(
    range.start,
    range.end,
  );

  const dateRangeLabel = `${formatDate(range.start)} to ${formatDate(range.end)}`;

  // Aggregate head data across all PL entries
  const headAggregates = useMemo(() => {
    if (!pls || pls.length === 0) return [];
    const map: Record<
      string,
      { name: string; opening: number; closing: number; pl: number }
    > = {};
    for (const pl of pls) {
      for (const hb of pl.headBalances) {
        if (!map[hb.headName]) {
          map[hb.headName] = {
            name: hb.headName,
            opening: 0,
            closing: 0,
            pl: 0,
          };
        }
        map[hb.headName].opening += hb.openingBalance;
        map[hb.headName].closing += hb.closingBalance;
        map[hb.headName].pl += hb.profitLoss;
      }
    }
    return Object.values(map);
  }, [pls]);

  const totalPL = headAggregates.reduce((s, h) => s + h.pl, 0);
  const profitHeads = headAggregates.filter((h) => h.pl >= 0);
  const lossHeads = headAggregates.filter((h) => h.pl < 0);

  const pieData = headAggregates.map((h) => ({
    name: h.name,
    value: Math.abs(h.pl),
  }));

  const dailyChartData = useMemo(() => {
    if (!pls) return [];
    return pls.map((pl) => ({
      date: formatDate(pl.date).slice(0, 5),
      pl: pl.totalProfitLoss,
    }));
  }, [pls]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">
            Profit &amp; Loss Reports
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Analyze branch performance by time period
          </p>
        </div>
        <Button
          onClick={() => pls && downloadPLReport(pls, dateRangeLabel)}
          disabled={!pls || pls.length === 0}
          className="gap-2 text-white"
          style={{ backgroundColor: "var(--brand-red)" }}
          data-ocid="pl_reports.download.button"
        >
          <Download className="w-4 h-4" />
          Download Excel
        </Button>
      </div>

      {/* Filters */}
      <Card className="shadow-card border-border">
        <CardContent className="pt-5">
          <div className="flex flex-wrap items-end gap-4">
            {/* Mode buttons */}
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Filter by
              </Label>
              <div className="flex gap-2 mt-2">
                {(["daily", "weekly", "monthly", "custom"] as FilterMode[]).map(
                  (m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMode(m)}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-all ${
                        mode === m
                          ? "text-white"
                          : "bg-secondary text-muted-foreground hover:bg-muted"
                      }`}
                      style={
                        mode === m
                          ? { backgroundColor: "var(--brand-red)" }
                          : {}
                      }
                      data-ocid={`pl_reports.${m}.tab`}
                    >
                      {m}
                    </button>
                  ),
                )}
              </div>
            </div>

            {mode === "custom" && (
              <div className="flex gap-3 items-end">
                <div>
                  <Label className="text-xs">Start Date</Label>
                  <Input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="w-40 mt-1"
                    data-ocid="pl_reports.start_date.input"
                  />
                </div>
                <div>
                  <Label className="text-xs">End Date</Label>
                  <Input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="w-40 mt-1"
                    data-ocid="pl_reports.end_date.input"
                  />
                </div>
              </div>
            )}

            {mode !== "custom" && (
              <div className="text-sm text-muted-foreground pb-1">
                Range:{" "}
                <span className="font-medium text-foreground">
                  {dateRangeLabel}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <LoadingSpinner text="Loading report data..." />
      ) : !pls || pls.length === 0 ? (
        <div
          className="text-center py-16 text-muted-foreground"
          data-ocid="pl_reports.empty_state"
        >
          No P&amp;L data found for the selected period.
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="shadow-card border-border">
              <CardContent className="pt-5">
                <p className="text-sm text-muted-foreground">Total Entries</p>
                <p className="text-2xl font-bold mt-1">{pls.length}</p>
              </CardContent>
            </Card>
            <Card className="shadow-card border-border">
              <CardContent className="pt-5">
                <p className="text-sm text-muted-foreground">
                  Net Profit / Loss
                </p>
                <p
                  className="text-2xl font-bold mt-1"
                  style={{
                    color:
                      totalPL >= 0 ? "var(--profit-green)" : "var(--brand-red)",
                  }}
                >
                  {totalPL >= 0 ? "+" : ""}
                  {formatINR(totalPL)}
                </p>
              </CardContent>
            </Card>
            <Card className="shadow-card border-border">
              <CardContent className="pt-5">
                <p className="text-sm text-muted-foreground">Period</p>
                <p className="text-sm font-semibold mt-1">{dateRangeLabel}</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pie chart */}
            <Card className="shadow-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">
                  Head Contribution (Absolute P&amp;L)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, percent }) =>
                        `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                      }
                      labelLine={false}
                    >
                      {pieData.map((entry, index) => (
                        <Cell
                          key={entry.name}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatINR(v)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Daily P&L trend bar */}
            <Card className="shadow-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">
                  Daily P&amp;L Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart
                    data={dailyChartData}
                    margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) => formatINRShort(v as number)}
                    />
                    <Tooltip formatter={(v: number) => [formatINR(v), "P&L"]} />
                    <Bar dataKey="pl" radius={[4, 4, 0, 0]}>
                      {dailyChartData.map((entry) => (
                        <Cell
                          key={entry.date}
                          fill={entry.pl >= 0 ? "#15803D" : "#B91C1C"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Profit bar chart */}
            {profitHeads.length > 0 && (
              <Card className="shadow-card border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">
                    Profit by Head
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart
                      data={profitHeads}
                      margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v) => formatINRShort(v as number)}
                      />
                      <Tooltip
                        formatter={(v: number) => [formatINR(v), "Profit"]}
                      />
                      <Bar
                        dataKey="pl"
                        fill="#15803D"
                        radius={[4, 4, 0, 0]}
                        name="Profit"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Loss bar chart */}
            {lossHeads.length > 0 && (
              <Card className="shadow-card border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">
                    Loss by Head
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart
                      data={lossHeads.map((h) => ({
                        ...h,
                        pl: Math.abs(h.pl),
                      }))}
                      margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v) => formatINRShort(v as number)}
                      />
                      <Tooltip
                        formatter={(v: number) => [formatINR(v), "Loss"]}
                      />
                      <Bar
                        dataKey="pl"
                        fill="#B91C1C"
                        radius={[4, 4, 0, 0]}
                        name="Loss"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Opening vs Closing */}
            <Card className="shadow-card border-border lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">
                  Opening vs Closing Balance per Head
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={headAggregates}
                    margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) => formatINRShort(v as number)}
                    />
                    <Tooltip formatter={(v: number) => formatINR(v)} />
                    <Legend />
                    <Bar
                      dataKey="opening"
                      fill="#2563EB"
                      radius={[4, 4, 0, 0]}
                      name="Opening Balance"
                    />
                    <Bar
                      dataKey="closing"
                      fill="#B91C1C"
                      radius={[4, 4, 0, 0]}
                      name="Closing Balance"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Summary table */}
          <Card className="shadow-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">
                Summary Table
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-secondary/50">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
                        #
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
                        Date
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">
                        Total Opening
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">
                        Total Closing
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">
                        Net P&amp;L
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pls.map((pl, i) => {
                      const opening = pl.headBalances.reduce(
                        (s, h) => s + h.openingBalance,
                        0,
                      );
                      const closing = pl.headBalances.reduce(
                        (s, h) => s + h.closingBalance,
                        0,
                      );
                      return (
                        <tr
                          key={String(pl.id)}
                          className="border-b border-border last:border-0 hover:bg-secondary/30"
                          data-ocid={`pl_reports.item.${i + 1}`}
                        >
                          <td className="px-4 py-3 text-muted-foreground">
                            {i + 1}
                          </td>
                          <td className="px-4 py-3">{formatDate(pl.date)}</td>
                          <td className="px-4 py-3 text-right">
                            {formatINR(opening)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {formatINR(closing)}
                          </td>
                          <td
                            className="px-4 py-3 text-right font-semibold"
                            style={{
                              color:
                                pl.totalProfitLoss >= 0
                                  ? "var(--profit-green)"
                                  : "var(--brand-red)",
                            }}
                          >
                            {pl.totalProfitLoss >= 0 ? "+" : ""}
                            {formatINR(pl.totalProfitLoss)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
