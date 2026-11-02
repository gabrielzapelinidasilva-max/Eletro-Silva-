"use client";

import { useCallback, useEffect, useState } from "react";
import { friendlyError } from "@/lib/format";

type State<T> = { key: string; data: T | null; error: string | null };

/**
 * Busca dados no cliente e refaz a busca quando `key` muda ou ao chamar `reload()`.
 * `loading` é derivado (key carregada ≠ key atual), sem setState síncrono no efeito.
 */
export function useQuery<T>(key: string, fetcher: () => Promise<T>) {
  const [version, setVersion] = useState(0);
  const fullKey = `${key}#${version}`;
  const [state, setState] = useState<State<T>>({ key: "", data: null, error: null });

  useEffect(() => {
    let cancelled = false;
    fetcher()
      .then((data) => {
        if (!cancelled) setState({ key: fullKey, data, error: null });
      })
      .catch((err: unknown) => {
        if (!cancelled) setState((s) => ({ key: fullKey, data: s.data, error: friendlyError(err) }));
      });
    return () => {
      cancelled = true;
    };
    // O fetcher é recriado a cada render; a `key` descreve suas dependências.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullKey]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  const loading = state.key !== fullKey;
  // Durante a troca de mês mostramos o carregamento, não os dados antigos.
  const fresh = state.key.split("#")[0] === key;

  return { data: fresh ? state.data : null, error: state.error, loading, reload };
}
