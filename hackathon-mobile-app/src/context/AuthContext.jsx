import React, { createContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const AuthContext = createContext({
  user: null,
  token: null,
  role: null,
  initializing: true,
  signIn: () => {},
  signOut: () => {},
});

export function AuthProvider({ children }) {
  const [authState, setAuthState] = useState({
    user: null,
    token: null,
    role: null,
  });
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const raw = await AsyncStorage.getItem("auth_state");
        if (raw) {
          const parsed = JSON.parse(raw);
          setAuthState({
            user: parsed.user || null,
            token: parsed.token || null,
            role: parsed.role || null,
          });
        }
      } catch (err) {
        // Ignore malformed storage
      } finally {
        setInitializing(false);
      }
    };
    load();
  }, []);

  const value = useMemo(
    () => ({
      user: authState.user,
      token: authState.token,
      role: authState.role,
      initializing,
      signIn: (nextAuth) =>
        (async () => {
          const nextState = {
            user: nextAuth.user,
            token: nextAuth.token,
            role: nextAuth.role,
          };
          setAuthState(nextState);
          await AsyncStorage.setItem("auth_state", JSON.stringify(nextState));
        })(),
      signOut: () =>
        (async () => {
          setAuthState({ user: null, token: null, role: null });
          await AsyncStorage.removeItem("auth_state");
        })(),
    }),
    [authState, initializing]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
