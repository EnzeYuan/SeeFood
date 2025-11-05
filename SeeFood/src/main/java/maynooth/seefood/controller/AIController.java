package maynooth.seefood.controller;

import maynooth.seefood.pojo.PO.RecipePO;
import maynooth.seefood.pojo.PO.SeafoodPO;
import maynooth.seefood.pojo.Result;
import maynooth.seefood.service.AIServiceImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/seefood/ai")
public class AIController {
    @Autowired
    AIServiceImpl aiService;

    @PostMapping("/addseafood")
    public Result addSeafood(SeafoodPO seafoodPO) {
        return new Result(200,"Successful",aiService.addSeafood(seafoodPO));
    }

    @PostMapping("/addRecipe")
    public Result addRecipe(List<RecipePO> recipePOs) {
        return new Result(200,"Successful",aiService.addRecipe(recipePOs));
    }
}
