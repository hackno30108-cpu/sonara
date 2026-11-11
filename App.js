import React, { useMemo } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator, BottomTabBar } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ThemeProvider, useTheme } from './src/theme';
import { PlayerProvider } from './src/PlayerContext';
import HomeScreen from './src/screens/HomeScreen';
import SearchScreen from './src/screens/SearchScreen';
import LibraryScreen from './src/screens/LibraryScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import MiniPlayer from './src/components/MiniPlayer';
import FullPlayer from './src/components/FullPlayer';
import AddToPlaylistModal from './src/components/AddToPlaylistModal';

const Tab = createBottomTabNavigator();
const icons = { Home: 'compass', Search: 'search', Library: 'library', Settings: 'settings' };

function Shell() {
  const { colors, mode } = useTheme();
  const navTheme = useMemo(() => {
    const base = mode === 'dark' ? DarkTheme : DefaultTheme;
    return { ...base, colors: { ...base.colors, background: colors.bg, card: colors.bg, border: colors.line, primary: colors.accent, text: colors.text } };
  }, [mode, colors]);
  return (
    <>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <NavigationContainer theme={navTheme}>
        <Tab.Navigator
          tabBar={(props) => (
            <View>
              <MiniPlayer />
              <BottomTabBar {...props} />
            </View>
          )}
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarActiveTintColor: colors.accent,
            tabBarInactiveTintColor: colors.muted,
            tabBarStyle: { backgroundColor: colors.bg, borderTopColor: colors.line },
            tabBarIcon: ({ color, size }) => <Ionicons name={icons[route.name]} size={size} color={color} />,
          })}
        >
          <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Khám phá' }} />
          <Tab.Screen name="Search" component={SearchScreen} options={{ title: 'Tìm kiếm' }} />
          <Tab.Screen name="Library" component={LibraryScreen} options={{ title: 'Thư viện' }} />
          <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: 'Cài đặt' }} />
        </Tab.Navigator>
      </NavigationContainer>
      <FullPlayer />
      <AddToPlaylistModal />
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <PlayerProvider>
          <Shell />
        </PlayerProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
