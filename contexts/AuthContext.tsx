import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
 
// 后端返回在 data 里的用户信息结构目前不固定，这里先用一个比较宽松的类型
export type User = {
    username?: string;
    token?: string;
    // 可以在这里按需补充字段，比如：id?: number; 等
    [key: string]: any;
};

type AuthContextType = {
    user: User | null;
    token: string | null;
    login: (user: User, token?: string) => void;
    logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = '@seefood_token';
const USER_KEY = '@seefood_user';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // 应用启动时从本地存储加载 token 和用户信息
    useEffect(() => {
        const loadStoredAuth = async () => {
            try {
                const [storedToken, storedUser] = await Promise.all([
                    AsyncStorage.getItem(TOKEN_KEY),
                    AsyncStorage.getItem(USER_KEY),
                ]);
                
                if (storedToken) {
                    setToken(storedToken);
                }
                
                if (storedUser) {
                    setUser(JSON.parse(storedUser));
                }
            } catch (error) {
                console.error('Failed to load stored auth:', error);
            } finally {
                setLoading(false);
            }
        };

        loadStoredAuth();
    }, []);

    const login = async (newUser: User, newToken?: string) => {
        try {
            // 如果提供了 token，使用提供的 token；否则尝试从 newUser 中获取
            const tokenToStore = newToken || newUser.token;
            
            if (tokenToStore) {
                setToken(tokenToStore);
                await AsyncStorage.setItem(TOKEN_KEY, tokenToStore);
            }
            
            setUser(newUser);
            await AsyncStorage.setItem(USER_KEY, JSON.stringify(newUser));
        } catch (error) {
            console.error('Failed to save auth data:', error);
        }
    };

    const logout = async () => {
        try {
            setUser(null);
            setToken(null);
            await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
        } catch (error) {
            console.error('Failed to clear auth data:', error);
        }
    };

    // 如果还在加载中，可以显示加载界面
    if (loading) {
        return null; // 或者返回一个加载组件
    }

    return (
        <AuthContext.Provider value={{ user, token, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};


