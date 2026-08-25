import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Platform } from "react-native";
import { useColors } from "@/hooks/use-colors";

export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);
  const tabBarHeight = 56 + bottomPadding;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.tint,
        tabBarInactiveTintColor: colors.muted,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          paddingTop: 8,
          paddingBottom: bottomPadding,
          height: tabBarHeight,
          backgroundColor: "rgba(255,255,255,0.86)",
          borderTopColor: "rgba(255,255,255,0.96)",
          borderTopWidth: 1,
          shadowColor: "#173B45",
          shadowOpacity: 0.12,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: -5 },
          elevation: 10,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: "800", marginTop: 2 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "الرئيسية",
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="rectangle.grid.2x2.fill" color={color} />,
        }}
      />
      <Tabs.Screen name="inventory" options={{ title: "المخزون", tabBarIcon: ({ color }) => <IconSymbol size={24} name="shippingbox.fill" color={color} /> }} />
      <Tabs.Screen name="sales" options={{ title: "البيع", tabBarIcon: ({ color }) => <IconSymbol size={24} name="cart.fill" color={color} /> }} />
      <Tabs.Screen name="alerts" options={{ title: "النواقص", tabBarIcon: ({ color }) => <IconSymbol size={24} name="bell.fill" color={color} /> }} />
      <Tabs.Screen name="more" options={{ title: "الإدارة", tabBarIcon: ({ color }) => <IconSymbol size={24} name="ellipsis.circle.fill" color={color} /> }} />
    </Tabs>
  );
}
