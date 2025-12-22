import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface TideBlockProps {
  id: string;
  title: string;
  description: string;
  backgroundImage?: number | { uri: string }; // 修改为支持本地和远程图片
  onPress?: () => void;
}

export default function TideBlock({
  id,
  title,
  description,
  backgroundImage,
  onPress,
}: TideBlockProps) {
  const router = useRouter();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push(`/tide/detail?id=${id}` as any);
    }
  };

  // 直接使用 backgroundImage，不需要转换
  const imageSource = backgroundImage
    ? backgroundImage
    : require("../assets/images/tide/firstBlock.png");

  return (
    <Pressable style={styles.container} onPress={handlePress}>
      <Image
        source={imageSource} // 直接传递给 expo-image
        style={styles.backgroundImage}
        contentFit="cover"
      />
      <View style={styles.overlay}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
        <View style={styles.dots}>
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 200,
    borderRadius: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    overflow: "hidden",
  },
  backgroundImage: {
    width: "100%",
    height: "100%",
    position: "absolute",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(14, 32, 72, 0.85)",
    padding: 20,
    justifyContent: "space-between",
  },
  title: {
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
  },
  description: {
    color: "white",
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  dots: {
    flexDirection: "row",
    alignSelf: "flex-end",
    gap: 6,
    marginTop: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
  },
  dotActive: {
    backgroundColor: "white",
  },
});
