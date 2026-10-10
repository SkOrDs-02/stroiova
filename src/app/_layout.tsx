import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { initSentry, wrapRoot } from '@/services/sentry';
import { color } from '@/theme';

initSentry();

function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: color.bg },
        }}
      />
    </>
  );
}

export default wrapRoot(RootLayout);
