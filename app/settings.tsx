import { useState } from "react";
import { Alert, Text, View } from "react-native";

import { AdminButton, AdminCard, AdminField, AdminShell, adminStyles } from "@/components/local-admin-ui";
import { COLORS } from "@/components/app-ui";
import { usePharmacy } from "@/lib/pharmacy-context";

export default function SettingsScreen() {
  const { settings, updateSettings, restoreDemoData } = usePharmacy();
  const [retention, setRetention] = useState(String(settings.imageRetentionDays));
  const save = () => {
    const days = Number(retention);
    if (!Number.isInteger(days) || days < 1 || days > 3650) return Alert.alert("قيمة غير صحيحة", "اختر مدة بين يوم واحد و3650 يومًا.");
    updateSettings({ imageRetentionDays: days });
    Alert.alert("تم الحفظ", `سيحتفظ التطبيق بصور الفواتير لمدة ${days} يومًا.`);
  };
  const reset = () => Alert.alert("إعادة بيانات العرض", "سيتم استبدال البيانات المحلية الحالية ببيانات العرض. هل تريد المتابعة؟", [{ text: "إلغاء", style: "cancel" }, { text: "إعادة", style: "destructive", onPress: restoreDemoData }]);
  return (
    <AdminShell title="إعدادات الصيدلية" subtitle="تحكم في البيانات المحلية وسياسة الاحتفاظ بالصور">
      <AdminCard>
        <Text style={{ color: COLORS.ink, fontSize: 15, fontWeight: "900", textAlign: "right", marginBottom: 6 }}>البيانات المحلية</Text>
        <Text style={{ color: COLORS.muted, fontSize: 11, lineHeight: 18, textAlign: "right", marginBottom: 14 }}>يعمل التطبيق حاليًا دون Supabase. تُحفظ المبيعات والمخزون والشيفتات والطلبيات والمصروفات على هذا الجهاز داخل قاعدة SQLite المحلية.</Text>
        <View style={{ flexDirection: "row-reverse", gap: 8, alignItems: "center" }}><View style={{ flex: 1 }}><AdminField label="الاحتفاظ بصور الفواتير (يوم)" value={retention} onChangeText={setRetention} placeholder="30" keyboardType="number-pad" /></View><Text style={{ color: COLORS.primary, fontSize: 24, fontWeight: "900", marginTop: 17 }}>⌁</Text></View>
        <AdminButton title="حفظ الإعدادات" onPress={save} />
      </AdminCard>
      <Text style={adminStyles.sectionHeading}>إدارة بيانات العرض</Text>
      <AdminCard><Text style={{ color: COLORS.muted, fontSize: 11, lineHeight: 18, textAlign: "right", marginBottom: 12 }}>استخدم هذا الخيار فقط لإرجاع أمثلة العرض. لن تحتاجه في الاستخدام اليومي.</Text><AdminButton title="إعادة بيانات العرض" onPress={reset} secondary /></AdminCard>
      <Text style={adminStyles.sectionHeading}>حالة المزامنة</Text>
      <AdminCard style={{ backgroundColor: "#FFF8E9", borderColor: "#F0D99D" }}><Text style={{ color: COLORS.warning, fontSize: 14, fontWeight: "900", textAlign: "right" }}>تشغيل محلي مؤقت</Text><Text style={{ color: COLORS.ink, fontSize: 11, lineHeight: 18, textAlign: "right", marginTop: 5 }}>المزامنة السحابية متوقفة حاليًا بناءً على اختيارك. يمكن تفعيلها لاحقًا دون تغيير نموذج التشغيل المحلي.</Text></AdminCard>
    </AdminShell>
  );
}
