import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Booking } from '@/constants/villaData';

interface BookingsState {
  bookings: Booking[];
  loading: boolean;
  error: string | null;
}

const initialState: BookingsState = {
  bookings: [],
  loading: false,
  error: null,
};

const bookingsSlice = createSlice({
  name: 'bookings',
  initialState,
  reducers: {
    setBookings(state, action: PayloadAction<Booking[]>) {
      state.bookings = action.payload;
    },
    addBooking(state, action: PayloadAction<Booking>) {
      state.bookings.push(action.payload);
    },
    updateBooking(state, action: PayloadAction<Booking>) {
      const index = state.bookings.findIndex((b) => b.id === action.payload.id);
      if (index !== -1) {
        state.bookings[index] = action.payload;
      }
    },
    deleteBooking(state, action: PayloadAction<string>) {
      state.bookings = state.bookings.filter((b) => b.id !== action.payload);
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
  },
});

export const { setBookings, addBooking, updateBooking, deleteBooking, setLoading, setError } = bookingsSlice.actions;
export default bookingsSlice.reducer;
