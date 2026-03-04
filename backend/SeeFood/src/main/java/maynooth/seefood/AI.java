package maynooth.seefood;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.annotations.SerializedName;
import maynooth.seefood.pojo.AIResponse;
import maynooth.seefood.pojo.PO.IngredientPO;
import maynooth.seefood.pojo.PO.RecipePO;
import maynooth.seefood.pojo.PO.SeafoodPO;
import okhttp3.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.net.ssl.*;
import java.io.*;
import java.net.InetSocketAddress;
import java.net.Proxy;
import java.security.cert.X509Certificate;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.concurrent.TimeUnit;

// 封装Gemini请求的结构
class GeminiRequest {
    private Content[] contents;

    public GeminiRequest(Content[] contents) {
        this.contents = contents;
    }
}

class Content {
    private String role = "user";
    private Part[] parts;

    public Content(Part[] parts) {
        this.parts = parts;
    }
}

class Part {
    private String text;
    private InlineData inlineData;

    public Part(String text) {
        this.text = text;
    }

    public Part(InlineData inlineData) {
        this.inlineData = inlineData;
    }
}

class InlineData {
    private String mimeType;
    private String data;

    public InlineData(String mimeType, String data) {
        this.mimeType = mimeType;
        this.data = data;
    }
}

// 封装 Imagen请求的结构(适配:predict端点)
class ImagenRequest {
    private Instance[] instances; // 包含 Prompt
    private Parameters parameters; // 包含配置

    public ImagenRequest(String prompt) {
        // 创建配置实例
        this.parameters = new Parameters();
        // 创建 Prompt 实例
        this.instances = new Instance[]{new Instance(prompt)};
    }
}

class Instance {
    private String prompt;

    public Instance(String prompt) {
        this.prompt = prompt;
    }
}

class Parameters {
    private int sampleCount = 1; // 对应 numberOfImages
    private String outputMimeType = "image/jpeg";
    private String aspect_ratio = "1:1";
    // 注意：部分新模型的参数可能不同，但这些是常见的参数
}

// 封装 Imagen API 响应的结构
class ImagenResponse {
    // 关键修正 1：将 generatedImages 替换为 predictions
    @SerializedName("predictions")
    public ImagePrediction[] predictions;
}

// 定义 ImagePrediction 类来匹配 predictions 数组中的对象
class ImagePrediction {
    // 关键修正 2：保持 Base64 字段的正确映射
    @SerializedName("bytesBase64Encoded")
    public String image; // Java 代码中存储 Base64 的字段
}

// JSON包装辅助类
class JsonWrapper {
    String base64;
}

public class AI {
    private static final Logger logger = LoggerFactory.getLogger(AI.class);
  //  private static final String GEMINI_API_KEY = "AIzaSyB7J1kLiztcAze7Llv-E7OZu0X7Z3QeShw";
    private static final String MODEL_NAME = "gemini-2.5-flash";
    private static final String GEMINI_API_URL =
            "https://generativelanguage.googleapis.com/v1/models/" +
                    MODEL_NAME + ":generateContent?key=" + GEMINI_API_KEY;

    // 新增：Imagen Model 和 URL 配置
    private static final String IMAGEN_MODEL_NAME = "imagen-4.0-generate-001";
    private static final String IMAGEN_API_URL =
            "https://generativelanguage.googleapis.com/v1beta/models/" +
                    IMAGEN_MODEL_NAME + ":predict?key=" + GEMINI_API_KEY;

    // 新增：图片输出目录配置（可通过系统属性覆盖，默认空表示不保存本地）
    private static final String IMAGE_OUTPUT_DIR = System.getProperty("seafood.image.output.dir", "");
    // 控制是否保存生成的图片（默认false，工具类模式下不强制保存）
    private static final boolean SAVE_GENERATED_IMAGES = Boolean.getBoolean("seafood.image.save");

    public static String callAI(String base64Input) {
        try {
            // 核心修复：提取纯Base64数据（保留原有功能）
            String cleanBase64 = extractPureBase64(base64Input);
            logger.info("Base64清理完成 - 原长度: {}, 清理后长度: {}",
                    base64Input.length(), cleanBase64.length());
            String originalImageBase64 = cleanBase64;
            String prompt = buildPrompt();
            logger.info("开始调用Gemini API...");

            // Step 1: 调用Gemini API获取文本数据（包含23个字段）
            String geminiResponse = callGeminiApi(originalImageBase64, prompt);
            if (geminiResponse == null || geminiResponse.trim().isEmpty()) {
                throw new RuntimeException("Gemini API返回空响应");
            }

            // Step 2: 解析Gemini响应（包含配菜emoji字段）
            AIResponse result = parseGeminiResponse(geminiResponse, originalImageBase64);

            // Step 3: 调用Imagen API生成图片并替换
            // 3.1 生成海鲜图片
            generateAndReplaceSeafoodImage(result, originalImageBase64);
            // 3.2 生成菜谱图片
            generateAndReplaceRecipeImages(result);

            // Step 4: 序列化结果为JSON
            Gson gson = new GsonBuilder()
                    .setPrettyPrinting()
                    .disableHtmlEscaping()
                    .create();
            String finalJson = gson.toJson(result);
            logger.info("AI调用成功，返回JSON长度: {}", finalJson.length());
            return finalJson;

        } catch (Exception e) {
            logger.error("AI调用失败: {}", e.getMessage(), e);
            return null; // 返回null让Controller捕获处理
        }
    }

    /**
     * 核心修复：清理Base64数据（保留原有功能）
     * 处理三种情况：
     * 1. JSON包装: {"base64":"data:image/..."}
     * 2. Data URI: data:image/jpeg;base64,/9j/4AAQ...
     * 3. 纯Base64: /9j/4AAQSkZJRg...
     */
    private static String extractPureBase64(String input) {
        if (input == null) {
            throw new IllegalArgumentException("Base64输入不能为空");
        }
        String cleaned = input.trim();
        // 情况1: 移除JSON包装（如果存在）
        if (cleaned.startsWith("{") && cleaned.contains("\"base64\"")) {
            try {
                Gson gson = new Gson();
                JsonWrapper wrapper = gson.fromJson(cleaned, JsonWrapper.class);
                if (wrapper != null && wrapper.base64 != null) {
                    cleaned = wrapper.base64.trim();
                    logger.debug("已移除JSON包装");
                }
            } catch (Exception e) {
                logger.warn("解析JSON包装失败，尝试其他方式: {}", e.getMessage());
            }
        }
        // 情况2: 移除Data URI前缀
        if (cleaned.contains(",")) {
            String[] parts = cleaned.split(",", 2);
            if (parts.length == 2) {
                cleaned = parts[1].trim();
                logger.debug("已移除Data URI前缀");
            }
        }
        // 验证是否为有效的Base64字符
        if (!cleaned.matches("^[A-Za-z0-9+/]*={0,2}$")) {
            logger.warn("Base64数据包含非法字符，可能导致API调用失败");
        }
        return cleaned;
    }

    /**
     * 构建Prompt（新增3个配菜emoji字段，总字段数23个）
     */
    private static String buildPrompt() {
        return "识别图片中的海鲜，详细信息按照以下要求返回（共23个字段，用分号分隔，每个字段仅含单一信息，无额外分号）：" +
                "1. 海鲜名称：准确名称，例如“帝王蟹”\n" +
                "2. 海鲜简介：100字以内的描述\n" +
                "3. 标签信息：FISH,  CRUSTACEN,  MOLLUSK, SHELLFISH四选一放在第一个，生成其他跟该海鲜相关的标签，每个标签之间用斜杠/隔开\n" +
                "4. 平均价格：中国市场的平均价格，单位元/公斤，保留两位小数，例如188.00\n" +
                "5. 季节月份：中国市场的时令月份，从1-12月选择一个，例如4\n" +
                "6. 菜谱1名称：第一个菜谱的名称\n" +
                "7. 菜谱1简介：第一个菜谱的详细做法\n" +
                "8. 菜谱1图片URL：第一个菜谱的图片URL，尺寸350*400左右\n" +
                "9. 菜谱2名称：第二个菜谱的名称\n" +
                "10. 菜谱2简介：第二个菜谱的详细做法\n" +
                "11. 菜谱2图片URL：第二个菜谱的图片URL\n" +
                "12. 菜谱3名称：第三个菜谱的名称\n" +
                "13. 菜谱3简介：第三个菜谱的详细做法\n" +
                "14. 菜谱3图片URL：第三个菜谱的图片URL\n" +
                "15. 配菜1名称：第一个配菜的名称\n" +
                "16. 配菜2名称：第二个配菜的名称\n" +
                "17. 配菜3名称：第三个配菜的名称\n" +
                "18. 配菜1价格：中国市场平均价格，单位元/公斤，保留两位小数\n" +
                "19. 配菜2价格：同上\n" +
                "20. 配菜3价格：同上\n" +
                "21. 配菜1的emoji图案\n" +
                "22. 配菜2的emoji图案\n" +
                "23. 配菜3的emoji图案\n" +
                "用英文回答，仅用分号；分隔23个字段，不添加任何额外说明，确保字段顺序完全一致。";
    }

    /**
     * 调用Imagen API生成图片Base64
     */
    private static String callImagenApi(String imagePrompt) throws IOException {
        OkHttpClient client = getHttpClient();
        MediaType mediaType = MediaType.parse("application/json; charset=utf-8");
        Gson gson = new Gson();
        ImagenRequest requestBody = new ImagenRequest(imagePrompt);
        String requestJson = gson.toJson(requestBody);

        logger.info("call Imagen API - Prompt: {}",
                imagePrompt.substring(0, Math.min(imagePrompt.length(), 60)));
        Request request = new Request.Builder()
                .url(IMAGEN_API_URL)
                .post(RequestBody.create(mediaType, requestJson))
                .addHeader("Content-Type", "application/json")
                .build();

        long startTime = System.currentTimeMillis();
        try (Response response = client.newCall(request).execute()) {
            long costTime = System.currentTimeMillis() - startTime;
            if (!response.isSuccessful()) {
                String errorBody = response.body() != null ? response.body().string() : "无错误体";
                logger.error("Imagen API调用失败 - code: {}, time: {}ms, msg: {}",
                        response.code(), costTime, errorBody);
                return "";
            }

            String responseBody = response.body().string();
            ImagenResponse imagenResponse = gson.fromJson(responseBody, ImagenResponse.class);
            // 检查响应数据有效性
            if (imagenResponse != null && imagenResponse.predictions != null && imagenResponse.predictions.length > 0) {
                String base64 = imagenResponse.predictions[0].image;
                if (base64 != null && !base64.isEmpty()) {
                    logger.info("Imagen API生成图片成功 - time: {}ms, Base64 length: {}",
                            costTime, base64.length());
                    return base64;
                } else {
                    logger.warn("Imagen API响应成功，但Base64字段为空");
                    logger.debug("Imagen API完整响应: {}", responseBody.substring(0, Math.min(responseBody.length(), 1000)));
                }
            } else {
                logger.warn("Imagen API响应成功，但predictions数组为空");
                logger.debug("Imagen API完整响应: {}", responseBody.substring(0, Math.min(responseBody.length(), 1000)));
            }
            return "";
        } catch (Exception e) {
            long costTime = System.currentTimeMillis() - startTime;
            logger.error("Imagen API请求异常 - 耗时: {}ms, 错误: {}", costTime, e.getMessage(), e);
            return "";
        }
    }

    /**
     * 生成并替换海鲜图片
     */
    private static void generateAndReplaceSeafoodImage(AIResponse result, String originalImageBase64) {
        try {
            SeafoodPO seafoodPO = result.getSeafoodPO();
            String seafoodName = seafoodPO.getSeafoodName();
            if ("未识别海鲜".equals(seafoodName)) {
                logger.warn("海鲜未识别，跳过Imagen海鲜图片生成");
                seafoodPO.setSeafoodImage(originalImageBase64);
                return;
            }

            // 构建海鲜图片生成Prompt
            String seafoodPrompt = String.format("%s on ice, studio photo, 350*400, seafood photography, high resolution",
                    seafoodName);
            String generatedSeafoodImageBase64 = callImagenApi(seafoodPrompt);

            if (!generatedSeafoodImageBase64.isEmpty()) {
                // 替换为生成的图片Base64
                seafoodPO.setSeafoodImage(generatedSeafoodImageBase64);
                // 可选保存本地图片
                if (SAVE_GENERATED_IMAGES && !IMAGE_OUTPUT_DIR.isEmpty()) {
                    decodeAndSaveBase64Image(generatedSeafoodImageBase64,
                            String.format("%s_Seafood.jpg", seafoodName.replaceAll("[^a-zA-Z0-9]", "_")));
                }
                logger.debug("海鲜图片替换为Imagen生成的Base64");
            } else {
                // 生成失败，保留原始图片
                seafoodPO.setSeafoodImage(originalImageBase64);
                logger.warn("海鲜图片生成失败，保留原始图片Base64");
            }
        } catch (Exception e) {
            logger.error("生成海鲜图片失败", e);
            result.getSeafoodPO().setSeafoodImage(originalImageBase64);
        }
    }

    /**
     * 生成并替换菜谱图片
     */
    private static void generateAndReplaceRecipeImages(AIResponse result) {
        try {
            List<RecipePO> recipePOs = result.getRecipePOList();
            int recipeCount = 1;
            for (RecipePO recipe : recipePOs) {
                String recipeName = recipe.getRecipeName();
                if ("默认菜谱".equals(recipeName.substring(0, 4))) {
                    logger.warn("菜谱为默认值，跳过Imagen菜谱图片生成 - 菜谱名称: {}", recipeName);
                    continue;
                }

                // 构建菜谱图片生成Prompt
                String recipePrompt = String.format("%s finished dish, plated, white background, food photography, 70*80, high resolution",
                        recipeName);
                String generatedRecipeImageBase64 = callImagenApi(recipePrompt);

                if (!generatedRecipeImageBase64.isEmpty()) {
                    // 替换为生成的图片Base64
                    recipe.setRecipeImage(generatedRecipeImageBase64);
                    // 可选保存本地图片
                    if (SAVE_GENERATED_IMAGES && !IMAGE_OUTPUT_DIR.isEmpty()) {
                        decodeAndSaveBase64Image(generatedRecipeImageBase64,
                                String.format("%s_Recipe%d.jpg", recipeName.replaceAll("[^a-zA-Z0-9]", "_"), recipeCount));
                    }
                    logger.debug("菜谱图片替换为Imagen生成的Base64 - 菜谱名称: {}", recipeName);
                } else {
                    // 生成失败，设置为空字符串
                    recipe.setRecipeImage("");
                    logger.warn("菜谱图片生成失败 - 菜谱名称: {}", recipeName);
                }
                recipeCount++;
            }
        } catch (Exception e) {
            logger.error("生成菜谱图片失败", e);
        }
    }

    /**
     * 将Base64字符串解码为图片并保存到本地
     */
    private static void decodeAndSaveBase64Image(String base64Data, String fileName) throws IOException {
        if (base64Data == null || base64Data.isEmpty()) {
            logger.warn("Base64数据为空，跳过图片保存: {}", fileName);
            return;
        }

        File outputDir = new File(IMAGE_OUTPUT_DIR);
        if (!outputDir.exists()) {
            boolean mkdirsSuccess = outputDir.mkdirs();
            if (!mkdirsSuccess) {
                logger.error("创建图片输出目录失败: {}", IMAGE_OUTPUT_DIR);
                return;
            }
        }

        File outputFile = new File(outputDir, fileName);
        try {
            // Base64解码
            byte[] imageBytes = Base64.getDecoder().decode(base64Data);
            // 写入文件
            try (OutputStream stream = new FileOutputStream(outputFile)) {
                stream.write(imageBytes);
            }
            logger.info("图片已保存至: {}", outputFile.getAbsolutePath());
        } catch (IllegalArgumentException e) {
            logger.error("Base64数据解码失败 - 文件名: {}, 错误: {}", fileName, e.getMessage());
        }
    }

    /**
     * 获取HTTP客户端（保留原有配置，复用给Imagen API）
     */
    private static OkHttpClient getHttpClient() {
        try {
            final TrustManager[] trustAllCerts = new TrustManager[]{
                    new X509TrustManager() {
                        @Override
                        public void checkClientTrusted(X509Certificate[] chain, String authType) {
                        }

                        @Override
                        public void checkServerTrusted(X509Certificate[] chain, String authType) {
                        }

                        @Override
                        public X509Certificate[] getAcceptedIssuers() {
                            return new X509Certificate[]{};
                        }
                    }
            };
            SSLContext sslContext = SSLContext.getInstance("TLSv1.2");
            sslContext.init(null, trustAllCerts, new java.security.SecureRandom());
            SSLSocketFactory sslSocketFactory = sslContext.getSocketFactory();

            Proxy proxy = null;
            String proxyHost = System.getProperty("http.proxyHost");
            String proxyPort = System.getProperty("http.proxyPort");
            if (proxyHost != null && proxyPort != null) {
                proxy = new Proxy(Proxy.Type.HTTP, new InetSocketAddress(proxyHost, Integer.parseInt(proxyPort)));
            } else {
                proxy = new Proxy(Proxy.Type.SOCKS, new InetSocketAddress("127.0.0.1", 7897));
            }

            return new OkHttpClient.Builder()
                    .proxy(proxy)
                    .sslSocketFactory(sslSocketFactory, (X509TrustManager) trustAllCerts[0])
                    .hostnameVerifier((hostname, session) -> true)
                    .connectTimeout(30, TimeUnit.SECONDS)
                    .readTimeout(30, TimeUnit.SECONDS)
                    .writeTimeout(30, TimeUnit.SECONDS)
                    .build();
        } catch (Exception e) {
            logger.error("创建HTTP客户端失败: {}", e.getMessage());
            return new OkHttpClient.Builder().build();
        }
    }

    /**
     * 调用Gemini API（保留原有逻辑）
     */
    private static String callGeminiApi(String imageBase64, String prompt) throws IOException {
        OkHttpClient client = getHttpClient();
        MediaType mediaType = MediaType.parse("application/json; charset=utf-8");
        logger.info("构建Gemini请求 - 图片Base64长度: {}, Prompt长度: {}",
                imageBase64.length(), prompt.length());

        InlineData imageData = new InlineData("image/jpeg", imageBase64);
        Part imagePart = new Part(imageData);
        Part textPart = new Part(prompt);
        Content content = new Content(new Part[]{imagePart, textPart});
        GeminiRequest requestBody = new GeminiRequest(new Content[]{content});
        Gson gson = new Gson();
        String requestJson = gson.toJson(requestBody);

        logger.info("发送请求到Gemini API - URL: {}, JSON长度: {}", GEMINI_API_URL, requestJson.length());
        Request request = new Request.Builder()
                .url(GEMINI_API_URL)
                .post(RequestBody.create(mediaType, requestJson))
                .addHeader("Content-Type", "application/json")
                .build();

        long startTime = System.currentTimeMillis();
        try (Response response = client.newCall(request).execute()) {
            long costTime = System.currentTimeMillis() - startTime;
            logger.info("Gemini API响应 - 状态码: {}, 耗时: {}ms", response.code(), costTime);

            if (!response.isSuccessful()) {
                String errorBody = response.body() != null ? response.body().string() : "无错误体";
                logger.error("Gemini API调用失败 - HTTP {}: {}", response.code(), errorBody);
                throw new IOException("HTTP " + response.code() + ": " + errorBody);
            }

            String responseBody = response.body().string();
            logger.debug("Gemini响应体长度: {}", responseBody.length());
            return responseBody;
        } catch (Exception e) {
            long costTime = System.currentTimeMillis() - startTime;
            logger.error("Gemini API请求异常 - 耗时: {}ms, 错误: {}", costTime, e.getMessage(), e);
            throw new IOException("调用Gemini API失败", e);
        }
    }

    // Gemini API响应数据结构（保留原有）
    static class GeminiApiResponse {
        private Candidate[] candidates;

        static class Candidate {
            private Content content;
        }

        static class Content {
            private ApiPart[] parts;
        }

        static class ApiPart {
            private String text;
        }
    }

    /**
     * 解析Gemini响应（新增配菜emoji字段处理）
     */
    private static AIResponse parseGeminiResponse(String geminiResponse, String originalImageBase64) {
        SeafoodPO seafoodPO = new SeafoodPO();
        List<RecipePO> recipePOs = new ArrayList<>();
        List<IngredientPO> ingredientPOs = new ArrayList<>();

        try {
            Gson gson = new Gson();
            GeminiApiResponse apiResponse = gson.fromJson(geminiResponse, GeminiApiResponse.class);
            String responseText = "";

            // 提取Gemini响应文本
            if (apiResponse != null && apiResponse.candidates != null && apiResponse.candidates.length > 0) {
                GeminiApiResponse.Candidate candidate = apiResponse.candidates[0];
                if (candidate != null && candidate.content != null && candidate.content.parts != null && candidate.content.parts.length > 0) {
                    responseText = candidate.content.parts[0].text;
                }
            }

            if (responseText == null || responseText.trim().isEmpty()) {
                throw new RuntimeException("Gemini响应文本为空");
            }

            logger.debug("Gemini响应文本长度: {}", responseText.length());
            String[] parts = responseText.split(";");

            // 字段数检查（从20改为23）
            if (parts.length >= 23) {
                // 填充海鲜信息（保留原有逻辑）
                seafoodPO.setSeafoodName(parts[0].trim());
                seafoodPO.setSeafoodBrief(parts[1].trim());
                seafoodPO.setTags(parts[2].trim());
                try {
                    seafoodPO.setCost(Double.parseDouble(parts[3].trim()));
                } catch (NumberFormatException e) {
                    logger.warn("解析价格失败: {}", parts[3]);
                    seafoodPO.setCost(0.0);
                }
                try {
                    int season = Integer.parseInt(parts[4].trim());
                    seafoodPO.setSeason(season >= 1 && season <= 12 ? season : 1);
                } catch (NumberFormatException e) {
                    logger.warn("解析季节失败: {}", parts[4]);
                    seafoodPO.setSeason(1);
                }
                // 海鲜图片先设为原始Base64，后续会被Imagen生成的替换
                seafoodPO.setSeafoodImage(originalImageBase64);
                seafoodPO.setViews(0);

                // 填充菜谱信息（保留原有逻辑）
                for (int i = 0; i < 3; i++) {
                    RecipePO recipe = new RecipePO();
                    int nameIndex = 5 + i * 3;
                    int briefIndex = nameIndex + 1;
                    int imageIndex = nameIndex + 2;

                    recipe.setRecipeName(parts[nameIndex].trim());
                    recipe.setRecipeBrief(parts[briefIndex].trim());
                    // 菜谱图片先设为空，后续会被Imagen生成的替换
                    recipe.setRecipeImage("");
                    recipePOs.add(recipe);
                }

                // 填充食材信息（新增emoji字段处理）
                for (int i = 0; i < 3; i++) {
                    IngredientPO ingredient = new IngredientPO();
                    int nameIndex = 14 + i;      // 配菜名称：15-17
                    int priceIndex = 17 + i;     // 配菜价格：18-20
                    int emojiIndex = 20 + i;     // 配菜emoji：21-23

                    // 配菜名称
                    ingredient.setIngredientName(
                            nameIndex < parts.length ? parts[nameIndex].trim() : "默认配菜" + (i + 1)
                    );

                    // 配菜价格
                    try {
                        ingredient.setIngredientPrice(
                                priceIndex < parts.length ? Double.parseDouble(parts[priceIndex].trim()) : 0.0
                        );
                    } catch (NumberFormatException e) {
                        ingredient.setIngredientPrice(0.0);
                    }

                    // 配菜emoji（新增）
                    if (emojiIndex < parts.length && parts[emojiIndex].trim().length() > 0) {
                        ingredient.setIngredientPic(parts[emojiIndex].trim());
                    } else {
                        ingredient.setIngredientPic("🥗"); // 默认emoji
                    }

                    ingredientPOs.add(ingredient);
                }
            } else {
                logger.warn("响应字段不足23个，使用默认值 - 实际字段数: {}", parts.length);
                setDefaultValues(seafoodPO, recipePOs, ingredientPOs, originalImageBase64);
            }
        } catch (Exception e) {
            logger.error("解析Gemini响应失败: {}", e.getMessage(), e);
            setDefaultValues(seafoodPO, recipePOs, ingredientPOs, originalImageBase64);
        }

        return new AIResponse(seafoodPO, recipePOs, ingredientPOs);
    }

    /**
     * 设置默认值（新增配菜emoji默认值）
     */
    private static void setDefaultValues(SeafoodPO seafoodPO, List<RecipePO> recipePOs, List<IngredientPO> ingredientPOs, String originalImageBase64) {
        logger.info("设置默认值");
        // 海鲜默认值
        seafoodPO.setSeafoodName("未识别海鲜");
        seafoodPO.setSeafoodBrief("无描述");
        seafoodPO.setTags("FISH,未知");
        seafoodPO.setCost(0.0);
        seafoodPO.setSeason(1);
        seafoodPO.setSeafoodImage(originalImageBase64);
        seafoodPO.setViews(0);

        // 菜谱默认值
        for (int i = 0; i < 3; i++) {
            RecipePO recipe = new RecipePO();
            recipe.setRecipeName("默认菜谱" + (i + 1));
            recipe.setRecipeBrief("无详细做法");
            recipe.setRecipeImage(""); // 默认空，生成失败时保持
            recipePOs.add(recipe);
        }

        // 食材默认值（新增emoji默认值）
        for (int i = 0; i < 3; i++) {
            IngredientPO ingredient = new IngredientPO();
            ingredient.setIngredientName("默认配菜" + (i + 1));
            ingredient.setIngredientPrice(0.0);
            ingredient.setIngredientPic("🥗"); // 默认emoji
            ingredientPOs.add(ingredient);
        }
    }
}
