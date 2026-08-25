import { ReactNode } from "react";
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from "react-native";

import { IconSymbol } from "@/components/ui/icon-symbol";

export const COLORS = {
  primary: "#176B68", mint: "#DDF3EF", background: "#F5F8FA", surface: "#FFFFFF", ink: "#172D36", muted: "#71838B", border: "#E2EBEF", success: "#2C8E6A", warning: "#C98238", danger: "#C65450", softWarning: "#FFF3E1", softDanger: "#FCEAE8",
};

export function PageHeader({ title, subtitle, action, onActionPress }: { title: string; subtitle?: string; action?: string; onActionPress?: () => void }) {
  return <View style={styles.header}><View style={styles.headerText}><Text style={styles.pageTitle}>{title}</Text>{subtitle ? <Text style={styles.pageSubtitle}>{subtitle}</Text> : null}</View>{action && onActionPress ? <TouchableOpacity onPress={onActionPress} style={styles.headerAction} activeOpacity={0.8}><Text style={styles.headerActionText}>{action}</Text><IconSymbol name="plus.circle.fill" size={18} color={COLORS.primary} /></TouchableOpacity> : null}</View>;
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) { return <View style={[styles.card, style]}>{children}</View>; }

export function SectionTitle({ title, action, onActionPress }: { title: string; action?: string; onActionPress?: () => void }) {
  return <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>{title}</Text>{action && onActionPress ? <TouchableOpacity onPress={onActionPress} activeOpacity={0.7}><Text style={styles.sectionAction}>{action}</Text></TouchableOpacity> : null}</View>;
}

export function Badge({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "success" | "warning" | "danger" }) {
  const stylesByTone = { neutral: { backgroundColor: COLORS.mint, color: COLORS.primary }, success: { backgroundColor: "#E4F6EE", color: COLORS.success }, warning: { backgroundColor: COLORS.softWarning, color: COLORS.warning }, danger: { backgroundColor: COLORS.softDanger, color: COLORS.danger } };
  const toneStyle = stylesByTone[tone];
  return <Text style={[styles.badge, { backgroundColor: toneStyle.backgroundColor, color: toneStyle.color }]}>{label}</Text>;
}

export function RoundIcon({ name, color = COLORS.primary, background = COLORS.mint }: { name: Parameters<typeof IconSymbol>[0]["name"]; color?: string; background?: string }) {
  return <View style={[styles.roundIcon, { backgroundColor: background }]}><IconSymbol name={name} size={21} color={color} /></View>;
}

export const commonStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 124 },
  primaryButton: { backgroundColor: COLORS.primary, borderRadius: 18, alignItems: "center", justifyContent: "center", minHeight: 56, paddingHorizontal: 20, flexDirection: "row-reverse", gap: 9, shadowColor: COLORS.primary, shadowOpacity: 0.14, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  primaryButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800", textAlign: "center" },
  secondaryButton: { backgroundColor: "#F9FBFC", borderColor: COLORS.border, borderWidth: 1, borderRadius: 18, alignItems: "center", justifyContent: "center", minHeight: 54, paddingHorizontal: 20, flexDirection: "row-reverse", gap: 9 },
  secondaryButtonText: { color: COLORS.ink, fontSize: 15, fontWeight: "800", textAlign: "center" },
  input: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, minHeight: 52, paddingHorizontal: 15, fontSize: 15, color: COLORS.ink, textAlign: "right", writingDirection: "rtl" },
  inputLabel: { color: COLORS.ink, fontSize: 12, fontWeight: "800", marginBottom: 8, textAlign: "right" },
  inputGroup: { marginBottom: 14 },
  rowDivider: { height: StyleSheet.hairlineWidth, backgroundColor: COLORS.border, marginVertical: 13 },
});

const styles = StyleSheet.create({
  header: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginBottom: 25 }, headerText: { flex: 1, alignItems: "flex-end" }, pageTitle: { color: COLORS.ink, fontSize: 29, lineHeight: 36, fontWeight: "900", textAlign: "right", letterSpacing: -0.4 }, pageSubtitle: { color: COLORS.muted, fontSize: 13, lineHeight: 20, marginTop: 5, textAlign: "right" }, headerAction: { flexDirection: "row-reverse", alignItems: "center", gap: 5, paddingVertical: 8, paddingLeft: 1, marginRight: 14 }, headerActionText: { color: COLORS.primary, fontSize: 13, fontWeight: "800" },
  card: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 22, padding: 17, shadowColor: "#173B45", shadowOpacity: 0.06, shadowRadius: 16, shadowOffset: { width: 0, height: 7 }, elevation: 2 }, sectionHeader: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginTop: 30, marginBottom: 13 }, sectionTitle: { color: COLORS.ink, fontSize: 18, fontWeight: "900", textAlign: "right", letterSpacing: -0.2 }, sectionAction: { color: COLORS.primary, fontSize: 13, fontWeight: "800" },
  badge: { overflow: "hidden", borderRadius: 10, paddingHorizontal: 9, paddingVertical: 5, fontSize: 11, lineHeight: 14, fontWeight: "800", textAlign: "center" }, roundIcon: { width: 46, height: 46, borderRadius: 16, alignItems: "center", justifyContent: "center" },
});
