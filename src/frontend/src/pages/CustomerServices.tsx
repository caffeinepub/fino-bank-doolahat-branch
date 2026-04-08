import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ClipboardList, FileText, FolderOpen } from "lucide-react";
import { useState } from "react";
import RoleSwitcherBar from "../components/RoleSwitcherBar";
import { useInventoryAuth } from "../context/InventoryAuthContext";
import AccountOpeningForm from "./AccountOpeningForm";

type ServiceOption =
  | "menu"
  | "account-opening"
  | "account-transfer"
  | "account-closure";

const services = [
  {
    id: "account-opening" as ServiceOption,
    no: "1",
    icon: FileText,
    title: "Account Opening Form",
    desc: "Generate and download account opening forms for Fino Bank Doolahat and CSP accounts with unique registration numbers.",
    available: true,
    staffAllowed: true,
  },
  {
    id: "account-transfer" as ServiceOption,
    no: "2",
    icon: FolderOpen,
    title: "Bank Account Transfer Form",
    desc: "Branch-to-branch account transfer form. Transfer fee: ₹236.00 (including GST). Manager access required.",
    available: false,
    staffAllowed: false,
  },
  {
    id: "account-closure" as ServiceOption,
    no: "3",
    icon: ClipboardList,
    title: "Account Closure Form",
    desc: "Initiate account closure for bank customers with all required documentation. Manager access required.",
    available: false,
    staffAllowed: false,
  },
];

export default function CustomerServices() {
  const { isManager } = useInventoryAuth();
  const [active, setActive] = useState<ServiceOption>("menu");

  if (active === "account-opening") {
    return <AccountOpeningForm onBack={() => setActive("menu")} />;
  }

  return (
    <div className="space-y-4" data-ocid="customer_services.page">
      <RoleSwitcherBar />

      {/* Page header */}
      <div className="flex items-center gap-3 mb-2">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
          style={{ backgroundColor: "#462980" }}
        >
          <ClipboardList className="w-4 h-4" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-foreground">
            Customer Services
          </h1>
          <p className="text-xs text-muted-foreground">
            Manage account opening, transfer, and closure forms for bank
            customers
          </p>
        </div>
      </div>

      {/* Service cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {services.map((svc) => {
          const Icon = svc.icon;
          const canAccess = svc.available && (svc.staffAllowed || isManager);
          return (
            <Card
              key={svc.id}
              className={`border transition-all ${canAccess ? "hover:shadow-md cursor-pointer hover:border-[#462980]/40" : "opacity-70 cursor-not-allowed"}`}
              onClick={() => canAccess && setActive(svc.id)}
              data-ocid={`customer_services.${svc.id}.card`}
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-3 mb-3">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-white shrink-0"
                    style={{
                      backgroundColor: canAccess ? "#462980" : "#9ca3af",
                    }}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center text-white shrink-0"
                        style={{ backgroundColor: "#462980" }}
                      >
                        {svc.no}
                      </span>
                      <span className="text-sm font-semibold text-foreground leading-tight">
                        {svc.title}
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                  {svc.desc}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  {svc.available ? (
                    <Badge
                      className="text-[10px] px-1.5 py-0.5"
                      style={{ backgroundColor: "#462980", color: "#fff" }}
                    >
                      Available
                    </Badge>
                  ) : (
                    <Badge
                      variant="secondary"
                      className="text-[10px] px-1.5 py-0.5"
                    >
                      Coming Soon
                    </Badge>
                  )}
                  {!svc.staffAllowed && (
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0.5 text-amber-700 border-amber-300 bg-amber-50"
                    >
                      Manager Only
                    </Badge>
                  )}
                  {svc.staffAllowed && (
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0.5 text-green-700 border-green-300 bg-green-50"
                    >
                      Staff + Manager
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
