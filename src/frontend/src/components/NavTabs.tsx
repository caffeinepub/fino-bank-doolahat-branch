import { ExternalLink, Star } from "lucide-react";
import type { TabId } from "../App";

interface NavTabsProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const tabs: { id: TabId; label: string; external?: boolean }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "daily-pl", label: "Daily P&L Entry" },
  { id: "pl-reports", label: "P&L Reports" },
  { id: "fixed-deposits", label: "Fixed Deposit" },
  { id: "transactions", label: "Transactions" },
  { id: "payment-heads", label: "Payment Heads" },
  { id: "merchants", label: "Merchants" },
  { id: "inventory", label: "Inventory" },
  { id: "complaints", label: "Complaints" },
  { id: "loans", label: "Loans" },
  { id: "lien-transaction", label: "Lien Transaction" },
  { id: "upi-collection", label: "UPI Collection", external: true },
];

export default function NavTabs({ activeTab, onTabChange }: NavTabsProps) {
  return (
    <nav className="bg-white border-b border-border sticky top-16 z-30">
      <div className="flex items-center px-6 gap-0 overflow-x-auto">
        {/* Branch label */}
        <div className="text-sm font-semibold text-muted-foreground mr-6 shrink-0 py-3">
          Doolahat Branch
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-border mr-4 shrink-0" />

        {/* Tabs */}
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`px-4 py-3.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap flex items-center gap-1 ${
              activeTab === tab.id && !tab.external
                ? "border-current"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            }`}
            style={
              activeTab === tab.id && !tab.external
                ? { borderColor: "var(--brand-red)", color: "var(--brand-red)" }
                : tab.external
                  ? { color: "#16a34a" }
                  : {}
            }
            data-ocid={`nav.${tab.id}.tab`}
          >
            {tab.label}
            {tab.external && <ExternalLink className="w-3 h-3" />}
          </button>
        ))}
      </div>
    </nav>
  );
}

export { Star };
