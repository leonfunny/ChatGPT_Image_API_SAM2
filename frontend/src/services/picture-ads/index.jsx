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

export { promptGenerating };
