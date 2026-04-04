import { createContext, useContext, useEffect, useState } from "react";

// ── Types ────────────────────────────────────────────────────────────────────

export type InventoryRole = "staff" | "manager" | null;

export interface InventoryAuthState {
  role: InventoryRole;
  staffUserId: string | null;
}

interface InventoryAuthContextValue extends InventoryAuthState {
  loginAsStaff: (userId: string, password: string) => boolean;
  loginAsManager: (password: string) => boolean;
  resetManagerPassword: (nickName: string) => boolean;
  logout: () => void;
  setStaffAuth: (userId: string) => void;
}

// ── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = "fino_inventory_auth";
const MANAGER_PASSWORD = "Ratulcc143@";
const STAFF_ID = "156399746";
const STAFF_PASSWORD = "156399746";
const SECURITY_ANSWER = "Pulak";

// ── Context ──────────────────────────────────────────────────────────────────

const InventoryAuthContext = createContext<InventoryAuthContextValue | null>(
  null,
);

export function InventoryAuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, setState] = useState<InventoryAuthState>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as InventoryAuthState;
        // Always start with staff view per requirement
        return { role: "staff", staffUserId: parsed.staffUserId ?? null };
      }
    } catch {
      // ignore
    }
    return { role: "staff", staffUserId: null };
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const loginAsStaff = (userId: string, password: string): boolean => {
    if (userId === STAFF_ID && password === STAFF_PASSWORD) {
      setState({ role: "staff", staffUserId: userId });
      return true;
    }
    return false;
  };

  const loginAsManager = (password: string): boolean => {
    if (password === MANAGER_PASSWORD) {
      setState((prev) => ({ ...prev, role: "manager" }));
      return true;
    }
    return false;
  };

  const resetManagerPassword = (nickName: string): boolean => {
    if (nickName === SECURITY_ANSWER) {
      setState((prev) => ({ ...prev, role: "manager" }));
      return true;
    }
    return false;
  };

  const logout = () => {
    setState({ role: "staff", staffUserId: null });
  };

  const setStaffAuth = (userId: string) => {
    setState((prev) => ({ ...prev, staffUserId: userId }));
  };

  return (
    <InventoryAuthContext.Provider
      value={{
        ...state,
        loginAsStaff,
        loginAsManager,
        resetManagerPassword,
        logout,
        setStaffAuth,
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

export { STAFF_ID, STAFF_PASSWORD, MANAGER_PASSWORD, SECURITY_ANSWER };
