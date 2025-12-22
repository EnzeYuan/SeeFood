package maynooth.seefood.pojo.PO;


import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class RatingPO {
    private int ratingId;
    private Long userId;
    private Integer seafoodId;
    // 行为权重（1=浏览，2=喜欢，3=购物车，5=下单）
    private Integer behaviorWeight;
}
