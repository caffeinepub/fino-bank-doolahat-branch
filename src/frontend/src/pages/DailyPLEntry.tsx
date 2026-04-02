import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CheckCircle2, Save, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { HeadBalance } from "../backend";
import LoadingSpinner from "../components/LoadingSpinner";
import {
  useAllDailyPLs,
  useDeleteDailyPL,
  usePaymentHeads,
  useSaveDailyPL,
} from "../hooks/useQueries";
import { formatDate, formatINR, todayISO } from "../utils/helpers";

export default function DailyPLEntry() {
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [balances, setBalances] = useState<
    Record<string, { opening: string; closing: string }>
  >({});
  const [confirmBalances, setConfirmBalances] = useState<
    Record<string, { opening: string; closing: string }>
  >({});
  const [doubleEntry, setDoubleEntry] = useState(false);
  const [saved, setSaved] = useState(false);

  const { data: heads, isLoading: headsLoading } = usePaymentHeads();
  const { data: allPLs, isLoading: plsLoading } = useAllDailyPLs();
  const saveMutation = useSaveDailyPL();
  const deleteMutation = useDeleteDailyPL();

  const existingEntry = useMemo(() => {
    if (!allPLs) return null;
    return allPLs.find((p) => p.date === selectedDate) || null;
  }, [allPLs, selectedDate]);

  // When heads or date changes, pre-fill if existing
  useEffect(() => {
    if (!heads) return;
    const initial: Record<string, { opening: string; closing: string }> = {};
    const confirmInitial: Record<string, { opening: string; closing: string }> =
      {};
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
      confirmInitial[key] = { opening: "", closing: "" };
    }
    setBalances(initial);
    setConfirmBalances(confirmInitial);
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

  // Validate double entry: confirm values must match primary
  const doubleEntryErrors = useMemo(() => {
    if (!doubleEntry || !heads) return {};
    const errors: Record<string, { opening?: boolean; closing?: boolean }> = {};
    for (const h of heads) {
      const key = String(h.id);
      const primary = balances[key] || { opening: "", closing: "" };
      const confirm = confirmBalances[key] || { opening: "", closing: "" };
      const openingMismatch =
        confirm.opening !== "" && confirm.opening !== primary.opening;
      const closingMismatch =
        confirm.closing !== "" && confirm.closing !== primary.closing;
      if (openingMismatch || closingMismatch) {
        errors[key] = {
          opening: openingMismatch,
          closing: closingMismatch,
        };
      }
    }
    return errors;
  }, [doubleEntry, heads, balances, confirmBalances]);

  const doubleEntryValid = useMemo(() => {
    if (!doubleEntry || !heads) return true;
    for (const h of heads) {
      const key = String(h.id);
      const primary = balances[key] || { opening: "", closing: "" };
      const confirm = confirmBalances[key] || { opening: "", closing: "" };
      if (primary.opening !== confirm.opening) return false;
      if (primary.closing !== confirm.closing) return false;
    }
    return true;
  }, [doubleEntry, heads, balances, confirmBalances]);

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

  const updateConfirmBalance = (
    headId: string,
    field: "opening" | "closing",
    value: string,
  ) => {
    setConfirmBalances((prev) => ({
      ...prev,
      [headId]: { ...prev[headId], [field]: value },
    }));
  };

  const handleSave = async () => {
    if (doubleEntry && !doubleEntryValid) {
      toast.error(
        "Double Entry mismatch: confirm values do not match primary values.",
      );
      return;
    }
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

  const handleDeleteEntry = async (id: bigint, date: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success(`Entry for ${formatDate(date)} deleted successfully.`);
      setSaved(false);
    } catch {
      toast.error("Failed to delete entry. Please try again.");
    }
  };

  // Sort all entries newest first for history
  const sortedEntries = useMemo(() => {
    if (!allPLs) return [];
    return [...allPLs].sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [allPLs]);

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

      {/* Date selector + Double Entry toggle */}
      <Card className="shadow-card border-border">
        <CardContent className="pt-5">
          <div className="flex flex-wrap items-end gap-4">
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
            {/* Double Entry Toggle */}
            <div className="ml-auto flex items-center gap-3 pb-1">
              <Label
                htmlFor="double-entry-toggle"
                className="text-sm font-medium cursor-pointer select-none"
              >
                Double Entry
              </Label>
              <Switch
                id="double-entry-toggle"
                checked={doubleEntry}
                onCheckedChange={(val) => {
                  setDoubleEntry(val);
                  // Reset confirm values when toggling
                  if (!val) {
                    const reset: Record<
                      string,
                      { opening: string; closing: string }
                    > = {};
                    for (const key of Object.keys(confirmBalances)) {
                      reset[key] = { opening: "", closing: "" };
                    }
                    setConfirmBalances(reset);
                  }
                }}
                data-ocid="daily_pl.double_entry.toggle"
              />
              {doubleEntry && (
                <Badge
                  variant="outline"
                  className="text-xs"
                  style={{
                    borderColor: doubleEntryValid ? "#16a34a" : "#dc2626",
                    color: doubleEntryValid ? "#16a34a" : "#dc2626",
                  }}
                >
                  {doubleEntryValid ? "Verified" : "Mismatch"}
                </Badge>
              )}
            </div>
          </div>
          {doubleEntry && (
            <p className="mt-3 text-xs text-muted-foreground bg-amber-50 border border-amber-200 rounded px-3 py-2">
              Double Entry mode is ON. Re-enter each balance in the confirm
              columns. Values must match before saving.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Balance entry table */}
      <Card className="shadow-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">
            Balance Entry
            {doubleEntry && (
              <span className="ml-2 text-xs font-normal text-amber-600">
                (Double Entry Mode)
              </span>
            )}
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
                  <th className="py-3 px-2 text-left text-xs font-semibold text-muted-foreground">
                    Opening (₹)
                  </th>
                  {doubleEntry && (
                    <th className="py-3 px-2 text-left text-xs font-semibold text-amber-600">
                      Confirm Opening (₹)
                    </th>
                  )}
                  <th className="py-3 px-2 text-left text-xs font-semibold text-muted-foreground">
                    Closing (₹)
                  </th>
                  {doubleEntry && (
                    <th className="py-3 px-2 text-left text-xs font-semibold text-amber-600">
                      Confirm Closing (₹)
                    </th>
                  )}
                  <th className="py-3 pl-2 text-right text-xs font-semibold text-muted-foreground">
                    Profit / Loss (₹)
                  </th>
                </tr>
              </thead>
              <tbody>
                {heads?.map((head) => {
                  const key = String(head.id);
                  const hb = headBalances.find((h) => h.headId === head.id);
                  const pl = hb ? hb.profitLoss : 0;
                  const errors = doubleEntryErrors[key] || {};
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
                      {/* Opening Balance */}
                      <td className="py-3 px-2">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={balances[key]?.opening || ""}
                          onChange={(e) =>
                            updateBalance(key, "opening", e.target.value)
                          }
                          placeholder="0.00"
                          className="w-36 text-sm"
                          data-ocid="daily_pl.opening.input"
                        />
                      </td>
                      {/* Confirm Opening (Double Entry) */}
                      {doubleEntry && (
                        <td className="py-3 px-2">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={confirmBalances[key]?.opening || ""}
                            onChange={(e) =>
                              updateConfirmBalance(
                                key,
                                "opening",
                                e.target.value,
                              )
                            }
                            placeholder="Re-enter"
                            className={`w-36 text-sm ${
                              errors.opening
                                ? "border-red-500 focus-visible:ring-red-500"
                                : confirmBalances[key]?.opening !== "" &&
                                    confirmBalances[key]?.opening ===
                                      balances[key]?.opening
                                  ? "border-green-500 focus-visible:ring-green-500"
                                  : ""
                            }`}
                            data-ocid="daily_pl.confirm_opening.input"
                          />
                          {errors.opening && (
                            <p className="text-xs text-red-500 mt-0.5">
                              Mismatch
                            </p>
                          )}
                        </td>
                      )}
                      {/* Closing Balance */}
                      <td className="py-3 px-2">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={balances[key]?.closing || ""}
                          onChange={(e) =>
                            updateBalance(key, "closing", e.target.value)
                          }
                          placeholder="0.00"
                          className="w-36 text-sm"
                          data-ocid="daily_pl.closing.input"
                        />
                      </td>
                      {/* Confirm Closing (Double Entry) */}
                      {doubleEntry && (
                        <td className="py-3 px-2">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={confirmBalances[key]?.closing || ""}
                            onChange={(e) =>
                              updateConfirmBalance(
                                key,
                                "closing",
                                e.target.value,
                              )
                            }
                            placeholder="Re-enter"
                            className={`w-36 text-sm ${
                              errors.closing
                                ? "border-red-500 focus-visible:ring-red-500"
                                : confirmBalances[key]?.closing !== "" &&
                                    confirmBalances[key]?.closing ===
                                      balances[key]?.closing
                                  ? "border-green-500 focus-visible:ring-green-500"
                                  : ""
                            }`}
                            data-ocid="daily_pl.confirm_closing.input"
                          />
                          {errors.closing && (
                            <p className="text-xs text-red-500 mt-0.5">
                              Mismatch
                            </p>
                          )}
                        </td>
                      )}
                      {/* P&L */}
                      <td className="py-3 pl-2 text-right">
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
                  <td className="py-3 px-2 font-semibold">
                    {formatINR(totalOpening)}
                  </td>
                  {doubleEntry && <td />}
                  <td className="py-3 px-2 font-semibold">
                    {formatINR(totalClosing)}
                  </td>
                  {doubleEntry && <td />}
                  <td className="py-3 pl-2 text-right">
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

          <div className="mt-5 flex items-center justify-between gap-3">
            {/* Delete existing entry button */}
            {existingEntry && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="gap-2 border-red-300 text-red-600 hover:bg-red-50"
                    data-ocid="daily_pl.delete.button"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Entry
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete P&L Entry?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete the P&L entry for{" "}
                      <strong>{formatDate(selectedDate)}</strong>. This action
                      cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-red-600 hover:bg-red-700 text-white"
                      onClick={() =>
                        handleDeleteEntry(existingEntry.id, selectedDate)
                      }
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            <div className="ml-auto">
              <Button
                onClick={handleSave}
                disabled={
                  saveMutation.isPending || (doubleEntry && !doubleEntryValid)
                }
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

      {/* Past entries with delete */}
      {sortedEntries.length > 0 && (
        <Card className="shadow-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              Past Entries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="py-2 pr-4 text-left text-xs font-semibold text-muted-foreground">
                      Date
                    </th>
                    <th className="py-2 px-4 text-right text-xs font-semibold text-muted-foreground">
                      Total Opening (₹)
                    </th>
                    <th className="py-2 px-4 text-right text-xs font-semibold text-muted-foreground">
                      Total Closing (₹)
                    </th>
                    <th className="py-2 px-4 text-right text-xs font-semibold text-muted-foreground">
                      Net P&L (₹)
                    </th>
                    <th className="py-2 pl-4 text-right text-xs font-semibold text-muted-foreground">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedEntries.map((entry) => {
                    const entryTotalOpening = entry.headBalances.reduce(
                      (s, h) => s + h.openingBalance,
                      0,
                    );
                    const entryTotalClosing = entry.headBalances.reduce(
                      (s, h) => s + h.closingBalance,
                      0,
                    );
                    const pl = entry.totalProfitLoss;
                    const isSelected = entry.date === selectedDate;
                    return (
                      <tr
                        key={String(entry.id)}
                        className={`border-b border-border last:border-0 ${
                          isSelected ? "bg-muted/40" : ""
                        }`}
                      >
                        <td className="py-2.5 pr-4">
                          <button
                            type="button"
                            className="font-medium text-left hover:underline"
                            style={{ color: "var(--brand-red)" }}
                            onClick={() => setSelectedDate(entry.date)}
                          >
                            {formatDate(entry.date)}
                          </button>
                          {isSelected && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              (selected)
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          {formatINR(entryTotalOpening)}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          {formatINR(entryTotalClosing)}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <span
                            className="font-semibold"
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
                        <td className="py-2.5 pl-4 text-right">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-red-500 hover:bg-red-50 hover:text-red-700"
                                data-ocid="daily_pl.history_delete.button"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Delete P&L Entry?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete the P&L entry for{" "}
                                  <strong>{formatDate(entry.date)}</strong>.
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-red-600 hover:bg-red-700 text-white"
                                  onClick={() =>
                                    handleDeleteEntry(entry.id, entry.date)
                                  }
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
