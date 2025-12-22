import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { API_BASE_URL } from "../../constants/api";
import { BEHAVIOR_WEIGHT, logUserBehavior } from "../../utils/userBehavior";

const HISTORY_STORAGE_KEY = "@catch_history_records";
const MAX_HISTORY_ITEMS = 20;
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

type CatchState = "initial" | "loading" | "result";

interface AIImage {
  uri: string;
}

interface SeafoodPO {
  seafoodId?: number;
  seafoodName?: string;
  seafoodImage?: string;
  seafoodBrief?: string;
  [key: string]: any;
}

interface RecipePO {
  recipeId?: number;
  recipeName?: string;
  recipeImage?: string;
  recipeBrief?: string;
  [key: string]: any;
}

interface IngredientPO {
  ingredientId?: number;
  ingredientName?: string;
  ingredientImage?: string;
  ingredientPrice?: number;
  ingredientPic?: string;
  [key: string]: any;
}

interface AIResponse {
  seafoodPO: SeafoodPO | null;
  recipePOList: RecipePO[];
  ingredientPOList: IngredientPO[];
}

interface HistoryRecord {
  id: string;
  imageUri: string;
  // 只存储必要的信息，不存储完整的图片 base64 数据
  result: {
    seafoodPO: SeafoodPO | null;
    recipePOList: RecipePO[];
    ingredientPOList: IngredientPO[];
  };
  timestamp: number;
  seafoodName?: string;
}

interface AIResult {
  name: string;
  nutritionFlavor: string;
  fullNutritionFlavor?: string;
  recipes: string;
  fullRecipes?: string;
  ingredients: string[];
}

export default function CatchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [state, setState] = useState<CatchState>("initial");
  const [selectedImage, setSelectedImage] = useState<AIImage | null>(null);
  const [expandedSections, setExpandedSections] = useState<{
    nutrition: boolean;
    recipes: boolean;
  }>({
    nutrition: false,
    recipes: false,
  });
  const [aiResult, setAiResult] = useState<AIResult | null>(null);
  const [currentAiResponse, setCurrentAiResponse] = useState<AIResponse | null>(null);
  const [historyRecords, setHistoryRecords] = useState<HistoryRecord[]>([]);
  const [currentSearchId, setCurrentSearchId] = useState<string | null>(null);
  const [ingredientCartStates, setIngredientCartStates] = useState<Map<number | string, boolean>>(new Map());
  const [seafoodCartState, setSeafoodCartState] = useState<boolean>(false);
  const [seafoodHookState, setSeafoodHookState] = useState<boolean>(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadHistoryRecords();
    cleanupOldRecords();
  }, []);

  useEffect(() => {
    if (state === "result" && scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [historyRecords, state]);

  const loadHistoryRecords = async () => {
    try {
      const storedData = await AsyncStorage.getItem(HISTORY_STORAGE_KEY);
      if (storedData) {
        const records: HistoryRecord[] = JSON.parse(storedData);
        records.sort((a, b) => b.timestamp - a.timestamp);
        setHistoryRecords(records);
      }
    } catch (error) {
      console.error("Error loading history records:", error);
    }
  };

  const saveHistoryRecords = async (records: HistoryRecord[]) => {
    try {
      // 限制记录数量，并且清理过大的数据
      const limitedRecords = records.slice(0, MAX_HISTORY_ITEMS);
      
      // 清理每个记录中的大图片数据，只保留 URI
      const cleanedRecords = limitedRecords.map(record => ({
        ...record,
        result: {
          ...record.result,
          seafoodPO: record.result.seafoodPO ? {
            ...record.result.seafoodPO,
            // 不存储 base64 图片数据
            seafoodImage: record.result.seafoodPO.seafoodImage?.startsWith('data:image') 
              ? undefined 
              : record.result.seafoodPO.seafoodImage,
          } : null,
          recipePOList: record.result.recipePOList.map(recipe => ({
            ...recipe,
            // 不存储 base64 图片数据
            recipeImage: recipe.recipeImage?.startsWith('data:image')
              ? undefined
              : recipe.recipeImage,
          })),
        },
      }));
      
      const dataString = JSON.stringify(cleanedRecords);
      // 如果数据仍然太大，逐步删除最旧的记录
      if (dataString.length > MAX_IMAGE_SIZE_BYTES) {
        const trimmedRecords = [...cleanedRecords];
        while (trimmedRecords.length > 1) {
          trimmedRecords.pop();
          const testString = JSON.stringify(trimmedRecords);
          if (testString.length <= MAX_IMAGE_SIZE_BYTES) {
            break;
          }
        }
        await AsyncStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(trimmedRecords));
        return trimmedRecords;
      }
      
      await AsyncStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(cleanedRecords));
      return cleanedRecords;
    } catch (error: any) {
      // 如果是存储空间不足的错误，清理一些旧记录
      if (error?.message?.includes('full') || error?.message?.includes('quota')) {
        console.warn("Storage full, attempting to clean up old records");
        try {
          // 只保留最新的 5 条记录
          const minimalRecords = records.slice(0, 5).map(record => ({
            ...record,
            result: {
              ...record.result,
              seafoodPO: record.result.seafoodPO ? {
                seafoodId: record.result.seafoodPO.seafoodId,
                seafoodName: record.result.seafoodPO.seafoodName,
                seafoodBrief: record.result.seafoodPO.seafoodBrief,
              } : null,
              recipePOList: record.result.recipePOList.map(recipe => ({
                recipeId: recipe.recipeId,
                recipeName: recipe.recipeName,
                recipeBrief: recipe.recipeBrief,
              })),
              ingredientPOList: record.result.ingredientPOList.map(ing => ({
                ingredientId: ing.ingredientId,
                ingredientName: ing.ingredientName,
              })),
            },
          }));
          await AsyncStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(minimalRecords));
          return minimalRecords;
        } catch (cleanupError) {
          console.error("Failed to cleanup records:", cleanupError);
          // 如果还是失败，尝试清空存储
          try {
            await AsyncStorage.removeItem(HISTORY_STORAGE_KEY);
          } catch (removeError) {
            console.error("Failed to remove storage:", removeError);
          }
        }
      } else {
        console.error("Error saving history records:", error);
      }
      return null;
    }
  };

  const cleanupOldRecords = async () => {
    try {
      const storedData = await AsyncStorage.getItem(HISTORY_STORAGE_KEY);
      if (storedData) {
        const records: HistoryRecord[] = JSON.parse(storedData);
        const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        const recentRecords = records.filter(record => record.timestamp > sevenDaysAgo);
        
        if (recentRecords.length !== records.length) {
          await AsyncStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(recentRecords));
          setHistoryRecords(recentRecords);
        }
      }
    } catch (error) {
      console.error("Error cleaning up old records:", error);
    }
  };

  const compressBase64Image = (base64: string, maxSizeBytes: number = 1024 * 1024): string => {
    if (base64.length <= maxSizeBytes) {
      return base64;
    }
    
    console.log(`Image size ${base64.length} bytes exceeds limit, consider compression`);
    return base64;
  };

  const buildImageUri = (image?: string | null) => {
    if (!image) return null;
    if (image.startsWith("data:image")) return image;
    if (/^https?:\/\//.test(image)) return image;
    return `data:image/png;base64,${image}`;
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes} min ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    if (days < 7) return `${days} day${days > 1 ? "s" : ""} ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const pickImageFromCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      alert("Sorry, we need camera permissions to make this work!");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      handleImageSelected({ uri: asset.uri }, asset.base64 || "");
    }
  };

  const pickImageFromAlbum = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      alert("Sorry, we need media library permissions to make this work!");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      handleImageSelected({ uri: asset.uri }, asset.base64 || "");
    }
  };

  const convertAIResponseToResult = (response: AIResponse): AIResult => {
    const seafood = response.seafoodPO;
    const recipes = response.recipePOList || [];
    const ingredients = response.ingredientPOList || [];

    const nutritionFlavor = seafood?.seafoodBrief || "No information yet";
    const fullNutritionFlavor = nutritionFlavor;

    const recipeNames = recipes.map((r) => r.recipeName || "").filter(Boolean);
    const recipesText =
      recipeNames.length > 0
        ? `Recommended recipes: ${recipeNames.join("、")}`
        : "No recommended recipes";
    const fullRecipesText =
      recipes.length > 0
        ? recipes
            .map((r) => r.recipeBrief || r.recipeName || "")
            .filter(Boolean)
            .join("\n")
        : recipesText;

    const ingredientNames = ingredients.map((i) => i.ingredientName || "").filter(Boolean);

    return {
      name: seafood?.seafoodName || "Unknown seafood",
      nutritionFlavor:
        nutritionFlavor.length > 100
          ? nutritionFlavor.substring(0, 100) + "..."
          : nutritionFlavor,
      fullNutritionFlavor: fullNutritionFlavor,
      recipes:
        recipesText.length > 100 ? recipesText.substring(0, 100) + "..." : recipesText,
      fullRecipes: fullRecipesText || recipesText,
      ingredients:
        ingredientNames.length > 0 ? ingredientNames : ["No ingredient information"],
    };
  };

  const handleImageSelected = async (image: AIImage, base64: string) => {
    console.log('🔍 Starting image processing:');
    console.log('   - Image:', JSON.stringify(image));
    console.log('   - Base64 length:', base64 ? `${base64.length} chars` : 'empty');

    setSelectedImage(image);
    setState("loading");

    try {
      const compressedBase64 = compressBase64Image(base64);
      const requestData = { base64: compressedBase64 };
      
      console.log('🚀 Sending AI API request:', JSON.stringify(requestData).substring(0, 200) + '...');

      const response = await axios.post<{
        code: number;
        message?: string;
        data: AIResponse;
      }>(`${API_BASE_URL}/seefood/ai/pic`, requestData, {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });

      console.log('✅ AI API response:', response.data);

      if (response.data.code === 200 && response.data.data) {
        const aiResponse = response.data.data;
        
        // Debug: Print ingredient data
        console.log('=== Ingredient Data Debug ===');
        console.log('Ingredient count:', aiResponse.ingredientPOList?.length || 0);
        aiResponse.ingredientPOList?.forEach((ing, i) => {
          console.log(`Ingredient ${i}:`, {
            id: ing.ingredientId,
            name: ing.ingredientName,
            hasId: !!ing.ingredientId,
          });
        });

        const result = convertAIResponseToResult(aiResponse);
        setAiResult(result);
        setCurrentAiResponse(aiResponse);

        const currentRecordId = Date.now().toString();
        setCurrentSearchId(currentRecordId);
        
        const newRecord: HistoryRecord = {
          id: currentRecordId,
          imageUri: image.uri,
          result: aiResponse,
          timestamp: Date.now(),
          seafoodName: result.name,
        };

        await saveSearchToHistory(newRecord);
        setSeafoodCartState(false);
        setSeafoodHookState(false);
        setIngredientCartStates(new Map());
        setState("result");
      } else {
        Alert.alert("Error", response.data.message || "Identification failed, please try again");
        setState("initial");
      }
    } catch (error: any) {
      console.error('❌ AI API error:', error);
      Alert.alert(
        "Error",
        error.response?.data?.message || error.message || "Network error, please check connection"
      );
      setState(historyRecords.length > 0 ? "result" : "initial");
    }
  };

  const saveSearchToHistory = async (record: HistoryRecord) => {
    try {
      const existingIndex = historyRecords.findIndex(
        r => r.seafoodName === record.seafoodName
      );
      
      let updatedRecords = [...historyRecords];
      
      if (existingIndex !== -1) {
        updatedRecords[existingIndex] = {
          ...updatedRecords[existingIndex],
          timestamp: record.timestamp
        };
      } else {
        updatedRecords = [record, ...updatedRecords];
      }
      
      updatedRecords.sort((a, b) => b.timestamp - a.timestamp);
      
      const savedRecords = await saveHistoryRecords(updatedRecords);
      if (savedRecords) {
        setHistoryRecords(savedRecords);
      }
    } catch (error) {
      console.error("Error saving search to history:", error);
    }
  };

  const selectHistoryRecord = (index: number) => {
    const record = historyRecords[index];
    if (record) {
      setSelectedImage({ uri: record.imageUri });
      const result = convertAIResponseToResult(record.result);
      setAiResult(result);
      setCurrentAiResponse(record.result);
      setCurrentSearchId(record.id);
      setState("result");
      setExpandedSections({ nutrition: false, recipes: false });
      setSeafoodCartState(false);
      setSeafoodHookState(false);
      setIngredientCartStates(new Map());
    }
  };

  const toggleSection = (section: "nutrition" | "recipes") => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // 🛒 修改版：使用 ingredientId 或 index 作为 key
  const addIngredientToCart = async (ingredient: IngredientPO, index: number) => {
    const ingredientKey = ingredient.ingredientId ?? index;
    
    console.log('🛒 Adding ingredient:', {
      name: ingredient.ingredientName,
      key: ingredientKey,
      id: ingredient.ingredientId,
      isInCart: ingredientCartStates.get(ingredientKey),
    });

    // 检查是否已在购物车
    if (ingredientCartStates.get(ingredientKey)) {
      Alert.alert('Already in Cart', 'This ingredient is already in your shopping cart.');
      return;
    }

    try {
      const ingredientData = {
        ingredientId: ingredient.ingredientId || 0,
        ingredientName: ingredient.ingredientName,
        ingredientPrice: ingredient.ingredientPrice || 0,
        ingredientPic: ingredient.ingredientPic || ingredient.ingredientImage || '',
      };

      console.log('📤 Sending to API:', ingredientData);

      const response = await axios.post(
        `${API_BASE_URL}/seefood/purchase/addingredienttocart`,
        ingredientData,
        {
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        }
      );

      if (response.data.code === 200 || response.data.code === 0) {
        // ✅ 更新状态 - 不再依赖 ingredientId
        setIngredientCartStates((prev) => {
          const newMap = new Map(prev);
          newMap.set(ingredientKey, true);
          console.log('✅ State updated:', Array.from(newMap.entries()));
          return newMap;
        });
        
        // ✅ 英文成功提示
        Alert.alert(
          'Success', 
          `${ingredient.ingredientName || 'Ingredient'} has been added to your cart!`,
          [{ text: 'OK', style: 'default' }]
        );
      } else {
        Alert.alert('Error', response.data.message || 'Failed to add to cart');
      }
    } catch (error: any) {
      console.error('❌ Error:', error);
      Alert.alert(
        'Network Error',
        error.response?.data?.message || error.message || 'Connection failed'
      );
    }
  };

  const addSeafoodToCart = async (seafoodId: number) => {
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
    }
  };

  const toggleSeafoodHook = async (seafoodId: number) => {
    try {
      const endpoint = seafoodHookState
        ? `/seefood/user/deletelike/${seafoodId}`
        : `/seefood/user/putlike/${seafoodId}`;
      
      const response = await axios.put(
        `${API_BASE_URL}${endpoint}`,
        null,
        {
          headers: {
            Accept: 'application/json',
          },
        }
      );

      if (response.data.code === 200 || response.data.code === 0) {
        setSeafoodHookState(!seafoodHookState);
        Alert.alert('Success', seafoodHookState ? 'Removed from favorites' : 'Added to favorites');
        if (!seafoodHookState) {
          await logUserBehavior(seafoodId, BEHAVIOR_WEIGHT.like);
        }
      } else {
        Alert.alert('Error', response.data.message || 'Failed to update like');
      }
    } catch (error: any) {
      console.error('Error toggling like:', error);
      Alert.alert(
        'Error',
        error.response?.data?.message || error.message || 'Failed to update like'
      );
    }
  };

  const clearAllHistory = async () => {
    Alert.alert(
      "Clear History",
      "Are you sure you want to clear all search history?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            try {
              await AsyncStorage.removeItem(HISTORY_STORAGE_KEY);
              setHistoryRecords([]);
              Alert.alert("Success", "History cleared");
            } catch (error) {
              Alert.alert("Error", "Failed to clear history");
            }
          }
        }
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Image
            source={require("../../assets/images/catch/backB.png")}
            style={styles.backIcon}
            contentFit="contain"
          />
        </Pressable>
        <Text style={styles.headerTitle}>Seafood Detective</Text>
        <Pressable onPress={clearAllHistory}>
          <Text style={styles.clearHistoryText}>Clear</Text>
        </Pressable>
      </View>
  
      {/* Chat Area */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.chatContainer}
        contentContainerStyle={styles.chatContent}
      >
        {historyRecords.length === 0 && state === "initial" ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Welcome to Seafood Detective!</Text>
            <Text style={styles.emptySubtitle}>
              Tap the camera to start identifying seafood
            </Text>
          </View>
        ) : (
          <>
            {/* History Records */}
            {historyRecords
              .filter(record => record.id !== currentSearchId)
              .map((record, index) => {
                const result = convertAIResponseToResult(record.result);
                return (
                  <Pressable key={record.id} onPress={() => selectHistoryRecord(index)}>
                    <View style={styles.messageGroup}>
                      {/* User Message */}
                      <View style={styles.userMessage}>
                        <Text style={styles.timestamp}>
                          {formatTime(record.timestamp)}
                        </Text>
                        <View style={styles.userThumbnail}>
                          <Image
                            source={{ uri: record.imageUri }}
                            style={styles.thumbnailImage}
                            contentFit="cover"
                          />
                        </View>
                      </View>
    
                      {/* AI Reply */}
                      <View style={styles.aiMessage}>
                        <View style={styles.aiBubble}>
                          <Text style={styles.aiName}>{result.name}</Text>
                          <Text style={styles.aiInfo} numberOfLines={2}>
                            {result.nutritionFlavor}
                          </Text>
                          <Text style={styles.aiInfo} numberOfLines={2}>
                            {result.recipes}
                          </Text>
                          <View style={styles.ingredientsPreview}>
                            {result.ingredients.slice(0, 3).map((ing, idx) => (
                              <View key={idx} style={styles.miniIngredient}>
                                <Text style={styles.miniIngredientText}>{ing}</Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
  
            {/* Current Result */}
            {state === "result" && selectedImage && aiResult && (
              <View style={styles.currentResultCard}>
                <View style={styles.resultHeader}>
                  <View style={styles.resultHeaderLeft}>
                    <Text style={styles.justNow}>Just now</Text>
                  </View>
                  <Image
                    source={{ uri: selectedImage.uri }}
                    style={styles.resultThumbnail}
                    contentFit="cover"
                  />
                </View>
  
                <View style={styles.resultBubble}>
                  {/* Title & Buttons */}
                  <View style={styles.resultTitleRow}>
                    <Text style={styles.aiName}>{aiResult.name}</Text>
                    <View style={styles.resultButtons}>
                      <Pressable
                        onPress={() => {
                          const seafoodId = currentAiResponse?.seafoodPO?.seafoodId;
                          if (seafoodId) {
                            addSeafoodToCart(seafoodId);
                          }
                        }}
                        style={styles.resultButton}
                      >
                        <Image
                          source={
                            seafoodCartState
                              ? require('../../assets/images/catch/carted.png')
                              : require('../../assets/images/catch/uncart.png')
                          }
                          style={styles.resultButtonIcon}
                          contentFit="contain"
                        />
                      </Pressable>
                      <Pressable
                        onPress={() => {
                          const seafoodId = currentAiResponse?.seafoodPO?.seafoodId;
                          if (seafoodId) {
                            toggleSeafoodHook(seafoodId);
                          }
                        }}
                        style={styles.resultButton}
                      >
                        <Image
                          source={
                            seafoodHookState
                              ? require('../../assets/images/catch/hooked.png')
                              : require('../../assets/images/catch/unhook.png')
                          }
                          style={styles.resultButtonIcon}
                          contentFit="contain"
                        />
                      </Pressable>
                    </View>
                  </View>

                  {/* Nutrition & Flavor */}
                  <View style={styles.resultSection}>
                    <View style={styles.sectionHeader}>
                      <Image
                        source={require("../../assets/images/catch/nutrition&flavour.png")}
                        style={styles.sectionIcon}
                        contentFit="contain"
                      />
                      <Text style={styles.sectionTitle}>Nutrition & Flavor</Text>
                    </View>
                    <Text style={styles.sectionTextJustified}>
                      {expandedSections.nutrition
                        ? aiResult.fullNutritionFlavor
                        : aiResult.nutritionFlavor}
                    </Text>
                    <Pressable
                      onPress={() => toggleSection("nutrition")}
                      style={styles.viewMoreBtn}
                    >
                      <Text style={styles.viewMoreText}>
                        {expandedSections.nutrition ? "view less" : "view more"}
                      </Text>
                    </Pressable>
                  </View>

                  {/* Recipes */}
                  <View style={styles.resultSection}>
                    <View style={styles.sectionHeader}>
                      <Image
                        source={require("../../assets/images/catch/recipes.png")}
                        style={styles.sectionIcon}
                        contentFit="contain"
                      />
                      <Text style={styles.sectionTitle}>Recommended recipes</Text>
                    </View>
                    {currentAiResponse?.recipePOList?.length ? (
                      <View style={styles.recipesContainer}>
                        {currentAiResponse.recipePOList.map((recipe, index) => {
                          const recipeUri = buildImageUri(recipe.recipeImage);
                          const recipeName = recipe.recipeName || `Recipe ${index + 1}`;
                          const capitalizedName = recipeName.charAt(0).toUpperCase() + recipeName.slice(1);
                          const recipeBrief = recipe.recipeBrief || "";
                          return (
                            <View key={`${recipe.recipeId || index}`} style={styles.recipeItemContainer}>
                              {index > 0 && <View style={styles.recipeSeparator} />}
                              <View style={styles.recipeItemContent}>
                                <Text style={styles.recipeItemTitle}>{capitalizedName}</Text>
                                <View style={styles.recipeItemRow}>
                                  {recipeUri ? (
                                    <Image
                                      source={{ uri: recipeUri }}
                                      style={styles.recipeItemImage}
                                      contentFit="cover"
                                    />
                                  ) : (
                                    <View style={styles.recipeItemImagePlaceholder}>
                                      <Text style={styles.recipeItemImagePlaceholderText}>No Image</Text>
                                    </View>
                                  )}
                                  {expandedSections.recipes && recipeBrief ? (
                                    <Text style={styles.recipeItemDescription}>
                                      {recipeBrief}
                                    </Text>
                                  ) : null}
                                </View>
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    ) : (
                      <Text style={styles.sectionTextJustified}>
                        {expandedSections.recipes
                          ? aiResult.fullRecipes
                          : aiResult.recipes}
                      </Text>
                    )}
                    {currentAiResponse?.recipePOList?.length ? (
                      <Pressable
                        onPress={() => toggleSection("recipes")}
                        style={styles.viewMoreBtn}
                      >
                        <Text style={styles.viewMoreText}>
                          {expandedSections.recipes ? "view less" : "view more"}
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>

                  {/* Ingredients - 修复版本 */}
                  <View style={styles.resultSection}>
                    <View style={styles.sectionHeader}>
                      <Image
                        source={require("../../assets/images/catch/ingredients.png")}
                        style={styles.sectionIcon}
                        contentFit="contain"
                      />
                      <Text style={styles.sectionTitle}>Matching ingredients</Text>
                    </View>
                    <View style={styles.ingredientsRow}>
                      {currentAiResponse?.ingredientPOList?.map((ingredient: IngredientPO, index) => {
                        const ingredientKey = ingredient.ingredientId ?? index;
                        const isInCart = ingredientCartStates.get(ingredientKey) || false;
                        
                        console.log(`Rendering ingredient ${index}:`, {
                          id: ingredient.ingredientId,
                          key: ingredientKey,
                          name: ingredient.ingredientName,
                          isInCart,
                        });
                        
                        return (
                          <View key={ingredientKey} style={styles.ingredientContainer}>
                            <View style={styles.ingredientCircle}>
                              {ingredient.ingredientPic ? (
                                <Text style={styles.ingredientEmoji}>
                                  {ingredient.ingredientPic}
                                </Text>
                              ) : null}
                              <Text style={styles.ingredientText} numberOfLines={2}>
                                {ingredient.ingredientName || `Ingredient ${index + 1}`}
                              </Text>
                            </View>
                            <Pressable
                              style={styles.ingredientCartButton}
                              onPress={() => addIngredientToCart(ingredient, index)}
                            >
                              <Image
                                source={
                                  isInCart
                                    ? require('../../assets/images/catch/carted.png')
                                    : require('../../assets/images/catch/uncart.png')
                                }
                                style={styles.ingredientCartIcon}
                                contentFit="contain"
                              />
                            </Pressable>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                </View>
              </View>
            )}
  
            {/* Loading State */}
            {state === "loading" && (
              <View style={styles.loadingContainer}>
                <View style={styles.loadingBubble}>
                  <Image
                    source={require("../../assets/images/catch/logo.png")}
                    style={styles.fishIconSmall}
                    contentFit="contain"
                  />
                  <Text style={styles.loadingText}>Deep Seeking...</Text>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
  
      {/* Bottom Buttons */}
      <View style={[styles.bottomButtons, { bottom: insets.bottom + 80 }]}>
        <Pressable style={styles.albumButton} onPress={pickImageFromAlbum}>
          <Image
            source={require("../../assets/images/catch/album.png")}
            style={styles.albumIcon}
            contentFit="contain"
          />
        </Pressable>
        <Pressable style={styles.cameraButton} onPress={pickImageFromCamera}>
          <Image
            source={require("../../assets/images/catch/camera.png")}
            style={styles.cameraIcon}
            contentFit="contain"
          />
        </Pressable>
      </View>
    </View>
  );
}

const IMAGE_SIZE = 100;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#9EC8DF",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(14, 32, 72, 0.1)",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0E2048",
  },
  backIcon: {
    width: 24,
    height: 24,
  },
  clearHistoryText: {
    fontSize: 14,
    color: "#FF6B6B",
    fontWeight: "500",
  },
  chatContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  chatContent: {
    paddingTop: 20,
    paddingBottom: 140,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#0E2048",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#6C819E",
  },
  messageGroup: {
    marginBottom: 24,
  },
  userMessage: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginBottom: 8,
    paddingRight: 8,
    gap: 8,
  },
  userThumbnail: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#0E2048",
  },
  thumbnailImage: {
    width: "100%",
    height: "100%",
  },
  timestamp: {
    fontSize: 11,
    color: "#6C819E",
  },
  aiMessage: {
    alignItems: "flex-start",
  },
  aiBubble: {
    backgroundColor: "#FFE8DE",
    borderRadius: 16,
    padding: 12,
    marginLeft: 8,
    marginRight: 48,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  aiName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#0E2048",
    marginBottom: 4,
  },
  aiInfo: {
    fontSize: 13,
    color: "#0E2048",
    lineHeight: 18,
    marginBottom: 4,
    textAlign: "justify",
  },
  ingredientsPreview: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 4,
  },
  miniIngredient: {
    backgroundColor: "#F8B98B",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 4,
    marginBottom: 4,
  },
  miniIngredientText: {
    fontSize: 11,
    color: "#0E2048",
    fontWeight: "600",
  },
  currentResultCard: {
    marginTop: 20,
  },
  resultHeader: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  resultThumbnail: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#0E2048",
  },
  resultHeaderLeft: {
    alignItems: "flex-end",
    gap: 8,
  },
  justNow: {
    fontSize: 11,
    color: "#6C819E",
  },
  resultBubble: {
    backgroundColor: "#FFE8DE",
    borderRadius: 20,
    padding: 20,
    marginLeft: 8,
    marginRight: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  resultTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  resultButtons: {
    flexDirection: "row",
    gap: 12,
  },
  resultButton: {
    padding: 4,
  },
  resultButtonIcon: {
    width: 24,
    height: 24,
  },
  resultSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  sectionIcon: {
    width: 24,
    height: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0E2048",
  },
  sectionText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#0E2048",
    marginBottom: 8,
  },
  sectionTextJustified: {
    fontSize: 14,
    lineHeight: 20,
    color: "#0E2048",
    marginBottom: 8,
    textAlign: "justify",
  },
  viewMoreBtn: {
    alignSelf: "flex-end",
  },
  viewMoreText: {
    fontSize: 12,
    color: "#214E9C",
    textDecorationLine: "underline",
  },
  ingredientsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
    flexWrap: "wrap",
  },
  ingredientContainer: {
    position: "relative",
  },
  ingredientCircle: {
    width: 70,
    height: 70,
    borderRadius: 15,
    backgroundColor: "#F8B98B",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  ingredientText: {
    fontSize: 12,
    color: "#0E2048",
    fontWeight: "600",
    textAlign: "center",
    paddingHorizontal: 4,
  },
  ingredientEmoji: {
    fontSize: 28,
    height: 30,
    textAlign: 'center',
    includeFontPadding: false,
    marginBottom: 2,
  },
  ingredientCartButton: {
    position: "absolute",
    bottom: -4,
    right: -4,
    width: 24,
    height: 24,
    zIndex: 1,
  },
  ingredientCartIcon: {
    width: 24,
    height: 24,
  },
  recipeList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 10,
  },
  recipeCard: {
    width: 90,
    alignItems: "center",
  },
  recipeImage: {
    width: 90,
    height: 70,
    borderRadius: 10,
    marginBottom: 6,
  },
  recipeImagePlaceholder: {
    width: 90,
    height: 70,
    borderRadius: 10,
    backgroundColor: "#E6EDF5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  recipeImagePlaceholderText: {
    fontSize: 11,
    color: "#6C819E",
  },
  recipeName: {
    fontSize: 12,
    color: "#0E2048",
    fontWeight: "600",
  },
  recipesContainer: {
    marginTop: 8,
  },
  recipeItemContainer: {
    marginBottom: 12,
  },
  recipeSeparator: {
    height: 12,
  },
  recipeItemContent: {
    gap: 8,
  },
  recipeItemTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#0E2048",
    textTransform: "capitalize",
  },
  recipeItemRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  recipeItemImage: {
    width: 90,
    height: 70,
    borderRadius: 10,
    flexShrink: 0,
  },
  recipeItemImagePlaceholder: {
    width: 90,
    height: 70,
    borderRadius: 10,
    backgroundColor: "#E6EDF5",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  recipeItemImagePlaceholderText: {
    fontSize: 11,
    color: "#6C819E",
  },
  recipeItemDescription: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: "#0E2048",
    textAlign: "justify",
  },
  loadingContainer: {
    alignItems: "center",
    marginTop: 40,
  },
  loadingBubble: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFE8DE",
    borderRadius: 20,
    paddingHorizontal: 40,
    paddingVertical: 20,
    gap: 12,
  },
  fishIconSmall: {
    width: 20,
    height: 20,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0E2048",
  },
  bottomButtons: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
    paddingHorizontal: 20,
  },
  albumButton: {
    alignItems: "center",
    justifyContent: "center",
    marginRight: -10,
  },
  albumIcon: {
    width: 40,
    height: 40,
  },
  cameraButton: {
    width: 90,
    height: 90,
    borderRadius: 50,
    backgroundColor: "#F8B98B",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 39,
  },
  cameraIcon: {
    width: 45,
    height: 45,
  },
});