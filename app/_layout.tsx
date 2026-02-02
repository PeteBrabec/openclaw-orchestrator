import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCredentialsStore } from '../src/store/credentials';

export default function RootLayout() {
  const loadCredentials = useCredentialsStore((state) => state.loadCredentials);
  
  useEffect(() => {
    loadCredentials();
  }, []);
  
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: '#000',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          contentStyle: {
            backgroundColor: '#111',
          },
        }}
      >
        <Stack.Screen 
          name="index" 
          options={{ 
            title: 'Hedz',
            headerShown: true,
          }} 
        />
        <Stack.Screen 
          name="settings" 
          options={{ 
            title: 'Settings',
            presentation: 'modal',
          }} 
        />
        <Stack.Screen 
          name="spawn" 
          options={{ 
            title: 'Spawn Agent',
            presentation: 'modal',
          }} 
        />
        <Stack.Screen 
          name="agent/[id]" 
          options={{ 
            title: 'Agent Details',
          }} 
        />
      </Stack>
    </>
  );
}
