import AsyncStorage from "@react-native-async-storage/async-storage";
import { ReactNode, createContext, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "saydalty-local-data-v1";

export type Medication = {
  id: string;
  name: string;
  category: string;
  sku: string;
  price: number;
  quantity: number;
  reorderLevel: number;
  expiryDate: string;
};

export type CartItem = { medicationId: string; name: string; unitPrice: number; quantity: number };
export type Sale = { id: string; createdAt: string; items: CartItem[]; total: number; paymentMethod: "نقدي" | "بطاقة" | "محفظة" };
export type Supplier = { id: string; name: string; company: string; phone: string; lastOrder: string };
export type PharmacyAlert = { id: string; medicationId: string; title: string; detail: string; severity: "high" | "medium" | "low"; kind: "stock" | "expiry" };
type PharmacyState = { medications: Medication[]; sales: Sale[]; suppliers: Supplier[] };

type PharmacyContextValue = PharmacyState & {
  isReady: boolean;
  alerts: PharmacyAlert[];
  addMedication: (medication: Omit<Medication, "id">) => void;
  updateMedication: (id: string, medication: Omit<Medication, "id">) => void;
  deleteMedication: (id: string) => void;
  completeSale: (items: CartItem[], paymentMethod: Sale["paymentMethod"]) => boolean;
  addSupplier: (supplier: Omit<Supplier, "id" | "lastOrder">) => void;
  restoreDemoData: () => void;
};

const PharmacyContext = createContext<PharmacyContextValue | undefined>(undefined);
const makeId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
const dateFromToday = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
const daysUntil = (date: string) => Math.ceil((new Date(date).getTime() - Date.now()) / 86_400_000);

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
});

export const buildAlerts = (medications: Medication[]): PharmacyAlert[] => {
  const generated: PharmacyAlert[] = [];
  medications.forEach((medication) => {
    if (medication.quantity <= medication.reorderLevel) {
      const severity = medication.quantity <= Math.max(2, Math.floor(medication.reorderLevel / 2)) ? "high" : "medium";
      generated.push({ id: `stock-${medication.id}`, medicationId: medication.id, title: severity === "high" ? "مخزون حرج" : "مخزون منخفض", detail: `${medication.name} — المتاح ${medication.quantity} عبوات فقط`, severity, kind: "stock" });
    }
    const remainingDays = daysUntil(medication.expiryDate);
    if (remainingDays <= 60) generated.push({ id: `expiry-${medication.id}`, medicationId: medication.id, title: remainingDays < 0 ? "انتهت الصلاحية" : "صلاحية قريبة", detail: remainingDays < 0 ? `${medication.name} يحتاج إلى معالجة فورية` : `${medication.name} ينتهي خلال ${remainingDays} يومًا`, severity: remainingDays <= 20 ? "high" : "medium", kind: "expiry" });
  });
  return generated.sort((a, b) => (a.severity === "high" ? -1 : 1) - (b.severity === "high" ? -1 : 1));
};

export const calculateOrderTotal = (items: CartItem[]) => items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

export function PharmacyProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PharmacyState>(createDemoState);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const load = async () => {
      try { const stored = await AsyncStorage.getItem(STORAGE_KEY); if (stored) setState(JSON.parse(stored) as PharmacyState); } catch { /* Start with demos if storage is unavailable. */ } finally { setIsReady(true); }
    };
    void load();
  }, []);

  useEffect(() => { if (isReady) void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }, [isReady, state]);

  const value = useMemo<PharmacyContextValue>(() => ({
    ...state,
    isReady,
    alerts: buildAlerts(state.medications),
    addMedication: (medication) => setState((current) => ({ ...current, medications: [{ ...medication, id: makeId("med") }, ...current.medications] })),
    updateMedication: (id, medication) => setState((current) => ({ ...current, medications: current.medications.map((item) => item.id === id ? { ...medication, id } : item) })),
    deleteMedication: (id) => setState((current) => ({ ...current, medications: current.medications.filter((item) => item.id !== id) })),
    completeSale: (items, paymentMethod) => {
      if (!items.length || items.some((item) => (state.medications.find((medication) => medication.id === item.medicationId)?.quantity ?? 0) < item.quantity)) return false;
      const sale: Sale = { id: makeId("sale"), createdAt: new Date().toISOString(), items, total: calculateOrderTotal(items), paymentMethod };
      setState((current) => ({ ...current, medications: current.medications.map((medication) => { const saleItem = items.find((item) => item.medicationId === medication.id); return saleItem ? { ...medication, quantity: medication.quantity - saleItem.quantity } : medication; }), sales: [sale, ...current.sales] }));
      return true;
    },
    addSupplier: (supplier) => setState((current) => ({ ...current, suppliers: [{ ...supplier, id: makeId("supplier"), lastOrder: "لم يتم الطلب بعد" }, ...current.suppliers] })),
    restoreDemoData: () => setState(createDemoState()),
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
