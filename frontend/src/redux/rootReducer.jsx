import { combineReducers } from "@reduxjs/toolkit";
import { persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage";
import { UserSlice } from "./slices";
const rootReducers = combineReducers({
  "feature/user": persistReducer(
    {
      key: "user",
      storage: storage,
      whitelist: ["access_token", "refresh_token", "userInfo"],
    },
    UserSlice.reducer
  ),
});
export default rootReducers;
