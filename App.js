import React from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator, BottomTabBar } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { PlayerProvider } from './src/PlayerContext';
import { colors } from './src/theme';
import HomeScreen from './src/screens/HomeScreen';
import SearchScreen from './src/screens/SearchScreen';
import LibraryScreen from './src/screens/LibraryScreen';
import MiniPlayer from './src/components/MiniPlayer';
import FullPlayer from './src/components/FullPlayer';

const Tab = createBottomTabNavigator();
const navTheme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: colors.bg, card: colors.bg, border: colors.line, primary: colors.accent },
};
const icons = { Khám_phá: 'compass', Tìm_kiếm: 'search', Thư_viện: 'heart' };

export default function App() {
  return (
    <SafeAreaProvider>
      <PlayerProvider>
        <StatusBar style="light" />
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
            <Tab.Screen name="Khám_phá" component={HomeScreen} options={{ title: 'Khám phá' }} />
            <Tab.Screen name="Tìm_kiếm" component={SearchScreen} options={{ title: 'Tìm kiếm' }} />
            <Tab.Screen name="Thư_viện" component={LibraryScreen} options={{ title: 'Thư viện' }} />
          </Tab.Navigator>
        </NavigationContainer>
        <FullPlayer />
      </PlayerProvider>
    </SafeAreaProvider>
  );
}
