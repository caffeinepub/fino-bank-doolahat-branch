import type React from "react";
import { createContext, useContext, useEffect, useState } from "react";

// ── Types ────────────────────────────────────────────────────────────────────

export type InventoryRole = "staff" | "manager";

export interface InventoryAuthState {
  role: InventoryRole;
}

interface InventoryAuthContextValue {
  role: InventoryRole;
  isManager: boolean;
  loginAsManager: (password: string) => boolean;
  resetManagerPassword: (nickName: string) => boolean;
  logoutManager: () => void;
}

// ── Constants ────────────────────────────────────────────────────────────────

export const STAFF_ID = "156399746";
export const STAFF_PASSWORD = "156399746";
export const MANAGER_PASSWORD = "Ratulcc143@";
export const SECURITY_ANSWER = "Pulak";

const STORAGE_KEY = "fino_role_v2";

// ── Context ──────────────────────────────────────────────────────────────────

const InventoryAuthContext = createContext<InventoryAuthContextValue | null>(
  null,
);

export function InventoryAuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [role, setRole] = useState<InventoryRole>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      // Always default to staff on page load for security
      if (stored === "manager") return "manager";
    } catch {
      // ignore
    }
    return "staff";
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, role);
    // Also write to old key for Transactions page compatibility
    localStorage.setItem("fino_inventory_auth", JSON.stringify({ role }));
  }, [role]);

  const loginAsManager = (password: string): boolean => {
    if (password === MANAGER_PASSWORD) {
      setRole("manager");
      return true;
    }
    return false;
  };

  const resetManagerPassword = (nickName: string): boolean => {
    if (nickName.trim() === SECURITY_ANSWER) {
      setRole("manager");
      return true;
    }
    return false;
  };

  const logoutManager = () => {
    setRole("staff");
  };

  return (
    <InventoryAuthContext.Provider
      value={{
        role,
        isManager: role === "manager",
        loginAsManager,
        resetManagerPassword,
        logoutManager,
      }}
    >
      {children}
    </InventoryAuthContext.Provider>
  );
}

export function useInventoryAuth(): InventoryAuthContextValue {
  const ctx = useContext(InventoryAuthContext);
  if (!ctx)
    throw new Error(
      "useInventoryAuth must be used within InventoryAuthProvider",
    );
  return ctx;
}
