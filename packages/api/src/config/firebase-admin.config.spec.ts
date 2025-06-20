import {
  initializeFirebaseAdmin,
  getFirebaseAdmin,
  getFirebaseAuth,
  verifyIdToken,
  getUserByUid,
} from './firebase-admin.config';

describe('Firebase Admin Configuration', () => {
  describe('Module Exports', () => {
    it('should export initializeFirebaseAdmin function', () => {
      expect(typeof initializeFirebaseAdmin).toBe('function');
    });

    it('should export getFirebaseAdmin function', () => {
      expect(typeof getFirebaseAdmin).toBe('function');
    });

    it('should export getFirebaseAuth function', () => {
      expect(typeof getFirebaseAuth).toBe('function');
    });

    it('should export verifyIdToken function', () => {
      expect(typeof verifyIdToken).toBe('function');
    });

    it('should export getUserByUid function', () => {
      expect(typeof getUserByUid).toBe('function');
    });
  });
});
