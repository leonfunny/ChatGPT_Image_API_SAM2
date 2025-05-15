import { HTTP_METHOD } from "@/utils/constants";
import { HOST } from "../host";
import Request from "../request";

const generateVideo = async (data) => {
  const response = await Request({
    method: HTTP_METHOD.POST,
    url: HOST.generateVideo,
    data: data,
  });
  return response?.data;
};

const checkStatus = async (requestId) => {
  const response = await Request({
    method: HTTP_METHOD.GET,
    url: `${HOST.generate}/status/${requestId}`,
  });

  return response?.data;
};

const generateTextToVideo = async (payload) => {
  const response = await Request({
    method: HTTP_METHOD.POST,
    url: HOST.generateTextToVideo,
    data: payload,
  });
  return response;
};

const checkLeonardoStatus = async (requestId) => {
  const response = await Request({
    method: HTTP_METHOD.GET,
    url: `${HOST.generate}/leonardo-status/${requestId}`,
  });
  return response;
};
export { generateVideo, checkStatus, generateTextToVideo, checkLeonardoStatus };
