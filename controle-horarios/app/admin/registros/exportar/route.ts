import { NextResponse, type NextRequest } from "next/server";
import { obterPerfil } from "@/lib/auth";
import { criarClienteServidor } from "@/lib/supabase/server";
import { buscarRegistros, lerFiltros } from "@/lib/consultas";
import { formatarData, formatarHora } from "@/lib/datas";
import { formatarMinutos, minutosEmHorasDecimais } from "@/lib/horas";

/** CSV com ";" e BOM UTF-8, que o Excel em português abre direto com acentos corretos. */
function celula(valor: string | null | undefined): string {
  let v = (valor ?? "").replace(/\r?\n/g, " ").trim();
  if (/^[=+\-@]/.test(v)) v = `'${v}`; // evita fórmulas maliciosas no Excel
  return /[";]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export async function GET(request: NextRequest) {
  const perfil = await obterPerfil();
  if (!perfil || !perfil.ativo || perfil.funcao !== "admin") {
    return NextResponse.json({ erro: "Acesso negado" }, { status: 403 });
  }

  const filtros = lerFiltros(Object.fromEntries(request.nextUrl.searchParams));
  const supabase = await criarClienteServidor();
  const registros = await buscarRegistros(supabase, filtros);

  const cabecalho = ["Data", "Colaborador", "Chegada", "Saída", "Horas (h:mm)", "Horas (decimal)", "Cliente", "Serviço", "Observações"];
  const linhas = registros
    .slice()
    .reverse() // do mais antigo para o mais recente
    .map((r) =>
      [
        formatarData(r.data),
        r.profiles?.nome,
        formatarHora(r.hora_chegada),
        r.hora_saida ? formatarHora(r.hora_saida) : "",
        r.minutos_trabalhados == null ? "" : formatarMinutos(r.minutos_trabalhados).replace("h", ":"),
        minutosEmHorasDecimais(r.minutos_trabalhados),
        r.cliente,
        r.servico,
        r.observacoes,
      ].map(celula).join(";"),
    );

  const csv = "﻿" + [cabecalho.join(";"), ...linhas].join("\r\n") + "\r\n";
  const nome = `registros_${filtros.de}_a_${filtros.ate}.csv`;
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nome}"`,
      "Cache-Control": "no-store",
    },
  });
}
