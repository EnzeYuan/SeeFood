import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
    return (
        <>
            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="log&sign" />
                <Stack.Screen name="tide" />
                <Stack.Screen name="catch" />
                <Stack.Screen name="kitchen" />
            </Stack>
            <StatusBar style="auto" />
        </>
    );
}

