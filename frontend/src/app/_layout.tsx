import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';

/**
 * Root navigation layout. Shared navigation structure is owned jointly by the
 * team — coordinate before adding route groups (e.g. (auth), (tabs)).
 */
export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ title: 'Blood Donor App' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
