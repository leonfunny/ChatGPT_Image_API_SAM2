import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  access_token: null,
  refresh_token: null,
  userInfo: null,
};

const UserSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    login: (state, action) => {
      state.access_token = action.payload.access_token;
      state.refresh_token = action.payload.refresh_token;
    },
    logout: (state, action) => {
      state.access_token = undefined;
      state.refresh_token = undefined;
      state.userInfo = null;
    },
    setUserInfo: (state, action) => {
      state.userInfo = action.payload;
    },
    updateToken: (state, { payload: { access_token, refresh_token } }) => {
      state.access_token = access_token;
      state.refresh_token = refresh_token;
    },
  },
  extraReducers() {},
});

export default UserSlice;
