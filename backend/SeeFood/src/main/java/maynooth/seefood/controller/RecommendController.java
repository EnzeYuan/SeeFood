package maynooth.seefood.controller;

import com.fasterxml.jackson.core.JsonProcessingException;
import maynooth.seefood.pojo.LoginUser;
import maynooth.seefood.pojo.PO.RatingPO;
import maynooth.seefood.pojo.PO.SeafoodPO;
import maynooth.seefood.pojo.Result;
import maynooth.seefood.service.RecommendService;
import maynooth.seefood.service.SeafoodService;
import maynooth.seefood.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("seefood/recommend")
public class RecommendController {

    @Autowired
    private RecommendService recommendService;
    @Autowired
    private SeafoodService seafoodService;

    @PostMapping("/addrating")
    public Result addUserBehavior(@AuthenticationPrincipal LoginUser loginUser,@RequestBody RatingPO ratingPO) {

        boolean success = recommendService.addUserBehavior(loginUser,ratingPO);
        if (success) {
            return new Result(200, "Success", success);
        } else {
            return new Result(400, "failed", success);
        }
    }

    @GetMapping("/getpersonalrecommendation")
    public Result getPersonalRecommend(@AuthenticationPrincipal LoginUser loginUser) throws JsonProcessingException {
        long userId = loginUser.getUserId();
        List<SeafoodPO> seafoodPOS = recommendService.recommendItems(userId, 50);
        if (seafoodPOS.size() < 3) {
            return new Result(200, "Success",seafoodService.getTop());
        }
        return new Result(200, "Success", seafoodPOS);
    }


}
