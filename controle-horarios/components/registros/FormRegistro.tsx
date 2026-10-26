"use client";

import { useActionState } from "react";
import { Save } from "lucide-react";
import { Campo, AreaTexto } from "@/components/ui/Campo";
import { CampoHora } from "./CampoHora";
import { CamposGastosRegistro } from "./CamposGastosRegistro";
import { BotaoEnviar, Botao } from "@/components/ui/Botao";
import { useToastDoResultado } from "@/components/ui/Toast";
import { formatarHora } from "@/lib/datas";
import { RESULTADO_INICIAL, type Registro, type Resultado, type VeiculoOpcao } from "@/lib/tipos";

type Props = {
  registro: Registro;
  veiculos: VeiculoOpcao[];
  acao: (anterior: Resultado, form: FormData) => Promise<Resultado>;
  /** O administrador pode trocar a data e ver/preencher material e valor cobrado; o eletricista não. */
  permitirData?: boolean;
  aoConcluir: () => void;
};

/** Formulário de edição completa de um registro (usado nas duas áreas). */
export function FormRegistro({ registro, veiculos, acao, permitirData, aoConcluir }: Props) {
  const [estado, enviar] = useActionState(acao, RESULTADO_INICIAL);
  useToastDoResultado(estado, aoConcluir);
  const e = estado.erros ?? {};
  const hora = (h: string | null) => (h ? formatarHora(h) : "");
  const v = (campo: string, original: string) => estado.valores?.[campo] ?? original;

  return (
    <form action={enviar} className="space-y-4" noValidate>
      <input type="hidden" name="id" value={registro.id} />
      {permitirData ? (
        <Campo rotulo="Data" name="data" type="date" defaultValue={v("data", registro.data)} erro={e.data} obrigatorio />
      ) : (
        <input type="hidden" name="data" value={registro.data} />
      )}
      <div className="grid grid-cols-2 gap-3">
        <CampoHora rotulo="Chegada" name="hora_chegada" defaultValue={v("hora_chegada", hora(registro.hora_chegada))} erro={e.hora_chegada} obrigatorio />
        <CampoHora rotulo="Saída" name="hora_saida" defaultValue={v("hora_saida", hora(registro.hora_saida))} erro={e.hora_saida} ajuda="Vazio = ainda trabalhando" />
      </div>
      <Campo rotulo="Cliente" name="cliente" defaultValue={v("cliente", registro.cliente)} erro={e.cliente} obrigatorio maxLength={200} />
      <AreaTexto rotulo="Serviço realizado" name="servico" defaultValue={v("servico", registro.servico ?? "")} erro={e.servico} ajuda="Obrigatório quando houver saída." maxLength={2000} />
      <AreaTexto rotulo="Observações" name="observacoes" defaultValue={v("observacoes", registro.observacoes ?? "")} erro={e.observacoes} rows={4} maxLength={5000} />
      <CamposGastosRegistro veiculos={veiculos} inicial={registro} digitado={estado.valores} erros={e} mostrarValores={permitirData} />
      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <Botao variante="fantasma" onClick={aoConcluir}>Cancelar</Botao>
        <BotaoEnviar textoCarregando="Salvando...">
          <Save className="size-5" aria-hidden /> Salvar alterações
        </BotaoEnviar>
      </div>
    </form>
  );
}
