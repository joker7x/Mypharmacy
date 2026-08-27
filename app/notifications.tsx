import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";

import { COLORS, PageHeader, RoundIcon, commonStyles } from "@/components/app-ui";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";

export default function NotificationsScreen() {
  const notifications = trpc.staff.notifications.useQuery(undefined, { refetchInterval: 60_000 });
  const markRead = trpc.staff.markNotificationRead.useMutation({ onSuccess: () => notifications.refetch() });
  return <ScreenContainer className="flex-1"><FlatList data={notifications.data ?? []} keyExtractor={(item) => String(item.id)} contentContainerStyle={commonStyles.content} ListHeaderComponent={<PageHeader title="الإشعارات" subtitle="رسائل وإجراءات موجهة إليك من إدارة الصيدلية" />} ListEmptyComponent={<View style={styles.empty}><RoundIcon name="bell.fill" color={COLORS.primary} background="#DFF6EC" /><Text style={styles.emptyTitle}>لا توجد إشعارات</Text><Text style={styles.emptyText}>ستظهر هنا أي رسالة يرسلها مسؤول الصيدلية إلى حسابك أو دورك.</Text></View>} renderItem={({ item }) => <TouchableOpacity onPress={() => { if (!item.readAt) markRead.mutate({ id: item.id }); if (item.route) router.push(item.route as never); }} style={[styles.row, !item.readAt && styles.unread]} activeOpacity={0.78}><View style={styles.dot}>{!item.readAt ? <View style={styles.dotFill} /> : null}</View><View style={styles.rowText}><Text style={styles.title}>{item.title}</Text><Text style={styles.body}>{item.body}</Text><Text style={styles.date}>{new Date(item.createdAt).toLocaleString("ar-EG")}</Text></View></TouchableOpacity>} /> </ScreenContainer>;
}

const styles = StyleSheet.create({ empty: { alignItems: "center", paddingVertical: 72, gap: 8 }, emptyTitle: { color: COLORS.ink, fontSize: 17, fontWeight: "900", marginTop: 7 }, emptyText: { color: COLORS.muted, fontSize: 11, lineHeight: 18, textAlign: "center", maxWidth: 260 }, row: { flexDirection: "row-reverse", alignItems: "flex-start", gap: 11, padding: 15, backgroundColor: "#FFFFFF", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border }, unread: { backgroundColor: "#EEFBF6" }, dot: { width: 11, height: 20, justifyContent: "center", marginTop: 2 }, dotFill: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary }, rowText: { flex: 1, alignItems: "flex-end" }, title: { color: COLORS.ink, fontSize: 13, fontWeight: "900", textAlign: "right" }, body: { color: COLORS.muted, fontSize: 11, lineHeight: 17, textAlign: "right", marginTop: 4 }, date: { color: "#9CA6A1", fontSize: 9, marginTop: 7 } });
