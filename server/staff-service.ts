import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { and, desc, eq, gt, inArray, isNull, or } from "drizzle-orm";

import { staffAuditLogs, staffNotifications, staffProfiles, staffSessions, users } from "../drizzle/schema";
import { normalizePermissions, permissionsForRole, type StaffPermission, type StaffRole, type StaffStatus } from "../lib/staff-access";
import { getDb } from "./db";

const scrypt = promisify(scryptCallback);
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

export type DeviceContext = {
  deviceName?: string;
  devicePlatform?: string;
  appVersion?: string;
  userAgent?: string;
  networkAddress?: string | null;
};

export type PublicStaffProfile = {
  userId: number;
  username: string;
  displayName: string;
  role: StaffRole;
  permissions: StaffPermission[];
  status: StaffStatus;
  frozenUntil: Date | null;
  createdAt: Date;
  lastSignedIn: Date;
};

function requireDb(db: Awaited<ReturnType<typeof getDb>>) {
  if (!db) throw new Error("قاعدة بيانات إدارة المستخدمين غير متاحة حاليًا.");
  return db;
}

function cleanUsername(username: string) { return username.trim().toLowerCase(); }
function newOpenId() { return `staff_${randomBytes(18).toString("hex")}`; }
function newSessionId() { return `session_${randomBytes(18).toString("hex")}`; }
function safeDeviceName(input?: string) { return input?.trim().slice(0, 255) || "جهاز غير معروف"; }
function safePlatform(input?: string) { return input?.trim().slice(0, 64) || "unknown"; }

export function maskNetworkAddress(value: string | undefined | null) {
  if (!value) return null;
  const first = value.split(",")[0]?.trim() ?? "";
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(first)) return `${first.split(".").slice(0, 3).join(".")}.0`;
  const blocks = first.split(":");
  return blocks.length > 2 ? `${blocks.slice(0, 3).join(":")}::` : first.slice(0, 64);
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, 64) as Buffer;
  return `scrypt:${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, storedHash: string) {
  const [algorithm, salt, stored] = storedHash.split(":");
  if (algorithm !== "scrypt" || !salt || !stored) return false;
  const derived = await scrypt(password, salt, 64) as Buffer;
  const storedBuffer = Buffer.from(stored, "hex");
  return storedBuffer.length === derived.length && timingSafeEqual(storedBuffer, derived);
}

function serializeProfile(profile: typeof staffProfiles.$inferSelect, user: typeof users.$inferSelect): PublicStaffProfile {
  return {
    userId: profile.userId,
    username: profile.username,
    displayName: profile.displayName,
    role: profile.role as StaffRole,
    permissions: normalizePermissions(JSON.parse(profile.permissions || "[]")),
    status: profile.status as StaffStatus,
    frozenUntil: profile.frozenUntil,
    createdAt: profile.createdAt,
    lastSignedIn: user.lastSignedIn,
  };
}

export function isProfileActive(profile: Pick<PublicStaffProfile, "status" | "frozenUntil">, now = new Date()) {
  if (profile.status === "disabled") return false;
  if (profile.status === "frozen" && (!profile.frozenUntil || profile.frozenUntil > now)) return false;
  return true;
}

export async function hasStaffConfigured() {
  const db = requireDb(await getDb());
  const result = await db.select({ userId: staffProfiles.userId }).from(staffProfiles).limit(1);
  return result.length > 0;
}

export async function getProfileByUserId(userId: number) {
  const db = requireDb(await getDb());
  const rows = await db.select({ profile: staffProfiles, user: users }).from(staffProfiles).innerJoin(users, eq(staffProfiles.userId, users.id)).where(eq(staffProfiles.userId, userId)).limit(1);
  return rows[0] ? serializeProfile(rows[0].profile, rows[0].user) : null;
}

export async function getStaffIdentity(userId: number) {
  const db = requireDb(await getDb());
  const [user] = await db.select({ openId: users.openId }).from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new Error("لم يتم العثور على هوية حساب العامل.");
  return user;
}

export async function listProfiles() {
  const db = requireDb(await getDb());
  const rows = await db.select({ profile: staffProfiles, user: users }).from(staffProfiles).innerJoin(users, eq(staffProfiles.userId, users.id)).orderBy(desc(staffProfiles.createdAt));
  return rows.map((row) => serializeProfile(row.profile, row.user));
}

export async function createStaff(input: { username: string; password: string; displayName: string; role: StaffRole; permissions?: StaffPermission[]; createdBy?: number }) {
  const db = requireDb(await getDb());
  const username = cleanUsername(input.username);
  const [duplicate] = await db.select({ userId: staffProfiles.userId }).from(staffProfiles).where(eq(staffProfiles.username, username)).limit(1);
  if (duplicate) throw new Error("اسم المستخدم مستخدم بالفعل.");
  const passwordHash = await hashPassword(input.password);
  const openId = newOpenId();
  await db.insert(users).values({ openId, name: input.displayName.trim(), email: null, loginMethod: "staff-password", role: input.role === "owner" ? "admin" : "user", lastSignedIn: new Date() });
  const [createdUser] = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  if (!createdUser) throw new Error("تعذر إنشاء حساب العامل.");
  const permissions = input.permissions?.length ? normalizePermissions(input.permissions) : permissionsForRole(input.role);
  await db.insert(staffProfiles).values({ userId: createdUser.id, username, passwordHash, displayName: input.displayName.trim(), role: input.role, permissions: JSON.stringify(permissions), createdBy: input.createdBy ?? null });
  const profile = await getProfileByUserId(createdUser.id);
  if (!profile) throw new Error("تعذر قراءة حساب العامل بعد إنشائه.");
  return profile;
}

export async function bootstrapOwner(input: { username: string; password: string; displayName: string }) {
  if (await hasStaffConfigured()) throw new Error("تم إعداد حساب مسؤول بالفعل. أنشئ الحسابات الجديدة من لوحة الإدارة.");
  return createStaff({ ...input, role: "owner", permissions: permissionsForRole("owner") });
}

export async function authenticateStaff(usernameInput: string, password: string) {
  const db = requireDb(await getDb());
  const username = cleanUsername(usernameInput);
  const rows = await db.select({ profile: staffProfiles, user: users }).from(staffProfiles).innerJoin(users, eq(staffProfiles.userId, users.id)).where(eq(staffProfiles.username, username)).limit(1);
  const row = rows[0];
  if (!row || !(await verifyPassword(password, row.profile.passwordHash))) throw new Error("اسم المستخدم أو كلمة المرور غير صحيحين.");
  const profile = serializeProfile(row.profile, row.user);
  if (!isProfileActive(profile)) throw new Error(profile.status === "disabled" ? "هذا الحساب معطّل. راجع مسؤول الصيدلية." : "هذا الحساب مجمّد مؤقتًا. راجع مسؤول الصيدلية.");
  await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, profile.userId));
  return { profile: { ...profile, lastSignedIn: new Date() }, openId: row.user.openId };
}

export async function createStaffSession(userId: number, device: DeviceContext) {
  const db = requireDb(await getDb());
  const id = newSessionId();
  await db.insert(staffSessions).values({ id, userId, deviceName: safeDeviceName(device.deviceName), devicePlatform: safePlatform(device.devicePlatform), appVersion: device.appVersion?.slice(0, 64) ?? null, userAgent: device.userAgent?.slice(0, 512) ?? null, networkAddress: maskNetworkAddress(device.networkAddress), lastActiveAt: new Date() });
  return { id, expiresAt: new Date(Date.now() + SESSION_TTL_MS) };
}

export async function recordAudit(input: { actorUserId?: number | null; action: string; entityType: string; entityId?: string | null; detail: string; metadata?: Record<string, unknown>; device?: DeviceContext }) {
  const db = requireDb(await getDb());
  await db.insert(staffAuditLogs).values({ actorUserId: input.actorUserId ?? null, action: input.action.slice(0, 120), entityType: input.entityType.slice(0, 80), entityId: input.entityId?.slice(0, 128) ?? null, detail: input.detail.slice(0, 500), metadata: input.metadata ? JSON.stringify(input.metadata).slice(0, 20_000) : null, deviceName: input.device?.deviceName?.slice(0, 255) ?? null, networkAddress: maskNetworkAddress(input.device?.networkAddress) });
}

export async function updateStaffProfile(input: { actorUserId: number; userId: number; role?: StaffRole; permissions?: StaffPermission[]; status?: StaffStatus; frozenUntil?: Date | null }) {
  const db = requireDb(await getDb());
  if (input.actorUserId === input.userId && input.status && input.status !== "active") throw new Error("لا يمكنك تعطيل أو تجميد حسابك أثناء استخدامه.");
  const updates: Partial<typeof staffProfiles.$inferInsert> = {};
  if (input.role) updates.role = input.role;
  if (input.permissions) updates.permissions = JSON.stringify(normalizePermissions(input.permissions));
  if (input.status) { updates.status = input.status; updates.frozenUntil = input.status === "frozen" ? input.frozenUntil ?? null : null; }
  await db.update(staffProfiles).set(updates).where(eq(staffProfiles.userId, input.userId));
  const updated = await getProfileByUserId(input.userId);
  if (!updated) throw new Error("لم يتم العثور على حساب العامل.");
  await recordAudit({ actorUserId: input.actorUserId, action: "staff.updated", entityType: "staff", entityId: String(input.userId), detail: `تم تحديث حساب ${updated.displayName}.`, metadata: { role: input.role, status: input.status } });
  return updated;
}

export async function resetStaffPassword(actorUserId: number, userId: number, password: string) {
  const db = requireDb(await getDb());
  const passwordHash = await hashPassword(password);
  await db.update(staffProfiles).set({ passwordHash }).where(eq(staffProfiles.userId, userId));
  const profile = await getProfileByUserId(userId);
  if (!profile) throw new Error("لم يتم العثور على حساب العامل.");
  await recordAudit({ actorUserId, action: "staff.password_reset", entityType: "staff", entityId: String(userId), detail: `تمت إعادة تعيين كلمة مرور ${profile.displayName}.` });
  return { success: true };
}

export async function finishRecentSession(userId: number, deviceName?: string) {
  const db = requireDb(await getDb());
  const matching = deviceName ? and(eq(staffSessions.userId, userId), eq(staffSessions.deviceName, deviceName), isNull(staffSessions.signedOutAt)) : and(eq(staffSessions.userId, userId), isNull(staffSessions.signedOutAt));
  const recent = await db.select().from(staffSessions).where(matching).orderBy(desc(staffSessions.lastActiveAt)).limit(1);
  if (recent[0]) await db.update(staffSessions).set({ signedOutAt: new Date(), lastActiveAt: new Date() }).where(eq(staffSessions.id, recent[0].id));
}

export async function listSessions(limit = 80) {
  const db = requireDb(await getDb());
  const rows = await db.select({ session: staffSessions, profile: staffProfiles }).from(staffSessions).innerJoin(staffProfiles, eq(staffSessions.userId, staffProfiles.userId)).orderBy(desc(staffSessions.lastActiveAt)).limit(limit);
  return rows.map(({ session, profile }) => ({ ...session, displayName: profile.displayName, username: profile.username }));
}

export async function listAudits(limit = 120) {
  const db = requireDb(await getDb());
  const rows = await db.select({ audit: staffAuditLogs, profile: staffProfiles }).from(staffAuditLogs).leftJoin(staffProfiles, eq(staffAuditLogs.actorUserId, staffProfiles.userId)).orderBy(desc(staffAuditLogs.createdAt)).limit(limit);
  return rows.map(({ audit, profile }) => ({ ...audit, actorName: profile?.displayName ?? "النظام" }));
}

export async function createNotifications(input: { senderId: number; title: string; body: string; route?: string | null; target: { type: "all" | "role" | "user"; role?: StaffRole; userId?: number } }) {
  const db = requireDb(await getDb());
  let recipients: Array<{ userId: number }> = [];
  const activeFilter = and(eq(staffProfiles.status, "active"), or(isNull(staffProfiles.frozenUntil), gt(staffProfiles.frozenUntil, new Date())));
  if (input.target.type === "user" && input.target.userId) recipients = await db.select({ userId: staffProfiles.userId }).from(staffProfiles).where(and(activeFilter, eq(staffProfiles.userId, input.target.userId)));
  else if (input.target.type === "role" && input.target.role) recipients = await db.select({ userId: staffProfiles.userId }).from(staffProfiles).where(and(activeFilter, eq(staffProfiles.role, input.target.role)));
  else recipients = await db.select({ userId: staffProfiles.userId }).from(staffProfiles).where(activeFilter);
  if (!recipients.length) throw new Error("لا يوجد مستخدمون نشطون لاستلام الإشعار.");
  await db.insert(staffNotifications).values(recipients.map((recipient) => ({ recipientUserId: recipient.userId, sentByUserId: input.senderId, title: input.title.trim(), body: input.body.trim(), route: input.route?.trim() || null })));
  await recordAudit({ actorUserId: input.senderId, action: "notification.sent", entityType: "notification", detail: `تم إرسال إشعار إلى ${recipients.length} مستخدم/مستخدمين.`, metadata: { target: input.target.type, recipients: recipients.length } });
  return { recipients: recipients.length };
}

export async function listNotifications(userId: number) {
  const db = requireDb(await getDb());
  return db.select().from(staffNotifications).where(eq(staffNotifications.recipientUserId, userId)).orderBy(desc(staffNotifications.createdAt)).limit(100);
}

export async function markNotificationRead(userId: number, notificationId: number) {
  const db = requireDb(await getDb());
  await db.update(staffNotifications).set({ readAt: new Date() }).where(and(eq(staffNotifications.id, notificationId), eq(staffNotifications.recipientUserId, userId)));
}

export function getSessionTtl() { return SESSION_TTL_MS; }
