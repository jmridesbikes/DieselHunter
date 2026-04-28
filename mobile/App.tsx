import { Ionicons } from '@expo/vector-icons';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LeaderboardScreen } from './components/LeaderboardScreen';
import { MapScreen } from './components/MapScreen';
import { useAuth } from './hooks/useAuth';
import { hasSupabaseClientConfig } from './lib/supabase';

const Tab = createBottomTabNavigator();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#0f1419',
    card: '#0f1419',
    border: 'rgba(255,255,255,0.08)',
    primary: '#93c5fd',
    text: '#e8ecf4',
  },
};

export default function App() {
  const hasConfig = hasSupabaseClientConfig();
  const { userId, ready, authError } = useAuth();

  if (Platform.OS === 'web') {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <View style={styles.centered}>
            <Text style={styles.hint}>DieselHunter is built for iOS and Android (Apple / Google Maps).</Text>
          </View>
          <StatusBar style="light" />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  if (!hasConfig) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <View style={styles.centered}>
            <Text style={styles.hint}>
              Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or legacy
              EXPO_PUBLIC_SUPABASE_ANON_KEY) in .env
            </Text>
          </View>
          <StatusBar style="light" />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  if (authError) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <View style={styles.centered}>
            <Text style={styles.err}>Auth: {authError.message}</Text>
            <Text style={styles.hint}>Enable anonymous sign-in in the Supabase dashboard (Authentication → Providers).</Text>
          </View>
          <StatusBar style="light" />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  if (!ready || !userId) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.hint}>Signing in…</Text>
          </View>
          <StatusBar style="light" />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer theme={navTheme}>
          <Tab.Navigator
            screenOptions={{
              headerShown: false,
              tabBarStyle: {
                backgroundColor: '#0f1419',
                borderTopColor: 'rgba(255,255,255,0.08)',
              },
              tabBarActiveTintColor: '#93c5fd',
              tabBarInactiveTintColor: '#6b7280',
            }}
          >
            <Tab.Screen
              name="Map"
              component={MapScreen}
              options={{
                tabBarLabel: 'Map',
                tabBarIcon: ({ color, size }) => <Ionicons name="map-outline" size={size} color={color} />,
              }}
            />
            <Tab.Screen
              name="Leaderboard"
              component={LeaderboardScreen}
              options={{
                tabBarLabel: 'Leaderboard',
                tabBarIcon: ({ color, size }) => <Ionicons name="podium-outline" size={size} color={color} />,
              }}
            />
          </Tab.Navigator>
        </NavigationContainer>
        <StatusBar style="light" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, backgroundColor: '#0f1419', justifyContent: 'center', padding: 24 },
  hint: { color: '#9aa5bf', textAlign: 'center', lineHeight: 22 },
  err: { color: '#fca5a5', textAlign: 'center', marginBottom: 8 },
});
