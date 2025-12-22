import axios from 'axios';
import { API_BASE_URL } from '../constants/api';

export const BEHAVIOR_WEIGHT = {
    view: 1,
    like: 2,
    cart: 3,
    order: 5,
} as const;

/**
 * 记录用户行为（浏览、收藏、加购、下单）
 */
export const logUserBehavior = async (
    seafoodId?: number | string | null,
    behaviorWeight?: number
): Promise<void> => {
    if (!seafoodId || !behaviorWeight) {
        return;
    }

    try {
        await axios.post(
            `${API_BASE_URL}/seefood/recommend/addrating`,
            {
                seafoodId: Number(seafoodId),
                behaviorWeight,
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
            }
        );
    } catch (err) {
        // 行为记录失败不阻塞主流程
        console.warn('Failed to log user behavior', err);
    }
};

