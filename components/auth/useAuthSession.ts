"use client";

import { useEffect, useState } from "react";
import { subscribeToAuthState, type AuthUser } from "@/lib/auth";
import { firebaseConfigMessage, isFirebaseConfigured } from "@/lib/firebase";

export type AuthSession =
  | { status: "loading" }
  | { status: "authenticated"; user: AuthUser }
  | { status: "anonymous" }
  | { status: "error"; message: string };

const missingConfig: AuthSession = {
  status: "error",
  message: firebaseConfigMessage,
};

export function useAuthSession(): AuthSession {
  const configured = isFirebaseConfigured();
  const [session, setSession] = useState<AuthSession>({ status: "loading" });

  useEffect(() => {
    if (!configured) {
      return;
    }

    return subscribeToAuthState((user) => {
      setSession(user ? { status: "authenticated", user } : { status: "anonymous" });
    });
  }, [configured]);

  if (!configured) {
    return missingConfig;
  }

  return session;
}
