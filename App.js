import React, { useMemo } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator, BottomTabBar } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ThemeProvider, useTheme } from './src/theme';
import { PlayerProvider, usePlayer } from './src/PlayerContext';
import HomeScreen from './src/screens/HomeScreen';
import FeedScreen from './src/screens/FeedScreen';
import SearchScreen from './src/screens/SearchScreen';
import LibraryScreen from './src/screens/LibraryScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import MiniPlayer from './src/components/MiniPlayer';
import FullPlayer from './src/components/FullPlayer';
import AddToPlaylistModal from './src/components/AddToPlaylistModal';
import ArtistModal from './src/components/ArtistModal';

const Tab = createBottomTabNavigator();
const icons = { Home: 'compass', Feed: 'newspaper', Search: 'search', Library: 'library', Settings: 'settings' };

function Shell() {
  const { colors, mode, liquid } = useTheme();
  const { artist, playerOpen, current } = usePlayer();
  const navTheme = useMemo(() => {
    const base = mode === 'dark' ? DarkTheme : DefaultTheme;
    return { ...base, colors: { ...base.colors, background: liquid ? 'transparent' : colors.bg, card: liquid ? 'transparent' : colors.bg, border: colors.line, primary: colors.accent, text: colors.text } };
  }, [mode, colors, liquid]);
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {liquid && current?.artwork ? (
        <>
          <Image source={{ uri: current.artwork }} blurRadius={70} style={[StyleSheet.absoluteFill, { opacity: 0.32 }]} />
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.35)' }]} />
        </>
      ) : null}
      <StatusBar style={mode === 'light' ? 'dark' : 'light'} />
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
            tabBarStyle: { backgroundColor: liquid ? 'transparent' : colors.bg, borderTopColor: colors.line },
            tabBarBackground: liquid ? () => <BlurView tint="dark" intensity={60} style={StyleSheet.absoluteFill} /> : undefined,
            tabBarIcon: ({ color, size }) => <Ionicons name={icons[route.name]} size={size} color={color} />,
          })}
        >
          <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Khám phá' }} />
          <Tab.Screen name="Feed" component={FeedScreen} options={{ title: 'Bảng tin' }} />
          <Tab.Screen name="Search" component={SearchScreen} options={{ title: 'Tìm kiếm' }} />
          <Tab.Screen name="Library" component={LibraryScreen} options={{ title: 'Thư viện' }} />
          <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: 'Cài đặt' }} />
        </Tab.Navigator>
      </NavigationContainer>
      <FullPlayer />
      <ArtistModal />
      <AddToPlaylistModal enabled={!artist && !playerOpen} />
    </View>
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
