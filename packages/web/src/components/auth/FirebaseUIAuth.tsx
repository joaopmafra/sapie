import { EmailAuthProvider, GoogleAuthProvider } from 'firebase/auth';
import * as firebaseui from 'firebaseui';
import { useEffect, useRef } from 'react';

import 'firebaseui/dist/firebaseui.css';
import { auth } from '../../lib/firebase/config';

interface FirebaseUIAuthProps {
  // UI configuration
  signInSuccessUrl?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  signInOptions?: any[];
  onSignInSuccess?: (authResult: unknown, redirectUrl?: string) => boolean;
  onSignInFailure?: (error: unknown) => Promise<void>;
}

const FirebaseUIAuth = ({
  signInSuccessUrl = '/',
  signInOptions,
  onSignInSuccess,
  onSignInFailure,
}: FirebaseUIAuthProps) => {
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Get or create the FirebaseUI instance
    const ui =
      firebaseui.auth.AuthUI.getInstance() || new firebaseui.auth.AuthUI(auth);

    const defaultSignInOptions = [
      {
        provider: EmailAuthProvider.PROVIDER_ID,
        requireDisplayName: true,
        signInMethod: EmailAuthProvider.EMAIL_PASSWORD_SIGN_IN_METHOD,
      },
      {
        provider: GoogleAuthProvider.PROVIDER_ID,
        scopes: ['profile', 'email'],
        customParameters: {
          // Forces account selection even when one account is available
          prompt: 'select_account',
        },
      },
    ];

    const uiConfig = {
      signInSuccessUrl,
      signInOptions: signInOptions || defaultSignInOptions,
      tosUrl: '/terms-of-service',
      privacyPolicyUrl: '/privacy-policy',
      callbacks: {
        signInSuccessWithAuthResult: (
          authResult: unknown,
          redirectUrl?: string
        ) => {
          if (onSignInSuccess) {
            return onSignInSuccess(authResult, redirectUrl);
          }
          // Return false to avoid redirect and let the app handle the state change
          return false;
        },
        signInFailure: async (error: unknown) => {
          if (onSignInFailure) {
            await onSignInFailure(error);
          } else {
            console.error('Sign in error:', error);
          }
        },
      },
      // Other config options
      signInFlow: 'popup', // or 'redirect'
    };

    // Render the FirebaseUI Auth widget
    if (elementRef.current) {
      ui.start(elementRef.current, uiConfig);
    }

    // Cleanup function
    return () => {
      if (ui.isPendingRedirect()) {
        return;
      }
      ui.reset();
    };
  }, [signInSuccessUrl, signInOptions, onSignInSuccess, onSignInFailure]);

  return <div ref={elementRef} />;
};

export default FirebaseUIAuth;
