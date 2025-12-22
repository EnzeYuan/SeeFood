import axios from 'axios';
import { Image } from 'expo-image';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { API_BASE_URL } from '../../constants/api';
import { useAuth } from '../../contexts/AuthContext';

type LoginResponse = {
    token: any;
    code: number;
    message: string;
    data: any;
};

export default function Login() {
    const router = useRouter();
    const { login } = useAuth();
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [usernameError, setUsernameError] = useState('');
    const [passwordError, setPasswordError] = useState('');

    const validateUsername = (value: string): string => {
        if (value.length > 20) {
            return 'The username cannot exceed 20 characters.';
        }
        return '';
    };

    const validatePassword = (value: string): string => {
        if (!value) {
            return '';
        }
        const hasNumber = /\d/.test(value);
        const hasLetter = /[a-zA-Z]/.test(value);
        if (!hasNumber || !hasLetter) {
            return 'The password must contain both numbers and letters.';
        }
        return '';
    };

    const handleUsernameChange = (value: string) => {
        setUsername(value);
        setUsernameError(validateUsername(value));
    };

    const handlePasswordChange = (value: string) => {
        setPassword(value);
        setPasswordError(validatePassword(value));
    };

    const handleLogin = async () => {
        // 验证输入
        const usernameErr = validateUsername(username);
        const passwordErr = validatePassword(password);

        setUsernameError(usernameErr);
        setPasswordError(passwordErr);

        if (usernameErr || passwordErr || !username || !password) {
            if (!username || !password) {
                Alert.alert('Error', '请输入用户名和密码');
            }
            return;
        }

        setLoading(true);
        try {
            // 后端接口：POST /seefood/user/login
            // 后端期望的是 JSON body（@RequestBody），不能用 query 参数
            const { data } = await axios.post<LoginResponse>(
                `${API_BASE_URL}/seefood/user/login`,
                {
                    username,
                    password,
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                    },
                },
            );

            if (data.code === 200) {
                // 登录成功，将后端返回的 data 作为用户信息放到全局
                // 从后端返回的数据中提取 token（可能在 data.token 或 data.data.token）
                const token = data.data?.token || data.data?.accessToken || data.token;
                
                const userData = {
                    username,
                    ...data.data,
                };

                // 保存用户信息和 token
                login(userData, token);
                setLoading(false);
                router.replace('/tide' as any);
            } else {
                setLoading(false);
                Alert.alert('Login failed', data.message || 'Login failed. Please check your account or password.');
            }
        } catch (error: any) {
            setLoading(false);

            if (axios.isAxiosError(error)) {
                const backend = error.response?.data as Partial<LoginResponse> | undefined;
                const message = backend?.message || 'Login failed. Please try again later.';
                Alert.alert('Login failed', message);
            } else {
                Alert.alert('error', 'Login failed. Please try again.');
            }
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Image source={require('../../assets/images/login&sign/logo.png')} style={styles.logo} contentFit="contain" />
            </View>

            <Text style={styles.title}>SeeFood，Sea food</Text>

            <View style={styles.fieldGroup}>
                <Text style={styles.label}>Username</Text>
                <View style={styles.inputWrapperDark}>
                    <TextInput
                        placeholder="Enter Username"
                        placeholderTextColor="#B9C6E2"
                        keyboardType="default"
                        style={styles.inputDark}
                        value={username}
                        onChangeText={handleUsernameChange}
                        maxLength={20}
                    />
                </View>
                {usernameError ? (
                    <Text style={styles.errorText}>{usernameError}</Text>
                ) : null}
            </View>

            <View style={styles.fieldGroup}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.inputWrapperLight}>
                    <TextInput
                        placeholder="Password"
                        placeholderTextColor="#6C819E"
                        secureTextEntry={!passwordVisible}
                        style={styles.inputLight}
                        value={password}
                        onChangeText={handlePasswordChange}
                    />
                    <Pressable onPress={() => setPasswordVisible(v => !v)} style={styles.eyeBtn}>
                        <Image
                            source={passwordVisible
                                ? require('../../assets/images/login&sign/eye_open.png')
                                : require('../../assets/images/login&sign/eye_close.png')}
                            style={styles.eyeIcon}
                            contentFit="contain"
                            tintColor={Navy}
                        />
                    </Pressable>
                </View>
                {passwordError ? (
                    <Text style={styles.errorText}>{passwordError}</Text>
                ) : null}
            </View>

            <Pressable 
                style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
                onPress={handleLogin}
                disabled={loading}
            >
                <Text style={styles.primaryButtonText}>
                    {loading ? 'Logging in...' : 'Log In'}
                </Text>
            </Pressable>

            <Text style={styles.linkMuted}>Forgot Password?</Text>

            <View style={styles.bottomRow}>
                <Text style={styles.textMuted}>Don't have account? </Text>
                <Link href="/log&sign/signup" style={styles.linkText}>Sign Up</Link>
            </View>
        </View>
    );
}

const BG = '#9EC8DF';
const Navy = '#0E2048';
const Peach = '#F8B98B';

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: BG,
        paddingHorizontal: 24,
        paddingTop: 72,
    },
    header: {
        alignItems: 'center',
        marginBottom: 24,
    },
    logo: {
        width: 96,
        height: 96,
    },
    title: {
        textAlign: 'center',
        color: Navy,
        fontSize: 24,
        fontWeight: '600',
        marginBottom: 24,
    },
    fieldGroup: {
        marginBottom: 16,
    },
    label: {
        color: Navy,
        marginBottom: 8,
    },
    inputWrapperDark: {
        backgroundColor: Navy,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    inputDark: {
        color: 'white',
    },
    inputWrapperLight: {
        backgroundColor: '#B9D5E8',
        borderRadius: 12,
        paddingLeft: 16,
        paddingRight: 44,
        paddingVertical: 14,
    },
    inputLight: {
        color: Navy,
    },
    eyeBtn: {
        position: 'absolute',
        right: 12,
        top: 20,
        height: 28,
        width: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    eyeIcon: {
        width: 22,
        height: 22,
    },
    primaryButton: {
        marginTop: 16,
        backgroundColor: Peach,
        borderRadius: 22,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryButtonText: {
        color: Navy,
        fontWeight: '600',
    },
    linkMuted: {
        color: Navy,
        opacity: 0.7,
        textAlign: 'center',
        marginTop: 10,
    },
    bottomRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 24,
    },
    textMuted: {
        color: Navy,
        opacity: 0.8,
    },
    linkText: {
        color: Navy,
        textDecorationLine: 'underline',
        fontWeight: '600',
    },
    primaryButtonDisabled: {
        opacity: 0.6,
    },
    errorText: {
        color: '#CC4E17',
        fontSize: 12,
        marginTop: 4,
        marginLeft: 4,
    },
});