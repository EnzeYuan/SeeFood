import axios from 'axios';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_BASE_URL } from '../../constants/api';
import { BEHAVIOR_WEIGHT, logUserBehavior } from '../../utils/userBehavior';

interface SeafoodDetail {
    id: string;
    name: string;
    image?: string;
    description: string;
    tags?: string;
    cost?: string;
    views?: number;
}

interface RecipeDetail {
    id: string;
    name: string;
    brief: string;
    image?: string;
}

interface ItemDetailPayload {
    itemId?: number;
    itemName?: string;
    seafood?: {
        seafoodId?: number;
        seafoodName?: string;
        seafoodBrief?: string;
        seafoodImage?: string;
        tags?: string;
        cost?: string | number;
        views?: number;
    };
    seafoodPO?: ItemDetailPayload['seafood'];
    recipePos?: {
        recipeId?: number;
        recipeName?: string;
        recipeBrief?: string;
        recipeImage?: string;
    }[];
    recipePOs?: ItemDetailPayload['recipePos'];
}

interface ItemDetailResponse {
    code: number;
    message: string;
    data?: ItemDetailPayload;
}

// 收藏列表响应（用于初始化 isLiked）
interface LikeItem {
    seafoodId?: number;
}

interface LikeResponse {
    code: number;
    message: string;
    data?: LikeItem[];
}

export default function FishDetailScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { id } = useLocalSearchParams<{ id: string }>();
    const [seafoodDetail, setSeafoodDetail] = useState<SeafoodDetail | null>(null);
    const [recipes, setRecipes] = useState<RecipeDetail[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isLiked, setIsLiked] = useState(false);
    const [liking, setLiking] = useState(false);
    const [seafoodCartState, setSeafoodCartState] = useState(false);
    const [addingToCart, setAddingToCart] = useState(false);

    useEffect(() => {
        const fetchDetail = async () => {
            if (!id) {
                return;
            }
            setLoading(true);
            setError(null);
            try {
                const { data } = await axios.get<ItemDetailResponse>(
                    `${API_BASE_URL}/seefood/item/detail/${id}`,
                    {
                        headers: {
                            Accept: 'application/json',
                        },
                    }
                );

                if ((data.code === 0 || data.code === 200) && data.data) {
                    const {
                        itemId,
                        itemName,
                        seafood,
                        seafoodPO,
                        recipePos,
                        recipePOs,
                    } = data.data;
                    const mergedSeafood = seafood ?? seafoodPO ?? {};
                    setSeafoodDetail({
                        id: String(mergedSeafood.seafoodId ?? itemId ?? id),
                        name: mergedSeafood.seafoodName ?? itemName ?? 'Unknown Seafood',
                        image: mergedSeafood.seafoodImage,
                        description: mergedSeafood.seafoodBrief ?? 'No description available.',
                        tags: mergedSeafood.tags,
                        cost: mergedSeafood.cost !== undefined ? String(mergedSeafood.cost) : undefined,
                        views: mergedSeafood.views,
                    });
                    setRecipes(
                        (recipePos ?? recipePOs ?? []).map((recipe, index) => ({
                            id: String(recipe.recipeId ?? index),
                            name: recipe.recipeName ?? `Recipe ${index + 1}`,
                            brief: recipe.recipeBrief ?? 'No description available.',
                            image: recipe.recipeImage,
                        }))
                    );
                } else {
                    throw new Error(data.message || 'Failed to fetch detail.');
                }
            } catch (err) {
                if (axios.isAxiosError(err)) {
                    const backendMessage = (err.response?.data as Partial<ItemDetailResponse> | undefined)?.message;
                    setError(backendMessage || err.message || 'Failed to load detail. Please try again later.');
                } else if (err instanceof Error) {
                    setError(err.message);
                } else {
                    setError('Failed to load detail. Please try again later.');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchDetail();
    }, [id]);

    // 记录详情页浏览行为
    useEffect(() => {
        if (seafoodDetail?.id) {
            logUserBehavior(seafoodDetail.id, BEHAVIOR_WEIGHT.view);
        }
    }, [seafoodDetail?.id]);

    // 初始化"已收藏"状态
    useEffect(() => {
        const loadLikeStatus = async () => {
            if (!id) return;
            try {
                const { data } = await axios.get<LikeResponse>(
                    `${API_BASE_URL}/seefood/user/getLike`,
                    {
                        headers: { Accept: 'application/json' },
                    }
                );

                if ((data.code === 0 || data.code === 200) && data.data) {
                    const liked = data.data.some(
                        (item) => String(item.seafoodId ?? '') === String(id)
                    );
                    setIsLiked(liked);
                }
            } catch (err) {
                // 静默失败，不阻塞页面
                console.warn('Failed to load like status', err);
            }
        };

        loadLikeStatus();
    }, [id]);

    // 初始化购物车状态（检查是否已在购物车）
    useEffect(() => {
        const checkCartStatus = async () => {
            if (!seafoodDetail?.id) return;
            try {
                const { data } = await axios.get<{
                    code: number;
                    message: string;
                    data?: Array<{ seafoodId?: number }>;
                }>(
                    `${API_BASE_URL}/seefood/purchase/getcart`,
                    {
                        headers: { Accept: 'application/json' },
                    }
                );

                if ((data.code === 0 || data.code === 200) && data.data) {
                    const inCart = data.data.some(
                        (item) => String(item.seafoodId ?? '') === String(seafoodDetail.id)
                    );
                    setSeafoodCartState(inCart);
                }
            } catch (err) {
                // 静默失败，不阻塞页面
                console.warn('Failed to load cart status', err);
            }
        };

        checkCartStatus();
    }, [seafoodDetail?.id]);

    const defaultImage = require('../../assets/images/tide/detailbg.png');
    const buildImageSource = (image?: string | null) => {
        if (!image) return null;
        if (image.startsWith('data:image')) return { uri: image };
        if (/^https?:\/\//.test(image)) return { uri: image };
        return { uri: `data:image/png;base64,${image}` };
    };
    const handleToggleLike = async () => {
        if (!seafoodDetail || liking) {
            return;
        }
        setLiking(true);
        try {
            const endpoint = isLiked
                ? `/seefood/user/deletelike/${seafoodDetail.id}`
                : `/seefood/user/putlike/${seafoodDetail.id}`;
            await axios.put(
                `${API_BASE_URL}${endpoint}`,
                null,
                {
                    headers: {
                        Accept: 'application/json',
                    },
                }
            );
            setIsLiked(!isLiked);

            if (!isLiked) {
                logUserBehavior(seafoodDetail.id, BEHAVIOR_WEIGHT.like);
            }
        } catch (err) {
            console.warn('Failed to toggle like', err);
            Alert.alert('Error', 'Failed to update like. Please try again.');
        } finally {
            setLiking(false);
        }
    };

    const addSeafoodToCart = async (seafoodId: number) => {
        if (addingToCart || seafoodCartState) {
            return;
        }

        Alert.alert(
            'Add to Cart',
            'Are you sure you want to add this seafood to your cart?',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Confirm',
                    onPress: async () => {
                        setAddingToCart(true);
                        try {
                            const response = await axios.post(
                                `${API_BASE_URL}/seefood/purchase/add/${seafoodId}`,
                                {},
                                {
                                    headers: {
                                        'Content-Type': 'application/json',
                                        Accept: 'application/json',
                                    },
                                }
                            );

                            if (response.data.code === 200 || response.data.code === 0) {
                                setSeafoodCartState(true);
                                Alert.alert('Success', 'Seafood added to cart!');
                                await logUserBehavior(seafoodId, BEHAVIOR_WEIGHT.cart);
                            } else {
                                Alert.alert('Error', response.data.message || 'Failed to add to cart');
                            }
                        } catch (error: any) {
                            console.error('Error adding to cart:', error);
                            Alert.alert(
                                'Error',
                                error.response?.data?.message || error.message || 'Failed to add to cart'
                            );
                        } finally {
                            setAddingToCart(false);
                        }
                    },
                },
            ]
        );
    };

    if (loading) {
        return (
            <View style={styles.stateWrapper}>
                <ActivityIndicator size="large" color="#214E9C" />
                <Text style={styles.stateText}>Loading detail...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.stateWrapper}>
                <Text style={styles.stateText}>{error}</Text>
                <Pressable style={styles.retryButton} onPress={() => router.back()}>
                    <Text style={styles.retryText}>Go Back</Text>
                </Pressable>
            </View>
        );
    }

    if (!seafoodDetail) {
        return (
            <View style={styles.stateWrapper}>
                <Text style={styles.stateText}>No detail available.</Text>
            </View>
        );
    }
    return (
        <View style={styles.container}>
        <ScrollView 
            style={styles.container}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
            showsVerticalScrollIndicator={false}
        >
            {/* Header Section with Image */}
            <View style={styles.headerSection}>
                <Image
                  source={buildImageSource(seafoodDetail.image) || defaultImage}
                    style={styles.headerImage}
                    contentFit="cover"
                />
                <Pressable
                    style={[styles.backButton, { top: insets.top + 10 }]}
                    onPress={() => router.back()}
                >
                    <Image
                        source={require('../../assets/images/tide/backB.png')}
                        style={styles.backIcon}
                        contentFit="contain"
                    />
                </Pressable>
            </View>
    
            {/* Seafood Block */}
            <View style={styles.section}>
                <View style={styles.sectionHeaderPeach}>
                    <Image
                        source={require('../../assets/images/tide/fish.png')}
                        style={styles.sectionHeaderIconFish}
                        contentFit="contain"
                    />
                    <Text style={styles.sectionHeaderTextFish}>{seafoodDetail.name}</Text>
                    <Pressable
                        onPress={() => {
                            if (seafoodDetail?.id) {
                                addSeafoodToCart(Number(seafoodDetail.id));
                            }
                        }}
                        style={styles.cartButton}
                        disabled={addingToCart || seafoodCartState}
                    >
                        <Image
                            source={
                                seafoodCartState
                                    ? require('../../assets/images/catch/carted.png')
                                    : require('../../assets/images/catch/uncart.png')
                            }
                            style={styles.cartButtonIcon}
                            contentFit="contain"
                        />
                    </Pressable>
                </View>
                <View style={styles.sectionBodyBlue}>
                    <View style={styles.contentWrapper}>
                        <Text style={styles.sectionBodyText}>{seafoodDetail.description}</Text>
                        {seafoodDetail.cost ? (
                            <Text style={styles.costText}>Cost: {seafoodDetail.cost}￥</Text>
                        ) : null}
                    </View>
                    <View style={styles.bottomLeftContainer}>
                        {seafoodDetail.tags ? (
                            <View style={styles.tagsContainer}>
                                {seafoodDetail.tags.split(',').map((tag, index) => (
                                    <View key={index} style={styles.tag}>
                                        <Text style={styles.tagText}>{tag.trim().toLowerCase()}</Text>
                                    </View>
                                ))}
                            </View>
                        ) : null}
                        {typeof seafoodDetail.views === 'number' ? (
                            <Text style={styles.viewText}>Views: {seafoodDetail.views}</Text>
                        ) : null}
                    </View>
                </View>
            </View>
    
            {/* Recipe Blocks */}
            {recipes.length === 0 ? (
                <View style={styles.section}>
                    <View style={styles.sectionHeaderWarning}>
                        <Image
                            source={require('../../assets/images/tide/flavor.png')}
                            style={styles.sectionHeaderIcon}
                            contentFit="contain"
                        />
                        <Text style={styles.sectionHeaderTextDark}>Recipes</Text>
                    </View>
                    <View style={styles.sectionBodyWarning}>
                        <Text style={styles.sectionBodyTextDark}>No recipe recommendations for this seafood.</Text>
                    </View>
                </View>
            ) : (
                recipes.map((recipe) => (
                    <View key={recipe.id} style={styles.section}>
                        <View style={styles.sectionHeaderPeach}>
                            <Image
                                source={require('../../assets/images/tide/flavor.png')}
                                style={styles.sectionHeaderIcon}
                                contentFit="contain"
                            />
                            <Text style={styles.sectionHeaderText}>{recipe.name}</Text>
                        </View>
                        <View style={styles.sectionBodyBlue}>
                            {/* 添加食谱图片 */}
                            {recipe.image ? (
                                <Image
                                    source={buildImageSource(recipe.image)}
                                    style={styles.recipeImage}
                                    contentFit="cover"
                                />
                            ) : null}
                            
                            {/* 食谱描述 */}
                            <Text style={[styles.sectionBodyText, styles.justifiedText]}>{recipe.brief}</Text>
                        </View>
                    </View>
                ))
            )}
    
        </ScrollView>
        {/* Fixed Bottom Reel Image */}
        <Pressable
            style={[styles.reelFixed, { bottom: insets.bottom + 16 }]}
            onPress={handleToggleLike}
            disabled={liking}
        >
            <Image
                source={
                    isLiked
                        ? require('../../assets/images/tide/gotB.png')
                        : require('../../assets/images/tide/reelB.png')
                }
                style={styles.reelImage}
                contentFit="contain"
            />
        </Pressable>
        </View>
    );
    }
    
    const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#9EC8DF',
    },
    scrollContent: {
        paddingBottom: 40,
    },
    headerSection: {
        height: 300,
        position: 'relative',
        overflow: 'hidden',
        borderTopLeftRadius: 8,
        borderTopRightRadius: 8,
        
    },
    headerImage: {
        width: '100%',
        height: '100%',
    },
    backButton: {
        position: 'absolute',
        left: 16,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(158, 200, 223, 0)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    backIcon: {
        width: 24,
        height: 24,
    },
    titleCard: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#F8B98B',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        gap: 12,
    },
    titleIcon: {
        width: 24,
        height: 24,
    },
    titleText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#0E2048',
    },
    section: {
        marginTop: 16,
        paddingHorizontal: 16,
        
        
    },
    sectionHeaderPeach: {
        backgroundColor: '#F8B98B',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 10,
        gap: 8,
        position: 'relative',
    },
    sectionHeaderWarning: {
        backgroundColor: '#FFE0D0',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        gap: 8,
    },
    sectionHeaderIconFish: {
        width: 26,
        height: 26,
    },
    sectionHeaderIcon: {
        width: 20,
        height: 20,
    },
    sectionHeaderTextFish: {
        fontSize: 24,
        fontWeight: '700',
        color: '#0E2048',
        lineHeight: 32,
        flex: 1,
    },
    cartButton: {
        padding: 4,
        marginLeft: 8,
    },
    cartButtonIcon: {
        width: 24,
        height: 24,
    },
    sectionHeaderText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0E2048',
        marginRight:35,
    },
    sectionHeaderTextDark: {
        fontSize: 18,
        fontWeight: '700',
        color: '#CC4E17',
    },
    sectionBodyBlue: {
        backgroundColor: '#B9D5E8',
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
        padding: 16,
    },
    recipeImage: {
        width: '100%',
        height: 200,
        borderRadius: 12,
        marginBottom: 16,
        backgroundColor: '#E8F4F8', // 加载时的背景色
    },
    contentWrapper: {
        // 保持不变
    },
    sectionBodyWarning: {
        backgroundColor: '#F8B98B',
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
        padding: 16,
    },
    sectionBodyText: {
        fontSize: 13,
        lineHeight: 18,
        color: '#0E2048',
        textAlign: 'justify',
    },
    justifiedText: {
        textAlign: 'justify',
    },
    sectionBodyTextDark: {
        fontSize: 13,
        lineHeight: 18,
        color: '#0E2048',
    },
    metaText: {
        marginTop: 8,
        fontSize: 12,
        color: '#0E2048',
    },
    costText: {
        marginTop: 8,
        fontSize: 16,
        fontWeight: '700',
        color: '#0E2048',
    },
    bottomLeftContainer: {
        marginTop: 16,
        flexDirection: 'column',
        alignItems: 'flex-end',
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        alignSelf: 'stretch',
        marginBottom: 8,
        justifyContent: 'flex-start',
    },
    tag: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#9EC8DF',
        backgroundColor: '#E8F4F8',
    },
    tagText: {
        fontSize: 12,
        color: '#4A90E2',
        textTransform: 'lowercase',
    },
    viewText: {
        fontSize: 12,
        color: '#0E2048',
    },
    reelImage: {
        width: 88,
        height: 54,
        alignSelf: 'center',
    },
    reelFixed: {
        position: 'absolute',
        left: 0,
        right: 0,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stateWrapper: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#9EC8DF',
        paddingHorizontal: 24,
    },
    stateText: {
        marginTop: 12,
        color: '#0E2048',
        fontSize: 16,
        textAlign: 'center',
    },
    retryButton: {
        marginTop: 16,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: '#F8B98B',
    },
    retryText: {
        color: '#0E2048',
        fontWeight: '600',
    },
    });