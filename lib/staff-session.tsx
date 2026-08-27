import * as Device from "expo-device";
import Constants from "expo-constants";
import { AppState, Platform } from "react-native";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import * as Auth from "@/lib/_core/auth";
import { trpc } from "@/lib/trpc";
import type { StaffPermission } from "@/lib/staff-access";

type StaffUser = {
  userId: number;
  username: string;
  displayName: string;
  role: "owner" | "pharmacist" | "cashier" | "viewer";
  permissions: StaffPermission[];
  status: "active" | "frozen" | "disabled";
};

type Credentials = { username: string; password: string; displayName?: string };
type StaffSessionValue = {
  configured: boolean | undefined;
  ready: boolean;
  staff: StaffUser | null;
  can: (permission: StaffPermission) => boolean;
  login: (credentials: Credentials) => Promise<void>;
  bootstrap: (credentials: Required<Credentials>) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const StaffSessionContext = createContext<StaffSessionValue | null>(null);

export async function getStaffDevice() {
  const browserAgent = Platform.OS === "web" && typeof navigator !== "undefined" ? navigator.userAgent : undefined;
  return {
    deviceName: Device.deviceName ?? (Platform.OS === "web" ? "متصفح الويب" : "هاتف غير معروف"),
    devicePlatform: Platform.OS,
    appVersion: Constants.expoConfig?.version ?? undefined,
    userAgent: browserAgent,
  };
}

export function StaffSessionProvider({ children }: { children: ReactNode }) {
  const utils = trpc.useUtils();
  const [tokenReady, setTokenReady] = useState(false);
  const status = trpc.staff.status.useQuery(undefined, { retry: false });
  const me = trpc.staff.me.useQuery(undefined, { enabled: tokenReady, retry: false, refetchOnMount: true });
  const loginMutation = trpc.staff.login.useMutation();
  const bootstrapMutation = trpc.staff.bootstrap.useMutation();
  const logoutMutation = trpc.staff.logout.useMutation();

  useEffect(() => { Auth.getSessionToken().finally(() => setTokenReady(true)); }, []);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => { if (state === "active" && tokenReady) void me.refetch(); });
    return () => subscription.remove();
  }, [me, tokenReady]);

  const establish = useCallback(async (result: { token: string; profile: StaffUser }) => {
    await Auth.setSessionToken(result.token);
    await Auth.setUserInfo({ id: result.profile.userId, openId: `staff-${result.profile.userId}`, name: result.profile.displayName, email: null, loginMethod: "staff-password", lastSignedIn: new Date() });
    await utils.staff.me.invalidate();
    await me.refetch();
  }, [me, utils.staff.me]);

  const login = useCallback(async ({ username, password }: Credentials) => {
    const device = await getStaffDevice();
    const result = await loginMutation.mutateAsync({ username, password, device });
    await establish(result);
  }, [establish, loginMutation]);

  const bootstrap = useCallback(async ({ username, password, displayName }: Required<Credentials>) => {
    const device = await getStaffDevice();
    const result = await bootstrapMutation.mutateAsync({ username, password, displayName, device });
    await establish(result);
    await status.refetch();
  }, [bootstrapMutation, establish, status]);

  const logout = useCallback(async () => {
    try { await logoutMutation.mutateAsync(await getStaffDevice()); } catch { /* A revoked session may no longer reach the server. */ }
    await Auth.removeSessionToken();
    await Auth.clearUserInfo();
    utils.staff.me.setData(undefined, undefined);
    utils.staff.status.setData(undefined, undefined);
    await me.refetch();
  }, [logoutMutation, me, utils]);

  const value = useMemo<StaffSessionValue>(() => ({
    configured: status.data?.configured,
    ready: tokenReady && !status.isLoading && !me.isLoading,
    staff: me.data ?? null,
    can: (permission) => Boolean(me.data?.permissions.includes(permission)),
    login,
    bootstrap,
    logout,
    refresh: async () => { await Promise.all([status.refetch(), me.refetch()]); },
  }), [bootstrap, login, me.data, me.isLoading, status, tokenReady, logout]);

  return <StaffSessionContext.Provider value={value}>{children}</StaffSessionContext.Provider>;
}

export function useStaffSession() {
  const context = useContext(StaffSessionContext);
  if (!context) throw new Error("useStaffSession يجب أن يُستخدم داخل StaffSessionProvider.");
  return context;
}
