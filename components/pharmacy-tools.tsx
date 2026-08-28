import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import { AdminButton, AdminCard, AdminField, AdminShell, adminStyles } from "@/components/local-admin-ui";
import { COLORS } from "@/components/app-ui";
import { usePharmacy } from "@/lib/pharmacy-context";

export function PharmacyTools() {
  const { settings, updateSettings, restoreDemoData } = usePharmacy();
  const [retention, setRetention] = useState(String(settings.imageRetentionDays));

  const saveRetention = () => {
    const days = Number(retention);
    if (!Number.isInteger(days) || days < 1 || days > 3650) {
      return Alert.alert("قيمة غير صحيحة", "اختر مدة بين يوم واحد و3650 يومًا.");
    }
    updateSettings({ imageRetentionDays: days });
    Alert.alert("تم الحفظ", `سيحتفظ التطبيق بصور الفواتير لمدة ${days} يومًا.`);
  };

  return (
    <AdminShell title="بيانات التطبيق" subtitle="إدارة البيانات المحلية دون إعدادات زائدة">
      <Text style={adminStyles.sectionHeading}>حفظ صور الفواتير</Text>
      <AdminCard>
        <Text style={styles.bodyText}>تُحفظ المبيعات والمخزون والشيفتات والطلبيات والمصروفات على هذا الجهاز. يمكنك تحديد مدة الاحتفاظ بصور فواتير الطلبيات فقط.</Text>
        <View style={styles.retentionRow}>
          <View style={styles.retentionField}>
            <AdminField label="الاحتفاظ بصور الفواتير (يوم)" value={retention} onChangeText={setRetention} placeholder="30" keyboardType="number-pad" />
          </View>
          <Text style={styles.retentionMark}>يوم</Text>
        </View>
        <AdminButton title="حفظ مدة الاحتفاظ" onPress={saveRetention} />
      </AdminCard>

      <Text style={adminStyles.sectionHeading}>بيانات العرض</Text>
      <AdminCard>
        <Text style={styles.bodyText}>هذا الخيار مخصص للمعاينة فقط. استخدامه يستبدل البيانات المحلية الحالية ببيانات عرض تجريبية.</Text>
        <AdminButton title="إعادة بيانات العرض" onPress={() => Alert.alert("إعادة بيانات العرض", "سيتم استبدال البيانات المحلية الحالية ببيانات العرض. هل تريد المتابعة؟", [{ text: "إلغاء", style: "cancel" }, { text: "إعادة", style: "destructive", onPress: restoreDemoData }])} secondary />
      </AdminCard>
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  bodyText: { color: COLORS.muted, fontSize: 11, lineHeight: 18, textAlign: "right", marginBottom: 12 },
  retentionRow: { flexDirection: "row-reverse", gap: 8, alignItems: "center" },
  retentionField: { flex: 1 },
  retentionMark: { color: COLORS.primary, fontSize: 12, fontWeight: "900", marginTop: 17 },
});
