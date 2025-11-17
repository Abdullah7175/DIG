import { configureStore } from '@reduxjs/toolkit';
import trackingReducer from './tracking';

export const store = configureStore({
  reducer: {
    tracking: trackingReducer,
  },
});

export default store;
