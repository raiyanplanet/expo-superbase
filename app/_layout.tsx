import "@/global.css";
import { Stack } from "expo-router";
import { ErrorBoundary } from './error-boundary';

export default function Layout() {
  return (
    <ErrorBoundary>
      <Stack screenOptions={{ headerShown: false }} />
    </ErrorBoundary>
  );
}
