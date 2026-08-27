import { useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { COLORS, PharmacyMark } from "@/components/app-ui";
import { ScreenContainer } from "@/components/screen-container";
import { useStaffSession } from "@/lib/staff-session";

export default function StaffLoginScreen() {
  const { configured, login, bootstrap } = useStaffSession();
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const setupMode = configured === false;
  const submit = async () => {
    if (!username.trim() || !password) return Alert.alert("بيانات ناقصة", "أدخل اسم المستخدم وكلمة المرور.");
    if (setupMode && displayName.trim().length < 2) return Alert.alert("الاسم مطلوب", "أدخل اسم مسؤول الصيدلية.");
    setLoading(true);
    try {
      if (setupMode) await bootstrap({ displayName: displayName.trim(), username: username.trim(), password });
      else await login({ username: username.trim(), password });
    } catch (error) { Alert.alert("تعذر الدخول", error instanceof Error ? error.message : "تحقق من البيانات وأعد المحاولة."); }
    finally { setLoading(false); }
  };
  return <ScreenContainer edges={["top", "bottom", "left", "right"]} className="flex-1"><KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.page}><View style={styles.hero}><PharmacyMark inverse size="regular" /><Text style={styles.brand}>صيدليتي</Text><Text style={styles.tagline}>{setupMode ? "إعداد حساب مسؤول الصيدلية" : "تسجيل دخول فريق الصيدلية"}</Text></View><View style={styles.card}>{setupMode ? <><Text style={styles.title}>ابدأ بحساب المسؤول</Text><Text style={styles.description}>سينشئ هذا الحساب لوحة التحكم وإدارة أفراد الصيدلية. لن يتم إنشاء حسابات العاملين إلا من خلاله.</Text><Field label="اسم المسؤول" value={displayName} onChangeText={setDisplayName} placeholder="مثال: د. أحمد" /></> : <><Text style={styles.title}>مرحبًا بعودتك</Text><Text style={styles.description}>استخدم اسم المستخدم وكلمة المرور التي أنشأها مسؤول الصيدلية.</Text></>}<Field label="اسم المستخدم" value={username} onChangeText={setUsername} placeholder="مثال: ahmed.admin" autoCapitalize="none" /><Field label="كلمة المرور" value={password} onChangeText={setPassword} placeholder="8 أحرف على الأقل" secureTextEntry /><TouchableOpacity onPress={() => void submit()} disabled={loading || configured === undefined} style={[styles.submit, (loading || configured === undefined) && styles.submitDisabled]} activeOpacity={0.82}>{loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitText}>{setupMode ? "إنشاء حساب المسؤول" : "دخول إلى الصيدلية"}</Text>}</TouchableOpacity></View><Text style={styles.privacy}>يُسجّل التطبيق اسم الجهاز والمنصة ووقت الدخول، ويُخفي الجزء الأخير من عنوان الشبكة لأغراض حماية الحساب والمراجعة.</Text></KeyboardAvoidingView></ScreenContainer>;
}

function Field({ label, ...props }: { label: string } & React.ComponentProps<typeof TextInput>) { return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput {...props} placeholderTextColor="#98A39E" style={styles.input} textAlign="right" returnKeyType="done" /></View>; }

const styles = StyleSheet.create({ page: { flex: 1, justifyContent: "center", padding: 22, backgroundColor: COLORS.background }, hero: { alignItems: "center", marginBottom: 30 }, brand: { color: COLORS.ink, fontSize: 31, fontWeight: "900", marginTop: 12 }, tagline: { color: COLORS.muted, fontSize: 13, fontWeight: "700", marginTop: 5 }, card: { backgroundColor: "#FFFFFF", borderRadius: 27, padding: 20, borderWidth: 1, borderColor: COLORS.border }, title: { color: COLORS.ink, fontSize: 19, fontWeight: "900", textAlign: "right" }, description: { color: COLORS.muted, fontSize: 11, lineHeight: 18, textAlign: "right", marginTop: 7, marginBottom: 17 }, field: { marginBottom: 13 }, label: { color: COLORS.ink, fontSize: 11, fontWeight: "900", textAlign: "right", marginBottom: 7 }, input: { minHeight: 51, backgroundColor: "#F5F4F1", borderRadius: 15, paddingHorizontal: 14, color: COLORS.ink, fontSize: 14, writingDirection: "rtl" }, submit: { minHeight: 54, borderRadius: 17, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center", marginTop: 5 }, submitDisabled: { opacity: 0.55 }, submitText: { color: "#FFFFFF", fontWeight: "900", fontSize: 14 }, privacy: { color: COLORS.muted, fontSize: 10, lineHeight: 16, textAlign: "center", marginTop: 20, paddingHorizontal: 10 } });
