import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Villa } from '@/constants/villaData';

interface VillasState {
  villas: Villa[];
  loading: boolean;
  error: string | null;
}

const initialState: VillasState = {
  villas: [],
  loading: false,
  error: null,
};

const villasSlice = createSlice({
  name: 'villas',
  initialState,
  reducers: {
    setVillas(state, action: PayloadAction<Villa[]>) {
      state.villas = action.payload;
    },
    addVilla(state, action: PayloadAction<Villa>) {
      state.villas.push(action.payload);
    },
    updateVilla(state, action: PayloadAction<Villa>) {
      const index = state.villas.findIndex((v) => v.id === action.payload.id);
      if (index !== -1) {
        state.villas[index] = action.payload;
      }
    },
    deleteVilla(state, action: PayloadAction<string>) {
      state.villas = state.villas.filter((v) => v.id !== action.payload);
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
  },
});

export const { setVillas, addVilla, updateVilla, deleteVilla, setLoading, setError } = villasSlice.actions;
export default villasSlice.reducer;
