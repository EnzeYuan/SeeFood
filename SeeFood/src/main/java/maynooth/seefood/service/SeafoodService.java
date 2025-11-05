package maynooth.seefood.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import maynooth.seefood.pojo.PO.SeafoodPO;

import java.util.List;

public interface SeafoodService {


    int putViews(int seafoodId) throws JsonProcessingException;

    List<SeafoodPO> getTop() throws JsonProcessingException;

    List<SeafoodPO> getSeafoodsBySeason(int month) throws JsonProcessingException;
}
