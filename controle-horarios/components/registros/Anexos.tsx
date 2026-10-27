/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { PenLine, Printer } from "lucide-react";
import { classesBotao } from "@/components/ui/estilos";
import { urlArquivo } from "@/lib/fotos";

type ComAnexos = { id: string; hora_saida: string | null; fotos_antes?: string[] | null; fotos_depois?: string[] | null; assinatura?: string | null; assinatura_nome?: string | null };

/** Miniaturas das fotos (antes/depois), assinatura e botão para imprimir a nota (telas do admin). */
export function Anexos({ registro: r, compacto = false }: { registro: ComAnexos; compacto?: boolean }) {
  const antes = r.fotos_antes ?? [];
  const depois = r.fotos_depois ?? [];
  const tem = antes.length + depois.length > 0 || r.assinatura;
  if (!r.hora_saida) return null;
  return (
    <div className="mt-3 space-y-2">
      {tem && (
        <div className="flex flex-wrap items-end gap-3">
          {[["Antes", antes], ["Depois", depois]].map(([rotulo, fotos]) =>
            (fotos as string[]).length ? (
              <div key={rotulo as string}>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{rotulo as string}</p>
                <div className="flex gap-1.5">
                  {(fotos as string[]).slice(0, compacto ? 3 : 6).map((f) => (
                    <a key={f} href={urlArquivo(f)} target="_blank" rel="noopener" className="block">
                      <img src={urlArquivo(f)} alt={`Foto do ${(rotulo as string).toLowerCase()}`} loading="lazy" className="size-14 rounded-lg object-cover ring-1 ring-slate-200" />
                    </a>
                  ))}
                </div>
              </div>
            ) : null,
          )}
          {r.assinatura && (
            <div>
              <p className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500"><PenLine className="size-3" aria-hidden /> Assinado{r.assinatura_nome ? ` por ${r.assinatura_nome}` : ""}</p>
              <img src={urlArquivo(r.assinatura)} alt="Assinatura do cliente" loading="lazy" className="h-14 rounded-lg bg-white object-contain px-2 ring-1 ring-slate-200" />
            </div>
          )}
        </div>
      )}
      <Link href={`/admin/nota/${r.id}`} target="_blank" className={classesBotao("secundario", "md", "px-3")}>
        <Printer className="size-4" aria-hidden /> Imprimir nota de serviço
      </Link>
    </div>
  );
}
