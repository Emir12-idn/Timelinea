import { useEffect, useState, useCallback } from "react";
import { api } from "../api/client";

/** Fetches `path` on mount and whenever it changes; call `reload()` to refetch after a mutation. */
export function useApi(path) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    api
      .get(path)
      .then((d) => {
        if (!cancelled) {
          setData(d);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e.message);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [path, reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);
  return { data, loading, error, reload };
}
