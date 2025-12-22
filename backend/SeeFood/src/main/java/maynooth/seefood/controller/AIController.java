package maynooth.seefood.controller;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import maynooth.seefood.AI;
import maynooth.seefood.pojo.AIResponse;
import maynooth.seefood.pojo.PO.IngredientPO;
import maynooth.seefood.pojo.PO.RecipePO;
import maynooth.seefood.pojo.PO.SeafoodPO;
import maynooth.seefood.pojo.Result;
import maynooth.seefood.service.AIService;
import maynooth.seefood.mapper.SeafoodMapper;
import maynooth.seefood.mapper.RecipeMapper;
import maynooth.seefood.mapper.IngredientMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.List;
import java.util.StringJoiner;

@RestController
@RequestMapping("/seefood/ai")
public class AIController {

    private static final Logger logger = LoggerFactory.getLogger(AIController.class);

    @Autowired
    private ObjectMapper objectMapper;
    // JSON解析器

    @Autowired
    private SeafoodMapper seafoodMapper;
    // 海鲜数据访问层

    @Autowired
    private RecipeMapper recipeMapper;
    // 食谱数据访问层

    @Autowired
    private IngredientMapper ingredientMapper;
    // 食材数据访问层

//    @Autowired
//    private AIService aiService;
//    // AI服务封装类

    /**
     * 上传图片并获取AI识别的海鲜信息、食谱和食材
     * @param base64 图片的base64编码
     * @return 包含AI识别结果的标准响应
     */
    @PostMapping("/pic")
    @Transactional(rollbackFor = Exception.class) // 事务管理，出错时回滚
    public Result addPic(@RequestBody String base64) {
        Result result = new Result();
        result.setCode(200);
        result.setMessage("Success");

        try {
            // 1. 调用AI服务识别图片
            logger.info("Initiating AI service for image recognition");
            String responseJson = AI.callAI(base64);
            logger.debug("AI Raw Response: {}", responseJson);

            // 2. 将JSON字符串转换为AIResponse对象
            AIResponse aiResponse = objectMapper.readValue(responseJson, AIResponse.class);
            System.out.println("============================================================================");
            System.out.println(aiResponse);
            System.out.println("============================================================================");

            // 验证必要数据
            if (aiResponse == null || aiResponse.getSeafoodPO() == null) {
                throw new IllegalArgumentException("AI Response Data Invalid: Missing Seafood Information");
            }

            // 3. 保存海鲜信息到数据库
            logger.info("Save Seafood Information: {}", aiResponse.getSeafoodPO().getSeafoodName());
            SeafoodPO seafoodPO = aiResponse.getSeafoodPO();
            String tags = seafoodPO.getTags();
            String[] split = tags.split("/");
            StringJoiner stringJoiner = new StringJoiner(",");
            for (String s : split) {
                stringJoiner.add(s);
            }
            seafoodPO.setTags(stringJoiner.toString());
            int seafoodRows = seafoodMapper.addSeafood(seafoodPO);
            int seafoodId = seafoodPO.getSeafoodId();
            if (seafoodRows <= 0) {
                throw new RuntimeException("Seafood Information Save Failed");
            }

            List<Integer> recipeIds =  new ArrayList<>();

            // 4. 遍历并保存食谱列表
            List<RecipePO> recipeList = aiResponse.getRecipePOList();
            if (recipeList != null && !recipeList.isEmpty()) {
                logger.info("Start Saving {} recipes", recipeList.size());
                for (RecipePO recipe : recipeList) {
                    System.out.println("------------------------------------------------------");
                    System.out.println(recipe);
                    System.out.println("------------------------------------------------------");
                    int recipeRows = recipeMapper.addRecipe(recipe);
                    recipeIds.add(recipe.getRecipeId());
                    if (recipeRows <= 0) {
                        logger.warn("Recipe Save Failed: {}", recipe.getRecipeName());
                    }
                }
            }

            recipeIds.forEach(id -> {
                recipeMapper.addCooking(seafoodId,id);
            });

//            // 5. 遍历并保存食材列表
//            List<IngredientPO> ingredientList = aiResponse.getIngredientPOList();
//            if (ingredientList != null && !ingredientList.isEmpty()) {
//                logger.info("开始保存{}个食材", ingredientList.size());
//                for (IngredientPO ingredient : ingredientList) {
//                    System.out.println("------------------------------------------------------");
//                    System.out.println(ingredient);
//                    System.out.println("------------------------------------------------------");
//                    int ingredientRows = ingredientMapper.addIngredient(ingredient);
//                    if (ingredientRows <= 0) {
//                        logger.warn("食材保存失败: {}", ingredient.getIngredientName());
//                    }
//                }
//            }

            // 6. 将AIResponse对象返回给前端
            System.out.println(aiResponse);
            result.setData(aiResponse);
            logger.info("Image Recognition and Data Save Completed");

        } catch (JsonProcessingException e) {
            // JSON解析异常处理
            logger.error("JSON Parsing Failed: ", e);
            result.setCode(500);
            result.setMessage("Data Format Error: " + e.getMessage());
        } catch (IllegalArgumentException e) {
            // 参数验证异常处理
            logger.error("Parameter Validation Failed: ", e);
            result.setCode(400);
            result.setMessage(e.getMessage());
        } catch (Exception e) {
            // 其他异常处理
            logger.error("Error Occurred While Processing Request: ", e);
            result.setCode(500);
            result.setMessage("Internal Server Error:" + e.getMessage());
        }

        return result;
    }
}