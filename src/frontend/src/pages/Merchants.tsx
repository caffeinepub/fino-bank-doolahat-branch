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
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Download,
  Lock,
  Pencil,
  PlusCircle,
  Trash2,
  Users,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import RoleSwitcherBar from "../components/RoleSwitcherBar";
import { useInventoryAuth } from "../context/InventoryAuthContext";
import type { Merchant } from "../hooks/useQueries";
import {
  useAddMerchant,
  useDeleteMerchant,
  useMerchants,
  useUpdateMerchant,
} from "../hooks/useQueries";
import { downloadMerchants } from "../utils/excelExport";

const emptyForm = { name: "", merchantId: "", mobileNo: "", address: "" };

export default function Merchants() {
  const { isManager } = useInventoryAuth();
  const { data: merchants = [] } = useMerchants();
  const addMerchant = useAddMerchant();
  const updateMerchant = useUpdateMerchant();
  const deleteMerchant = useDeleteMerchant();

  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Merchant | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState(emptyForm);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.merchantId.trim()) {
      toast.error("Name and Merchant ID are required.");
      return;
    }
    try {
      await addMerchant.mutateAsync({
        name: form.name.trim(),
        merchantId: form.merchantId.trim(),
        mobileNo: form.mobileNo.trim(),
        address: form.address.trim(),
      });
      toast.success("Merchant added");
      setForm(emptyForm);
      setAddOpen(false);
    } catch {
      toast.error("Failed to add merchant.");
    }
  };

  const openEdit = (merchant: Merchant) => {
    setEditTarget(merchant);
    setEditForm({
      name: merchant.name,
      merchantId: merchant.merchantId,
      mobileNo: merchant.mobileNo,
      address: merchant.address,
    });
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    if (!editForm.name.trim() || !editForm.merchantId.trim()) {
      toast.error("Name and Merchant ID are required.");
      return;
    }
    try {
      await updateMerchant.mutateAsync({
        id: editTarget.id,
        name: editForm.name.trim(),
        merchantId: editForm.merchantId.trim(),
        mobileNo: editForm.mobileNo.trim(),
        address: editForm.address.trim(),
      });
      toast.success("Merchant updated");
      setEditTarget(null);
    } catch {
      toast.error("Failed to update merchant.");
    }
  };

  const handleDelete = async () => {
    if (deleteTarget === null) return;
    try {
      await deleteMerchant.mutateAsync(deleteTarget);
      toast.success("Merchant deleted");
      setDeleteTarget(null);
    } catch {
      toast.error("Failed to delete merchant.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Role Switcher Bar */}
      <RoleSwitcherBar />

      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-3"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: "oklch(0.44 0.19 21 / 0.1)" }}
          >
            <Users className="w-5 h-5" style={{ color: "var(--brand-red)" }} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Merchants</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage merchant registrations for Doolahat Branch
            </p>
          </div>
        </div>
        {/* Manager-only action buttons */}
        {isManager && (
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => downloadMerchants(merchants)}
              disabled={merchants.length === 0}
              data-ocid="merchants.download.button"
            >
              <Download className="w-4 h-4" />
              Download Excel
            </Button>
            <Button
              className="gap-2 text-white"
              style={{ backgroundColor: "var(--brand-red)" }}
              onClick={() => {
                setForm(emptyForm);
                setAddOpen(true);
              }}
              data-ocid="merchants.add.open_modal_button"
            >
              <PlusCircle className="w-4 h-4" />
              Add Merchant
            </Button>
          </div>
        )}
      </motion.div>

      {/* Staff view-only notice */}
      {!isManager && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 px-4 py-3 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-800"
          data-ocid="merchants.staff_restricted.panel"
        >
          <Lock className="w-5 h-5 shrink-0 mt-0.5 text-blue-500" />
          <div>
            <p className="font-semibold text-blue-900">View Only Access</p>
            <p className="mt-0.5 text-blue-700">
              Merchant details are partially hidden for staff. Switch to Manager
              to view full details or make changes.
            </p>
          </div>
        </motion.div>
      )}

      {/* Table card */}
      <Card className="shadow-card border-border">
        <CardContent className="p-0">
          {merchants.length === 0 ? (
            <div
              className="py-16 text-center text-muted-foreground"
              data-ocid="merchants.empty_state"
            >
              <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No merchants registered yet.</p>
              {isManager && (
                <p className="text-sm mt-1">
                  Click &quot;Add Merchant&quot; to get started.
                </p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary/50">
                    <TableHead className="text-xs font-semibold text-muted-foreground w-12">
                      #
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground">
                      Name
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground">
                      Merchant ID
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground">
                      Mobile No
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground">
                      Address
                    </TableHead>
                    {isManager && (
                      <TableHead className="text-xs font-semibold text-muted-foreground">
                        Actions
                      </TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {merchants.map((merchant, i) => (
                    <TableRow
                      key={merchant.id}
                      className="hover:bg-secondary/30"
                      data-ocid={`merchants.item.${i + 1}`}
                    >
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {i + 1}
                      </TableCell>
                      <TableCell className="font-medium">
                        {merchant.name}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {isManager ? (
                          merchant.merchantId
                        ) : (
                          <span
                            className="tracking-widest text-muted-foreground"
                            title="Hidden from staff view"
                          >
                            &#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {isManager ? (
                          merchant.mobileNo || "-"
                        ) : (
                          <span
                            className="tracking-widest text-muted-foreground"
                            title="Hidden from staff view"
                          >
                            &#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm max-w-xs truncate">
                        {isManager ? (
                          merchant.address || "-"
                        ) : (
                          <span
                            className="tracking-widest text-muted-foreground"
                            title="Hidden from staff view"
                          >
                            &#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;
                          </span>
                        )}
                      </TableCell>
                      {isManager && (
                        <TableCell>
                          <div className="flex gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 gap-1 text-xs"
                              onClick={() => openEdit(merchant)}
                              data-ocid={`merchants.edit_button.${i + 1}`}
                            >
                              <Pencil className="w-3 h-3" /> Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs border-red-200 text-red-600 hover:bg-red-50"
                              onClick={() => setDeleteTarget(merchant.id)}
                              data-ocid={`merchants.delete_button.${i + 1}`}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Merchant Dialog — Manager only */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent data-ocid="merchants.add.dialog">
          <DialogHeader>
            <DialogTitle>Add Merchant</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4 mt-2">
            <div>
              <Label htmlFor="add-name">Name *</Label>
              <Input
                id="add-name"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="e.g. Ramesh Traders"
                className="mt-1"
                data-ocid="merchants.name.input"
              />
            </div>
            <div>
              <Label htmlFor="add-mid">Merchant ID *</Label>
              <Input
                id="add-mid"
                value={form.merchantId}
                onChange={(e) =>
                  setForm((f) => ({ ...f, merchantId: e.target.value }))
                }
                placeholder="e.g. MID-20230001"
                className="mt-1"
                data-ocid="merchants.merchant_id.input"
              />
            </div>
            <div>
              <Label htmlFor="add-mobile">Mobile No</Label>
              <Input
                id="add-mobile"
                value={form.mobileNo}
                onChange={(e) =>
                  setForm((f) => ({ ...f, mobileNo: e.target.value }))
                }
                placeholder="e.g. 9876543210"
                className="mt-1"
                data-ocid="merchants.mobile.input"
              />
            </div>
            <div>
              <Label htmlFor="add-address">Address</Label>
              <Input
                id="add-address"
                value={form.address}
                onChange={(e) =>
                  setForm((f) => ({ ...f, address: e.target.value }))
                }
                placeholder="e.g. Main Bazar, Doolahat"
                className="mt-1"
                data-ocid="merchants.address.input"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddOpen(false)}
                data-ocid="merchants.add.cancel_button"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={addMerchant.isPending}
                className="text-white"
                style={{ backgroundColor: "var(--brand-red)" }}
                data-ocid="merchants.add.submit_button"
              >
                {addMerchant.isPending ? "Adding..." : "Add Merchant"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Merchant Dialog — Manager only */}
      <Dialog
        open={!!editTarget}
        onOpenChange={(open) => !open && setEditTarget(null)}
      >
        <DialogContent data-ocid="merchants.edit.dialog">
          <DialogHeader>
            <DialogTitle>Edit Merchant</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4 mt-2">
            <div>
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, name: e.target.value }))
                }
                className="mt-1"
                data-ocid="merchants.edit_name.input"
              />
            </div>
            <div>
              <Label htmlFor="edit-mid">Merchant ID *</Label>
              <Input
                id="edit-mid"
                value={editForm.merchantId}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, merchantId: e.target.value }))
                }
                className="mt-1"
                data-ocid="merchants.edit_merchant_id.input"
              />
            </div>
            <div>
              <Label htmlFor="edit-mobile">Mobile No</Label>
              <Input
                id="edit-mobile"
                value={editForm.mobileNo}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, mobileNo: e.target.value }))
                }
                className="mt-1"
                data-ocid="merchants.edit_mobile.input"
              />
            </div>
            <div>
              <Label htmlFor="edit-address">Address</Label>
              <Input
                id="edit-address"
                value={editForm.address}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, address: e.target.value }))
                }
                className="mt-1"
                data-ocid="merchants.edit_address.input"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditTarget(null)}
                data-ocid="merchants.edit.cancel_button"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateMerchant.isPending}
                className="text-white"
                style={{ backgroundColor: "var(--brand-red)" }}
                data-ocid="merchants.edit.save_button"
              >
                {updateMerchant.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation — Manager only */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent data-ocid="merchants.delete.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Merchant?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the merchant from your records. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-ocid="merchants.delete.cancel_button">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="text-white"
              style={{ backgroundColor: "var(--brand-red)" }}
              data-ocid="merchants.delete.confirm_button"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
