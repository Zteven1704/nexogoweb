import { FirebaseError } from "firebase/app";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from "firebase/auth";
import { firebaseConfigMessage, getFirebaseAuth } from "@/lib/firebase";

export type AuthUser = {
  uid: string;
  email: string | null;
};

function toAuthUser(user: User): AuthUser {
  return {
    uid: user.uid,
    email: user.email,
  };
}

export async function signInWithEmail(email: string, password: string): Promise<AuthUser> {
  const credential = await signInWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);
  return toAuthUser(credential.user);
}

export async function signOutUser(): Promise<void> {
  await signOut(getFirebaseAuth());
}

export function subscribeToAuthState(onChange: (user: AuthUser | null) => void): () => void {
  return onAuthStateChanged(getFirebaseAuth(), (user) => {
    onChange(user ? toAuthUser(user) : null);
  });
}

export function getAuthErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message === firebaseConfigMessage) {
    return error.message;
  }

  if (!(error instanceof FirebaseError)) {
    return "No se pudo completar la acción. Inténtalo de nuevo.";
  }

  switch (error.code) {
    case "auth/invalid-email":
      return "El correo electrónico no es válido.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "El correo o la contraseña no son correctos.";
    case "auth/user-disabled":
      return "Esta cuenta está desactivada.";
    case "auth/too-many-requests":
      return "Demasiados intentos. Espera un momento e inténtalo de nuevo.";
    case "auth/network-request-failed":
      return "No hay conexión con el servicio de acceso. Revisa tu red e inténtalo de nuevo.";
    default:
      return "No se pudo iniciar sesión. Inténtalo de nuevo.";
  }
}
