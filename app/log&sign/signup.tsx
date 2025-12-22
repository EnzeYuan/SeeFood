import axios from 'axios';
import { Image } from 'expo-image';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { API_BASE_URL } from '../../constants/api';
import { useAuth } from '../../contexts/AuthContext';

// ✅ 修复1：类型定义与后端保持一致
type RegisterResponse = {
    token: any;
    code: number;      // 原来是 status
    message: string;   // 原来是 msg
    data: any;
};

export default function SignUp() {
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

    const handleSignUp = async () => {
        // 验证输入
        const usernameErr = validateUsername(username);
        const passwordErr = validatePassword(password);

        setUsernameError(usernameErr);
        setPasswordError(passwordErr);

        if (usernameErr || passwordErr || !username || !password) {
            if (!username || !password) {
                Alert.alert('Error', 'Please enter username and password');
            }
            return;
        }

        setLoading(true);
        try {
            const { data } = await axios.post<RegisterResponse>(
                `${API_BASE_URL}/seefood/user/register`,
                {
                    username,
                    password,
                    brief: '',
                    avatar: '',
                    money: '0',
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                    },
                }
            );

            // ✅ 修复2：使用正确的字段名
            if (data.code === 200) {  // 原来是 data.status
                // 从后端返回的数据中提取 token（可能在 data.token 或 data.data.token）
                const token = data.data?.token || data.data?.accessToken || data.token;
                
                const userData = {
                    username,
                    ...data.data,
                };

                // 保存用户信息和 token
                login(userData, token);
                router.replace('/tide' as any);
            } else {
                Alert.alert('Sign up failed', data.message || 'Registration failed'); // ✅ 修复3：使用 message
            }
        } catch (error: any) {
            // ✅ 修复4：错误处理也使用 message
            if (axios.isAxiosError(error)) {
                const backend = error.response?.data as Partial<RegisterResponse> | undefined;
                const message = backend?.message || 'Sign up failed. Please try again later.';
                Alert.alert('Sign up failed', message);
            } else {
                Alert.alert('Error', 'Sign up failed. Please try again.');
            }
        } finally {
            setLoading(false); // ✅ 优化：确保loading总会被关闭
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
                onPress={handleSignUp}
                disabled={loading}
            >
                <Text style={styles.primaryButtonText}>
                    {loading ? 'Signing up...' : 'Sign Up'}
                </Text>
            </Pressable>

            <View style={styles.orRow}>
                <View style={styles.rule} />
                <Text style={styles.orText}>Or</Text>
                <View style={styles.rule} />
            </View>

            <View style={styles.oauthRow}>
                <View style={styles.oauthButton}>
                    <Image source={require('../../assets/images/login&sign/wechat.png')} style={styles.oauthIcon} />
                    <Text style={styles.oauthText}>WeChat</Text>
                </View>
                <View style={styles.oauthButton}>
                    <Image source={require('../../assets/images/login&sign/email.png')} style={styles.oauthIcon} />
                    <Text style={styles.oauthText}>Email</Text>
                </View>
            </View>

            <View style={styles.bottomRow}>
                <Text style={styles.textMuted}>Already have an account? </Text>
                <Link href="/log&sign/login" style={styles.linkText}>Log In</Link>
            </View>

            <Text style={styles.footerText}>By creating an account, you agree to our Terms & Conditions and Privacy Policy.</Text>
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
    orRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginTop: 20,
    },
    rule: {
        height: 1,
        backgroundColor: '#5E7BA0',
        flex: 1,
    },
    orText: {
        color: '#5E7BA0',
    },
    oauthRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 16,
    },
    oauthButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 14,
        paddingHorizontal: 14,
        height: 40,
        width: '48%'
    },
    oauthIcon: {
        width: 20,
        height: 20,
        marginRight: 8,
    },
    oauthText: {
        color: Navy,
        fontWeight: '600',
    },
    bottomRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 20,
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
    footerText: {
        color: Navy,
        opacity: 0.8,
        textAlign: 'center',
        fontSize: 12,
        marginTop: 16,
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