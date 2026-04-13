import { Alert, Linking, Platform } from "react-native";

export type MapProvider = "apple" | "google";

function buildAppleMapsUrl(query: string) {
  return `https://maps.apple.com/?q=${encodeURIComponent(query)}`;
}

function buildGoogleMapsUrl(query: string) {
  const encoded = encodeURIComponent(query);
  if (Platform.OS === "ios") return `comgooglemaps://?q=${encoded}`;
  if (Platform.OS === "android") return `geo:0,0?q=${encoded}`;
  return `https://www.google.com/maps/search/?api=1&query=${encoded}`;
}

export async function openMapApp(provider: MapProvider, query: string) {
  const cleanQuery = query.trim();
  if (!cleanQuery) {
    Alert.alert("Location needed", "Add a club address or location before opening maps.");
    return;
  }

  const primaryUrl = provider === "apple" ? buildAppleMapsUrl(cleanQuery) : buildGoogleMapsUrl(cleanQuery);
  const fallbackUrl = provider === "google" ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cleanQuery)}` : primaryUrl;

  try {
    const canOpen = await Linking.canOpenURL(primaryUrl);
    await Linking.openURL(canOpen ? primaryUrl : fallbackUrl);
  } catch {
    Alert.alert("Maps unavailable", "This device could not open the selected maps application.");
  }
}