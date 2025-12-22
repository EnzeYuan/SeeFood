package maynooth.seefood.pojo.PO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;


@Data
@AllArgsConstructor
@NoArgsConstructor
@ToString
public class SeafoodPO {
    private Integer seafoodId;
    private String seafoodName;
    private String seafoodBrief;
    private String seafoodImage;
    private int views;
    private int season;
    private String tags;
    private double cost;
}
