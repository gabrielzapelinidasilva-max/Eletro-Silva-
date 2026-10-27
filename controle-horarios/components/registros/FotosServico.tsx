"use client";

import { useState } from "react";
import { Camera, Loader2, X } from "lucide-react";
import { clienteNavegador } from "@/lib/supabase/browser";
import { BUCKET_SERVICOS, MAX_FOTOS, comprimirImagem } from "@/lib/fotos";

type Foto = { caminho: string; previa: string };

/**
 * Fotos de "antes" ou "depois" (opcional). Cada foto é reduzida no celular e enviada
 * na hora para o Storage; o formulário recebe só os caminhos (campos ocultos).
 */
export function FotosServico({ nome, rotulo, usuarioId, registroId, aoMudarEnvio }: {
  nome: "fotos_antes" | "fotos_depois";
  rotulo: string;
  usuarioId: string;
  registroId: string;
  aoMudarEnvio: (enviando: boolean) => void;
}) {
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [enviando, setEnviando] = useState(0);
  const [erro, setErro] = useState("");

  async function escolher(lista: FileList | null) {
    if (!lista?.length) return;
    setErro("");
    const arquivos = [...lista].slice(0, MAX_FOTOS - fotos.length);
    if (lista.length > arquivos.length) setErro(`Máximo de ${MAX_FOTOS} fotos.`);
    setEnviando((n) => n + arquivos.length);
    aoMudarEnvio(true);
    const supabase = clienteNavegador();
    for (const arquivo of arquivos) {
      try {
        const blob = await comprimirImagem(arquivo);
        const caminho = `${usuarioId}/${registroId}/${nome === "fotos_antes" ? "antes" : "depois"}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.jpg`;
        const { error } = await supabase.storage.from(BUCKET_SERVICOS).upload(caminho, blob, { contentType: "image/jpeg" });
        if (error) throw error;
        setFotos((f) => [...f, { caminho, previa: URL.createObjectURL(blob) }]);
      } catch {
        setErro("Não foi possível enviar uma das fotos. Confira a internet e tente de novo.");
      } finally {
        setEnviando((n) => {
          if (n - 1 === 0) aoMudarEnvio(false);
          return n - 1;
        });
      }
    }
  }

  function remover(caminho: string) {
    setFotos((f) => f.filter((x) => x.caminho !== caminho));
    clienteNavegador().storage.from(BUCKET_SERVICOS).remove([caminho]).catch(() => {});
  }

  return (
    <div>
      <p className="mb-1.5 text-sm font-semibold text-slate-700">{rotulo}</p>
      <div className="flex flex-wrap gap-2">
        {fotos.map((f) => (
          <div key={f.caminho} className="relative size-20 overflow-hidden rounded-xl ring-1 ring-slate-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={f.previa} alt="" className="size-full object-cover" />
            <input type="hidden" name={nome} value={f.caminho} />
            <button type="button" onClick={() => remover(f.caminho)} aria-label="Remover foto"
              className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white"><X className="size-3.5" /></button>
          </div>
        ))}
        {enviando > 0 && (
          <div className="flex size-20 items-center justify-center rounded-xl bg-slate-100 text-slate-500" role="status" aria-label="Enviando foto">
            <Loader2 className="size-6 animate-spin" />
          </div>
        )}
        {fotos.length < MAX_FOTOS && (
          <label className="flex size-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-marca-200 text-xs font-semibold text-marca-700 hover:bg-marca-50">
            <Camera className="size-6" aria-hidden />
            Adicionar
            <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => { escolher(e.target.files); e.target.value = ""; }} />
          </label>
        )}
      </div>
      {erro && <p className="mt-1 text-sm font-medium text-red-600">{erro}</p>}
    </div>
  );
}
