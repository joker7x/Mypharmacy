import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Image, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { Badge, Card, COLORS, PageHeader, RoundIcon, SectionTitle, commonStyles } from "@/components/app-ui";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { formatCurrency, formatShortDate, IncomingOrder, usePharmacy } from "@/lib/pharmacy-context";
import { ScreenContainer } from "@/components/screen-container";

type SourceType = IncomingOrder["sourceType"];
type DraftOrder = { supplierName: string; sourceType: SourceType; referenceNumber: string; total: string; notes: string; invoiceUri?: string };

const initialDraft = (): DraftOrder => ({ supplierName: "", sourceType: "شركة", referenceNumber: "", total: "", notes: "" });
const sourceOptions: SourceType[] = ["شركة", "مكتب", "مورد آخر"];

async function keepInvoiceImage(sourceUri: string) {
  if (!FileSystem.documentDirectory) return sourceUri;
  const folder = `${FileSystem.documentDirectory}invoices/`;
  await FileSystem.makeDirectoryAsync(folder, { intermediates: true });
  const extension = sourceUri.split("?")[0].split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "") || "jpg";
  const destination = `${folder}invoice-${Date.now()}.${extension}`;
  await FileSystem.copyAsync({ from: sourceUri, to: destination });
  return destination;
}

export default function OrdersScreen() {
  const { incomingOrders, addIncomingOrder } = usePharmacy();
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [draft, setDraft] = useState<DraftOrder>(initialDraft);
  const [isSavingImage, setIsSavingImage] = useState(false);
  const [preview, setPreview] = useState<string | undefined>();

  const closeForm = () => { setIsFormVisible(false); setDraft(initialDraft()); };
  const updateDraft = <K extends keyof DraftOrder>(key: K, value: DraftOrder[K]) => setDraft((current) => ({ ...current, [key]: value }));

  const selectInvoice = async (source: "camera" | "library") => {
    const permission = source === "camera" ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("يلزم السماح بالوصول", source === "camera" ? "اسمح باستخدام الكاميرا لتصوير الفاتورة." : "اسمح بالوصول للصور لاختيار فاتورة محفوظة.");
      return;
    }
    const result = source === "camera"
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], allowsEditing: true, quality: 0.7 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, quality: 0.7 });
    const asset = !result.canceled ? result.assets[0] : undefined;
    if (!asset?.uri) return;
    try {
      setIsSavingImage(true);
      updateDraft("invoiceUri", await keepInvoiceImage(asset.uri));
    } catch {
      Alert.alert("تعذر حفظ الصورة", "حاول اختيار الصورة أو تصويرها مرة أخرى.");
    } finally {
      setIsSavingImage(false);
    }
  };

  const saveOrder = () => {
    const supplierName = draft.supplierName.trim();
    if (!supplierName) { Alert.alert("بيانات ناقصة", "اكتب اسم الشركة أو المكتب أو المورد أولًا."); return; }
    const parsedTotal = draft.total.trim() ? Number(draft.total.replace(/,/g, "")) : undefined;
    if (parsedTotal !== undefined && (!Number.isFinite(parsedTotal) || parsedTotal < 0)) { Alert.alert("قيمة غير صحيحة", "اكتب إجماليًا رقميًا صحيحًا أو اتركه فارغًا."); return; }
    addIncomingOrder({ supplierName, sourceType: draft.sourceType, referenceNumber: draft.referenceNumber.trim() || undefined, total: parsedTotal, notes: draft.notes.trim() || undefined, invoiceUri: draft.invoiceUri });
    closeForm();
    Alert.alert("تم حفظ الطلب", "أصبح الطلب وفاتورته متاحين للرجوع إليهما في أي وقت من هذا الجهاز.");
  };

  return <ScreenContainer edges={["top", "bottom", "left", "right"]} containerClassName="bg-background" className="flex-1"><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={commonStyles.content}>
    <TouchableOpacity onPress={() => router.back()} style={styles.back} activeOpacity={0.75}><IconSymbol name="chevron.right" size={20} color={COLORS.ink} /><Text style={styles.backText}>رجوع</Text></TouchableOpacity>
    <PageHeader title="الطلبيات الواردة" subtitle="احتفظ بطلبات الموردين وصور الفواتير للرجوع إليها" action="إضافة طلب" onActionPress={() => setIsFormVisible(true)} />
    <Card style={styles.helperCard}><RoundIcon name="doc.text.fill" /><View style={styles.helperText}><Text style={styles.helperTitle}>كل طلب في مكانه</Text><Text style={styles.helperSubtitle}>أضف اسم الجهة، تفاصيل الطلب، وصورة الفاتورة من الكاميرا أو ألبوم الصور.</Text></View></Card>
    <SectionTitle title={`الطلبات المحفوظة (${incomingOrders.length})`} />
    {incomingOrders.length ? <View style={styles.list}>{incomingOrders.map((order) => <OrderCard key={order.id} order={order} onPreview={() => setPreview(order.invoiceUri)} />)}</View> : <Card style={styles.emptyCard}><RoundIcon name="doc.text.fill" color={COLORS.muted} background="#EEF3F1" /><Text style={styles.emptyTitle}>لا توجد طلبيات محفوظة بعد</Text><Text style={styles.emptySubtitle}>عند وصول طلب من شركة أو مكتب، أضفه هنا وارفق صورة فاتورته.</Text><TouchableOpacity onPress={() => setIsFormVisible(true)} style={commonStyles.primaryButton} activeOpacity={0.85}><IconSymbol name="plus.circle.fill" size={19} color="#FFFFFF" /><Text style={commonStyles.primaryButtonText}>تسجيل أول طلب</Text></TouchableOpacity></Card>}
  </ScrollView>
  <OrderForm visible={isFormVisible} draft={draft} isSavingImage={isSavingImage} onClose={closeForm} onChange={updateDraft} onCapture={() => selectInvoice("camera")} onChoose={() => selectInvoice("library")} onSave={saveOrder} />
  <InvoicePreview uri={preview} onClose={() => setPreview(undefined)} />
  </ScreenContainer>;
}

function OrderCard({ order, onPreview }: { order: IncomingOrder; onPreview: () => void }) {
  return <Card style={styles.orderCard}><View style={styles.orderTop}><View style={styles.orderText}><Text style={styles.orderName}>{order.supplierName}</Text><Text style={styles.orderDate}>{formatShortDate(order.createdAt)} · {new Intl.DateTimeFormat("ar-EG", { hour: "numeric", minute: "2-digit" }).format(new Date(order.createdAt))}</Text></View><RoundIcon name="doc.text.fill" color={COLORS.primary} background={COLORS.mint} /></View><View style={styles.metaRow}><Badge label={order.sourceType} tone="neutral" />{order.referenceNumber ? <Text style={styles.reference}>رقم: {order.referenceNumber}</Text> : null}{typeof order.total === "number" ? <Text style={styles.total}>{formatCurrency(order.total)}</Text> : null}</View>{order.notes ? <Text style={styles.notes}>{order.notes}</Text> : null}{order.invoiceUri ? <TouchableOpacity onPress={onPreview} style={styles.invoiceButton} activeOpacity={0.8}><Image source={{ uri: order.invoiceUri }} style={styles.invoiceThumb} /><View style={styles.invoiceText}><Text style={styles.invoiceTitle}>صورة الفاتورة محفوظة</Text><Text style={styles.invoiceSubtitle}>اضغط لعرضها بالحجم الكامل</Text></View><IconSymbol name="eye.fill" size={19} color={COLORS.primary} /></TouchableOpacity> : <View style={styles.noInvoice}><IconSymbol name="photo.on.rectangle.angled" size={17} color={COLORS.muted} /><Text style={styles.noInvoiceText}>لم تُرفق صورة فاتورة بهذا الطلب</Text></View>}</Card>;
}

function OrderForm({ visible, draft, isSavingImage, onClose, onChange, onCapture, onChoose, onSave }: { visible: boolean; draft: DraftOrder; isSavingImage: boolean; onClose: () => void; onChange: <K extends keyof DraftOrder>(key: K, value: DraftOrder[K]) => void; onCapture: () => void; onChoose: () => void; onSave: () => void }) {
  return <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}><ScreenContainer edges={["top", "bottom", "left", "right"]} containerClassName="bg-background" className="flex-1"><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.formContent} showsVerticalScrollIndicator={false}><View style={styles.modalHeader}><TouchableOpacity onPress={onClose} style={styles.closeButton} activeOpacity={0.75}><IconSymbol name="xmark" size={21} color={COLORS.ink} /></TouchableOpacity><View style={styles.modalHeaderText}><Text style={styles.modalTitle}>تسجيل طلب وارد</Text><Text style={styles.modalSubtitle}>تُحفظ البيانات والفاتورة محليًا على الجهاز</Text></View></View>
    <Field label="اسم الشركة أو المكتب أو المورد *" value={draft.supplierName} onChangeText={(value) => onChange("supplierName", value)} placeholder="مثال: المتحدة للأدوية" />
    <Text style={commonStyles.inputLabel}>نوع جهة التوريد</Text><View style={styles.sourceChoices}>{sourceOptions.map((source) => <TouchableOpacity key={source} onPress={() => onChange("sourceType", source)} style={[styles.sourceChoice, draft.sourceType === source && styles.sourceChoiceActive]} activeOpacity={0.8}><Text style={[styles.sourceChoiceText, draft.sourceType === source && styles.sourceChoiceTextActive]}>{source}</Text></TouchableOpacity>)}</View>
    <View style={styles.twoColumns}><View style={styles.column}><Field label="رقم الفاتورة أو الطلب" value={draft.referenceNumber} onChangeText={(value) => onChange("referenceNumber", value)} placeholder="اختياري" /></View><View style={styles.column}><Field label="إجمالي الطلب" value={draft.total} onChangeText={(value) => onChange("total", value)} placeholder="اختياري" keyboardType="decimal-pad" /></View></View>
    <Field label="ملاحظات" value={draft.notes} onChangeText={(value) => onChange("notes", value)} placeholder="أي تفاصيل تساعدك لاحقًا" multiline />
    <Text style={commonStyles.inputLabel}>صورة الفاتورة</Text><View style={styles.imageActions}><TouchableOpacity onPress={onCapture} disabled={isSavingImage} style={[styles.imageAction, styles.cameraAction]} activeOpacity={0.8}><IconSymbol name="camera.fill" size={21} color="#FFFFFF" /><Text style={styles.cameraActionText}>تصوير الفاتورة</Text></TouchableOpacity><TouchableOpacity onPress={onChoose} disabled={isSavingImage} style={styles.imageAction} activeOpacity={0.8}><IconSymbol name="photo.on.rectangle.angled" size={21} color={COLORS.primary} /><Text style={styles.imageActionText}>اختيار من الصور</Text></TouchableOpacity></View>
    {draft.invoiceUri ? <View style={styles.selectedInvoice}><Image source={{ uri: draft.invoiceUri }} style={styles.selectedImage} /><View style={styles.selectedText}><Text style={styles.selectedTitle}>تم إرفاق صورة الفاتورة</Text><Text style={styles.selectedSubtitle}>ستُحفظ مع الطلب للرجوع إليها لاحقًا.</Text><TouchableOpacity onPress={() => onChange("invoiceUri", undefined)} activeOpacity={0.7}><Text style={styles.removeImage}>إزالة الصورة</Text></TouchableOpacity></View></View> : <Text style={styles.imageHint}>{isSavingImage ? "جارٍ حفظ الصورة..." : "يمكنك حفظ الطلب دون فاتورة، ثم الاحتفاظ بالتفاصيل الأساسية."}</Text>}
    <TouchableOpacity onPress={onSave} style={[commonStyles.primaryButton, styles.saveButton]} activeOpacity={0.85}><IconSymbol name="checkmark.circle.fill" size={19} color="#FFFFFF" /><Text style={commonStyles.primaryButtonText}>حفظ الطلب</Text></TouchableOpacity>
  </ScrollView></ScreenContainer></Modal>;
}

function InvoicePreview({ uri, onClose }: { uri?: string; onClose: () => void }) {
  return <Modal visible={Boolean(uri)} transparent animationType="fade" onRequestClose={onClose}><View style={styles.previewOverlay}><TouchableOpacity onPress={onClose} style={styles.previewClose} activeOpacity={0.8}><IconSymbol name="xmark" size={22} color="#FFFFFF" /></TouchableOpacity>{uri ? <Image source={{ uri }} resizeMode="contain" style={styles.previewImage} /> : null}<Text style={styles.previewCaption}>صورة فاتورة الطلب</Text></View></Modal>;
}

function Field({ label, multiline, ...props }: { label: string; multiline?: boolean } & React.ComponentProps<typeof TextInput>) {
  return <View style={commonStyles.inputGroup}><Text style={commonStyles.inputLabel}>{label}</Text><TextInput {...props} multiline={multiline} textAlign="right" style={[commonStyles.input, multiline && styles.textArea]} placeholderTextColor="#99A5A3" /></View>;
}

const styles = StyleSheet.create({
  back: { flexDirection: "row-reverse", alignSelf: "flex-end", alignItems: "center", gap: 3, marginBottom: 13, paddingVertical: 4 }, backText: { color: COLORS.ink, fontSize: 13, fontWeight: "800" },
  helperCard: { flexDirection: "row-reverse", alignItems: "center", gap: 12, backgroundColor: "#F2FBF8" }, helperText: { flex: 1, alignItems: "flex-end" }, helperTitle: { color: COLORS.ink, fontSize: 14, fontWeight: "900", textAlign: "right" }, helperSubtitle: { color: COLORS.muted, fontSize: 12, lineHeight: 18, marginTop: 3, textAlign: "right" },
  list: { gap: 12 }, orderCard: { padding: 15 }, orderTop: { flexDirection: "row-reverse", alignItems: "center", gap: 11 }, orderText: { flex: 1, alignItems: "flex-end" }, orderName: { color: COLORS.ink, fontSize: 15, fontWeight: "900", textAlign: "right" }, orderDate: { color: COLORS.muted, fontSize: 11, marginTop: 4, textAlign: "right" }, metaRow: { flexDirection: "row-reverse", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 14 }, reference: { color: COLORS.muted, fontSize: 11, fontWeight: "700" }, total: { color: COLORS.primary, fontSize: 13, fontWeight: "900", marginRight: "auto", writingDirection: "ltr" }, notes: { color: COLORS.ink, fontSize: 12, lineHeight: 19, marginTop: 12, textAlign: "right", writingDirection: "rtl" }, invoiceButton: { flexDirection: "row-reverse", alignItems: "center", gap: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.border, marginTop: 14, paddingTop: 13 }, invoiceThumb: { width: 48, height: 48, borderRadius: 12, backgroundColor: "#EDF2F0" }, invoiceText: { flex: 1, alignItems: "flex-end" }, invoiceTitle: { color: COLORS.ink, fontSize: 12, fontWeight: "800", textAlign: "right" }, invoiceSubtitle: { color: COLORS.muted, fontSize: 10, marginTop: 3, textAlign: "right" }, noInvoice: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "flex-end", gap: 6, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.border, marginTop: 14, paddingTop: 13 }, noInvoiceText: { color: COLORS.muted, fontSize: 11, textAlign: "right" },
  emptyCard: { alignItems: "center", paddingVertical: 28 }, emptyTitle: { color: COLORS.ink, fontSize: 15, fontWeight: "900", marginTop: 12, textAlign: "center" }, emptySubtitle: { color: COLORS.muted, fontSize: 12, lineHeight: 19, marginTop: 6, marginBottom: 18, textAlign: "center" },
  formContent: { padding: 20, paddingBottom: 36 }, modalHeader: { flexDirection: "row-reverse", alignItems: "flex-start", gap: 12, marginBottom: 26 }, modalHeaderText: { flex: 1, alignItems: "flex-end" }, modalTitle: { color: COLORS.ink, fontSize: 23, fontWeight: "900", textAlign: "right" }, modalSubtitle: { color: COLORS.muted, fontSize: 12, marginTop: 4, textAlign: "right" }, closeButton: { width: 38, height: 38, borderRadius: 14, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", justifyContent: "center" }, sourceChoices: { flexDirection: "row-reverse", gap: 8, marginBottom: 17 }, sourceChoice: { flex: 1, borderRadius: 13, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, alignItems: "center", justifyContent: "center", minHeight: 44, paddingHorizontal: 5 }, sourceChoiceActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary }, sourceChoiceText: { color: COLORS.muted, fontSize: 12, fontWeight: "800" }, sourceChoiceTextActive: { color: "#FFFFFF" }, twoColumns: { flexDirection: "row-reverse", gap: 10 }, column: { flex: 1 }, textArea: { minHeight: 85, paddingTop: 13, textAlignVertical: "top" }, imageActions: { flexDirection: "row-reverse", gap: 10, marginBottom: 12 }, imageAction: { flex: 1, minHeight: 51, borderRadius: 15, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, alignItems: "center", justifyContent: "center", flexDirection: "row-reverse", gap: 7 }, cameraAction: { borderColor: COLORS.primary, backgroundColor: COLORS.primary }, imageActionText: { color: COLORS.primary, fontSize: 13, fontWeight: "900" }, cameraActionText: { color: "#FFFFFF", fontSize: 13, fontWeight: "900" }, selectedInvoice: { flexDirection: "row-reverse", alignItems: "center", gap: 12, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, padding: 11 }, selectedImage: { width: 64, height: 64, borderRadius: 13, backgroundColor: "#EDF2F0" }, selectedText: { flex: 1, alignItems: "flex-end" }, selectedTitle: { color: COLORS.ink, fontSize: 13, fontWeight: "900", textAlign: "right" }, selectedSubtitle: { color: COLORS.muted, fontSize: 11, lineHeight: 16, marginTop: 3, textAlign: "right" }, removeImage: { color: COLORS.danger, fontSize: 11, fontWeight: "800", marginTop: 6 }, imageHint: { color: COLORS.muted, fontSize: 11, lineHeight: 17, textAlign: "right", marginBottom: 12 }, saveButton: { marginTop: 20 },
  previewOverlay: { flex: 1, backgroundColor: "rgba(9, 30, 29, 0.95)", alignItems: "center", justifyContent: "center", padding: 22 }, previewImage: { width: "100%", height: "78%" }, previewClose: { position: "absolute", top: 56, right: 22, width: 42, height: 42, borderRadius: 21, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center", zIndex: 1 }, previewCaption: { color: "#FFFFFF", fontSize: 13, fontWeight: "800", marginTop: 12 },
});
