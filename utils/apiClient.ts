import axios from 'axios';

// 存储 token 的变量（会在拦截器中更新）
let currentToken: string | null = null;

// 设置 token 的函数，供 AuthContext 调用
export const setAuthToken = (token: string | null) => {
    currentToken = token;
};

// 全局请求拦截器：自动添加 Authorization header
axios.interceptors.request.use(
    (config) => {
        // 如果存在 token，添加到 header 中
        if (currentToken) {
            config.headers.Authorization = `Bearer ${currentToken}`; // 注意 Bearer 后面的空格
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// 全局响应拦截器：处理 401 未授权错误
axios.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        if (error.response?.status === 401) {
            // token 过期或无效，可以在这里触发登出
            // 注意：这里不能直接调用 useAuth，因为 hooks 不能在普通函数中使用
            // 如果需要，可以通过事件或其他方式通知
        }
        return Promise.reject(error);
    }
);

