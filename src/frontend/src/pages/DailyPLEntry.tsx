import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, Save } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { HeadBalance } from "../backend";
import LoadingSpinner from "../components/LoadingSpinner";
import {
  useAllDailyPLs,
  usePaymentHeads,
  useSaveDailyPL,
} from "../hooks/useQueries";
import { formatDate, formatINR, todayISO } from "../utils/helpers";

export default function DailyPLEntry() {
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [balances, setBalances] = useState<
    Record<string, { opening: string; closing: string }>
  >({});
  const [saved, setSaved] = useState(false);

  const { data: heads, isLoading: headsLoading } = usePaymentHeads();
  const { data: allPLs, isLoading: plsLoading } = useAllDailyPLs();
  const saveMutation = useSaveDailyPL();

  const existingEntry = useMemo(() => {
    if (!allPLs) return null;
    return allPLs.find((p) => p.date === selectedDate) || null;
  }, [allPLs, selectedDate]);

  // When heads or date changes, pre-fill if existing
  useEffect(() => {
    if (!heads) return;
    const initial: Record<string, { opening: string; closing: string }> = {};
    for (const h of heads) {
      const key = String(h.id);
      if (existingEntry) {
        const hb = existingEntry.headBalances.find((b) => b.headId === h.id);
        initial[key] = {
          opening: hb ? String(hb.openingBalance) : "0",
          closing: hb ? String(hb.closingBalance) : "0",
        };
      } else {
        initial[key] = { opening: "", closing: "" };
      }
    }
    setBalances(initial);
    setSaved(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heads, existingEntry]);

  const headBalances: (HeadBalance & { opening: number; closing: number })[] =
    useMemo(() => {
      if (!heads) return [];
      return heads.map((h) => {
        const key = String(h.id);
        const opening = Number.parseFloat(balances[key]?.opening || "0") || 0;
        const closing = Number.parseFloat(balances[key]?.closing || "0") || 0;
        return {
          headId: h.id,
          headName: h.name,
          openingBalance: opening,
          closingBalance: closing,
          profitLoss: closing - opening,
          opening,
          closing,
        };
      });
    }, [heads, balances]);

  const totalPL = headBalances.reduce((s, h) => s + h.profitLoss, 0);
  const totalOpening = headBalances.reduce((s, h) => s + h.openingBalance, 0);
  const totalClosing = headBalances.reduce((s, h) => s + h.closingBalance, 0);

  const updateBalance = (
    headId: string,
    field: "opening" | "closing",
    value: string,
  ) => {
    setBalances((prev) => ({
      ...prev,
      [headId]: { ...prev[headId], [field]: value },
    }));
  };

  const handleSave = async () => {
    try {
      const hbs: HeadBalance[] = headBalances.map((h) => ({
        headId: h.headId,
        headName: h.headName,
        openingBalance: h.openingBalance,
        closingBalance: h.closingBalance,
        profitLoss: h.profitLoss,
      }));
      await saveMutation.mutateAsync({ date: selectedDate, headBalances: hbs });
      toast.success("Daily P&L entry saved successfully!");
      setSaved(true);
    } catch {
      toast.error("Failed to save P&L entry. Please try again.");
    }
  };

  if (headsLoading || plsLoading)
    return <LoadingSpinner text="Loading P&L data..." />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Daily P&L Entry</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Record opening and closing balances for each payment head
          </p>
        </div>
      </div>

      {/* Date selector */}
      <Card className="shadow-card border-border">
        <CardContent className="pt-5">
          <div className="flex items-end gap-4">
            <div>
              <Label className="text-sm font-medium">Select Date</Label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-44 mt-1"
                data-ocid="daily_pl.date.input"
              />
            </div>
            <div className="text-sm text-muted-foreground pb-2">
              Displaying:{" "}
              <span className="font-semibold text-foreground">
                {formatDate(selectedDate)}
              </span>
            </div>
            {existingEntry && (
              <div className="flex items-center gap-1.5 text-sm text-green-700 bg-green-50 px-3 py-1.5 rounded-full border border-green-200">
                <CheckCircle2 className="w-4 h-4" />
                Entry exists — pre-filled
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Balance entry table */}
      <Card className="shadow-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">
            Balance Entry
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-3 pr-4 text-left text-xs font-semibold text-muted-foreground">
                    Payment Head
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-muted-foreground">
                    Opening Balance (\u20b9)
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-muted-foreground">
                    Closing Balance (\u20b9)
                  </th>
                  <th className="py-3 pl-4 text-right text-xs font-semibold text-muted-foreground">
                    Profit / Loss (\u20b9)
                  </th>
                </tr>
              </thead>
              <tbody>
                {heads?.map((head) => {
                  const key = String(head.id);
                  const hb = headBalances.find((h) => h.headId === head.id);
                  const pl = hb ? hb.profitLoss : 0;
                  return (
                    <tr
                      key={key}
                      className="border-b border-border last:border-0"
                      data-ocid="daily_pl.head.row"
                    >
                      <td className="py-3 pr-4">
                        <div className="font-medium">{head.name}</div>
                        {head.isDefault && (
                          <span className="text-xs text-muted-foreground">
                            Default
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={balances[key]?.opening || ""}
                          onChange={(e) =>
                            updateBalance(key, "opening", e.target.value)
                          }
                          placeholder="0.00"
                          className="w-40 text-sm"
                          data-ocid="daily_pl.opening.input"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={balances[key]?.closing || ""}
                          onChange={(e) =>
                            updateBalance(key, "closing", e.target.value)
                          }
                          placeholder="0.00"
                          className="w-40 text-sm"
                          data-ocid="daily_pl.closing.input"
                        />
                      </td>
                      <td className="py-3 pl-4 text-right">
                        <span
                          className="font-semibold text-base"
                          style={{
                            color:
                              pl >= 0
                                ? "var(--profit-green)"
                                : "var(--brand-red)",
                          }}
                        >
                          {pl >= 0 ? "+" : ""}
                          {formatINR(pl)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {/* Totals row */}
                <tr
                  className="border-t-2"
                  style={{ borderColor: "var(--brand-red)" }}
                >
                  <td className="py-3 pr-4 font-bold text-sm">TOTAL</td>
                  <td className="py-3 px-4 font-semibold">
                    {formatINR(totalOpening)}
                  </td>
                  <td className="py-3 px-4 font-semibold">
                    {formatINR(totalClosing)}
                  </td>
                  <td className="py-3 pl-4 text-right">
                    <span
                      className="font-bold text-lg"
                      style={{
                        color:
                          totalPL >= 0
                            ? "var(--profit-green)"
                            : "var(--brand-red)",
                      }}
                    >
                      {totalPL >= 0 ? "+" : ""}
                      {formatINR(totalPL)}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-5 flex justify-end">
            <Button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="gap-2 text-white"
              style={{ backgroundColor: "var(--brand-red)" }}
              data-ocid="daily_pl.save.button"
            >
              {saveMutation.isPending ? (
                <>
                  <span className="animate-spin inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Entry
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Saved summary */}
      {saved && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25 }}
        >
          <Card className="border-green-200 bg-green-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-green-800 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" /> Entry Saved — Summary for{" "}
                {formatDate(selectedDate)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {headBalances.map((hb) => (
                  <div
                    key={String(hb.headId)}
                    className="bg-white rounded-lg p-3 border border-green-200"
                  >
                    <div className="text-xs text-muted-foreground">
                      {hb.headName}
                    </div>
                    <div
                      className="font-semibold mt-1"
                      style={{
                        color:
                          hb.profitLoss >= 0
                            ? "var(--profit-green)"
                            : "var(--brand-red)",
                      }}
                    >
                      {hb.profitLoss >= 0 ? "+" : ""}
                      {formatINR(hb.profitLoss)}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-3 border-t border-green-200">
                <span className="font-bold text-green-800">
                  Total Net P&L:{" "}
                </span>
                <span
                  className="font-bold text-xl"
                  style={{
                    color:
                      totalPL >= 0 ? "var(--profit-green)" : "var(--brand-red)",
                  }}
                >
                  {totalPL >= 0 ? "+" : ""}
                  {formatINR(totalPL)}
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
