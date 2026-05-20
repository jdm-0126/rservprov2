import { FirebaseError } from 'firebase/app';

// ─── Firestore / Auth error code → user-friendly message ─────────────────────

const FIRESTORE_MESSAGES: Record<string, string> = {
  'permission-denied':    'You don\'t have permission to perform this action.',
  'not-found':            'The requested item no longer exists.',
  'already-exists':       'This record already exists.',
  'resource-exhausted':   'Too many requests. Please wait a moment and try again.',
  'failed-precondition':  'This action can\'t be completed right now. Please refresh and try again.',
  'unauthenticated':      'You need to be signed in to do that.',
  'unavailable':          'Service is temporarily unavailable. Please check your connection.',
  'cancelled':            'The operation was cancelled.',
  'deadline-exceeded':    'The request timed out. Please try again.',
  'internal':             'An unexpected error occurred. Please try again.',
};

const AUTH_MESSAGES: Record<string, string> = {
  'auth/user-not-found':        'No account found with this email.',
  'auth/wrong-password':        'Incorrect password.',
  'auth/email-already-in-use':  'An account with this email already exists.',
  'auth/invalid-email':         'Please enter a valid email address.',
  'auth/too-many-requests':     'Too many attempts. Please wait before trying again.',
  'auth/network-request-failed':'Network error. Please check your connection.',
  'auth/popup-closed-by-user':  'Sign-in was cancelled.',
  'auth/cancelled-popup-request': 'Sign-in was cancelled.',
};

// ─── Main resolver ────────────────────────────────────────────────────────────

export function resolveFirebaseError(error: unknown): string {
  if (error instanceof FirebaseError) {
    // Strip the "firestore/" prefix to match our map keys
    const code = error.code.replace(/^firestore\//, '');

    if (AUTH_MESSAGES[error.code])      return AUTH_MESSAGES[error.code];
    if (FIRESTORE_MESSAGES[code])       return FIRESTORE_MESSAGES[code];

    // Fallback: surface the raw code in dev, generic message in prod
    if (__DEV__) return `Firebase error: ${error.code} — ${error.message}`;
  }

  if (error instanceof Error) return error.message;

  return 'Something went wrong. Please try again.';
}

// ─── Specific helpers for common scenarios ────────────────────────────────────

/** Call when a booking write is denied — gives context-aware feedback */
export function resolveBookingError(error: unknown): string {
  if (error instanceof FirebaseError) {
    if (error.code === 'permission-denied' || error.code === 'firestore/permission-denied') {
      return 'You can only cancel bookings that are pending or confirmed.';
    }
  }
  return resolveFirebaseError(error);
}

/** Call when a villa read/write is denied */
export function resolveVillaError(error: unknown): string {
  if (error instanceof FirebaseError) {
    if (error.code === 'permission-denied' || error.code === 'firestore/permission-denied') {
      return 'You can only manage villas assigned to your account.';
    }
  }
  return resolveFirebaseError(error);
}

// ─── Type guard ───────────────────────────────────────────────────────────────

export function isPermissionDenied(error: unknown): boolean {
  return error instanceof FirebaseError &&
    (error.code === 'permission-denied' || error.code === 'firestore/permission-denied');
}
