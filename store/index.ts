import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import villasReducer from './slices/villasSlice';
import bookingsReducer from './slices/bookingsSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    villas: villasReducer,
    bookings: bookingsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
