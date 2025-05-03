import { HTTP_METHOD } from "@/utils/constants";
import { HOST } from "../host";
import Request from "../request";

const authenticate = async (data) => {
  const response = await Request({
    method: HTTP_METHOD.POST,
    url: HOST.login,
    data: data,
  });
  return response?.data;
};

const getUserInfo = async () => {
  const response = await Request({
    method: HTTP_METHOD.GET,
    url: `${HOST.me}`,
  });
  return response?.data;
};

export { authenticate, getUserInfo };
