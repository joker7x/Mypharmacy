import { ReactNode } from "react";
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from "react-native";

import { IconSymbol } from "@/components/ui/icon-symbol";

export const COLORS = {
  primary: "#0B6E69", mint: "#D7F3EE", background: "#F7FAF9", surface: "#FFFFFF", ink: "#102A2A", muted: "#6F7D7C", border: "#E1EBE8", success: "#178A5B", warning: "#D97706", danger: "#C2413B", softWarning: "#FFF4DF", softDanger: "#FBE9E7",
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
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 112 },
  primaryButton: { backgroundColor: COLORS.primary, borderRadius: 16, alignItems: "center", justifyContent: "center", minHeight: 52, paddingHorizontal: 18, flexDirection: "row-reverse", gap: 8 },
  primaryButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800", textAlign: "center" },
  secondaryButton: { backgroundColor: COLORS.surface, borderColor: COLORS.border, borderWidth: 1, borderRadius: 16, alignItems: "center", justifyContent: "center", minHeight: 52, paddingHorizontal: 18, flexDirection: "row-reverse", gap: 8 },
  secondaryButtonText: { color: COLORS.ink, fontSize: 15, fontWeight: "800", textAlign: "center" },
  input: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, minHeight: 50, paddingHorizontal: 14, fontSize: 15, color: COLORS.ink, textAlign: "right", writingDirection: "rtl" },
  inputLabel: { color: COLORS.ink, fontSize: 13, fontWeight: "700", marginBottom: 7, textAlign: "right" },
  inputGroup: { marginBottom: 14 },
  rowDivider: { height: StyleSheet.hairlineWidth, backgroundColor: COLORS.border, marginVertical: 13 },
});

const styles = StyleSheet.create({
  header: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }, headerText: { flex: 1, alignItems: "flex-end" }, pageTitle: { color: COLORS.ink, fontSize: 27, lineHeight: 34, fontWeight: "800", textAlign: "right" }, pageSubtitle: { color: COLORS.muted, fontSize: 13, lineHeight: 20, marginTop: 3, textAlign: "right" }, headerAction: { flexDirection: "row-reverse", alignItems: "center", gap: 5, paddingVertical: 8, paddingLeft: 1, marginRight: 14 }, headerActionText: { color: COLORS.primary, fontSize: 13, fontWeight: "800" },
  card: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 20, padding: 16, shadowColor: "#0B3A37", shadowOpacity: 0.035, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 1 }, sectionHeader: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginTop: 26, marginBottom: 12 }, sectionTitle: { color: COLORS.ink, fontSize: 17, fontWeight: "800", textAlign: "right" }, sectionAction: { color: COLORS.primary, fontSize: 13, fontWeight: "800" },
  badge: { overflow: "hidden", borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5, fontSize: 11, lineHeight: 14, fontWeight: "800", textAlign: "center" }, roundIcon: { width: 44, height: 44, borderRadius: 15, alignItems: "center", justifyContent: "center" },
});
