export const WHATSAPP = "5548998149358";
export const WHATSAPP_LABEL = "(48) 99814-9358";
export const FIXO = "(48) 3658-6692";
export const FIXO_TEL = "+554836586692";
export const EMAIL = "eletrosilvabn@gmail.com";
export const INSTAGRAM = "eletrosilvamateriais";
export const FACEBOOK_SERVICOS = "https://facebook.com/eletrosilvaoficial";
// Página de materiais (rodapé). Troque pelo link exato da página de materiais.
export const FACEBOOK_MATERIAIS = "https://facebook.com/eletrosilvaoficial";

export const ENDERECO = "Rodovia SC-370, nº 1182, Nossa Senhora das Graças, Braço do Norte/SC, CEP 88750-000";
export const ENDERECO_CURTO = "Rodovia SC-370, 1182, Nossa Sra. das Graças, Braço do Norte/SC";
const enderecoQuery = encodeURIComponent("Eletro Silva Materiais Elétricos, Rodovia SC-370, 1182, Braço do Norte - SC, 88750-000");
export const MAPS_LINK = `https://www.google.com/maps/search/?api=1&query=${enderecoQuery}`;
export const MAPS_EMBED = `https://www.google.com/maps?q=${enderecoQuery}&output=embed`;

export const HORARIOS = [
  { dia: "Segunda a sexta", hora: "8h às 12h e 13h30 às 18h" },
  { dia: "Sábado", hora: "8h às 12h" },
  { dia: "Domingo", hora: "Fechado" },
];

// Vídeos: cole aqui o link de incorporação (YouTube "embed" ou arquivo .mp4).
// Se ficarem vazios, o site mostra um espaço reservado.
export const VIDEO_QUEM_SOMOS = "";
export const VIDEO_TOUR_LOJA = "";

export function wa(texto: string) {
  return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(texto)}`;
}

export const MSG = {
  orcamento: "Olá! Gostaria de fazer um orçamento.",
  eletricista: "Olá! Sou eletricista e gostaria de atendimento.",
  servico: "Olá! Gostaria de um orçamento de serviço.",
  posVenda: "Olá! Preciso de ajuda com uma compra.",
  fornecedor: "Olá! Gostaria de apresentar meus produtos.",
  ofertas: "Olá! Quero receber as ofertas da Eletro Silva pelo WhatsApp.",
};

export const MENU = [
  { href: "/", label: "Início" },
  { href: "/quem-somos", label: "Quem Somos" },
  { href: "/conheca-a-loja", label: "Conheça a Loja" },
  { href: "/servicos", label: "Serviços" },
  { href: "/catalogo", label: "Catálogo" },
  { href: "/ofertas", label: "Ofertas e Sorteios" },
  { href: "/fornecedores", label: "Fornecedores" },
  { href: "/contato", label: "Contato" },
];

export const CATEGORIAS = [
  { slug: "fios-e-cabos", nome: "Fios e cabos", icone: "🧵" },
  { slug: "disjuntores-e-quadros", nome: "Disjuntores e quadros", icone: "🔌" },
  { slug: "tomadas-e-interruptores", nome: "Tomadas e interruptores", icone: "🔘" },
  { slug: "iluminacao-e-led", nome: "Iluminação e LED", icone: "💡" },
  { slug: "eletrodutos-e-conexoes", nome: "Eletrodutos e conexões", icone: "🪈" },
  { slug: "ferramentas-e-epis", nome: "Ferramentas e EPIs", icone: "🧰" },
  { slug: "ventiladores-e-chuveiros", nome: "Ventiladores e chuveiros", icone: "🌀" },
];
