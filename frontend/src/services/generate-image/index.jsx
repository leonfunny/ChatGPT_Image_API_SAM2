import { HTTP_METHOD } from "@/utils/constants";
import { HOST } from "../host";
import Request from "../request";

const generate = async (data) => {
  const response = await Request({
    method: HTTP_METHOD.POST,
    url: HOST.generate,
    data: data,
  });
  return response?.data;
};

const editImage = async (data) => {
  const response = await Request({
    method: HTTP_METHOD.POST,
    url: HOST.editImage,
    data: data,
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response?.data;
};

const batchEditImage = async (data) => {
  const response = await Request({
    method: HTTP_METHOD.POST,
    url: HOST.batchEditImage,
    data: data,
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response?.data;
};

const editURLImage = async (data) => {
  const response = await Request({
    method: HTTP_METHOD.POST,
    url: HOST.editURLImage,
    data: data,
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response?.data;
};

export { generate, editImage, batchEditImage, editURLImage };
