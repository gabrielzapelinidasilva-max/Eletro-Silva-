"use client";

import { useEffect, useState } from "react";
import { criarClienteNavegador } from "@/lib/supabase/client";
import type { PerfilResumo } from "@/lib/tipos";

/** Lista de pessoas (nome/papel) para mostrar responsáveis. */
export function useEquipe() {
  const [equipe, setEquipe] = useState<PerfilResumo[]>([]);
  useEffect(() => {
    criarClienteNavegador()
      .from("profiles")
      .select("id, nome, role, ativo, is_owner")
      .order("nome")
      .then(({ data }) => setEquipe((data as PerfilResumo[]) ?? []));
  }, []);
  const nomeDe = (id: string | null | undefined) => equipe.find((p) => p.id === id)?.nome ?? (id ? "Alguém" : "");
  return { equipe, nomeDe };
}
