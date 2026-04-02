import { Toaster } from "@/components/ui/sonner";
import { useState } from "react";
import Header from "./components/Header";
import NavTabs from "./components/NavTabs";
import DailyPLEntry from "./pages/DailyPLEntry";
import Dashboard from "./pages/Dashboard";
import FixedDeposits from "./pages/FixedDeposits";
import PLReports from "./pages/PLReports";
import PaymentHeads from "./pages/PaymentHeads";
import Transactions from "./pages/Transactions";

export type TabId =
  | "dashboard"
  | "daily-pl"
  | "pl-reports"
  | "fixed-deposits"
  | "transactions"
  | "payment-heads";

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");

  const renderPage = () => {
    switch (activeTab) {
      case "dashboard":
        return <Dashboard onNavigate={setActiveTab} />;
      case "daily-pl":
        return <DailyPLEntry />;
      case "pl-reports":
        return <PLReports />;
      case "fixed-deposits":
        return <FixedDeposits />;
      case "transactions":
        return <Transactions />;
      case "payment-heads":
        return <PaymentHeads />;
      default:
        return <Dashboard onNavigate={setActiveTab} />;
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "var(--page-bg)" }}
    >
      <Header />
      <NavTabs activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="flex-1 px-6 py-6 max-w-screen-2xl mx-auto w-full">
        {renderPage()}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-border mt-8">
        <div className="max-w-screen-2xl mx-auto px-6 py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Bank info */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-7 h-7 rounded-full border-2 flex items-center justify-center"
                  style={{ borderColor: "var(--brand-red)" }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="w-4 h-4"
                    fill="currentColor"
                    style={{ color: "var(--brand-red)" }}
                    aria-label="Fino Bank Star"
                    role="img"
                  >
                    <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
                  </svg>
                </div>
                <span
                  className="font-bold text-sm"
                  style={{ color: "var(--brand-red)" }}
                >
                  Fino Small Finance Bank
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Doolahat Branch</p>
              <p className="text-xs text-muted-foreground">IFSC: FINO0001599</p>
              <p className="text-xs text-muted-foreground mt-1">
                Branch Management Portal
              </p>
            </div>

            {/* Quick links */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3">
                Quick Links
              </h4>
              <ul className="space-y-1">
                {(
                  [
                    ["dashboard", "Dashboard"],
                    ["daily-pl", "Daily P&L Entry"],
                    ["pl-reports", "P&L Reports"],
                    ["fixed-deposits", "Fixed Deposit"],
                    ["transactions", "Transactions"],
                  ] as [TabId, string][]
                ).map(([tab, label]) => (
                  <li key={tab}>
                    <button
                      type="button"
                      onClick={() => setActiveTab(tab)}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Support */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3">
                Support
              </h4>
              <ul className="space-y-1">
                <li className="text-xs text-muted-foreground">
                  Helpline: 1800-XXX-XXXX
                </li>
                <li className="text-xs text-muted-foreground">
                  Email: support@finobank.com
                </li>
                <li className="text-xs text-muted-foreground">
                  Mon–Fri, 9:00 AM – 6:00 PM
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-2">
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} Fino Small Finance Bank —
              Doolahat Branch. All rights reserved.
            </p>
            <p className="text-xs text-muted-foreground">
              Built with ❤️ using{" "}
              <a
                href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(
                  typeof window !== "undefined" ? window.location.hostname : "",
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground transition-colors"
              >
                caffeine.ai
              </a>
            </p>
          </div>
        </div>
      </footer>

      <Toaster richColors position="top-right" />
    </div>
  );
}
