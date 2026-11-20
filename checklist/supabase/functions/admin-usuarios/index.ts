// Em Ordem — operações de administrador sobre usuários.
// Roda no servidor do Supabase: a SERVICE_ROLE_KEY vem do próprio ambiente da função
// e nunca chega ao navegador. Toda chamada confere antes se quem chamou é admin ativo.
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function resposta(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

const erro = (mensagem: string, status = 400) => resposta({ erro: mensagem }, status);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Link que aponta direto para o site (/auth/confirmar?token_hash=...), sem depender
// da lista de Redirect URLs do Auth. O site valida o token com verifyOtp.
function linkDireto(redirectTo: string | undefined, hashed: string | undefined, tipo: "invite" | "recovery", reserva: string) {
  if (!redirectTo || !hashed) return reserva;
  const u = new URL(redirectTo);
  u.searchParams.set("token_hash", hashed);
  u.searchParams.set("type", tipo);
  return u.toString();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return erro("Método não permitido.", 405);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1) Quem está chamando?
  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: quem, error: erroQuem } = await admin.auth.getUser(jwt);
  if (erroQuem || !quem?.user) return erro("Sessão inválida.", 401);

  const { data: perfil } = await admin
    .from("profiles")
    .select("id, role, ativo, is_owner")
    .eq("id", quem.user.id)
    .maybeSingle();
  if (!perfil || perfil.role !== "admin" || !perfil.ativo) {
    return erro("Somente administradores podem fazer isso.", 403);
  }

  let corpo: Record<string, unknown>;
  try {
    corpo = await req.json();
  } catch {
    return erro("Requisição inválida.");
  }
  const acao = String(corpo.acao ?? "");
  const redirectTo = typeof corpo.redirectTo === "string" ? corpo.redirectTo : undefined;

  // Busca o alvo e aplica as proteções comuns
  async function carregarAlvo() {
    const id = String(corpo.id ?? "");
    const { data } = await admin
      .from("profiles")
      .select("id, nome, email, role, ativo, is_owner")
      .eq("id", id)
      .maybeSingle();
    return data;
  }

  switch (acao) {
    // ---------------------------------------------------------------
    case "listar": {
      const { data: perfis, error } = await admin
        .from("profiles")
        .select("id, nome, email, role, ativo, is_owner, created_at")
        .order("nome");
      if (error) return erro(error.message, 500);

      const { data: lista } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const porId = new Map((lista?.users ?? []).map((u) => [u.id, u]));
      return resposta({
        usuarios: (perfis ?? []).map((p) => {
          const u = porId.get(p.id);
          return {
            ...p,
            ultimo_acesso: u?.last_sign_in_at ?? null,
            pendente: !u?.last_sign_in_at,
          };
        }),
      });
    }

    // ---------------------------------------------------------------
    case "convidar": {
      const email = String(corpo.email ?? "").trim().toLowerCase();
      const nome = String(corpo.nome ?? "").trim();
      const role = corpo.role === "admin" ? "admin" : "colaborador";
      if (!EMAIL_RE.test(email)) return erro("E-mail inválido.");
      if (!nome) return erro("Informe o nome da pessoa.");

      const { data: existente } = await admin
        .from("profiles").select("id").eq("email", email).maybeSingle();
      if (existente) return erro("Já existe uma pessoa com este e-mail.");

      // Pré-autoriza o e-mail (o banco recusa contas que não estejam aqui)
      const { error: erroConvite } = await admin.from("convites").upsert({
        email, nome, role, convidado_por: perfil.id,
      });
      if (erroConvite) return erro("Não foi possível registrar o convite: " + erroConvite.message, 500);

      const { error: erroEmail } = await admin.auth.admin.inviteUserByEmail(email, {
        data: { nome },
        redirectTo,
      });
      if (!erroEmail) return resposta({ ok: true, emailEnviado: true });

      // Se o e-mail não puder ser enviado (ex.: SMTP padrão do Supabase), gera o link
      // para o admin mandar por WhatsApp.
      const { data: link, error: erroLink } = await admin.auth.admin.generateLink({
        type: "invite",
        email,
        options: { data: { nome }, redirectTo },
      });
      if (erroLink || !link?.properties?.action_link) {
        await admin.from("convites").delete().eq("email", email);
        return erro("Não foi possível convidar: " + (erroLink?.message ?? erroEmail.message), 500);
      }
      return resposta({
        ok: true,
        emailEnviado: false,
        aviso: erroEmail.message,
        link: linkDireto(redirectTo, link.properties.hashed_token, "invite", link.properties.action_link),
      });
    }

    // ---------------------------------------------------------------
    case "gerar_link": {
      // Link para a pessoa (re)definir a senha — útil se o e-mail não chegou.
      const alvo = await carregarAlvo();
      if (!alvo) return erro("Pessoa não encontrada.", 404);
      if (!alvo.ativo) return erro("Reative a pessoa antes de gerar um link.");
      const { data: link, error } = await admin.auth.admin.generateLink({
        type: "recovery",
        email: alvo.email,
        options: { redirectTo },
      });
      if (error || !link?.properties?.action_link) return erro(error?.message ?? "Falha ao gerar link.", 500);
      return resposta({
        ok: true,
        link: linkDireto(redirectTo, link.properties.hashed_token, "recovery", link.properties.action_link),
      });
    }

    // ---------------------------------------------------------------
    case "alterar_papel": {
      const alvo = await carregarAlvo();
      if (!alvo) return erro("Pessoa não encontrada.", 404);
      const role = corpo.role === "admin" ? "admin" : "colaborador";
      if (alvo.is_owner && role !== "admin") {
        return erro("O administrador principal não pode ser rebaixado.", 403);
      }
      if (alvo.id === perfil.id && role !== "admin") {
        return erro("Você não pode rebaixar a si mesmo.");
      }
      const { error } = await admin.from("profiles").update({ role }).eq("id", alvo.id);
      if (error) return erro(error.message, 400);
      return resposta({ ok: true });
    }

    // ---------------------------------------------------------------
    case "alterar_status": {
      const alvo = await carregarAlvo();
      if (!alvo) return erro("Pessoa não encontrada.", 404);
      const ativo = corpo.ativo === true;
      if (alvo.is_owner && !ativo) return erro("O administrador principal não pode ser desativado.", 403);
      if (alvo.id === perfil.id && !ativo) return erro("Você não pode desativar a si mesmo.");

      const { error } = await admin.from("profiles").update({ ativo }).eq("id", alvo.id);
      if (error) return erro(error.message, 400);
      // Bloqueia (ou libera) o login no Auth também
      await admin.auth.admin.updateUserById(alvo.id, { ban_duration: ativo ? "none" : "876000h" });
      return resposta({ ok: true });
    }

    // ---------------------------------------------------------------
    case "remover": {
      const alvo = await carregarAlvo();
      if (!alvo) return erro("Pessoa não encontrada.", 404);
      if (alvo.is_owner) return erro("O administrador principal não pode ser removido.", 403);
      if (alvo.id === perfil.id) return erro("Você não pode remover a si mesmo.");
      const { error } = await admin.auth.admin.deleteUser(alvo.id);
      if (error) return erro(error.message, 400);
      return resposta({ ok: true });
    }

    default:
      return erro("Ação desconhecida.");
  }
});
