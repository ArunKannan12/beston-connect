// src/redux/store.js
import { configureStore } from '@reduxjs/toolkit';
import { cartSlice } from './cartSlice';

export const store = configureStore({
  reducer: {
    [cartSlice.reducerPath]: cartSlice.reducer,
    // ...other reducers
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(cartSlice.middleware),
});
