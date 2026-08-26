import { ReactNode } from "react";
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from "react-native";

import { IconSymbol } from "@/components/ui/icon-symbol";

export const COLORS = {
  primary: "#0F6B5B",
  deep: "#123B36",
  mint: "#E7F1EC",
  background: "#F8F7F3",
  surface: "#FFFFFF",
  ink: "#162321",
  muted: "#71807B",
  border: "#E3E8E4",
  success: "#178A5B",
  warning: "#B56A20",
  danger: "#B7473E",
  softWarning: "#FFF3DF",
  softDanger: "#FCEBE8",
  softBlue: "#EAF1F7",
};

export function PageHeader({ title, subtitle, action, onActionPress }: { title: string; subtitle?: string; action?: string; onActionPress?: () => void }) {
  return <View style={styles.header}><View style={styles.headerText}><Text style={styles.pageTitle}>{title}</Text>{subtitle ? <Text style={styles.pageSubtitle}>{subtitle}</Text> : null}</View>{action && onActionPress ? <TouchableOpacity onPress={onActionPress} style={styles.headerAction} activeOpacity={0.8}><Text style={styles.headerActionText}>{action}</Text><IconSymbol name="plus.circle.fill" size={18} color={COLORS.primary} /></TouchableOpacity> : null}</View>;
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle; glass?: boolean }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ title, action, onActionPress }: { title: string; action?: string; onActionPress?: () => void }) {
  return <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>{title}</Text>{action && onActionPress ? <TouchableOpacity onPress={onActionPress} activeOpacity={0.7}><Text style={styles.sectionAction}>{action}</Text></TouchableOpacity> : null}</View>;
}

export function Badge({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "success" | "warning" | "danger" }) {
  const stylesByTone = { neutral: { backgroundColor: COLORS.mint, color: COLORS.primary }, success: { backgroundColor: "#E5F4EC", color: COLORS.success }, warning: { backgroundColor: COLORS.softWarning, color: COLORS.warning }, danger: { backgroundColor: COLORS.softDanger, color: COLORS.danger } };
  const toneStyle = stylesByTone[tone];
  return <Text style={[styles.badge, { backgroundColor: toneStyle.backgroundColor, color: toneStyle.color }]}>{label}</Text>;
}

export function RoundIcon({ name, color = COLORS.primary, background = COLORS.mint }: { name: Parameters<typeof IconSymbol>[0]["name"]; color?: string; background?: string }) {
  return <View style={[styles.roundIcon, { backgroundColor: background }]}><IconSymbol name={name} size={21} color={color} /></View>;
}

export function PharmacyMark({ inverse = false, size = "regular" }: { inverse?: boolean; size?: "small" | "regular" }) {
  const compact = size === "small";
  return <View style={[styles.pharmacyMark, compact && styles.pharmacyMarkSmall, { backgroundColor: inverse ? "#24574F" : COLORS.mint }]}><View style={styles.markCross}><View style={[styles.markCrossVertical, { backgroundColor: inverse ? "#FFFFFF" : COLORS.primary }]} /><View style={[styles.markCrossHorizontal, { backgroundColor: inverse ? "#FFFFFF" : COLORS.primary }]} /></View><View style={styles.markBars}>{[5, 2, 7, 3, 6].map((width, index) => <View key={index} style={[styles.markBar, { width, backgroundColor: inverse ? "#BDE5D4" : COLORS.primary }]} />)}</View></View>;
}

export const commonStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 124 },
  primaryButton: { backgroundColor: COLORS.primary, borderRadius: 14, alignItems: "center", justifyContent: "center", minHeight: 52, paddingHorizontal: 20, flexDirection: "row-reverse", gap: 9 },
  primaryButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "900", textAlign: "center" },
  secondaryButton: { backgroundColor: COLORS.surface, borderColor: COLORS.border, borderWidth: 1, borderRadius: 14, alignItems: "center", justifyContent: "center", minHeight: 50, paddingHorizontal: 20, flexDirection: "row-reverse", gap: 9 },
  secondaryButtonText: { color: COLORS.ink, fontSize: 14, fontWeight: "800", textAlign: "center" },
  input: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 13, minHeight: 50, paddingHorizontal: 15, fontSize: 14, color: COLORS.ink, textAlign: "right", writingDirection: "rtl" },
  inputLabel: { color: COLORS.ink, fontSize: 12, fontWeight: "900", marginBottom: 8, textAlign: "right" },
  inputGroup: { marginBottom: 14 },
  rowDivider: { height: StyleSheet.hairlineWidth, backgroundColor: COLORS.border, marginVertical: 12 },
});

const styles = StyleSheet.create({
  header: { flexDirection: "row-reverse", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 },
  headerText: { flex: 1, alignItems: "flex-end" },
  pageTitle: { color: COLORS.ink, fontSize: 28, lineHeight: 35, fontWeight: "900", textAlign: "right", letterSpacing: -0.5 },
  pageSubtitle: { color: COLORS.muted, fontSize: 12, lineHeight: 19, marginTop: 5, textAlign: "right" },
  headerAction: { flexDirection: "row-reverse", alignItems: "center", gap: 5, paddingVertical: 7, marginRight: 14 },
  headerActionText: { color: COLORS.primary, fontSize: 12, fontWeight: "900" },
  card: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 18, padding: 16, shadowColor: "#18352F", shadowOpacity: 0.055, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 1 },
  sectionHeader: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginTop: 28, marginBottom: 11 },
  sectionTitle: { color: COLORS.ink, fontSize: 16, fontWeight: "900", textAlign: "right" },
  sectionAction: { color: COLORS.primary, fontSize: 12, fontWeight: "900" },
  badge: { overflow: "hidden", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, fontSize: 10, lineHeight: 13, fontWeight: "900", textAlign: "center" },
  roundIcon: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  pharmacyMark: { width: 46, height: 46, borderRadius: 14, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 4 },
  pharmacyMarkSmall: { width: 38, height: 38, borderRadius: 11 },
  markCross: { width: 20, height: 20, alignItems: "center", justifyContent: "center" },
  markCrossVertical: { position: "absolute", width: 6, height: 20, borderRadius: 2 },
  markCrossHorizontal: { position: "absolute", width: 20, height: 6, borderRadius: 2 },
  markBars: { height: 19, flexDirection: "row", alignItems: "center", gap: 2 },
  markBar: { height: 17, borderRadius: 1 },
});
