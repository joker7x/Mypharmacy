import AsyncStorage from "@react-native-async-storage/async-storage";
import { ReactNode, createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createLocalStorage, type LocalStorage } from "./local-storage";


export type Medication = {
  id: string;
  catalogId?: string;
  name: string;
  category: string;
  sku: string;
  barcode?: string;
  price: number;
  quantity: number;
  unitsPerPackage?: number;
  reorderLevel: number;
  expiryDate: string;
};

export type CartItem = { medicationId: string; name: string; unitPrice: number; quantity: number; unitLabel?: string };
export type Sale = { id: string; createdAt: string; items: CartItem[]; total: number; paymentMethod: "نقدي" | "بطاقة" | "محفظة"; shiftId?: string; cashReceived?: number; change?: number };
export type Supplier = { id: string; name: string; company: string; phone: string; lastOrder: string };
export type IncomingOrderItem = { medicationId?: string; catalogId?: string; name: string; quantity: number; unitCost: number; expiryDate?: string };
export type IncomingOrder = { id: string; supplierName: string; sourceType: "شركة" | "مكتب" | "مورد آخر"; referenceNumber?: string; total?: number; notes?: string; invoiceUri?: string; receiptUri?: string; status?: "قيد الانتظار" | "تم الإرسال" | "تم الاستلام"; items?: IncomingOrderItem[]; receivedAt?: string; createdAt: string };
export type Shift = { id: string; pharmacistName: string; openingCash: number; startedAt: string; closedAt?: string; actualCash?: number; difference?: number; note?: string };
export type Expense = { id: string; title: string; amount: number; category: "توريد" | "تشغيل" | "أخرى"; createdAt: string; orderId?: string; paidAmount?: number; shiftId?: string };
export type CustomerDebt = { id: string; customerName: string; phone?: string; total: number; paid: number; createdAt: string; note?: string };
export type PharmacySettings = { imageRetentionDays: number };
export type ReorderRecord = { medicationId: string; markedAt: string; quantityAtMark: number; manual?: boolean; status?: "needed" | "ordered" };
export type ReorderNeed = { medication: Medication; status: "needed" | "ordered"; resumed: boolean; orderedAt?: string };
export type PharmacyAlert = { id: string; medicationId: string; title: string; detail: string; severity: "high" | "medium" | "low"; kind: "stock" | "expiry" };
type PharmacyState = { medications: Medication[]; sales: Sale[]; suppliers: Supplier[]; incomingOrders: IncomingOrder[]; reorderRecords: ReorderRecord[]; shifts: Shift[]; expenses: Expense[]; debts: CustomerDebt[]; settings: PharmacySettings };

type PharmacyContextValue = PharmacyState & {
  isReady: boolean;
  alerts: PharmacyAlert[];
  reorderNeeds: ReorderNeed[];
  addMedication: (medication: Omit<Medication, "id">) => void;
  updateMedication: (id: string, medication: Omit<Medication, "id">) => void;
  deleteMedication: (id: string) => void;
  completeSale: (items: CartItem[], paymentMethod: Sale["paymentMethod"], paymentDetails?: { cashReceived?: number; change?: number }) => boolean;
  addSupplier: (supplier: Omit<Supplier, "id" | "lastOrder">) => void;
  addIncomingOrder: (order: Omit<IncomingOrder, "id" | "createdAt">) => void;
  markReorderOrdered: (medicationId: string) => void;
  addReorderNeedFromCatalog: (medication: Omit<Medication, "id">) => void;
  startShift: (pharmacistName: string, openingCash: number) => boolean;
  closeShift: (shiftId: string, actualCash: number, note?: string) => void;
  addExpense: (expense: Omit<Expense, "id" | "createdAt">) => void;
  addDebt: (debt: Omit<CustomerDebt, "id" | "createdAt">) => void;
  settleDebt: (debtId: string, amount: number) => void;
  receiveIncomingOrder: (orderId: string, items: IncomingOrderItem[], attachments?: { invoiceUri?: string; receiptUri?: string }) => boolean;
  updateSettings: (settings: Partial<PharmacySettings>) => void;
  activeShift?: Shift;
  restoreDemoData: () => void;
};

const PharmacyContext = createContext<PharmacyContextValue | undefined>(undefined);
const makeId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
const dateFromToday = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
const daysUntil = (date: string) => Math.ceil((new Date(date).getTime() - Date.now()) / 86_400_000);
export const getUnitsPerPackage = (medication: Pick<Medication, "unitsPerPackage">) => Math.max(1, Math.trunc(medication.unitsPerPackage ?? 1));
export const getUnitPrice = (medication: Pick<Medication, "price" | "unitsPerPackage">) => medication.price / getUnitsPerPackage(medication);
export const calculateExpectedShiftCash = (openingCash: number, cashSales: number, shiftExpenses: number) => Math.max(0, openingCash + cashSales - shiftExpenses);

const createDemoState = (): PharmacyState => ({
  medications: [
    { id: "med-1", name: "بانادول إكسترا", category: "مسكنات", sku: "PAN-500", price: 72, quantity: 34, reorderLevel: 12, expiryDate: dateFromToday(210) },
    { id: "med-2", name: "أوجمنتين 1 جم", category: "مضادات حيوية", sku: "AUG-1G", price: 165, quantity: 7, reorderLevel: 10, expiryDate: dateFromToday(96) },
    { id: "med-3", name: "كونجستال", category: "برد وحساسية", sku: "CON-20", price: 54, quantity: 18, reorderLevel: 8, expiryDate: dateFromToday(42) },
    { id: "med-4", name: "فيتامين د3", category: "فيتامينات", sku: "D3-1000", price: 115, quantity: 22, reorderLevel: 10, expiryDate: dateFromToday(315) },
    { id: "med-5", name: "بخاخ محلول ملحي", category: "عناية شخصية", sku: "SAL-50", price: 45, quantity: 4, reorderLevel: 8, expiryDate: dateFromToday(178) },
    { id: "med-6", name: "أوميبرازول 20 مجم", category: "جهاز هضمي", sku: "OME-20", price: 88, quantity: 29, reorderLevel: 10, expiryDate: dateFromToday(264) },
  ],
  sales: [
    { id: "sale-1", createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(), items: [{ medicationId: "med-1", name: "بانادول إكسترا", unitPrice: 72, quantity: 2 }], total: 144, paymentMethod: "نقدي" },
    { id: "sale-2", createdAt: new Date(Date.now() - 2.5 * 60 * 60 * 1000).toISOString(), items: [{ medicationId: "med-4", name: "فيتامين د3", unitPrice: 115, quantity: 1 }], total: 115, paymentMethod: "بطاقة" },
    { id: "sale-3", createdAt: new Date(Date.now() - 4.25 * 60 * 60 * 1000).toISOString(), items: [{ medicationId: "med-3", name: "كونجستال", unitPrice: 54, quantity: 1 }, { medicationId: "med-5", name: "بخاخ محلول ملحي", unitPrice: 45, quantity: 1 }], total: 99, paymentMethod: "محفظة" },
  ],
  suppliers: [
    { id: "supplier-1", name: "أحمد السعدني", company: "مخازن النيل", phone: "0100 245 1976", lastOrder: "منذ يومين" },
    { id: "supplier-2", name: "سارة عادل", company: "المتحدة للأدوية", phone: "0122 880 5431", lastOrder: "منذ 5 أيام" },
    { id: "supplier-3", name: "محمود نبيل", company: "ميديكال إمداد", phone: "0111 638 9204", lastOrder: "منذ أسبوع" },
  ],
  incomingOrders: [],
  reorderRecords: [],
  shifts: [],
  expenses: [],
  debts: [],
  settings: { imageRetentionDays: 30 },
});

export const normalizePharmacyState = (stored: Partial<PharmacyState>): PharmacyState => {
  const demo = createDemoState();
  return {
    medications: Array.isArray(stored.medications) ? stored.medications.map((medication) => ({ ...medication, unitsPerPackage: getUnitsPerPackage(medication) })) : demo.medications,
    sales: Array.isArray(stored.sales) ? stored.sales : demo.sales,
    suppliers: Array.isArray(stored.suppliers) ? stored.suppliers : demo.suppliers,
    incomingOrders: Array.isArray(stored.incomingOrders) ? stored.incomingOrders.map((order) => ({ status: "قيد الانتظار", ...order })) : [],
    reorderRecords: Array.isArray(stored.reorderRecords) ? stored.reorderRecords : [],
    shifts: Array.isArray(stored.shifts) ? stored.shifts : [],
    expenses: Array.isArray(stored.expenses) ? stored.expenses : [],
    debts: Array.isArray(stored.debts) ? stored.debts : [],
    settings: { imageRetentionDays: 30, ...(stored.settings ?? {}) },
  };
};

export const buildAlerts = (medications: Medication[]): PharmacyAlert[] => {
  const generated: PharmacyAlert[] = [];
  medications.forEach((medication) => {
    if (medication.quantity <= medication.reorderLevel) {
      const severity = medication.quantity <= Math.max(2, Math.floor(medication.reorderLevel / 2)) ? "high" : "medium";
      generated.push({ id: `stock-${medication.id}`, medicationId: medication.id, title: severity === "high" ? "مخزون حرج" : "مخزون منخفض", detail: `${medication.name} — المتاح ${medication.quantity} وحدة بيع فقط`, severity, kind: "stock" });
    }
    const remainingDays = daysUntil(medication.expiryDate);
    if (remainingDays <= 60) generated.push({ id: `expiry-${medication.id}`, medicationId: medication.id, title: remainingDays < 0 ? "انتهت الصلاحية" : "صلاحية قريبة", detail: remainingDays < 0 ? `${medication.name} يحتاج إلى معالجة فورية` : `${medication.name} ينتهي خلال ${remainingDays} يومًا`, severity: remainingDays <= 20 ? "high" : "medium", kind: "expiry" });
  });
  return generated.sort((a, b) => (a.severity === "high" ? -1 : 1) - (b.severity === "high" ? -1 : 1));
};

export const buildReorderNeeds = (medications: Medication[], records: ReorderRecord[]): ReorderNeed[] => {
  const recordByMedication = new Map(records.map((record) => [record.medicationId, record]));
  return medications
    .filter((medication) => medication.quantity <= medication.reorderLevel || Boolean(recordByMedication.get(medication.id)?.manual))
    .map((medication) => {
      const record = recordByMedication.get(medication.id);
      const resumed = Boolean(!record?.manual && record && medication.quantity < record.quantityAtMark);
      const status: ReorderNeed["status"] = record?.manual ? (record.status ?? "needed") : record && !resumed ? "ordered" : "needed";
      return { medication, status, resumed, orderedAt: record?.markedAt };
    })
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === "needed" ? -1 : 1;
      return a.medication.quantity - b.medication.quantity;
    });
};

export const calculateOrderTotal = (items: CartItem[]) => items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
export const calculateCashChange = (total: number, cashReceived: number) => Math.max(0, cashReceived - total);

async function removeExpiredOrderAttachments(state: PharmacyState) {
  const cutoff = Date.now() - state.settings.imageRetentionDays * 86_400_000;
  const { File } = await import("expo-file-system");
  const nextOrders = await Promise.all(state.incomingOrders.map(async (order) => {
    if (new Date(order.createdAt).getTime() >= cutoff) return order;
    for (const uri of [order.invoiceUri, order.receiptUri]) {
      if (uri?.startsWith("file:")) { try { new File(uri).delete(); } catch { /* The file may already be removed by the system. */ } }
    }
    return { ...order, invoiceUri: undefined, receiptUri: undefined };
  }));
  return { ...state, incomingOrders: nextOrders };
}

export function PharmacyProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PharmacyState>(createDemoState);
  const [isReady, setIsReady] = useState(false);
  const storageRef = useRef<LocalStorage | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const storage = await createLocalStorage();
        storageRef.current = storage;
        const stored = await storage.get();
        const loaded = stored ? normalizePharmacyState(JSON.parse(stored) as Partial<PharmacyState>) : createDemoState();
        setState(await removeExpiredOrderAttachments(loaded));
      } catch { setState(createDemoState()); } finally { setIsReady(true); }
    };
    void load();
    return () => { void storageRef.current?.close(); };
  }, []);

  useEffect(() => {
    if (!isReady || !storageRef.current) return;
    void storageRef.current.set(JSON.stringify(state));
  }, [isReady, state]);

  const value = useMemo<PharmacyContextValue>(() => ({
    ...state,
    isReady,
    alerts: buildAlerts(state.medications),
    reorderNeeds: buildReorderNeeds(state.medications, state.reorderRecords),
    addMedication: (medication) => setState((current) => ({ ...current, medications: [{ ...medication, id: makeId("med") }, ...current.medications] })),
    updateMedication: (id, medication) => setState((current) => {
      const previous = current.medications.find((item) => item.id === id);
      const isRestocked = Boolean(previous && medication.quantity > previous.quantity && medication.quantity > medication.reorderLevel);
      return { ...current, medications: current.medications.map((item) => item.id === id ? { ...medication, id } : item), reorderRecords: isRestocked ? current.reorderRecords.filter((record) => record.medicationId !== id) : current.reorderRecords };
    }),
    deleteMedication: (id) => setState((current) => ({ ...current, medications: current.medications.filter((item) => item.id !== id), reorderRecords: current.reorderRecords.filter((record) => record.medicationId !== id) })),
    completeSale: (items, paymentMethod, paymentDetails) => {
      const activeShift = state.shifts.find((shift) => !shift.closedAt);
      const total = calculateOrderTotal(items);
      if (!activeShift || !items.length || items.some((item) => (state.medications.find((medication) => medication.id === item.medicationId)?.quantity ?? 0) < item.quantity)) return false;
      if (paymentMethod === "نقدي" && (paymentDetails?.cashReceived ?? 0) < total) return false;
      const sale: Sale = { id: makeId("sale"), createdAt: new Date().toISOString(), items, total, paymentMethod, shiftId: activeShift.id, cashReceived: paymentMethod === "نقدي" ? paymentDetails?.cashReceived : undefined, change: paymentMethod === "نقدي" ? paymentDetails?.change : undefined };
      setState((current) => ({ ...current, medications: current.medications.map((medication) => { const saleItem = items.find((item) => item.medicationId === medication.id); return saleItem ? { ...medication, quantity: medication.quantity - saleItem.quantity } : medication; }), sales: [sale, ...current.sales] }));
      return true;
    },
    addSupplier: (supplier) => setState((current) => ({ ...current, suppliers: [{ ...supplier, id: makeId("supplier"), lastOrder: "لم يتم الطلب بعد" }, ...current.suppliers] })),
    addIncomingOrder: (order) => setState((current) => ({ ...current, incomingOrders: [{ ...order, id: makeId("order"), status: order.status ?? "قيد الانتظار", createdAt: new Date().toISOString() }, ...current.incomingOrders] })),
    startShift: (pharmacistName, openingCash) => {
      if (state.shifts.some((shift) => !shift.closedAt) || !pharmacistName.trim() || openingCash < 0) return false;
      setState((current) => ({ ...current, shifts: [{ id: makeId("shift"), pharmacistName: pharmacistName.trim(), openingCash, startedAt: new Date().toISOString() }, ...current.shifts] }));
      return true;
    },
    closeShift: (shiftId, actualCash, note) => setState((current) => { const shift = current.shifts.find((item) => item.id === shiftId); if (!shift) return current; const cashSalesTotal = current.sales.filter((sale) => sale.shiftId === shiftId && sale.paymentMethod === "نقدي").reduce((sum, sale) => sum + sale.total, 0); const shiftExpensesTotal = current.expenses.filter((expense) => expense.shiftId === shiftId).reduce((sum, expense) => sum + expense.amount, 0); return { ...current, shifts: current.shifts.map((item) => item.id === shiftId ? { ...item, closedAt: new Date().toISOString(), actualCash, difference: actualCash - calculateExpectedShiftCash(shift.openingCash, cashSalesTotal, shiftExpensesTotal), note } : item) }; }),
    addExpense: (expense) => setState((current) => ({ ...current, expenses: [{ ...expense, id: makeId("expense"), createdAt: new Date().toISOString() }, ...current.expenses] })),
    addDebt: (debt) => setState((current) => ({ ...current, debts: [{ ...debt, id: makeId("debt"), createdAt: new Date().toISOString() }, ...current.debts] })),
    settleDebt: (debtId, amount) => setState((current) => ({ ...current, debts: current.debts.map((debt) => debt.id === debtId ? { ...debt, paid: Math.min(debt.total, debt.paid + Math.max(0, amount)) } : debt) })),
    receiveIncomingOrder: (orderId, items, attachments) => {
      const order = state.incomingOrders.find((item) => item.id === orderId);
      if (!order || order.status === "تم الاستلام") return false;
      setState((current) => {
        const medications = current.medications.map((medication) => { const line = items.find((item) => item.medicationId === medication.id); return line ? { ...medication, quantity: medication.quantity + line.quantity, price: line.unitCost * getUnitsPerPackage(medication) } : medication; });
        const total = items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);
        return { ...current, medications, incomingOrders: current.incomingOrders.map((item) => item.id === orderId ? { ...item, status: "تم الاستلام", items, total, receivedAt: new Date().toISOString(), ...attachments } : item), expenses: [{ id: makeId("expense"), title: `توريد ${order.supplierName}`, category: "توريد", amount: total, paidAmount: total, orderId, createdAt: new Date().toISOString() }, ...current.expenses] };
      });
      return true;
    },
    updateSettings: (settings) => setState((current) => ({ ...current, settings: { ...current.settings, ...settings } })),
    markReorderOrdered: (medicationId) => setState((current) => {
      const medication = current.medications.find((item) => item.id === medicationId);
      const existing = current.reorderRecords.find((item) => item.medicationId === medicationId);
      if (!medication || (!existing?.manual && medication.quantity > medication.reorderLevel)) return current;
      const record: ReorderRecord = { medicationId, markedAt: new Date().toISOString(), quantityAtMark: medication.quantity, manual: existing?.manual, status: "ordered" };
      return { ...current, reorderRecords: [record, ...current.reorderRecords.filter((item) => item.medicationId !== medicationId)] };
    }),
    addReorderNeedFromCatalog: (medication) => setState((current) => {
      const existing = current.medications.find((item) => (medication.catalogId && item.catalogId === medication.catalogId) || (medication.barcode && item.barcode === medication.barcode) || item.sku === medication.sku);
      const target = existing ?? { ...medication, id: makeId("med") };
      const record: ReorderRecord = { medicationId: target.id, markedAt: new Date().toISOString(), quantityAtMark: target.quantity, manual: true, status: "needed" };
      return { ...current, medications: existing ? current.medications : [target, ...current.medications], reorderRecords: [record, ...current.reorderRecords.filter((item) => item.medicationId !== target.id)] };
    }),
    restoreDemoData: () => setState(createDemoState()),
    activeShift: state.shifts.find((shift) => !shift.closedAt),
  }), [isReady, state]);

  return <PharmacyContext.Provider value={value}>{children}</PharmacyContext.Provider>;
}

export function usePharmacy() {
  const context = useContext(PharmacyContext);
  if (!context) throw new Error("usePharmacy must be used within PharmacyProvider");
  return context;
}

export const formatCurrency = (value: number) => `${new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 0 }).format(value)} ج.م`;
export const formatShortDate = (date: string) => new Intl.DateTimeFormat("ar-EG", { day: "numeric", month: "short" }).format(new Date(date));
export const isExpirySoon = (date: string) => daysUntil(date) <= 60;
