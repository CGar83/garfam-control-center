import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { db } from "./db/index.js";

const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const generation = useRef(0);
  const mounted = useRef(false);

  const refresh = useCallback(async () => {
    const request = ++generation.current;
    setLoading(true);
    setError(null);
    try {
      const session = await db.auth.getSession();
      const next = session ? await db.getProfile() : null;
      if (mounted.current && request === generation.current) setProfile(next);
      return next;
    } catch (failure) {
      if (mounted.current && request === generation.current) {
        setProfile(null);
        setError(
          failure instanceof Error
            ? failure
            : new Error("Unable to load your account."),
        );
      }
      return null;
    } finally {
      if (mounted.current && request === generation.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    refresh();
    const unsubscribe = db.auth.onChange(() => {
      void refresh();
    });
    // The generation counter intentionally invalidates every in-flight request on cleanup.
    return () => {
      mounted.current = false;
      // eslint-disable-next-line react-hooks/exhaustive-deps
      generation.current++;
      unsubscribe();
    };
  }, [refresh]);

  return (
    <Ctx.Provider value={{ profile, loading, error, refresh, db }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  return useContext(Ctx);
}

// Latest request wins. Unmounted or superseded requests cannot replace newer data.
export function useAsync(fn, deps) {
  const [state, setState] = useState({
    value: null,
    loading: true,
    error: null,
  });
  const generation = useRef(0);
  const mounted = useRef(false);
  const run = useCallback(async () => {
    const request = ++generation.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const value = await fn();
      if (mounted.current && request === generation.current)
        setState({ value, loading: false, error: null });
      return value;
    } catch (failure) {
      const error =
        failure instanceof Error
          ? failure
          : new Error("Unable to load this page.");
      if (mounted.current && request === generation.current)
        setState({ value: null, loading: false, error });
      return null;
    }
    // The dependency list defines the request identity for this hook.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => {
    mounted.current = true;
    void run();
    // The generation counter intentionally invalidates every in-flight request on cleanup.
    return () => {
      mounted.current = false;
      // eslint-disable-next-line react-hooks/exhaustive-deps
      generation.current++;
    };
  }, [run]);
  return [state.value, run, state.loading, state.error];
}
