"use server";

import { revalidatePath } from "next/cache";
import { exigirAdmin } from "@/lib/auth";
import { criarClienteAdmin, serviceRoleConfigurada } from "@/lib/supabase/admin";
import { criarClienteServidor } from "@/lib/supabase/server";
import { falha, falhaValidacao, sucesso } from "@/lib/resultado";
import type { Funcao, Resultado } from "@/lib/tipos";

// Todas estas ações rodam só no servidor e sempre conferem antes se quem pediu é um administrador ativo.
// Com a chave SUPABASE_SERVICE_ROLE_KEY configurada, usam a API de administração do Supabase Auth.
// Sem ela, usam as funções admin_* do banco (migração 0004), que conferem o administrador de novo lá dentro.

const SENHA_MINIMA = 6;
const BANIDO_PARA_SEMPRE = "876000h"; // ~100 anos

function texto(form: FormData, campo: string) {
  return String(form.get(campo) ?? "").trim();
}

function lerDados(form: FormData) {
  return {
    nome: texto(form, "nome"),
    email: texto(form, "email").toLowerCase(),
    telefone: texto(form, "telefone") || null,
    funcao: (texto(form, "funcao") === "admin" ? "admin" : "eletricista") as Funcao,
  };
}

function validarDados(d: ReturnType<typeof lerDados>) {
  const erros: Record<string, string> = {};
  if (d.nome.length < 2) erros.nome = "Informe o nome completo.";
  else if (d.nome.length > 120) erros.nome = "Nome muito longo.";
  if (!/^\S+@\S+\.\S+$/.test(d.email)) erros.email = "Informe um e-mail válido.";
  if (d.telefone && !/^[\d\s()+-]{8,20}$/.test(d.telefone)) erros.telefone = "Telefone inválido. Ex.: (48) 99999-9999";
  return erros;
}

function validarSenha(senha: string, confirmar: string | null) {
  const erros: Record<string, string> = {};
  if (senha.length < SENHA_MINIMA) erros.senha = `A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.`;
  else if (confirmar !== null && senha !== confirmar) erros.confirmar = "As senhas não são iguais.";
  return erros;
}

function mensagemErroAuth(msg: string | undefined): string {
  const m = (msg ?? "").toLowerCase();
  if (m.includes("already") && (m.includes("registered") || m.includes("exists"))) return "Já existe um usuário com este e-mail.";
  if (m.includes("password")) return "Senha fraca. Use pelo menos 6 caracteres, misturando letras e números.";
  if (m.includes("email")) return "E-mail inválido.";
  return "Não foi possível salvar. Tente novamente.";
}

/** Traduz os erros lançados pelas funções admin_* do banco. */
function mensagemErroFuncao(msg: string | undefined): string {
  const m = msg ?? "";
  if (m.includes("email_existente")) return "Já existe um usuário com este e-mail.";
  if (m.includes("senha_curta")) return `A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.`;
  if (m.includes("nao_pode_rebaixar_a_si")) return "Você não pode tirar a sua própria função de administrador.";
  if (m.includes("nao_pode_desativar_a_si")) return "Você não pode desativar a sua própria conta.";
  if (m.includes("nao_encontrado")) return "Colaborador não encontrado.";
  if (m.includes("sem_permissao")) return "Você não tem permissão para fazer isso.";
  return "Não foi possível salvar. Tente novamente.";
}

function atualizarTelas() {
  revalidatePath("/admin", "layout");
}

export async function criarColaborador(_a: Resultado, form: FormData): Promise<Resultado> {
  await exigirAdmin();
  const d = lerDados(form);
  const senha = String(form.get("senha") ?? "");
  const erros = { ...validarDados(d), ...validarSenha(senha, null) };
  if (Object.keys(erros).length) return falhaValidacao(erros, form);

  if (!serviceRoleConfigurada()) {
    const supabase = await criarClienteServidor();
    const { error } = await supabase.rpc("admin_criar_colaborador", {
      p_nome: d.nome, p_email: d.email, p_telefone: d.telefone ?? "", p_senha: senha, p_funcao: d.funcao,
    });
    if (error) return falha(mensagemErroFuncao(error.message), form);
  } else {
    const admin = criarClienteAdmin();
    const { data, error } = await admin.auth.admin.createUser({
      email: d.email,
      password: senha,
      email_confirm: true,
      user_metadata: { nome: d.nome, telefone: d.telefone },
      app_metadata: { funcao: d.funcao },
    });
    if (error || !data.user) return falha(mensagemErroAuth(error?.message), form);

    // O gatilho do banco já criou o perfil; aqui garantimos os dados certinhos.
    const { error: erroPerfil } = await admin
      .from("profiles")
      .upsert({ id: data.user.id, nome: d.nome, email: d.email, telefone: d.telefone, funcao: d.funcao, ativo: true });
    if (erroPerfil) return falha("Usuário criado, mas houve um erro ao salvar o perfil. Edite o colaborador para corrigir.");
  }

  atualizarTelas();
  return sucesso(`${d.nome} foi adicionado(a). Já pode entrar com o e-mail e a senha informados.`);
}

export async function editarColaborador(_a: Resultado, form: FormData): Promise<Resultado> {
  const eu = await exigirAdmin();
  const id = texto(form, "id");
  const d = lerDados(form);
  const erros = validarDados(d);
  if (Object.keys(erros).length) return falhaValidacao(erros, form);
  if (id === eu.id && d.funcao !== "admin") {
    return falha("Você não pode tirar a sua própria função de administrador.", form, { funcao: "Peça a outro administrador." });
  }

  if (!serviceRoleConfigurada()) {
    const supabase = await criarClienteServidor();
    const { error } = await supabase.rpc("admin_atualizar_colaborador", {
      p_id: id, p_nome: d.nome, p_email: d.email, p_telefone: d.telefone ?? "", p_funcao: d.funcao,
    });
    if (error) return falha(mensagemErroFuncao(error.message), form);
  } else {
    const admin = criarClienteAdmin();
    const { data: atual } = await admin.from("profiles").select("email").eq("id", id).single();
    if (!atual) return falha("Colaborador não encontrado.", form);

    if (atual.email !== d.email) {
      const { error } = await admin.auth.admin.updateUserById(id, { email: d.email, email_confirm: true });
      if (error) return falha(mensagemErroAuth(error.message), form, { email: mensagemErroAuth(error.message) });
    }
    await admin.auth.admin.updateUserById(id, { app_metadata: { funcao: d.funcao }, user_metadata: { nome: d.nome, telefone: d.telefone } });

    const { error } = await admin.from("profiles").update(d).eq("id", id);
    if (error) return falha("Não foi possível salvar. Tente novamente.", form);
  }

  atualizarTelas();
  return sucesso("Dados do colaborador atualizados.");
}

export async function redefinirSenha(_a: Resultado, form: FormData): Promise<Resultado> {
  await exigirAdmin();
  const id = texto(form, "id");
  const senha = String(form.get("senha") ?? "");
  const erros = validarSenha(senha, String(form.get("confirmar") ?? ""));
  if (Object.keys(erros).length) return falhaValidacao(erros);

  if (!serviceRoleConfigurada()) {
    const supabase = await criarClienteServidor();
    const { error } = await supabase.rpc("admin_redefinir_senha", { p_id: id, p_senha: senha });
    if (error) return falha(mensagemErroFuncao(error.message));
  } else {
    const { error } = await criarClienteAdmin().auth.admin.updateUserById(id, { password: senha });
    if (error) return falha(mensagemErroAuth(error.message));
  }
  return sucesso("Senha redefinida. Informe a nova senha ao colaborador.");
}

export async function alterarStatus(_a: Resultado, form: FormData): Promise<Resultado> {
  const eu = await exigirAdmin();
  const id = texto(form, "id");
  const ativar = texto(form, "ativo") === "true";
  if (id === eu.id && !ativar) return falha("Você não pode desativar a sua própria conta.");

  let nome: string;
  if (!serviceRoleConfigurada()) {
    const supabase = await criarClienteServidor();
    const { data, error } = await supabase.rpc("admin_alterar_status", { p_id: id, p_ativo: ativar });
    if (error) return falha(mensagemErroFuncao(error.message));
    nome = String(data ?? "Colaborador");
  } else {
    const admin = criarClienteAdmin();
    // Usuário "banido" no Supabase Auth não consegue entrar; o histórico continua guardado.
    const { error: erroAuth } = await admin.auth.admin.updateUserById(id, { ban_duration: ativar ? "none" : BANIDO_PARA_SEMPRE });
    if (erroAuth) return falha("Não foi possível alterar o acesso. Tente novamente.");
    const { data, error } = await admin.from("profiles").update({ ativo: ativar }).eq("id", id).select("nome").single();
    if (error || !data) return falha("Não foi possível alterar o status. Tente novamente.");
    nome = data.nome;
  }

  atualizarTelas();
  return sucesso(ativar ? `${nome} foi reativado(a).` : `${nome} foi desativado(a) e não consegue mais entrar.`);
}
