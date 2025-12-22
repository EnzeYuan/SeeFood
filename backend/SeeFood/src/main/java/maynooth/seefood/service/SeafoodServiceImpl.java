package maynooth.seefood.service;

import maynooth.seefood.mapper.SeafoodMapper;
import maynooth.seefood.pojo.PO.SeafoodPO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class SeafoodServiceImpl implements SeafoodService {

    @Autowired
    SeafoodMapper seafoodMapper;

    @Override
    @Caching(evict = {
            @CacheEvict(cacheNames = "seafood:top", key = "'popular'", beforeInvocation = false),
            @CacheEvict(cacheNames = "item:detail", key = "#seafoodId")
    })
    public int putViews(int seafoodId) {
        return seafoodMapper.putViews(seafoodId);
    }

    // 获取热门商品
    @Override
    @Cacheable(cacheNames = "seafood:top", key = "'popular'")
    public List<SeafoodPO> getTop() {
        return seafoodMapper.getSeafoodInPopularity();
    }

    @Override
    @Cacheable(cacheNames = "seafood:season", key = "#month")
    public List<SeafoodPO> getSeafoodsBySeason(int month){
        return seafoodMapper.getSeafoodBySeason(month);
    }
}
