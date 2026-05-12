import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { api } from "../store/authStore";

let firebaseConfigPromise = null;

/** Only keys Firebase Web SDK accepts (strip googleClientId etc. from API payload). */
const toFirebaseWebConfig = (raw) => ({
  apiKey: raw.apiKey,
  authDomain: raw.authDomain,
  projectId: raw.projectId,
  storageBucket: raw.storageBucket || undefined,
  messagingSenderId: raw.messagingSenderId || undefined,
  appId: raw.appId,
});

const loadFirebaseConfig = async () => {
  if (!firebaseConfigPromise) {
    firebaseConfigPromise = api
      .get("/config/firebase")
      .then(({ data }) => {
        if (!data.success || !data.config) {
          throw new Error(
            data.message ||
              "Firebase is not configured. Add API Key, App ID, and Messaging Sender ID in admin settings."
          );
        }
        return toFirebaseWebConfig(data.config);
      })
      .catch((error) => {
        firebaseConfigPromise = null;
        throw error;
      });
  }
  return firebaseConfigPromise;
};

const getFirebaseAuth = async () => {
  const webConfig = await loadFirebaseConfig();
  const app = getApps().length ? getApps()[0] : initializeApp(webConfig);
  return getAuth(app);
};

export const signInWithGooglePopup = async () => {
  const auth = await getFirebaseAuth();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const credential = await signInWithPopup(auth, provider);
  return credential.user.getIdToken();
};

/** Requires Facebook Login enabled in Firebase Console → Authentication → Sign-in method → Facebook. */
export const signInWithFacebookPopup = async () => {
  const auth = await getFirebaseAuth();
  const provider = new FacebookAuthProvider();
  provider.addScope("email");
  provider.addScope("public_profile");
  const credential = await signInWithPopup(auth, provider);
  return credential.user.getIdToken();
};

const mapFirebaseAuthError = (err) => {
  const code = err?.code || "";
  const messages = {
    "auth/email-already-in-use": "That email is already registered. Log in instead.",
    "auth/invalid-email": "Enter a valid email address.",
    "auth/weak-password": "Password is too weak. Use at least 6 characters.",
    "auth/user-disabled": "This account has been disabled.",
    "auth/user-not-found": "No account found for this email.",
    "auth/wrong-password": "Incorrect password. Try again or reset it in Firebase.",
    "auth/invalid-credential": "Invalid email or password.",
    "auth/too-many-requests": "Too many attempts. Try again later.",
    "auth/network-request-failed": "Network error. Check your connection.",
    "auth/account-exists-with-different-credential": "An account already exists with this email using another sign-in method.",
    "auth/popup-closed-by-user": "Sign-in was cancelled.",
    "auth/cancelled-popup-request": "Only one sign-in window can run at a time.",
  };
  return messages[code] || err?.message || "Firebase authentication failed.";
};

/**
 * Register with Firebase Email/Password, set display name, return ID token for your API.
 */
export const signUpWithFirebaseEmail = async (email, password, displayName) => {
  try {
    const auth = await getFirebaseAuth();
    const cred = await createUserWithEmailAndPassword(
      auth,
      String(email || "").trim(),
      password
    );
    const name = String(displayName || "").trim();
    if (name) {
      try {
        await updateProfile(cred.user, { displayName: name });
      } catch {
        /* non-fatal; server can derive name from email */
      }
    }
    return cred.user.getIdToken();
  } catch (err) {
    throw new Error(mapFirebaseAuthError(err), { cause: err });
  }
};

export const signInWithFirebaseEmail = async (email, password) => {
  try {
    const auth = await getFirebaseAuth();
    const cred = await signInWithEmailAndPassword(
      auth,
      String(email || "").trim(),
      password
    );
    return cred.user.getIdToken();
  } catch (err) {
    throw new Error(mapFirebaseAuthError(err), { cause: err });
  }
};

export const firebaseEmailAuthErrorMessage = (err) => mapFirebaseAuthError(err);
