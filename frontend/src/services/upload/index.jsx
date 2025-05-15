import { HTTP_METHOD } from "@/utils/constants";
import { HOST } from "../host";
import Request from "../request";

const uploadImageService = async (data) => {
  const response = await Request({
    method: HTTP_METHOD.POST,
    url: HOST.upload,
    data: data,
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response?.data;
};

export { uploadImageService };
