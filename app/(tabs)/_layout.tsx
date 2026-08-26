import { Platform } from "react-native";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 10 : Math.max(insets.bottom, 8);
  return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.tint, tabBarInactiveTintColor: colors.muted, tabBarButton: HapticTab, tabBarStyle: { height: 58 + bottomPadding, paddingTop: 7, paddingBottom: bottomPadding, backgroundColor: colors.surface, borderTopColor: colors.border, borderTopWidth: 1, elevation: 0, shadowOpacity: 0 }, tabBarLabelStyle: { fontSize: 10, fontWeight: "900", marginTop: 2 }, tabBarItemStyle: { paddingHorizontal: 2 } }}>
    <Tabs.Screen name="index" options={{ title: "الرئيسية", tabBarIcon: ({ color }) => <IconSymbol size={23} name="rectangle.grid.2x2.fill" color={color} /> }} />
    <Tabs.Screen name="inventory" options={{ title: "المخزون", tabBarIcon: ({ color }) => <IconSymbol size={23} name="shippingbox.fill" color={color} /> }} />
    <Tabs.Screen name="sales" options={{ title: "البيع", tabBarIcon: ({ color }) => <IconSymbol size={23} name="cart.fill" color={color} /> }} />
    <Tabs.Screen name="alerts" options={{ title: "النواقص", tabBarIcon: ({ color }) => <IconSymbol size={23} name="bell.fill" color={color} /> }} />
    <Tabs.Screen name="more" options={{ title: "الإدارة", tabBarIcon: ({ color }) => <IconSymbol size={23} name="ellipsis.circle.fill" color={color} /> }} />
  </Tabs>;
}
