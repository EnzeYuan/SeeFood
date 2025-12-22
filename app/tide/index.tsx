import BottomNav from "@/components/bottom-nav";
import TideBlock from "@/components/tide-block";
import { API_BASE_URL } from "@/constants/api";
import { useAuth } from "@/contexts/AuthContext";
import { useFocusEffect } from "@react-navigation/native";
import axios from "axios";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// 定义数据类型
interface TideItem {
  id: string;
  title: string;
  description: string;
  backgroundImage?: number | { uri: string };
}

interface SeafoodItem {
  seafoodId?: number;
  seafoodName?: string;
  seafoodBrief?: string;
  seafoodImage?: string;
}

interface ApiResponse {
  code: number;
  message: string;
  data?: SeafoodItem[];
}

interface ViewUpdateResponse {
  code: number;
  message: string;
  data?: {};
}

export default function TideHome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const userName = user?.username ?? "Joy";
  const [selected, setSelected] = useState<"seasonal" | "popular" | "personal">(
    "seasonal"
  );
  const [seasonalData, setSeasonalData] = useState<TideItem[]>([]);
  const [popularData, setPopularData] = useState<TideItem[]>([]);
  const [personalData, setPersonalData] = useState<TideItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const avatar = require("../../assets/images/tide/avatar.png");
  const headerBg = require("../../assets/images/tide/background.png");
  const defaultImages = [
    require("../../assets/images/tide/firstBlock.png"),
    require("../../assets/images/tide/secondBlock.png"),
  ];

  const fetchCategory = async (path: string) => {
    const response = await axios.get<ApiResponse>(
      `${API_BASE_URL}${path}`,
      { 
        headers: {
          Accept: "application/json",
        },
      }
    );

    if (response.data.code === 200 && response.data.data) {
      return response.data.data;
    }

    throw new Error(response.data.message || "Failed to obtain data.");
  };

  const mapToTideItems = (list: SeafoodItem[]): TideItem[] =>
    list.map((item, index) => ({
      id: String(item.seafoodId ?? index),
      title: item.seafoodName ?? "Unknown Seafood",
      description:
        item.seafoodBrief ??
        "No description provided for this seafood item.",
      backgroundImage: item.seafoodImage
        ? { uri: item.seafoodImage }
        : defaultImages[index % defaultImages.length],
    }));

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('🔍 开始请求数据...');
      const [seasonal, popular, personal] = await Promise.all([
        fetchCategory("/seefood/seafood/getSeason"),
        fetchCategory("/seefood/seafood/getPopular"),
        fetchCategory("/seefood/recommend/getpersonalrecommendation"),
      ]);

      setSeasonalData(mapToTideItems(seasonal));
      setPopularData(mapToTideItems(popular));
      setPersonalData(mapToTideItems(personal));
      console.log('✅ success:', { seasonal, popular, personal }); 
    } catch (err) {
      console.error('❌ failed to load data:', err);
      if (axios.isAxiosError(err)) {
        const backendMessage = (
          err.response?.data as Partial<ApiResponse> | undefined
        )?.message;
        setError(
          backendMessage || err.message || "Failed to load data. Please try again later."
        );
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to load data. Please try again later.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // 使用 useFocusEffect 在页面获得焦点时刷新数据
  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  // 根据选中的分类获取对应的数据
  const getCurrentData = (): TideItem[] => {
    switch (selected) {
      case "seasonal":
        return seasonalData;
      case "popular":
        return popularData;
      case "personal":
        return personalData;
      default:
        return seasonalData;
    }
  };

  // 获取图标路径
  const getSeasonalIcon = () => {
    return selected === "seasonal"
      ? require("../../assets/images/tide/seasonChoosen.png")
      : require("../../assets/images/tide/seasonal.png");
  };

  const getPopularIcon = () => {
    return selected === "popular"
      ? require("../../assets/images/tide/popularChoosen.png")
      : require("../../assets/images/tide/popular.png");
  };

  const getPersonalIcon = () => {
    return selected === "personal"
      ? require("../../assets/images/tide/personalChoosen.png")
      : require("../../assets/images/tide/personal.png");
  };

  // 获取文字样式
  const getLabelStyle = (category: "seasonal" | "popular" | "personal") => {
    return selected === category ? styles.catLabelActive : styles.catLabel;
  };

  // 更新浏览量
  const updateViews = useCallback(async (seafoodId: string) => {
    try {
      await axios.put<ViewUpdateResponse>(
        `${API_BASE_URL}/seefood/seafood/views/${seafoodId}`,
        null,
        {
          headers: {
            Accept: "application/json",
          },
        }
      );
      // 浏览量更新成功，静默处理，不需要显示错误
    } catch (err) {
      // 浏览量更新失败，静默处理，不影响用户体验
      console.warn("Failed to update views:", err);
    }
  }, []);

  // 处理点击事件：更新浏览量并跳转
  const handleTideBlockPress = useCallback((item: TideItem) => {
    // 先更新浏览量（异步，不阻塞跳转）
    updateViews(item.id);
    // 然后跳转到详情页
    router.push(`/tide/detail?id=${item.id}` as any);
  }, [router, updateViews]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Fullscreen background image */}
      <Image
        source={headerBg}
        style={[
          styles.fullscreenBg,
          {
            top: -insets.top - 30, // 考虑状态栏高度
            height: SCREEN_HEIGHT + insets.top + 100,
          },
        ]}
        contentFit="cover"
        contentPosition="top"
      />

      {/* Header with greeting and avatar */}
      <View style={styles.headerWrapper}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>Morning, {userName}</Text>
            <Text style={styles.subGreeting}>Ready to catch?</Text>
          </View>
          <View style={styles.avatarWrap}>
            <Image source={avatar} style={styles.avatar} contentFit="cover" />
          </View>
        </View>
      </View>

      {/* Category buttons */}
      <View style={styles.categories}>
        <Pressable
          onPress={() => setSelected("seasonal")}
          style={styles.catItem}
        >
          <Image
            source={getSeasonalIcon()}
            style={styles.catIcon}
            contentFit="contain"
          />
          <Text style={getLabelStyle("seasonal")}>Seasonal</Text>
        </Pressable>

        <Pressable
          onPress={() => setSelected("popular")}
          style={styles.catItem}
        >
          <Image
            source={getPopularIcon()}
            style={styles.catIcon}
            contentFit="contain"
          />
          <Text style={getLabelStyle("popular")}>Popular</Text>
        </Pressable>

        <Pressable
          onPress={() => setSelected("personal")}
          style={styles.catItem}
        >
          <Image
            source={getPersonalIcon()}
            style={styles.catIcon}
            contentFit="contain"
          />
          <Text style={getLabelStyle("personal")}>Personal</Text>
        </Pressable>
      </View>

      {/* Cards - 根据选中的分类显示对应的内容 */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator
      >
        {loading ? (
          <View style={styles.stateWrapper}>
            <ActivityIndicator size="large" color="#214E9C" />
            <Text style={styles.stateText}>Loading recommendations...</Text>
          </View>
        ) : error ? (
          <View style={styles.stateWrapper}>
            <Text style={styles.stateText}>{error}</Text>
          </View>
        ) : getCurrentData().length === 0 ? (
          <View style={styles.stateWrapper}>
            <Text style={styles.stateText}>No data available. Please try again later.</Text>
          </View>
        ) : (
          getCurrentData().map((item) => (
            <TideBlock
              key={item.id}
              id={item.id}
              title={item.title}
              description={item.description}
              backgroundImage={item.backgroundImage}
              onPress={() => handleTideBlockPress(item)}
            />
          ))
        )}
        <View style={{ height: 120 }} />
      </ScrollView>

      <BottomNav />
    </View>
  );
}

const Navy = "#0E2048";
const Peach = "#F8B98B";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  fullscreenBg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
  },
  headerWrapper: {
    width: "100%",
    height: 260,
  },
  headerContent: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  greeting: {
    paddingTop: 50,
    paddingLeft: 10,
    fontSize: 30,
    fontWeight: "800",
    color: "#214E9C",
    marginBottom: 10,
  },
  subGreeting: {
    paddingLeft: 10,
    fontSize: 25,
    fontWeight: "800",
    color: "#214E9C",
  },
  avatarWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.8)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  categories: {
    marginTop: -35,
    paddingHorizontal: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  catItem: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: "center",
    justifyContent: "center",
  },
  catIcon: {
    width: 63,
    height: 63,
    marginBottom: 8,
  },
  catLabel: {
    color: "#214E9C",
    fontSize: 16,
    fontWeight: "600",
  },
  catLabelActive: {
    color: "#F28F64", 
    fontSize: 16,
    fontWeight: "600",
  },
  catLabelSeason: {
    color: "#F28F64",
    fontSize: 16,
    fontWeight: "600",
  },
  scroll: {
    flex: 1,
    marginTop: 8,
  },
  scrollContent: {
    paddingTop: 8,
    paddingBottom: 10,
  },
  stateWrapper: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  stateText: {
    marginTop: 12,
    color: "#214E9C",
    fontSize: 16,
  },
});