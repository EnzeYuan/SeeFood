import { Image } from 'expo-image';
import { usePathname, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface NavItem {
    name: string;
    label: string;
    icon: any;
    route: string;
}

const navItems: NavItem[] = [
    { name: 'tides', label: 'Tides', icon: require('../assets/images/tide/tideB.png'), route: '/tide' },
    { name: 'catch', label: 'Catch', icon: require('../assets/images/tide/catchB.png'), route: '/catch' },
    { name: 'kitchen', label: 'Kitchen', icon: require('../assets/images/tide/kitchenB.png'), route: '/kitchen' },
];

export default function BottomNav() {
    const router = useRouter();
    const pathname = usePathname();

    const isActive = (route: string) => {
        return pathname.startsWith(route);
    };

    return (
        <View style={styles.container}>
            {navItems.map((item) => {
                const active = isActive(item.route);
                return (
                    <Pressable
                        key={item.name}
                        style={styles.navItem}
                        onPress={() => router.push(item.route as any)}
                    >
                        <Image
                            source={item.icon}
                            style={[styles.icon, active && styles.iconActive]}
                            contentFit="contain"
                            tintColor={active ? '#F8B98B' : '#0E2048'}
                        />
                        <Text style={[styles.label, active && styles.labelActive]}>
                            {item.label}
                        </Text>
                    </Pressable>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        left: 16,
        right: 16,
        bottom: 20,
        flexDirection: 'row',
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        borderRadius: 20,
        paddingVertical: 12,
        paddingHorizontal: 20,
        justifyContent: 'space-around',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    navItem: {
        alignItems: 'center',
        gap: 4,
    },
    icon: {
        width: 28,
        height: 28,
    },
    iconActive: {
        tintColor: '#F8B98B',
    },
    label: {
        fontSize: 12,
        color: '#0E2048',
        fontWeight: '500',
    },
    labelActive: {
        color: '#F8B98B',
        fontWeight: '600',
    },
});

