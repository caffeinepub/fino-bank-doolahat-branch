import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowRight,
  CreditCard,
  FileText,
  Landmark,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { motion } from "motion/react";
import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TabId } from "../App";
import StatusBadge from "../components/StatusBadge";
import {
  useAllDailyPLs,
  useFixedDeposits,
  useTransactions,
} from "../hooks/useQueries";
import {
  formatDate,
  formatINR,
  formatINRShort,
  getLast7DaysRange,
  todayISO,
} from "../utils/helpers";

interface DashboardProps {
  onNavigate: (tab: TabId) => void;
}

function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  isProfit,
  isLoading,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  color: string;
  isProfit?: boolean;
  isLoading?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="shadow-card border-border hover:shadow-card-hover transition-shadow">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground font-medium">
                {title}
              </p>
              {isLoading ? (
                <Skeleton className="h-7 w-28 mt-2" />
              ) : (
                <p
                  className="text-2xl font-bold mt-1"
                  style={{
                    color:
                      isProfit !== undefined
                        ? isProfit
                          ? "var(--profit-green)"
                          : "var(--brand-red)"
                        : "var(--text-primary)",
                  }}
                >
                  {value}
                </p>
              )}
              {subtitle && (
                <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
              )}
            </div>
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${color}18` }}
            >
              <Icon className="w-5 h-5" style={{ color }} />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const { data: pls, isLoading: plLoading } = useAllDailyPLs();
  const { data: fds, isLoading: fdLoading } = useFixedDeposits();
  const { data: txs, isLoading: txLoading } = useTransactions();

  const today = todayISO();
  // getLast7DaysRange used for reference (chart computed below)
  const _range = getLast7DaysRange();
  void _range;

  const todayPL = useMemo(() => {
    if (!pls) return null;
    return pls.find((p) => p.date === today) || null;
  }, [pls, today]);

  const todayTxs = useMemo(() => {
    if (!txs) return [];
    return txs.filter((t) => t.transactionDate === today);
  }, [txs, today]);

  const recentTxs = useMemo(() => {
    if (!txs) return [];
    return [...txs]
      .sort((a, b) => Number(b.createdAt - a.createdAt))
      .slice(0, 5);
  }, [txs]);

  const chartData = useMemo(() => {
    const days: { date: string; pl: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().split("T")[0];
      const found = pls?.find((p) => p.date === iso);
      days.push({
        date: formatDate(iso).slice(0, 5),
        pl: found ? found.totalProfitLoss : 0,
      });
    }
    return days;
  }, [pls]);

  const netProfitToday = todayPL?.totalProfitLoss ?? 0;
  const totalActiveFDs = fds?.length ?? 0;
  const todayTxCount = todayTxs.length;
  const totalPLEntries = pls?.length ?? 0;

  const currentDate = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl p-6 text-white"
        style={{
          background:
            "linear-gradient(135deg, oklch(0.44 0.19 21) 0%, oklch(0.36 0.16 21) 100%)",
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              Welcome to Fino Small Finance Bank
            </h1>
            <p className="text-red-100 mt-1 text-sm">
              Doolahat Branch &nbsp;|&nbsp; IFSC: FINO0001599
            </p>
            <p className="text-red-200 text-xs mt-1">{currentDate}</p>
          </div>
          <div className="hidden md:flex items-center gap-2 bg-white/10 rounded-lg px-4 py-2">
            <Landmark className="w-6 h-6" />
            <div>
              <div className="text-xs text-red-100">Branch Manager</div>
              <div className="font-semibold text-sm">Admin Portal</div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Active FDs"
          value={totalActiveFDs.toString()}
          subtitle="Fixed deposits"
          icon={Landmark}
          color="#2563EB"
          isLoading={fdLoading}
        />
        <KPICard
          title="Today's Transactions"
          value={todayTxCount.toString()}
          subtitle="Processed today"
          icon={CreditCard}
          color="#7C3AED"
          isLoading={txLoading}
        />
        <KPICard
          title="Net Profit Today"
          value={formatINRShort(netProfitToday)}
          subtitle={netProfitToday >= 0 ? "Profit" : "Loss"}
          icon={netProfitToday >= 0 ? TrendingUp : TrendingDown}
          color={netProfitToday >= 0 ? "#15803D" : "#B91C1C"}
          isProfit={netProfitToday >= 0}
          isLoading={plLoading}
        />
        <KPICard
          title="Total P&L Entries"
          value={totalPLEntries.toString()}
          subtitle="All time entries"
          icon={FileText}
          color="#B91C1C"
          isLoading={plLoading}
        />
      </div>

      {/* Charts + Quick Actions grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar Chart */}
        <Card className="lg:col-span-2 shadow-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              Last 7 Days P&amp;L Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            {plLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={chartData}
                  margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="oklch(0.918 0.006 264)"
                  />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => formatINRShort(v as number)}
                  />
                  <Tooltip
                    formatter={(v: number) => [formatINR(v), "P&L"]}
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  />
                  <Bar
                    dataKey="pl"
                    fill="oklch(0.44 0.19 21)"
                    radius={[4, 4, 0, 0]}
                    name="Profit/Loss"
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="shadow-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              {
                label: "Add P&L Entry",
                tab: "daily-pl" as TabId,
                desc: "Record today's balances",
              },
              {
                label: "View P&L Reports",
                tab: "pl-reports" as TabId,
                desc: "Charts & analytics",
              },
              {
                label: "Add Fixed Deposit",
                tab: "fixed-deposits" as TabId,
                desc: "New FD registration",
              },
              {
                label: "Add Transaction",
                tab: "transactions" as TabId,
                desc: "Record transaction",
              },
              {
                label: "Manage Heads",
                tab: "payment-heads" as TabId,
                desc: "Payment head config",
              },
            ].map(({ label, tab, desc }) => (
              <Button
                key={tab}
                variant="ghost"
                className="w-full justify-between h-auto py-2.5 px-3 hover:bg-accent group"
                onClick={() => onNavigate(tab)}
                data-ocid={`dashboard.${tab}.button`}
              >
                <div className="text-left">
                  <div className="text-sm font-medium">{label}</div>
                  <div className="text-xs text-muted-foreground">{desc}</div>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions Table */}
      <Card className="shadow-card border-border">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">
            Recent Transactions
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            style={{ color: "var(--brand-red)" }}
            onClick={() => onNavigate("transactions")}
            data-ocid="dashboard.transactions.link"
          >
            View All <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {txLoading ? (
            <div className="p-4 space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : recentTxs.length === 0 ? (
            <div
              className="py-10 text-center text-muted-foreground text-sm"
              data-ocid="transactions.empty_state"
            >
              No transactions yet.{" "}
              <button
                type="button"
                className="underline"
                style={{ color: "var(--brand-red)" }}
                onClick={() => onNavigate("transactions")}
              >
                Add one
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/50">
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">
                      Date
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">
                      Ref ID
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">
                      Type
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">
                      Account
                    </th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">
                      Amount
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentTxs.map((tx, idx) => (
                    <tr
                      key={String(tx.id)}
                      className="border-b border-border last:border-0 hover:bg-secondary/30"
                      data-ocid={`recent_tx.item.${idx + 1}`}
                    >
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {formatDate(tx.transactionDate)}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {tx.referenceId}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-secondary text-foreground">
                          {tx.transactionType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">{tx.accountNumber}</td>
                      <td className="px-4 py-3 text-right font-medium">
                        {formatINR(tx.amount)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={tx.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
