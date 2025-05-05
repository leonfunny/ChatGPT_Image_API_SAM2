import { store } from "@/redux";
import { UserSlice } from "@/redux/slices";
import axios from "axios";
import { HOST } from "./host";

const BASE_API_URL = import.meta.env.VITE_BASE_API_URL;
const Request = axios.create({
  baseURL: BASE_API_URL,
  timeout: 60000,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

const isNeedToken = (url) => {
  //todo url
  return !!url;
};

const refreshToken = async (refreshToken) => {
  return await axios.post(
    `${BASE_API_URL}${HOST.refresh}`,
    {
      token: refreshToken,
    },
    {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    }
  );
};

const appendAuthToken = (config, authToken) => {
  return {
    ...config,
    headers: {
      ...config.headers,
      Authorization: `Bearer ${authToken}`,
    },
  };
};

Request.interceptors.request.use(
  (config) => {
    const accessToken = store?.getState()?.["feature/user"]?.access_token;

    if (!isNeedToken(config?.url)) {
      return config;
    }
    return appendAuthToken(config, accessToken);
  },
  (error) => {
    return Promise.reject(error?.message);
  }
);

Request.interceptors.response.use(
  (response) => {
    // console.log(response);
    return response;
  },
  async (error) => {
    const { config, response } = error;
    // console.log(response);
    if (
      response &&
      response?.status === 401 &&
      response?.config?.url !== HOST.login
    ) {
      const newConfig = config;
      if (!newConfig?.retry) {
        try {
          newConfig.retry = true;
          const refresh_token =
            store?.getState()?.["feature/user"]?.refresh_token;
          const newToken = await refreshToken(refresh_token);
          if (newToken) {
            store.dispatch(
              UserSlice.actions.updateToken({
                access_token: newToken?.data?.access_token,
                refresh_token: newToken?.data?.refresh_token,
              })
            );
            return Request(newConfig);
          }
          return Promise.reject(response);
        } catch (error) {
          if (error?.response?.status === 401) {
            return Promise.reject(error);
          }
        }
      }
    }

    if (response?.config?.url === "/me") {
      //   store.dispatch(AuthSlice.actions.logout());
    }
    if (response && response?.status >= 500) {
      // store.dispatch(AuthSlice.actions.logout());
      return Promise.reject(error);
    }
    if (response && response?.status === 404) {
      //Not found the resource
    }
    //handle others error
    return Promise.reject(response);
  }
);

export default Request;
