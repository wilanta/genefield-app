import { useEffect, useState } from "react";
export function useAsync<T>(
  loader: () => Promise<T>,
  deps: readonly unknown[] = [],
) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<string>();
  useEffect(() => {
    let live = true;
    setError(undefined);
    setData(undefined);
    void loader()
      .then((value) => {
        if (live) setData(value);
      })
      .catch((e) => {
        console.error("GeneField", e);
        if (live)
          setError("Data atau layanan lokal GeneField tidak dapat dimuat.");
      });
    return () => {
      live = false;
    };
  }, deps);
  return { data, error };
}
