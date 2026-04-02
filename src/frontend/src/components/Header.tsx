import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bell, LogOut, Search } from "lucide-react";

interface HeaderProps {
  notificationCount?: number;
}

export default function Header({ notificationCount = 3 }: HeaderProps) {
  return (
    <header className="bg-white border-b border-border sticky top-0 z-40 shadow-xs">
      <div className="flex items-center justify-between px-6 h-16 gap-4">
        {/* Logo + Bank Name */}
        <div className="flex items-center gap-3 shrink-0">
          <div
            className="w-10 h-10 rounded-full border-2 flex items-center justify-center"
            style={{ borderColor: "var(--brand-red)" }}
          >
            <svg
              viewBox="0 0 24 24"
              className="w-5 h-5"
              fill="currentColor"
              style={{ color: "var(--brand-red)" }}
              aria-label="Fino Bank Star Logo"
              role="img"
            >
              <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
            </svg>
          </div>
          <div>
            <div
              className="font-bold text-base leading-tight"
              style={{ color: "var(--brand-red)" }}
            >
              Fino Small Finance Bank
            </div>
            <div className="text-xs text-muted-foreground leading-tight">
              Doolahat Branch&nbsp;&nbsp;|&nbsp;&nbsp;IFSC: FINO0001599
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="flex-1 max-w-md mx-4 hidden sm:flex">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search accounts, transactions..."
              className="pl-9 bg-secondary border-border text-sm h-9"
              data-ocid="header.search_input"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Bell */}
          <button
            type="button"
            className="relative p-2 rounded-full hover:bg-secondary transition-colors"
            aria-label="Notifications"
            data-ocid="header.notifications.button"
          >
            <Bell className="w-5 h-5 text-foreground" />
            {notificationCount > 0 && (
              <span
                className="absolute top-1 right-1 w-2 h-2 rounded-full"
                style={{ backgroundColor: "var(--brand-red)" }}
              />
            )}
          </button>

          {/* User chip */}
          <div className="flex items-center gap-2 bg-secondary rounded-full px-3 py-1.5 cursor-pointer hover:bg-muted transition-colors">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold"
              style={{ backgroundColor: "var(--brand-red)" }}
            >
              A
            </div>
            <span className="text-sm font-medium text-foreground">Admin</span>
          </div>

          {/* Logout */}
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground gap-1.5"
            data-ocid="header.logout.button"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline text-sm">Logout</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
