import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil, PlusCircle, ShieldCheck, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import LoadingSpinner from "../components/LoadingSpinner";
import type { PaymentHead } from "../hooks/useQueries";
import {
  useAddPaymentHead,
  useDeletePaymentHead,
  useEditPaymentHead,
  usePaymentHeads,
} from "../hooks/useQueries";

const HEAD_TYPES = ["Opening", "Closing", "Both"];

export default function PaymentHeads() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("Both");
  const [editHead, setEditHead] = useState<PaymentHead | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: heads, isLoading } = usePaymentHeads();
  const addHead = useAddPaymentHead();
  const editHeadMutation = useEditPaymentHead();
  const deleteHeadMutation = useDeletePaymentHead();

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      toast.error("Name is required.");
      return;
    }
    try {
      await addHead.mutateAsync({ name: newName.trim(), headType: newType });
      toast.success("Payment head added!");
      setNewName("");
      setNewType("Both");
      setShowAddForm(false);
    } catch {
      toast.error("Failed to add payment head.");
    }
  };

  const openEdit = (head: PaymentHead) => {
    setEditHead(head);
    setEditName(head.name);
    setEditType(head.headType);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editHead || !editName.trim()) return;
    try {
      await editHeadMutation.mutateAsync({
        id: editHead.id,
        name: editName.trim(),
        headType: editType,
      });
      toast.success("Payment head updated!");
      setEditHead(null);
    } catch {
      toast.error("Failed to update payment head.");
    }
  };

  const handleDelete = async () => {
    if (deleteId === null) return;
    try {
      await deleteHeadMutation.mutateAsync(deleteId);
      toast.success("Payment head deleted.");
      setDeleteId(null);
    } catch {
      toast.error("Failed to delete. It may be in use.");
      setDeleteId(null);
    }
  };

  const getTypeBadgeStyle = (type: string) => {
    if (type === "Opening") return "bg-blue-50 text-blue-700 border-blue-200";
    if (type === "Closing")
      return "bg-purple-50 text-purple-700 border-purple-200";
    return "bg-green-50 text-green-700 border-green-200";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">Payment Heads</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configure opening and closing balance heads
          </p>
        </div>
        <Button
          onClick={() => setShowAddForm((v) => !v)}
          className="gap-2 text-white"
          style={{ backgroundColor: "var(--brand-red)" }}
          data-ocid="payment_heads.add.button"
        >
          <PlusCircle className="w-4 h-4" />
          Add Payment Head
        </Button>
      </div>

      {/* Add form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="shadow-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">
                  Add New Payment Head
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={handleAdd}
                  className="flex flex-wrap items-end gap-4"
                >
                  <div className="flex-1 min-w-48">
                    <Label htmlFor="head-name">Head Name *</Label>
                    <Input
                      id="head-name"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="e.g. Petty Cash"
                      className="mt-1"
                      data-ocid="payment_heads.name.input"
                    />
                  </div>
                  <div className="w-40">
                    <Label>Head Type</Label>
                    <Select value={newType} onValueChange={setNewType}>
                      <SelectTrigger
                        className="mt-1"
                        data-ocid="payment_heads.type.select"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {HEAD_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowAddForm(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={addHead.isPending}
                      className="text-white"
                      style={{ backgroundColor: "var(--brand-red)" }}
                      data-ocid="payment_heads.submit.button"
                    >
                      {addHead.isPending ? "Adding..." : "Add Head"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      <Card className="shadow-card border-border">
        <CardContent className="p-0">
          {isLoading ? (
            <LoadingSpinner text="Loading payment heads..." />
          ) : !heads || heads.length === 0 ? (
            <div
              className="py-12 text-center text-muted-foreground"
              data-ocid="payment_heads.empty_state"
            >
              No payment heads found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
                      ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
                      Category
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {heads.map((head: PaymentHead, i) => (
                    <tr
                      key={String(head.id)}
                      className="border-b border-border last:border-0 hover:bg-secondary/30"
                      data-ocid={`payment_heads.item.${i + 1}`}
                    >
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {String(head.id)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{head.name}</span>
                          {head.isDefault && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-amber-50 text-amber-700 border border-amber-200">
                              <ShieldCheck className="w-3 h-3" /> Default
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getTypeBadgeStyle(head.headType)}`}
                        >
                          {head.headType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {head.isDefault ? "System Default" : "Custom"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 gap-1 text-xs"
                            onClick={() => openEdit(head)}
                            data-ocid={`payment_heads.edit_button.${i + 1}`}
                          >
                            <Pencil className="w-3 h-3" /> Edit
                          </Button>
                          {!head.isDefault && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs border-red-200 text-red-600 hover:bg-red-50"
                              onClick={() => setDeleteId(head.id)}
                              data-ocid={`payment_heads.delete_button.${i + 1}`}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog
        open={!!editHead}
        onOpenChange={(open) => !open && setEditHead(null)}
      >
        <DialogContent data-ocid="payment_heads.edit.dialog">
          <DialogHeader>
            <DialogTitle>Edit Payment Head</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4 mt-2">
            <div>
              <Label htmlFor="edit-name">Head Name *</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="mt-1"
                data-ocid="payment_heads.edit_name.input"
              />
            </div>
            <div>
              <Label>Head Type</Label>
              <Select value={editType} onValueChange={setEditType}>
                <SelectTrigger
                  className="mt-1"
                  data-ocid="payment_heads.edit_type.select"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HEAD_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditHead(null)}
                data-ocid="payment_heads.edit.cancel_button"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={editHeadMutation.isPending}
                className="text-white"
                style={{ backgroundColor: "var(--brand-red)" }}
                data-ocid="payment_heads.edit.save_button"
              >
                {editHeadMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialogContent data-ocid="payment_heads.delete.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payment Head?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this payment head. If it&apos;s used
              in existing P&L entries, deletion may fail.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-ocid="payment_heads.delete.cancel_button">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="text-white"
              style={{ backgroundColor: "var(--brand-red)" }}
              data-ocid="payment_heads.delete.confirm_button"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
