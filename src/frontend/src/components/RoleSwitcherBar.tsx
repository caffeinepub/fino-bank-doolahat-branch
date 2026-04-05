import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, LogOut, ShieldCheck, User } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useInventoryAuth } from "../context/InventoryAuthContext";

interface RoleSwitcherBarProps {
  className?: string;
}

export default function RoleSwitcherBar({
  className = "",
}: RoleSwitcherBarProps) {
  const { isManager, loginAsManager, resetManagerPassword, logoutManager } =
    useInventoryAuth();

  const [loginOpen, setLoginOpen] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [nickName, setNickName] = useState("");
  const [nickError, setNickError] = useState("");

  const openLogin = () => {
    setPassword("");
    setPasswordError("");
    setLoginOpen(true);
  };

  const handleLogin = () => {
    const ok = loginAsManager(password);
    if (ok) {
      toast.success("Switched to Manager View");
      setLoginOpen(false);
      setPassword("");
    } else {
      setPasswordError("Incorrect manager password. Please try again.");
    }
  };

  const handleForgotOpen = () => {
    setNickName("");
    setNickError("");
    setLoginOpen(false);
    setForgotOpen(true);
  };

  const handleForgotSubmit = () => {
    const ok = resetManagerPassword(nickName);
    if (ok) {
      toast.success("Identity verified — Logged in as Manager");
      setForgotOpen(false);
      setNickName("");
    } else {
      setNickError("Incorrect answer. Please try again.");
    }
  };

  const handleLogout = () => {
    logoutManager();
    toast.success("Switched to Staff View");
  };

  return (
    <>
      <div
        className={`flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg mb-1 ${className}`}
        style={{ backgroundColor: "var(--brand-red)" }}
        data-ocid="role_switcher.panel"
      >
        <div className="flex items-center gap-2.5">
          {isManager ? (
            <>
              <ShieldCheck className="w-4 h-4 text-white" />
              <span className="text-sm font-semibold text-white">
                Manager View
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-white/20 text-white border border-white/30">
                Full Access
              </span>
            </>
          ) : (
            <>
              <User className="w-4 h-4 text-white" />
              <span className="text-sm font-semibold text-white">
                Staff View
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-white/20 text-white border border-white/30">
                Limited Access
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isManager ? (
            <Button
              size="sm"
              variant="outline"
              onClick={handleLogout}
              className="h-8 text-xs gap-1.5 bg-white/10 border-white/40 text-white hover:bg-white/20 hover:text-white"
              data-ocid="role_switcher.logout.button"
            >
              <LogOut className="w-3.5 h-3.5" />
              Switch to Staff
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={openLogin}
              className="h-8 text-xs gap-1.5 bg-white text-[#462980] hover:bg-white/90 font-semibold"
              data-ocid="role_switcher.login.button"
            >
              <Lock className="w-3.5 h-3.5" />
              Switch to Manager
            </Button>
          )}
        </div>
      </div>

      {/* Manager Login Dialog */}
      <Dialog
        open={loginOpen}
        onOpenChange={(v) => {
          if (!v) {
            setLoginOpen(false);
            setPassword("");
            setPasswordError("");
          }
        }}
      >
        <DialogContent
          className="sm:max-w-sm"
          data-ocid="role_switcher.login.dialog"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck
                className="w-5 h-5"
                style={{ color: "var(--brand-red)" }}
              />
              Manager Login
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <p className="text-sm text-muted-foreground">
              Enter the manager password to unlock full access.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="mgr-password">Manager Password</Label>
              <Input
                id="mgr-password"
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError("");
                }}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                autoFocus
                data-ocid="role_switcher.password.input"
              />
              {passwordError && (
                <p
                  className="text-xs text-red-600"
                  data-ocid="role_switcher.password.error_state"
                >
                  {passwordError}
                </p>
              )}
            </div>
            <button
              type="button"
              className="text-xs underline text-muted-foreground hover:text-foreground transition-colors"
              onClick={handleForgotOpen}
              data-ocid="role_switcher.forgot_password.button"
            >
              Forgot Password?
            </button>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setLoginOpen(false)}
              data-ocid="role_switcher.login.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleLogin}
              className="text-white"
              style={{ backgroundColor: "var(--brand-red)" }}
              data-ocid="role_switcher.login.submit_button"
            >
              Login as Manager
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Forgot Password Dialog */}
      <Dialog
        open={forgotOpen}
        onOpenChange={(v) => {
          if (!v) {
            setForgotOpen(false);
            setNickName("");
            setNickError("");
          }
        }}
      >
        <DialogContent
          className="sm:max-w-sm"
          data-ocid="role_switcher.forgot.dialog"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" style={{ color: "var(--brand-red)" }} />
              Forgot Password
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <p className="text-sm text-muted-foreground">
              Answer the security question to regain manager access.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="nick-name">Enter Your Nick Name</Label>
              <Input
                id="nick-name"
                placeholder="Your nick name"
                value={nickName}
                onChange={(e) => {
                  setNickName(e.target.value);
                  setNickError("");
                }}
                onKeyDown={(e) => e.key === "Enter" && handleForgotSubmit()}
                autoFocus
                data-ocid="role_switcher.nickname.input"
              />
              {nickError && (
                <p
                  className="text-xs text-red-600"
                  data-ocid="role_switcher.nickname.error_state"
                >
                  {nickError}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setForgotOpen(false)}
              data-ocid="role_switcher.forgot.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleForgotSubmit}
              className="text-white"
              style={{ backgroundColor: "var(--brand-red)" }}
              data-ocid="role_switcher.forgot.submit_button"
            >
              Verify &amp; Login
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
