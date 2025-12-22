import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { setAuthToken } from '../utils/apiClient';

// 导入以初始化 axios 拦截器
import '../utils/apiClient';

// 内部组件：用于同步 token 到 axios 拦截器
function AuthSync() {
    const { token } = useAuth();
    
    useEffect(() => {
        // 当 token 变化时，同步到 axios 拦截器
        setAuthToken(token);
    }, [token]);
    
    return null;
}

export default function RootLayout() {
    return (
        <AuthProvider>
            <AuthSync />
            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="log&sign" />
                <Stack.Screen name="tide" />
                <Stack.Screen name="catch" />
                <Stack.Screen name="kitchen" />
            </Stack>
            <StatusBar style="auto" />
        </AuthProvider>
    );
}

