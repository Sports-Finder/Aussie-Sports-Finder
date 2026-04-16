import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import React from "react";
import { Platform, StyleSheet, Text, View, useColorScheme } from "react-native";

import { useColors } from "@/hooks/useColors";

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "magnifyingglass", selected: "magnifyingglass" }} />
        <Label>Discover</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="post">
        <Icon sf={{ default: "plus.circle", selected: "plus.circle.fill" }} />
        <Label>Post</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="messages">
        <Icon sf={{ default: "bubble.left.and.bubble.right", selected: "bubble.left.and.bubble.right.fill" }} />
        <Label>Communication Hub</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <Icon sf={{ default: "person.crop.circle", selected: "person.crop.circle.fill" }} />
        <Label>Profile</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.background,
          borderTopWidth: isWeb ? 1 : 0,
          borderTopColor: colors.border,
          elevation: 0,
          height: isWeb ? 110 : 102,
          paddingTop: 10,
          paddingBottom: 14,
        },
        tabBarLabelStyle: {
          marginTop: 8,
          fontSize: 12,
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={100}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: colors.background },
              ]}
            />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Discover",
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="magnifyingglass" tintColor={color} size={48} /> : <Feather name="search" size={44} color={color} />,
        }}
      />
      <Tabs.Screen
        name="post"
        options={{
          title: "Post",
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="plus.circle" tintColor={color} size={48} /> : <Feather name="plus-circle" size={44} color={color} />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: "Communication Hub",
          tabBarIcon: ({ color }) => (
            <View style={styles.messageTabIconWrap}>
              <View style={styles.orangeBadge}>
                <View style={styles.orangeBadgeDot}>
                  <Text style={styles.badgeText}>1</Text>
                </View>
              </View>
              <View style={styles.redBadge}>
                <View style={styles.redBadgeDot}>
                  <Text style={styles.badgeText}>1</Text>
                </View>
              </View>
              {isIOS ? <SymbolView name="bubble.left.and.bubble.right" tintColor={color} size={48} /> : <Feather name="message-circle" size={44} color={color} />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) =>
            isIOS ? <SymbolView name="person.crop.circle" tintColor={color} size={48} /> : <Feather name="user" size={44} color={color} />,
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}

const styles = StyleSheet.create({
  messageTabIconWrap: {
    width: 60,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  orangeBadge: {
    position: "absolute",
    top: 2,
    left: 2,
    zIndex: 2,
  },
  redBadge: {
    position: "absolute",
    top: 2,
    right: 2,
    zIndex: 2,
  },
  orangeBadgeDot: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#F59E0B",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  redBadgeDot: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  badgeText: {
    color: "#000000",
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 13,
  },
});
