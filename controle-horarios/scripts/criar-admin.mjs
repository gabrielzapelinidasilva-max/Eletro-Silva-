// Cria (ou promove) o primeiro ADMINISTRADOR.
// Uso:  npm run criar-admin
//   ou: npm run criar-admin -- --nome "Fulano" --email fulano@email.com --senha minhaSenha
// Precisa do arquivo .env.local com NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.

import { createInterface } from "node:readline/promises";
import { stdin, stdout, exit } from "node:process";
import { createClient } from "@supabase/supabase-js";

try {
  process.loadEnvFile(".env.local");
} catch {
  // sem .env.local: usa as variáveis do ambiente
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !chave) {
  console.error("\n✖ Faltam NEXT_PUBLIC_SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY no arquivo .env.local (veja o README).\n");
  exit(1);
}

function argumento(nome) {
  const i = process.argv.indexOf(`--${nome}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

const rl = createInterface({ input: stdin, output: stdout });
const perguntar = async (nome, texto) => argumento(nome) ?? (await rl.question(texto)).trim();

console.log("\n=== Eletro Silva – criar administrador ===\n");
const nome = await perguntar("nome", "Nome completo: ");
const email = (await perguntar("email", "E-mail: ")).toLowerCase();
const senha = await perguntar("senha", "Senha (mínimo 6 caracteres): ");
rl.close();

if (nome.length < 2 || !/^\S+@\S+\.\S+$/.test(email) || senha.length < 6) {
  console.error("\n✖ Dados inválidos. Confira nome, e-mail e senha (mínimo 6 caracteres).\n");
  exit(1);
}

const supabase = createClient(url, chave, { auth: { persistSession: false, autoRefreshToken: false } });

let id;
const { data, error } = await supabase.auth.admin.createUser({
  email,
  password: senha,
  email_confirm: true,
  user_metadata: { nome },
  app_metadata: { funcao: "admin" },
});

if (error) {
  if (!/already|exists|registered/i.test(error.message)) {
    console.error(`\n✖ Erro ao criar usuário: ${error.message}\n`);
    exit(1);
  }
  // Já existe: procura o usuário e transforma em administrador.
  const { data: perfil } = await supabase.from("profiles").select("id").eq("email", email).maybeSingle();
  if (!perfil) {
    console.error("\n✖ Este e-mail já existe no Auth, mas sem perfil. Rode as migrações SQL primeiro (veja o README).\n");
    exit(1);
  }
  id = perfil.id;
  await supabase.auth.admin.updateUserById(id, { password: senha, app_metadata: { funcao: "admin" }, ban_duration: "none" });
  console.log("ℹ Usuário já existia: senha atualizada e promovido a administrador.");
} else {
  id = data.user.id;
}

const { error: erroPerfil } = await supabase.from("profiles").upsert({ id, nome, email, funcao: "admin", ativo: true });
if (erroPerfil) {
  console.error(`\n✖ Erro ao salvar o perfil: ${erroPerfil.message}\n  Você rodou as migrações SQL (supabase/migrations)?\n`);
  exit(1);
}

console.log(`\n✔ Pronto! ${nome} (${email}) agora é administrador. Entre no sistema com esse e-mail e senha.\n`);
