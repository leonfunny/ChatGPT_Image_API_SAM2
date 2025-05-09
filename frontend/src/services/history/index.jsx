import { HTTP_METHOD } from "@/utils/constants";
import { HOST } from "../host";
import Request from "../request";

const history = async (page = 1, size = 10) => {
  const response = await Request({
    method: HTTP_METHOD.GET,
    url: `${HOST.history}?page=${page}&size=${size}`,
  });
  return response?.data;
};

export { history };
