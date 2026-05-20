import { configureStore } from '@reduxjs/toolkit';
import authReducer, { setUser, logout } from '../store/slices/authSlice';

describe('authSlice', () => {
  it('should set user on setUser action', () => {
    const store = configureStore({
      reducer: {
        auth: authReducer,
      },
    });

    const testUser = {
      id: '123',
      name: 'John Doe',
      email: 'john@example.com',
      photo: 'https://example.com/photo.jpg',
    };

    store.dispatch(setUser(testUser));
    const state = store.getState().auth;

    expect(state.user).toEqual(testUser);
  });

  it('should logout user on logout action', () => {
    const store = configureStore({
      reducer: {
        auth: authReducer,
      },
    });

    const testUser = {
      id: '123',
      name: 'John Doe',
      email: 'john@example.com',
      photo: 'https://example.com/photo.jpg',
    };

    store.dispatch(setUser(testUser));
    store.dispatch(logout());
    const state = store.getState().auth;

    expect(state.user).toBeNull();
    expect(state.isAdmin).toBe(false);
  });
});
