import { configureStore } from "@reduxjs/toolkit";
import { persistReducer, persistStore } from "redux-persist";
import storage from "redux-persist/lib/storage"; // defaults to localStorage for web
import rootReducers from "./rootReducer";

const persistConfig = {
  key: "root",
  storage,
  whitelist: [],
  version: 1.0,
};

const persistedReducer = persistReducer(persistConfig, rootReducers);

export const store = configureStore({
  reducer: persistedReducer,
  middleware(getDefaultMiddleware) {
    return getDefaultMiddleware({ serializableCheck: false });
  },
});

export const persistor = persistStore(store);
