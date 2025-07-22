import "@/global.css";
import { Stack } from "expo-router";
import { StatusBar } from "react-native";
import { ErrorBoundary } from "./error-boundary";

export default function Layout() {
  return (
    <ErrorBoundary>
      <StatusBar
        barStyle="dark-content" // Dark text/icons for light background
        backgroundColor="#fff" // Matches your app's white background
        translucent={false}
      />

      <Stack screenOptions={{ headerShown: false }} />
    </ErrorBoundary>
  );
}
