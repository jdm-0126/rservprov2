# Mobile Web App — RservPro v2

Expo SDK 52 · React Native · expo-router v4 · TypeScript · Firebase Auth + Firestore · Redux

## Prerequisites

- Node.js 16+ and npm
- Expo CLI (`npm install -g expo-cli`)
- Firebase project with Auth and Firestore enabled
- Google OAuth credentials (web client ID)

## Installation

1. Clone the repository and navigate to the mobile-web-app:

```bash
cd apps/mobile-web-app
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env.local` file with your Firebase and Google OAuth credentials:

```env
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_API_KEY=your-api-key
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-google-web-client-id
EXPO_PUBLIC_ADMIN_EMAIL=admin@example.com,superadmin@example.com
```

## Running the app

### Web

```bash
npm run web
```

### iOS

```bash
npm run ios
```

### Android

```bash
npm run android
```

### Development server

```bash
npm start
```

## Testing

Run all tests:

```bash
npm test
```

Watch mode:

```bash
npm run test:watch
```

Coverage report:

```bash
npm run test:coverage
```

## Folder structure

```
app/
  _layout.tsx
  index.tsx
  login.tsx

  (guest)/
    _layout.tsx
    index.tsx
    bookings.tsx
    profile.tsx

  (admin)/
    _layout.tsx
    index.tsx
    villas.tsx
    availability.tsx
    bookings.tsx

  (superadmin)/
    _layout.tsx
    index.tsx
    admins.tsx
    properties.tsx
    analytics.tsx

  villa/[id].tsx
  booking/[id].tsx
  booking/confirmation.tsx

components/
  ChatAssistant.tsx
  BookingConfirmationModal.tsx
  VillaCard.tsx
  CalendarPicker.tsx
  RoleGuard.tsx

features/
  auth/
  villas/
  bookings/
  availability/
  notifications/
  analytics/
  admin/

hooks/
  useAuth.ts
  useBookings.ts

store/
  index.ts
  slices/
    authSlice.ts
    villasSlice.ts
    bookingsSlice.ts
  hooks.ts

services/
  auth.service.ts
  villas.service.ts
  bookings.service.ts
  notifications.service.ts

utils/
  helpers.ts
  validators.ts

types/
  auth.ts
  booking.ts
  villa.ts

constants/
  roles.ts
  theme.ts

assets/
  images/
  icons/

public/
  manifest.json
  sw.js
  icons/

__tests__/
  store.test.ts
```

## State Management

Redux with Redux Toolkit is used for state management. Access state using:

```typescript
import { useAppDispatch, useAppSelector } from '@/store/hooks';

const dispatch = useAppDispatch();
const user = useAppSelector((state) => state.auth.user);
```

## Authentication

Firebase Authentication with Google Sign-In. Users are automatically classified as admin or guest based on their email address.

## Deployment

### Web (Vercel)

```bash
npm run web
npx expo export -p web
# Deploy the dist/ folder to Vercel
```

### Android/iOS

Use EAS Build for managed builds:

```bash
eas build --platform android
eas build --platform ios
```
