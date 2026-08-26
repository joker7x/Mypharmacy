import { ReactNode } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TextInputProps, TouchableOpacity, View } from "react-native";

import { COLORS, PageHeader, commonStyles } from "@/components/app-ui";
import { ScreenContainer } from "@/components/screen-container";

export function AdminShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]} containerClassName="bg-background" className="flex-1">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={commonStyles.content} keyboardShouldPersistTaps="handled">
        <PageHeader title={title} subtitle={subtitle} />
        {children}
      </ScrollView>
    </ScreenContainer>
  );
}

export function AdminCard({ children, style }: { children: ReactNode; style?: object }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function AdminField({ label, style, ...props }: TextInputProps & { label: string; style?: object }) {
  return (
    <View style={[styles.fieldWrap, style]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput {...props} placeholderTextColor="#96A5A2" style={styles.input} returnKeyType="done" />
    </View>
  );
}

export function AdminButton({ title, onPress, secondary = false, disabled = false }: { title: string; onPress: () => void; secondary?: boolean; disabled?: boolean }) {
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled} activeOpacity={0.82} style={[styles.button, secondary && styles.buttonSecondary, disabled && styles.disabled]}>
      <Text style={[styles.buttonText, secondary && styles.buttonTextSecondary]}>{title}</Text>
    </TouchableOpacity>
  );
}

export function StatTile({ label, value, accent = COLORS.primary }: { label: string; value: string; accent?: string }) {
  return (
    <View style={styles.statTile}>
      <Text style={[styles.statValue, { color: accent }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 22, padding: 16, marginBottom: 14 },
  fieldWrap: { marginBottom: 13 },
  label: { color: COLORS.ink, fontSize: 12, fontWeight: "800", textAlign: "right", marginBottom: 7 },
  input: { minHeight: 46, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.background, color: COLORS.ink, paddingHorizontal: 12, fontSize: 13, textAlign: "right", writingDirection: "rtl" },
  button: { minHeight: 48, borderRadius: 15, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center", paddingHorizontal: 16, marginTop: 3 },
  buttonSecondary: { backgroundColor: COLORS.mint, borderWidth: 1, borderColor: COLORS.primary },
  buttonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "900" },
  buttonTextSecondary: { color: COLORS.primary },
  disabled: { opacity: 0.45 },
  sectionHeading: { color: COLORS.primary, fontSize: 12, fontWeight: "900", textAlign: "right", marginTop: 25, marginBottom: 9 },
  statTile: { flex: 1, minHeight: 80, borderRadius: 18, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  statValue: { fontSize: 20, fontWeight: "900" },
  statLabel: { color: COLORS.muted, fontSize: 10, fontWeight: "700", textAlign: "center", marginTop: 4 },
});

export const adminStyles = styles;
