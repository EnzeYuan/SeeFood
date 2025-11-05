package maynooth.seefood.controller;


import maynooth.seefood.pojo.Result;
import maynooth.seefood.service.SeafoodServiceImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;



@RestController
@RequestMapping("seefood/seafood")
public class SeafoodController {
    @Autowired
    SeafoodServiceImpl seafoodService;

    //update views for the seefood
    @PutMapping("/views/{seafoodId}")
    public Result views(@PathVariable int seafoodId){
        return new Result(200,"success",seafoodService.putViews(seafoodId));
    }

    @GetMapping("/getPopular")
    public Result getPopular(){
        return new Result(200,"Successful",seafoodService.getTop());
    }

    @GetMapping("/getSeason")
    public Result getBySeason(){
        int month = LocalDate.now().getMonthValue();
        return new Result(200,"Success",seafoodService.getSeafoodsBySeason(month));
    }
}
