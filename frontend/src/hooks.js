import { useCallback, useEffect, useState, createContext, useContext } from "react";

/** Run an async function on mount (and on demand via refetch). */
export function useAsync(fn, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const run = useCallback(() => {
    let live = true;
    setLoading(true);
    fn()
      .then((d) => live && (setData(d), setError(null)))
      .catch((e) => live && setError(e))
      .finally(() => live && setLoading(false));
    return () => { live = false; };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => run(), [run]);

  return { data, loading, error, refetch: run };
}

// Config (reference data + copy owned by the backend) shared via context.
export const ConfigContext = createContext(null);
export const useConfig = () => useContext(ConfigContext);
