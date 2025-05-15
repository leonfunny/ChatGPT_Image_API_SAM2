import { HTTP_METHOD } from "@/utils/constants";
import { HOST } from "../host";
import Request from "../request";

const promptGenerating = async (data) => {
  const response = await Request({
    method: HTTP_METHOD.POST,
    url: HOST.promptGenerating,
    data: data,
  });
  return response?.data;
};

const editImage = async (data) => {
  const response = await Request({
    method: HTTP_METHOD.POST,
    url: HOST.pictureAdsGenerate,
    data: data,
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response?.data;
};

const upscaleImage = async (data) => {
  const response = await Request({
    method: HTTP_METHOD.POST,
    url: HOST.upscaleImage,
    data: data,
  });
  return response?.data;
};

const upscaleVariation = async (requestId) => {
  const response = await Request({
    method: HTTP_METHOD.GET,
    url: `${HOST.upscaleVariation}/${requestId}`,
  });
  return response?.data;
};

export { promptGenerating, editImage, upscaleImage, upscaleVariation };
