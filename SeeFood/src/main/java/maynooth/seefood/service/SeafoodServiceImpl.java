package maynooth.seefood.service;

import maynooth.seefood.mapper.SeafoodMapper;
import maynooth.seefood.pojo.PO.SeafoodPO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class SeafoodServiceImpl implements SeafoodService {

    @Autowired
    SeafoodMapper seafoodMapper;

    @Override
    public int putViews(int seafoodId) {
        return seafoodMapper.putViews(seafoodId);
    }
    //gte popular ones
    @Override
    public List<SeafoodPO> getTop() {
        return seafoodMapper.getSeafoodInPopularity();
    }

    @Override
    public List<SeafoodPO> getSeafoodsBySeason(int month){
        return seafoodMapper.getSeafoodBySeason(month);
    }
}
