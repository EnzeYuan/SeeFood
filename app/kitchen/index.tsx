import BottomNav from '@/components/bottom-nav';
import { API_BASE_URL } from '@/constants/api';
import { useAuth } from '@/contexts/AuthContext';
import { BEHAVIOR_WEIGHT, logUserBehavior } from '@/utils/userBehavior';
import { useFocusEffect } from '@react-navigation/native';
import axios from 'axios';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface SeafoodItem {
    id: string;
    name: string;
    image?: number | { uri: string };
    tags?: string;
}

interface CartItem {
    id: string;
    kind: 'seafood' | 'ingredient';
    name: string;
    image?: number | { uri: string } | string;
    quantity: number;
    price: number;
    unit: string;
    cartId?: number;
    iCartId?: number | null;
    ingredientId?: number;
    seafoodId?: number;
}

interface OrderItem {
    id: string;
    name: string;
    image?: number | { uri: string } | string;
    quantity: number;
    price: number;
    unit: string;
}

// API 响应接口
interface SeafoodApiItem {
    seafoodId?: number;
    seafoodName?: string;
    seafoodBrief?: string;
    seafoodImage?: string;
    views?: number;
    tags?: string;
    cost?: string;
}

interface CartApiItem {
    cartId?: number;
    userId?: string;
    seafoodId?: number;
    count?: number;
    payed?: boolean;
    price?: string;
}

interface LikeResponse {
    code: number;
    message: string;
    data?: SeafoodApiItem[];
}

interface CartResponse {
    code: number;
    message: string;
    data?: CartApiItem[];
}

interface OrderResponse {
    code: number;
    message: string;
    data?: CartApiItem[];
}

interface IngredientPO {
    ingredientId?: number;
    ingredientName?: string;
    ingredientPrice?: number;
    ingredientPic?: string;
}

interface ICartDTO {
    icartId?: number;
    ingredient?: IngredientPO;
    count?: number;
    price?: number;
    orderTime?: string;
}

interface IngredientCartResponse {
    code: number;
    message: string;
    data?: ICartDTO[];
}

interface OrderListResponse<T> {
    code: number;
    message: string;
    data?: T[];
}

interface ItemDetailResponse {
    code: number;
    message: string;
    data?: {
        itemId?: number;
        itemName?: string;
        seafood?: {
            seafoodId?: number;
            seafoodName?: string;
            seafoodImage?: string;
            seafoodBrief?: string;
            tags?: string;
            cost?: string;
            views?: number;
        };
        seafoodPO?: {
            seafoodId?: number;
            seafoodName?: string;
            seafoodImage?: string;
            seafoodBrief?: string;
            tags?: string;
            cost?: string;
            views?: number;
        };
        recipePos?: any[];
        recipePOs?: any[];
    };
}

export default function KitchenScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user } = useAuth();
    const userName = user?.username ?? 'Guest';
    
    const [seafoodExpanded, setSeafoodExpanded] = useState(false);
    const [seafoodCartExpanded, setSeafoodCartExpanded] = useState(false);
    const [ingredientCartExpanded, setIngredientCartExpanded] = useState(false);
    const [orderExpanded, setOrderExpanded] = useState(false);
    const [selectedCartItems, setSelectedCartItems] = useState<Set<string>>(new Set());
    const [seafoodItems, setSeafoodItems] = useState<SeafoodItem[]>([]);
    const [seafoodCartItems, setSeafoodCartItems] = useState<CartItem[]>([]);
    const [ingredientCartItems, setIngredientCartItems] = useState<CartItem[]>([]);
    const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [quantityInputs, setQuantityInputs] = useState<Record<string, string>>({});
    const [focusedInputs, setFocusedInputs] = useState<Set<string>>(new Set());

    const defaultFishImage = require('../../assets/images/kitchen/defaultFish.png');
    const defaultVegImage = require('../../assets/images/kitchen/defaultVeg.png');

    // Helper function to get emoji based on tags
    const getSeafoodEmoji = (tags: string | undefined): string => {
        if (!tags) return '🐟';
        
        const tagList = tags.split(',').map(tag => tag.trim().toUpperCase());
        const firstTag = tagList[0];
        
        switch (firstTag) {
            case 'FISH':
                return '🐟';
            case 'CRUSTACEN':
                return '🦀';
            case 'MOLLUSK':
                return '🐙';
            case 'SHELLFISH':
                return '🦪';
            default:
                return '🐟';
        }
    };

    // 获取海鲜详情（包含图片）
    const getSeafoodDetail = async (seafoodId: number): Promise<{ name: string; image: any; tags?: string }> => {
        try {
            const { data } = await axios.get<ItemDetailResponse>(
                `${API_BASE_URL}/seefood/item/detail/${seafoodId}`,
                { headers: { Accept: 'application/json' } }
            );
            
            if ((data.code === 0 || data.code === 200) && data.data) {
                const seafood = data.data.seafood || data.data.seafoodPO;
                const name = seafood?.seafoodName || `Item ${seafoodId}`;
                const tags = seafood?.tags;
                
                // 处理图片
                let image: any = defaultFishImage;
                const seafoodImage = seafood?.seafoodImage;
                if (seafoodImage) {
                    if (seafoodImage.startsWith('data:image') || seafoodImage.startsWith('http')) {
                        image = { uri: seafoodImage };
                    } else if (seafoodImage.trim().length > 0) {
                        // 可能是 base64 字符串
                        image = { uri: `data:image/png;base64,${seafoodImage}` };
                    }
                }
                
                return { name, image, tags };
            }
        } catch (err) {
            console.error(`Failed to fetch seafood detail for ${seafoodId}:`, err);
        }
        
        return { 
            name: `Item ${seafoodId}`, 
            image: defaultFishImage 
        };
    };

    // 获取收藏夹数据
    const fetchLikeData = async (): Promise<SeafoodItem[]> => {
        try {
            const { data } = await axios.get<LikeResponse>(
                `${API_BASE_URL}/seefood/user/getLike`,
                { headers: { Accept: 'application/json' } }
            );

            if ((data.code === 0 || data.code === 200) && data.data) {
                return data.data.map((item) => ({
                    id: String(item.seafoodId ?? ''),
                    name: item.seafoodName ?? 'Unknown Seafood',
                    image: item.seafoodImage ? { uri: item.seafoodImage } : defaultFishImage,
                    tags: item.tags,
                }));
            }
            return [];
        } catch (err) {
            console.error('Failed to fetch like data:', err);
            return [];
        }
    };

    // 获取购物车数据 - 使用详情接口获取图片
    const fetchCartData = async (): Promise<CartItem[]> => {
        try {
            const { data } = await axios.get<CartResponse>(
                `${API_BASE_URL}/seefood/purchase/getcart`,
                { headers: { Accept: 'application/json' } }
            );

            if ((data.code === 0 || data.code === 200) && data.data) {
                const unpaidItems = data.data.filter((item) => !item.payed);
                
                const itemsWithDetails = await Promise.all(
                    unpaidItems.map(async (item, idx) => {
                        const seafoodId = item.seafoodId;
                        
                        if (seafoodId) {
                            // 获取详细的名称、图片和标签
                            const { name, image, tags } = await getSeafoodDetail(seafoodId);
                            const uniqueKey = item.cartId ?? seafoodId ?? idx;
                            
                            return {
                                id: `seafood_${uniqueKey}`,
                                kind: 'seafood' as const,
                                name,
                                image, // 使用从详情接口获取的图片
                                quantity: item.count ?? 1,
                                price: parseFloat(item.price ?? '0'),
                                unit: '/lb',
                                cartId: item.cartId ?? seafoodId ?? uniqueKey,
                                iCartId: null,
                                ingredientId: undefined,
                                seafoodId,
                            };
                        } else {
                            // 如果没有 seafoodId，使用默认值
                            const uniqueKey = item.cartId ?? idx;
                            return {
                                id: `seafood_${uniqueKey}`,
                                kind: 'seafood' as const,
                                name: `Item ${uniqueKey}`,
                                image: defaultFishImage,
                                quantity: item.count ?? 1,
                                price: parseFloat(item.price ?? '0'),
                                unit: '/lb',
                                cartId: item.cartId ?? uniqueKey,
                                iCartId: null,
                                ingredientId: undefined,
                                seafoodId: undefined,
                            };
                        }
                    })
                );
                return itemsWithDetails;
            }
            return [];
        } catch (err) {
            console.error('Failed to fetch cart data:', err);
            return [];
        }
    };

    // 获取海鲜订单数据 - 使用详情接口获取图片
    const fetchSeafoodOrderData = async (): Promise<OrderItem[]> => {
        try {
            const { data } = await axios.get<OrderListResponse<CartApiItem>>(
                `${API_BASE_URL}/seefood/purchase/getorder`,
                { headers: { Accept: 'application/json' } }
            );

            if ((data.code === 0 || data.code === 200) && data.data) {
                const itemsWithDetails = await Promise.all(
                    data.data.map(async (item) => {
                        const seafoodId = item.seafoodId;
                        
                        if (seafoodId) {
                            const { name, image } = await getSeafoodDetail(seafoodId);
                            
                            return {
                                id: `order_seafood_${item.cartId ?? seafoodId}`,
                                name,
                                image,
                                quantity: item.count ?? 1,
                                price: parseFloat(item.price ?? '0'),
                                unit: '/lb',
                            };
                        } else {
                            return {
                                id: `order_seafood_${item.cartId ?? ''}`,
                                name: `Item ${item.cartId ?? ''}`,
                                image: defaultFishImage,
                                quantity: item.count ?? 1,
                                price: parseFloat(item.price ?? '0'),
                                unit: '/lb',
                            };
                        }
                    })
                );
                return itemsWithDetails;
            }
            return [];
        } catch (err) {
            console.error('Failed to fetch seafood order data:', err);
            return [];
        }
    };

    // 获取食材订单数据
    const fetchIngredientOrderData = async (): Promise<OrderItem[]> => {
        try {
            const { data } = await axios.get<OrderListResponse<ICartDTO>>(
                `${API_BASE_URL}/seefood/purchase/getingredientorder`,
                { headers: { Accept: 'application/json' } }
            );

            if ((data.code === 0 || data.code === 200) && data.data) {
                return data.data.map((item) => {
                    const ingredient = item.ingredient;
                    const image = ingredient?.ingredientPic || '🥗';
                    return {
                        id: `order_ingredient_${item.icartId ?? ingredient?.ingredientId ?? ''}`,
                        name: ingredient?.ingredientName ?? 'Unknown Ingredient',
                        image,
                        quantity: item.count ?? 1,
                        price: item.price ?? 0,
                        unit: '/lb',
                    };
                });
            }
            return [];
        } catch (err) {
            console.error('Failed to fetch ingredient order data:', err);
            return [];
        }
    };

    // 获取食材购物车数据
    const fetchIngredientCartData = async (): Promise<CartItem[]> => {
        try {
            const { data } = await axios.get<IngredientCartResponse>(
                `${API_BASE_URL}/seefood/purchase/getingredientcart`,
                { headers: { Accept: 'application/json' } }
            );

            console.log('Ingredient cart API response:', JSON.stringify(data, null, 2));

            if ((data.code === 0 || data.code === 200) && data.data) {
                return data.data.map((item) => {
                    const ingredient = item.ingredient;
                    const validICartId = (item.icartId && item.icartId > 0) ? item.icartId : null;
                    const uniqueId = validICartId 
                        ? `ingredient_${validICartId}` 
                        : `ingredient_${ingredient?.ingredientId || Date.now()}`;

                    console.log(`处理食材项: 
                        原始iCartId=${item.icartId}, 
                        有效iCartId=${validICartId}, 
                        ingredientId=${ingredient?.ingredientId}, 
                        名称=${ingredient?.ingredientName}`);

                    return {
                        id: uniqueId,
                        kind: 'ingredient' as const,
                        name: ingredient?.ingredientName ?? 'Unknown Ingredient',
                        image: ingredient?.ingredientPic || '🥗',
                        quantity: item.count ?? 1,
                        price: item.price ?? 0,
                        unit: '/lb',
                        iCartId: validICartId,
                        ingredientId: ingredient?.ingredientId,
                    };
                });
            }
            return [];
        } catch (err) {
            console.error('Failed to fetch ingredient cart data:', err);
            Alert.alert('Error', 'Failed to load ingredient cart data');
            return [];
        }
    };

    // 获取所有数据
    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [likeData, cartData, ingredientCartData, seafoodOrders, ingredientOrders] = await Promise.all([
                fetchLikeData(),
                fetchCartData(),
                fetchIngredientCartData(),
                fetchSeafoodOrderData(),
                fetchIngredientOrderData(),
            ]);
            setSeafoodItems(likeData);
            setSeafoodCartItems(cartData);
            setIngredientCartItems(ingredientCartData);
            setOrderItems([...seafoodOrders, ...ingredientOrders]);
        } catch (err) {
            console.error('Failed to fetch data:', err);
            setError('Failed to load data. Please try again.');
        } finally {
            setLoading(false);
        }
    }, []);

    // 页面获得焦点时刷新数据
    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [fetchData])
    );

    const displayedSeafoodItems = seafoodExpanded ? seafoodItems : seafoodItems.slice(0, 2);
    const displayedSeafoodCartItems = seafoodCartExpanded ? seafoodCartItems : seafoodCartItems.slice(0, 2);
    const displayedIngredientCartItems = ingredientCartExpanded ? ingredientCartItems : ingredientCartItems.slice(0, 2);
    const displayedOrderItems = orderExpanded ? orderItems : orderItems.slice(0, 2);

    const seafoodTotalPrice = useMemo(() => {
        return seafoodCartItems.reduce((sum, item) => {
            return selectedCartItems.has(item.id) ? sum + item.price * item.quantity : sum;
        }, 0);
    }, [seafoodCartItems, selectedCartItems]);

    const ingredientTotalPrice = useMemo(() => {
        return ingredientCartItems.reduce((sum, item) => {
            return selectedCartItems.has(item.id) ? sum + item.price * item.quantity : sum;
        }, 0);
    }, [ingredientCartItems, selectedCartItems]);

    const handleSeafoodClick = (item: SeafoodItem) => {
        router.push(`/tide/detail?id=${item.id}` as any);
    };

    const toggleSelectAllSeafood = () => {
        const seafoodIds = seafoodCartItems.map((item) => item.id);
        const allSelected = seafoodIds.every((id) => selectedCartItems.has(id));
        if (allSelected) {
            const newSelected = new Set(selectedCartItems);
            seafoodIds.forEach((id) => newSelected.delete(id));
            setSelectedCartItems(newSelected);
        } else {
            const newSelected = new Set(selectedCartItems);
            seafoodIds.forEach((id) => newSelected.add(id));
            setSelectedCartItems(newSelected);
        }
    };

    const toggleSelectAllIngredients = () => {
        const ingredientIds = ingredientCartItems.map((item) => item.id);
        const allSelected = ingredientIds.every((id) => selectedCartItems.has(id));
        if (allSelected) {
            const newSelected = new Set(selectedCartItems);
            ingredientIds.forEach((id) => newSelected.delete(id));
            setSelectedCartItems(newSelected);
        } else {
            const newSelected = new Set(selectedCartItems);
            ingredientIds.forEach((id) => newSelected.add(id));
            setSelectedCartItems(newSelected);
        }
    };

    const toggleCartItem = (itemId: string) => {
        const newSelected = new Set(selectedCartItems);
        if (newSelected.has(itemId)) {
            newSelected.delete(itemId);
        } else {
            newSelected.add(itemId);
        }
        setSelectedCartItems(newSelected);
    };

    const handleQuantityChange = (itemId: string, value: string) => {
        setQuantityInputs((prev) => ({ ...prev, [itemId]: value }));
    };

    const setInputFocus = (itemId: string, focused: boolean) => {
        setFocusedInputs((prev) => {
            const next = new Set(prev);
            if (focused) {
                next.add(itemId);
            } else {
                next.delete(itemId);
            }
            return next;
        });
    };

    // 修正数量更新逻辑
    // 修正数量更新逻辑
const handleQuantityBlur = async (item: CartItem) => {
    const rawValue = quantityInputs[item.id];
    const parsed = parseInt(rawValue ?? '', 10);
    
    // 先检查解析是否有效
    if (Number.isNaN(parsed) || parsed < 0) {
        // 无效输入，恢复原始值
        setQuantityInputs((prev) => ({ ...prev, [item.id]: String(item.quantity) }));
        return;
    }
    
    // 如果数量为0，显示确认弹窗
    if (parsed === 0) {
        Alert.alert(
            'Confirm Delete',
            `Are you sure you want to remove "${item.name}" from your cart?`,
            [
                {
                    text: 'No',
                    style: 'cancel',
                    onPress: () => {
                        setQuantityInputs((prev) => ({ ...prev, [item.id]: String(item.quantity) }));
                    }
                },
                {
                    text: 'Yes',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            if (item.kind === 'ingredient' && item.iCartId && item.iCartId > 0) {
                                await axios.put(
                                    `${API_BASE_URL}/seefood/purchase/update/${item.iCartId}/0`,
                                    null,
                                    { headers: { Accept: 'application/json' } }
                                );
                                setIngredientCartItems((prev) => prev.filter(it => it.id !== item.id));
                            } else if (item.kind === 'seafood' && item.cartId && item.cartId > 0) {
                                await axios.put(
                                    `${API_BASE_URL}/seefood/purchase/updatecart/${item.cartId}/0`,
                                    null,
                                    { headers: { Accept: 'application/json' } }
                                );
                                setSeafoodCartItems((prev) => prev.filter(it => it.id !== item.id));
                            }
                            
                            setSelectedCartItems((prev) => {
                                const next = new Set(prev);
                                next.delete(item.id);
                                return next;
                            });
                            
                            setQuantityInputs((prev) => {
                                const next = { ...prev };
                                delete next[item.id];
                                return next;
                            });
                            setFocusedInputs((prev) => {
                                const next = new Set(prev);
                                next.delete(item.id);
                                return next;
                            });
                        } catch (err) {
                            console.error('Failed to remove item:', err);
                            Alert.alert('Error', 'Failed to remove item from cart');
                            setQuantityInputs((prev) => ({ ...prev, [item.id]: String(item.quantity) }));
                        }
                    }
                }
            ]
        );
        return; // 重要：提前返回，不执行后续逻辑
    }

    // 正常更新逻辑
    const newCount = parsed;
    try {
        if (item.kind === 'ingredient' && item.iCartId && item.iCartId > 0) {
            await axios.put(
                `${API_BASE_URL}/seefood/purchase/update/${item.iCartId}/${newCount}`,
                null,
                { headers: { Accept: 'application/json' } }
            );
            setIngredientCartItems((prev) =>
                prev.map((it) => (it.id === item.id ? { ...it, quantity: newCount } : it))
            );
            setQuantityInputs((prev) => ({ ...prev, [item.id]: String(newCount) }));
        } else if (item.kind === 'seafood' && item.cartId && item.cartId > 0) {
            await axios.put(
                `${API_BASE_URL}/seefood/purchase/updatecart/${item.cartId}/${newCount}`,
                null,
                { headers: { Accept: 'application/json' } }
            );
            setSeafoodCartItems((prev) =>
                prev.map((it) => (it.id === item.id ? { ...it, quantity: newCount } : it))
            );
            setQuantityInputs((prev) => ({ ...prev, [item.id]: String(newCount) }));
        } else {
            console.error('Invalid item for update:', item);
            Alert.alert('Error', `Cannot update: Invalid ID for ${item.name}`);
            setQuantityInputs((prev) => ({ ...prev, [item.id]: String(item.quantity) }));
        }
    } catch (err) {
        console.error('Failed to update quantity:', err);
        
        let errorMessage = 'Failed to update quantity, please try again';
        if (axios.isAxiosError(err)) {
            errorMessage = err.response?.data?.message || err.message || errorMessage;
        }
        
        Alert.alert('Error', errorMessage);
        setQuantityInputs((prev) => ({ ...prev, [item.id]: String(item.quantity) }));
    }
};

    // 海鲜支付逻辑
    const handleSeafoodPayment = async () => {
        const selectedSeafood = seafoodCartItems.filter((item) => selectedCartItems.has(item.id));
        if (selectedSeafood.length === 0) {
            Alert.alert('Error', 'Please select seafood items to pay');
            return;
        }

        const totalAmount = selectedSeafood.reduce((sum, item) => sum + item.price * item.quantity, 0);

        Alert.alert(
            'Confirm Payment',
            `Are you sure you want to pay for the selected seafood items?\nTotal: $${totalAmount.toFixed(2)}`,
            [
                {
                    text: 'No',
                    style: 'cancel'
                },
                {
                    text: 'Yes',
                    onPress: async () => {
                        const cartIds = selectedSeafood.map((item) => item.cartId).filter((id): id is number => id !== undefined && id > 0);
                        if (cartIds.length === 0) {
                            Alert.alert('Error', 'Selected seafood items missing valid cartId, please refresh');
                            return;
                        }

                        try {
                            setLoading(true);
                            const { data } = await axios.post(
                                `${API_BASE_URL}/seefood/purchase/gotopaycart`,
                                cartIds,
                                {
                                    transformRequest: [(d) => JSON.stringify(d)],
                                    headers: {
                                        'Content-Type': 'application/json',
                                        Accept: 'application/json',
                                    },
                                }
                            );

                            const payResult = data?.data;
                            if (payResult === 0) {
                                Alert.alert('Payment Failed', 'Insufficient balance or payment error');
                                return;
                            }
                            if (payResult === 1) {
                                const remaining = new Set(selectedCartItems);
                                cartIds.forEach((id) => {
                                    const item = seafoodCartItems.find((it) => it.cartId === id);
                                    if (item) remaining.delete(item.id);
                                });
                                setSelectedCartItems(remaining);
                                await Promise.all(
                                    selectedSeafood.map((item) =>
                                        logUserBehavior(item.seafoodId, BEHAVIOR_WEIGHT.order)
                                    )
                                );
                                await fetchData();
                                Alert.alert('Success', 'Payment completed successfully!');
                                return;
                            }
                            Alert.alert('Error', data?.message || `Unknown payment result: ${payResult}`);
                        } catch (err) {
                            console.error('Seafood payment failed:', err);
                            
                            let errorMessage = 'Payment failed, please try again';
                            if (axios.isAxiosError(err)) {
                                errorMessage = err.response?.data?.message || err.message || errorMessage;
                            }
                            
                            Alert.alert('Error', errorMessage);
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    // 食材支付逻辑
    const handleIngredientPayment = async () => {
        const selectedIngredients = ingredientCartItems.filter((item) => selectedCartItems.has(item.id));
        
        if (selectedIngredients.length === 0) {
            Alert.alert('Error', 'Please select ingredient items to pay');
            return;
        }

        const totalAmount = selectedIngredients.reduce((sum, item) => sum + item.price * item.quantity, 0);

        Alert.alert(
            'Confirm Payment',
            `Are you sure you want to pay for the selected ingredient items?\nTotal: $${totalAmount.toFixed(2)}`,
            [
                {
                    text: 'No',
                    style: 'cancel'
                },
                {
                    text: 'Yes',
                    onPress: async () => {
                        const validICartIds = selectedIngredients
                            .map(item => item.iCartId)
                            .filter((id): id is number => id !== null && id !== undefined && id > 0);

                        if (validICartIds.length === 0) {
                            Alert.alert('Error', 'No valid iCartId found for selected items.\nPlease refresh the cart and try again.');
                            return;
                        }

                        if (validICartIds.length < selectedIngredients.length) {
                            Alert.alert('Warning', `${selectedIngredients.length - validICartIds.length} items cannot be paid (invalid iCartId).\nOnly ${validICartIds.length} items will be processed.`);
                        }

                        try {
                            setLoading(true);
                            
                            const { data } = await axios.post(
                                `${API_BASE_URL}/seefood/purchase/gotopayicart`,
                                validICartIds,
                                {
                                    transformRequest: [(d) => JSON.stringify(d)],
                                    headers: {
                                        'Content-Type': 'application/json',
                                        Accept: 'application/json',
                                    },
                                }
                            );

                            const payResult = data?.data;
                            if (payResult === 0) {
                                Alert.alert('Payment Failed', 'Insufficient balance or payment error');
                                return;
                            }
                            
                            if (payResult === 1) {
                                const remaining = new Set(selectedCartItems);
                                selectedIngredients.forEach((item) => remaining.delete(item.id));
                                setSelectedCartItems(remaining);
                                
                                await fetchData();
                                
                                Alert.alert('Success', 'Payment completed successfully!');
                                return;
                            }
                            
                            Alert.alert('Error', data?.message || `Unknown payment result: ${payResult}`);
                        } catch (err) {
                            console.error('Ingredient payment failed:', err);
                            
                            let errorMessage = 'Payment failed, please try again';
                            if (axios.isAxiosError(err)) {
                                errorMessage = err.response?.data?.message || err.message || errorMessage;
                            }
                            
                            Alert.alert('Error', errorMessage);
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const renderCartGrid = (
        items: CartItem[],
        expanded: boolean,
        toggleExpanded: () => void,
        title: string,
        onSelectAll: () => void,
        totalPrice: number,
        onPayment: () => void
    ) => {
        const displayed = expanded ? items : items.slice(0, 2);
        return (
            <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                    <View style={styles.sectionHeader}>
                        <Image
                            source={require('../../assets/images/kitchen/cart.png')}
                            style={styles.sectionIcon}
                            contentFit="contain"
                        />
                        <Text style={styles.sectionTitle}>{title}</Text>
                    </View>
                    <Pressable onPress={onSelectAll}>
                        <Text style={styles.selectAllText}>Select All</Text>
                    </Pressable>
                </View>
                <View style={styles.cartContainer}>
                    {loading && items.length === 0 ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="small" color="#F28F64" />
                            <Text style={styles.loadingText}>Loading...</Text>
                        </View>
                    ) : displayed.length === 0 ? (
                        <Text style={styles.emptyText}>No items in cart</Text>
                    ) : (
                        <>
                            <View style={styles.cartItemsGrid}>
                                {displayed.map((item) => {
                                    const selected = selectedCartItems.has(item.id);
                                    const isFocused = focusedInputs.has(item.id);
                                    const quantityValue = quantityInputs[item.id] ?? String(item.quantity);
                                    
                                    // 渲染图片或 emoji
                                    const renderImage = () => {
                                        // 食材项目使用 emoji
                                        if (item.kind === 'ingredient') {
                                            const emoji = typeof item.image === 'string' ? item.image : '🥗';
                                            return <Text style={styles.cartItemEmoji}>{emoji}</Text>;
                                        }
                                        // 海鲜项目使用图片
                                        if (item.image) {
                                            // 如果是字符串，可能是 emoji 或图片 URI
                                            if (typeof item.image === 'string') {
                                                // 检查是否是 emoji（字符串长度较短）
                                                if (item.image.length <= 10) {
                                                    return <Text style={styles.cartItemEmoji}>{item.image}</Text>;
                                                }
                                                // 否则当作图片 URI 处理
                                                return (
                                                    <Image 
                                                        source={{ uri: item.image }} 
                                                        style={styles.cartItemImage} 
                                                        contentFit="cover" 
                                                    />
                                                );
                                            }
                                            // 如果是对象，直接作为图片源
                                            return <Image source={item.image} style={styles.cartItemImage} contentFit="cover" />;
                                        }
                                        // 默认显示鱼类 emoji
                                        return <Text style={styles.cartItemEmoji}>🐟</Text>;
                                    };
                                    
                                    return (
                                        <Pressable
                                            key={item.id}
                                            style={({ pressed }) => [
                                                styles.cartItem,
                                                styles.cartItemSmall,
                                                selected && styles.cartItemSelected,
                                                pressed && styles.cartItemPressed,
                                            ]}
                                            onPress={() => toggleCartItem(item.id)}
                                        >
                                            {renderImage()}
                                            <Text style={styles.cartItemName}>{item.name}</Text>
                                            <View style={styles.cartItemQuantityRow}>
                                                <Text style={styles.cartItemQuantityLabel}>Number</Text>
                                                <TextInput
                                                    style={[
                                                        styles.cartItemQuantityInput,
                                                        isFocused
                                                            ? styles.cartItemQuantityInputFocused
                                                            : styles.cartItemQuantityInputBlurred,
                                                    ]}
                                                    keyboardType="numeric"
                                                    value={quantityValue}
                                                    onChangeText={(text) => handleQuantityChange(item.id, text)}
                                                    onFocus={() => setInputFocus(item.id, true)}
                                                    onBlur={() => {
                                                        setInputFocus(item.id, false);
                                                        handleQuantityBlur(item);
                                                    }}
                                                />
                                            </View>
                                            <View style={styles.cartItemFooter}>
                                                <Text style={styles.cartItemPrice}>{item.price}${item.unit}</Text>
                                            </View>
                                        </Pressable>
                                    );
                                })}
                            </View>
                            {!expanded && items.length > 2 && (
                                <Pressable style={styles.expandButton} onPress={toggleExpanded}>
                                    <Image
                                        source={require('../../assets/images/kitchen/open.png')}
                                        style={styles.expandIcon}
                                        contentFit="contain"
                                    />
                                </Pressable>
                            )}
                            {expanded && items.length > 2 && (
                                <Pressable style={styles.expandButton} onPress={toggleExpanded}>
                                    <Image
                                        source={require('../../assets/images/kitchen/close.png')}
                                        style={styles.expandIcon}
                                        contentFit="contain"
                                    />
                                </Pressable>
                            )}
                        </>
                    )}
                    {items.length > 0 && (
                        <View style={styles.cartTotal}>
                            <Text style={styles.totalText}>Total: {totalPrice.toFixed(2)}$</Text>
                            <Pressable onPress={onPayment} disabled={loading}>
                                <Text style={[styles.paymentText, loading && styles.paymentTextDisabled]}>Payment</Text>
                            </Pressable>
                        </View>
                    )}
                </View>
            </View>
        );
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                {/* Header Section */}
                <View style={styles.headerSection}>
                    <Image
                        source={require('../../assets/images/kitchen/background.png')}
                        style={styles.headerBackground}
                        contentFit="cover"
                    />
                    <View style={styles.headerContent}>
                        <Image
                            source={require('../../assets/images/kitchen/avatar.png')}
                            style={styles.avatar}
                            contentFit="cover"
                        />
                        <View style={styles.headerText}>
                            <Text style={styles.greeting}>Hi, {userName}</Text>
                            <Text style={styles.preferences}>pure vegan, egg. onion sensitive.</Text>
                        </View>
                        <Pressable onPress={() => { /* TODO: Navigate to settings */ }}>
                            <Text style={styles.setMoreText}>set more →</Text>
                        </Pressable>
                    </View>
                </View>

                {/* My Seafood Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Image
                            source={require('../../assets/images/kitchen/hook.png')}
                            style={styles.sectionIcon}
                            contentFit="contain"
                        />
                        <Text style={styles.sectionTitle}>My Seafood</Text>
                    </View>
                    <View style={styles.seafoodContainer}>
                        {loading && seafoodItems.length === 0 ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="small" color="#F28F64" />
                                <Text style={styles.loadingText}>Loading...</Text>
                            </View>
                        ) : displayedSeafoodItems.length === 0 ? (
                            <Text style={styles.emptyText}>No seafood items yet</Text>
                        ) : (
                            <>
                                {displayedSeafoodItems.map((item, index) => (
                                    <Pressable
                                        key={item.id}
                                        style={[styles.seafoodItem, index > 0 && styles.seafoodItemSpacing]}
                                        onPress={() => handleSeafoodClick(item)}
                                    >
                                        <Text style={styles.seafoodEmoji}>{getSeafoodEmoji(item.tags)}</Text>
                                        <Text style={styles.seafoodName}>{item.name}</Text>
                                    </Pressable>
                                ))}
                                {seafoodItems.length > 2 && (
                                    <Pressable
                                        style={styles.expandButton}
                                        onPress={() => setSeafoodExpanded(!seafoodExpanded)}
                                    >
                                        <Image
                                            source={seafoodExpanded
                                                ? require('../../assets/images/kitchen/close.png')
                                                : require('../../assets/images/kitchen/open.png')}
                                            style={styles.expandIcon}
                                            contentFit="contain"
                                        />
                                    </Pressable>
                                )}
                            </>
                        )}
                    </View>
                </View>

                {renderCartGrid(
                    seafoodCartItems,
                    seafoodCartExpanded,
                    () => setSeafoodCartExpanded(!seafoodCartExpanded),
                    'My Seafood Cart',
                    toggleSelectAllSeafood,
                    seafoodTotalPrice,
                    handleSeafoodPayment
                )}

                {renderCartGrid(
                    ingredientCartItems,
                    ingredientCartExpanded,
                    () => setIngredientCartExpanded(!ingredientCartExpanded),
                    'My Ingredient Cart',
                    toggleSelectAllIngredients,
                    ingredientTotalPrice,
                    handleIngredientPayment
                )}

                {/* My Order Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Image
                            source={require('../../assets/images/kitchen/order.png')}
                            style={styles.sectionIcon}
                            contentFit="contain"
                        />
                        <Text style={styles.sectionTitle}>My Order</Text>
                    </View>
                    <View style={styles.orderContainer}>
                        {loading && orderItems.length === 0 ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="small" color="#F28F64" />
                                <Text style={styles.loadingText}>Loading...</Text>
                            </View>
                        ) : displayedOrderItems.length === 0 ? (
                            <Text style={styles.emptyText}>No orders yet</Text>
                        ) : (
                            <>
                                <View style={styles.orderItemsGrid}>
                                    {displayedOrderItems.map((item) => {
                                        // 渲染图片或 emoji
                                        const renderOrderImage = () => {
                                            const isIngredient = item.id.startsWith('order_ingredient');
                                            
                                            // 食材项目使用 emoji
                                            if (isIngredient) {
                                                const emoji = typeof item.image === 'string' ? item.image : '🥗';
                                                return <Text style={styles.orderItemEmoji}>{emoji}</Text>;
                                            }
                                            
                                            // 海鲜项目使用图片
                                            if (item.image) {
                                                if (typeof item.image === 'string') {
                                                    // 检查是否是 emoji
                                                    if (item.image.length <= 10) {
                                                        return <Text style={styles.orderItemEmoji}>{item.image}</Text>;
                                                    }
                                                    // 当作图片 URI 处理
                                                    return (
                                                        <Image 
                                                            source={{ uri: item.image }} 
                                                            style={styles.orderItemImage} 
                                                            contentFit="cover" 
                                                        />
                                                    );
                                                }
                                                return <Image source={item.image} style={styles.orderItemImage} contentFit="cover" />;
                                            }
                                            return <Text style={styles.orderItemEmoji}>🐟</Text>;
                                        };
                                        
                                        return (
                                            <View key={item.id} style={[styles.orderItem, styles.orderItemSmall]}>
                                                {renderOrderImage()}
                                                <Text style={styles.orderItemName}>{item.name}</Text>
                                                <Text style={styles.orderItemQuantity}>x {item.quantity}</Text>
                                                <View style={styles.orderItemFooter}>
                                                    <Text style={styles.orderItemPrice}>{item.price}${item.unit}</Text>
                                                </View>
                                            </View>
                                        );
                                    })}
                                </View>
                                {!orderExpanded && orderItems.length > 2 && (
                                    <Pressable
                                        style={styles.expandButton}
                                        onPress={() => setOrderExpanded(!orderExpanded)}
                                    >
                                        <Image
                                            source={require('../../assets/images/kitchen/open.png')}
                                            style={styles.expandIcon}
                                            contentFit="contain"
                                        />
                                    </Pressable>
                                )}
                                {orderExpanded && orderItems.length > 2 && (
                                    <Pressable
                                        style={styles.expandButton}
                                        onPress={() => setOrderExpanded(!orderExpanded)}
                                    >
                                        <Image
                                            source={require('../../assets/images/kitchen/close.png')}
                                            style={styles.expandIcon}
                                            contentFit="contain"
                                        />
                                    </Pressable>
                                )}
                            </>
                        )}
                    </View>
                </View>

                <View style={{ height: 120 }} />
            </ScrollView>

            <BottomNav />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFE8DE',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 20,
    },
    headerSection: {
        height: 200,
        position: 'relative',
        marginBottom: 20,
    },
    headerBackground: {
        position: 'absolute',
        width: '100%',
        height: '100%',
    },
    headerContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 20,
        gap: 16,
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
    },
    headerText: {
        flex: 1,
    },
    greeting: {
        fontSize: 28,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 4,
    },
    preferences: {
        fontSize: 14,
        color: 'white',
        opacity: 0.7,
    },
    setMoreText: {
        fontSize: 14,
        color: 'white',
        textDecorationLine: 'underline',
    },
    section: {
        paddingHorizontal: 20,
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionIcon: {
        width: 20,
        height: 20,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#0E2048',
    },
    selectAllText: {
        fontSize: 14,
        color: '#6C819E',
        textDecorationLine: 'underline',
    },
    seafoodContainer: {
        backgroundColor: 'rgba(13, 57, 144, 0.6)',
        borderRadius: 20,
        padding: 16,
        gap: 12,
    },
    seafoodItem: {
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        borderRadius: 20,
        paddingVertical: 8,
    },
    seafoodItemSpacing: {
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.5)',
        paddingTop: 12,
    },
    seafoodEmoji: {
        width: 70,
        height: 48,
        marginLeft: 10,
        fontSize: 36,
        textAlign: 'center',
        lineHeight: 48,
    },
    seafoodName: {
        flex: 1,
        fontSize: 20,
        fontWeight: '800',
        color: 'black',
    },
    cartContainer: {
        backgroundColor: 'rgba(244, 182, 136, 1)',
        borderRadius: 20,
        padding: 16,
    },
    cartItemsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 12,
    },
    cartItem: {
        borderRadius: 12,
        backgroundColor: '#fff3e6',
        padding: 12,
    },
    cartItemSelected: {
        backgroundColor: '#f2b071',
        borderWidth: 1,
        borderColor: '#e07a30',
    },
    cartItemPressed: {
        backgroundColor: '#ffe0c2',
    },
    cartItemSmall: {
        width: '45%',
    },
    cartItemImage: {
        width: '100%',
        height: 120,
        borderRadius: 8,
        marginBottom: 8,
    },
    cartItemEmoji: {
        width: '100%',
        height: 120,
        fontSize: 80,
        textAlign: 'center',
        lineHeight: 120,
        marginBottom: 8,
    },
    cartItemName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#0E2048',
        marginBottom: 4,
    },
    cartItemQuantityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
        gap: 8,
    },
    cartItemQuantityLabel: {
        fontSize: 12,
        color: '#6C819E',
    },
    cartItemQuantityInput: {
        flex: 1,
        height: 36,
        borderRadius: 8,
        paddingHorizontal: 10,
        fontSize: 14,
        color: '#0E2048',
        backgroundColor: '#fffaf4',
    },
    cartItemQuantityInputFocused: {
        borderWidth: 1,
        borderColor: '#214E9C',
        backgroundColor: 'white',
    },
    cartItemQuantityInputBlurred: {
        borderWidth: 0,
    },
    cartItemFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 4,
    },
    cartItemPrice: {
        fontSize: 14,
        fontWeight: '600',
        color: '#0E2048',
    },
    expandButton: {
        width: '100%',
        alignItems: 'center',
        paddingVertical: 8,
    },
    expandIcon: {
        width: 24,
        height: 24,
    },
    cartTotal: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(14, 32, 72, 0.1)',
        marginTop: 12,
    },
    totalText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#0E2048',
    },
    paymentText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#214E9C',
        textDecorationLine: 'underline',
    },
    paymentTextDisabled: {
        color: '#999',
        textDecorationLine: 'none',
    },
    loadingContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 20,
        gap: 8,
    },
    loadingText: {
        fontSize: 14,
        color: 'black',
        opacity: 0.7,
    },
    emptyText: {
        fontSize: 14,
        color: 'black',
        opacity: 0.7,
        textAlign: 'center',
        paddingVertical: 20,
    },
    orderContainer: {
        backgroundColor: 'rgba(244, 182, 136, 1)',
        borderRadius: 20,
        padding: 16,
    },
    orderItemsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 12,
    },
    orderItem: {
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: 'white',
        padding: 12,
    },
    orderItemSmall: {
        width: '45%',
    },
    orderItemImage: {
        width: '100%',
        height: 120,
        borderRadius: 8,
        marginBottom: 8,
    },
    orderItemEmoji: {
        width: '100%',
        height: 120,
        fontSize: 80,
        textAlign: 'center',
        lineHeight: 120,
        marginBottom: 8,
    },
    orderItemName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#0E2048',
        marginBottom: 4,
    },
    orderItemQuantity: {
        fontSize: 12,
        color: '#6C819E',
        marginBottom: 4,
    },
    orderItemFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 4,
    },
    orderItemPrice: {
        fontSize: 14,
        fontWeight: '600',
        color: '#0E2048',
    },
});