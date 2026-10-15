"""
Grana Jovem — mentoria de dinheiro para jovens
Versão em Python usando Streamlit.

Como rodar:
    pip install -r requirements.txt
    streamlit run app.py
"""

from datetime import date

import pandas as pd
import streamlit as st

# ------------------------------------------------------------------
# Configuração da página
# ------------------------------------------------------------------
st.set_page_config(page_title="Grana Jovem", page_icon="🪙", layout="wide")

st.markdown(
    """
    <style>
    .big-number {font-size: 3rem; font-weight: 800; color: #2D4BD8; line-height: 1.1;}
    .aviso {border-left: 4px solid #D24A33; background: rgba(210,74,51,.08);
            padding: .8rem 1rem; border-radius: 0 10px 10px 0; margin-bottom: .7rem;}
    .dica {border-left: 4px solid #F5B935; background: rgba(245,185,53,.12);
           padding: .8rem 1rem; border-radius: 0 10px 10px 0; margin-bottom: .7rem;}
    </style>
    """,
    unsafe_allow_html=True,
)


# ------------------------------------------------------------------
# Funções úteis
# ------------------------------------------------------------------
def brl(valor: float) -> str:
    """Formata um número como dinheiro em reais: 1234.5 -> R$ 1.234,50"""
    texto = f"{valor:,.2f}"
    texto = texto.replace(",", "X").replace(".", ",").replace("X", ".")
    return f"R$ {texto}"


def aviso(texto: str, tipo: str = "aviso") -> None:
    st.markdown(f'<div class="{tipo}">{texto}</div>', unsafe_allow_html=True)


def simular(inicial: float, mensal: float, taxa_mes: float, meses: int, composto: bool = True):
    """
    Simula o investimento mês a mês.
    - Juros compostos: os juros são calculados sobre o saldo (juros sobre juros).
    - Juros simples: os juros são calculados só sobre o dinheiro que você colocou.
    O depósito mensal entra no fim de cada mês.
    """
    saldo = inicial
    investido = inicial
    juros_acumulados = 0.0
    linhas = []
    for mes in range(1, meses + 1):
        juros_mes = saldo * taxa_mes if composto else investido * taxa_mes
        juros_acumulados += juros_mes
        saldo += juros_mes + mensal
        investido += mensal
        linhas.append(
            {
                "Mês": mes,
                "Juros no mês": juros_mes,
                "Total colocado": investido,
                "Juros acumulados": juros_acumulados,
                "Saldo": saldo,
            }
        )
    return pd.DataFrame(linhas)


# ------------------------------------------------------------------
# Dados guardados durante a sessão (gestor e metas)
# ------------------------------------------------------------------
if "movimentacoes" not in st.session_state:
    st.session_state.movimentacoes = []
if "metas" not in st.session_state:
    st.session_state.metas = []


# ------------------------------------------------------------------
# Cabeçalho e abas
# ------------------------------------------------------------------
st.title("🪙 Grana Jovem")

abas = st.tabs(
    [
        "Início",
        "Cuidar do dinheiro",
        "Como guardar",
        "Tipos de investimento",
        "Melhor forma de investir",
        "Meu dinheiro",
        "Simulador",
    ]
)

# ==================================================================
# ABA 1 — INÍCIO
# ==================================================================
with abas[0]:
    col1, col2 = st.columns([1.3, 1])
    with col1:
        st.header("Seu dinheiro pode trabalhar por você.")
        st.write(
            "Uma mentoria para jovens que querem aprender a cuidar do dinheiro, "
            "guardar sem sofrimento e começar a investir com segurança, mesmo com pouco."
        )
        st.markdown(
            """
            **O que você vai encontrar nas abas:**
            - **Cuidar do dinheiro:** organizar o que entra e o que sai, e fugir das armadilhas.
            - **Como guardar:** reserva de emergência e truques para guardar todo mês.
            - **Tipos de investimento:** o que cada um faz, quanto arrisca e para quem serve.
            - **Melhor forma de investir:** passo a passo e teste de perfil de investidor.
            - **Meu dinheiro:** anote entradas, gastos e metas.
            - **Simulador:** veja quanto seu dinheiro rende com juros compostos.
            """
        )
    with col2:
        st.subheader("Teste rápido")
        aporte = st.number_input("Guardando por mês (R$)", min_value=0.0, value=50.0, step=10.0, key="h_aporte")
        anos = st.number_input("Durante quantos anos?", min_value=1, max_value=60, value=5, key="h_anos")
        df_h = simular(0, aporte, 0.008, int(anos) * 12)
        final = df_h["Saldo"].iloc[-1]
        colocado = df_h["Total colocado"].iloc[-1]
        st.caption("Rendendo 0,8% ao mês, você teria:")
        st.markdown(f'<div class="big-number">{brl(final)}</div>', unsafe_allow_html=True)
        st.write(f"Você colocou {brl(colocado)}. Os juros renderam {brl(final - colocado)}.")

# ==================================================================
# ABA 2 — CUIDAR DO DINHEIRO
# ==================================================================
with abas[1]:
    st.header("Cuidar do dinheiro")
    st.write(
        "Cuidar do dinheiro é decidir para onde ele vai antes de gastar. Não importa se é mesada, "
        "estágio ou primeiro salário: o hábito vale mais que o valor."
    )

    st.subheader("A regra 50 / 30 / 20")
    c1, c2, c3 = st.columns(3)
    c1.metric("Essencial", "50%", help="Transporte, alimentação, contas, estudo")
    c2.metric("Desejos", "30%", help="Lazer, roupas, delivery, jogos")
    c3.metric("Futuro", "20%", help="Guardar e investir")
    st.write(
        "Se você mora com a família e não tem muitas contas, dá para guardar bem mais que 20%. "
        "Essa é a melhor fase da vida para começar."
    )

    renda = st.number_input("Quanto você recebe por mês? (R$)", min_value=0.0, value=1500.0, step=100.0)
    st.write(
        f"Essencial: **{brl(renda * 0.5)}** · Desejos: **{brl(renda * 0.3)}** · Futuro: **{brl(renda * 0.2)}**"
    )

    col1, col2 = st.columns(2)
    with col1:
        st.subheader("O que fazer quando o dinheiro cai")
        st.markdown(
            """
            - **Pague-se primeiro:** separe a parte de guardar no mesmo dia, antes de gastar.
            - **Anote tudo por um mês:** os pequenos gastos surpreendem.
            - **Tenha objetivos:** "R$ 1.200 para um celular em 8 meses" funciona melhor que "guardar dinheiro".
            """
        )
    with col2:
        st.subheader("Antes de comprar, pergunte")
        st.markdown(
            """
            - Eu preciso disso ou só quero agora?
            - Quantas horas de trabalho isso custa?
            - Vou usar daqui a um mês?
            - Espere 48 horas em compras não planejadas.
            """
        )

    st.subheader("Armadilhas para evitar")
    aviso("<b>Cartão de crédito:</b> não é dinheiro extra. Se não pagar a fatura inteira, entra no rotativo, "
          "que tem alguns dos juros mais altos do mercado.")
    aviso("<b>Parcelar tudo:</b> várias parcelas pequenas viram uma conta grande que prende seu salário por meses.")
    aviso("<b>Apostas e “bets”:</b> não são investimento. A banca é feita para ganhar no longo prazo.")
    aviso("<b>Golpes e pirâmides:</b> desconfie de retorno alto e garantido, de quem pede para chamar amigos "
          "ou tem pressa para você entrar.")

# ==================================================================
# ABA 3 — COMO GUARDAR
# ==================================================================
with abas[2]:
    st.header("Como guardar dinheiro")
    st.write("Guardar é o primeiro passo. Investir é fazer o dinheiro guardado crescer.")

    st.subheader("Comece pela reserva de emergência")
    st.write(
        "É um dinheiro só para imprevistos. Para quem já tem contas, o ideal é juntar de **3 a 6 meses** "
        "dos seus gastos. Se você mora com a família, comece com uma meta menor, como R$ 500 ou R$ 1.000. "
        "Ela precisa estar num lugar **seguro** e com **saque no mesmo dia**, como Tesouro Selic ou um CDB "
        "com liquidez diária que renda pelo menos 100% do CDI."
    )
    gastos = st.number_input("Quanto você gasta por mês? (R$)", min_value=0.0, value=1000.0, step=100.0)
    st.write(f"Sua reserva ideal fica entre **{brl(gastos * 3)}** e **{brl(gastos * 6)}**.")

    aviso("Dinheiro parado na carteira ou na conta corrente perde valor todo ano por causa da inflação.", "dica")

    col1, col2 = st.columns(2)
    with col1:
        st.subheader("Truques que funcionam")
        st.markdown(
            """
            - **Automático:** programe uma transferência para o dia em que você recebe.
            - **Caixinhas separadas:** uma para reserva, uma para cada objetivo.
            - **Arredonde:** gastou R$ 17,40? Guarde os R$ 2,60 que faltam para R$ 20.
            - **Revise assinaturas:** apps que você nem usa somam muito no ano.
            """
        )
    with col2:
        st.subheader("Desafio das 52 semanas")
        base = st.number_input("Valor da semana 1 (R$)", min_value=1.0, value=1.0, step=1.0)
        total_52 = sum(base * semana for semana in range(1, 53))
        st.write(
            f"Na semana 1 você guarda {brl(base)}, na semana 2 guarda {brl(base * 2)}, e assim por diante. "
            f"No fim do ano terá **{brl(total_52)}**."
        )

    st.subheader("Objetivos por prazo")
    st.table(
        pd.DataFrame(
            {
                "Prazo": ["Curto (até 2 anos)", "Médio (2 a 5 anos)", "Longo (mais de 5 anos)"],
                "Exemplos": ["Reserva, celular, viagem", "Carro, intercâmbio, faculdade", "Casa, independência financeira"],
                "Onde costuma fazer sentido": [
                    "Tesouro Selic, CDB com liquidez diária",
                    "CDB, LCI, LCA, Tesouro Prefixado",
                    "Tesouro IPCA+, ETFs, ações, fundos imobiliários",
                ],
            }
        ).set_index("Prazo")
    )

# ==================================================================
# ABA 4 — TIPOS DE INVESTIMENTO
# ==================================================================
INVESTIMENTOS = [
    {"nome": "Poupança", "tipo": "Renda fixa", "risco": "🟢 Risco baixo",
     "desc": "O investimento mais conhecido do Brasil. Simples, mas costuma render menos que outras opções igualmente seguras.",
     "info": {"Como rende": "0,5% ao mês + TR quando a Selic está acima de 8,5% ao ano; se estiver abaixo, 70% da Selic + TR",
              "Liquidez": "Saque a qualquer hora (rende só no aniversário mensal)",
              "Imposto": "Isenta de IR", "Bom para": "Quem está começando, mas vale comparar com o Tesouro Selic"}},
    {"nome": "Tesouro Selic", "tipo": "Renda fixa", "risco": "🟢 Risco baixo",
     "desc": "Você empresta dinheiro para o governo federal. É considerado o investimento mais seguro do país.",
     "info": {"Como rende": "Acompanha a Selic", "Liquidez": "Pode vender em qualquer dia útil",
              "Imposto": "IR regressivo (22,5% a 15%)", "Bom para": "Reserva de emergência e curto prazo"}},
    {"nome": "Tesouro Prefixado", "tipo": "Renda fixa", "risco": "🟡 Risco médio",
     "desc": "Você sabe na hora quanto vai ganhar se levar até o vencimento. Se vender antes, o preço pode oscilar.",
     "info": {"Como rende": "Taxa fixa combinada na compra", "Liquidez": "Diária, com oscilação de preço",
              "Imposto": "IR regressivo", "Bom para": "Objetivos com data marcada"}},
    {"nome": "Tesouro IPCA+", "tipo": "Renda fixa", "risco": "🟡 Risco médio",
     "desc": "Rende a inflação mais uma taxa fixa. Protege seu poder de compra no longo prazo.",
     "info": {"Como rende": "IPCA + taxa fixa", "Liquidez": "Diária, com oscilação de preço",
              "Imposto": "IR regressivo", "Bom para": "Aposentadoria e objetivos longos"}},
    {"nome": "CDB", "tipo": "Renda fixa", "risco": "🟢 Risco baixo",
     "desc": "Você empresta dinheiro para um banco. Muitos rendem mais que a poupança e têm proteção do FGC.",
     "info": {"Como rende": "Geralmente um percentual do CDI", "Liquidez": "Diária ou só no vencimento",
              "Imposto": "IR regressivo", "Bom para": "Reserva (com liquidez diária) e médio prazo"}},
    {"nome": "LCI e LCA", "tipo": "Renda fixa", "risco": "🟢 Risco baixo",
     "desc": "Parecidas com o CDB, mas financiam o setor imobiliário (LCI) ou o agronegócio (LCA). Têm FGC.",
     "info": {"Como rende": "Percentual do CDI ou taxa fixa", "Liquidez": "Normalmente só após um prazo mínimo",
              "Imposto": "Hoje isentas de IR para pessoa física", "Bom para": "Médio prazo"}},
    {"nome": "Fundos de investimento", "tipo": "Renda variável", "risco": "🟡 Risco variável",
     "desc": "Seu dinheiro se junta ao de outras pessoas e um gestor profissional decide onde investir.",
     "info": {"Como rende": "Depende da estratégia do fundo", "Liquidez": "De 1 dia a vários meses",
              "Custos": "Taxa de administração e às vezes de performance", "Bom para": "Quem quer delegar, olhando bem as taxas"}},
    {"nome": "Ações", "tipo": "Renda variável", "risco": "🔴 Risco alto",
     "desc": "Você compra um pedacinho de uma empresa. Ganha com a valorização e com dividendos. O preço oscila todo dia.",
     "info": {"Como rende": "Valorização + dividendos", "Liquidez": "Alta, vende na bolsa",
              "Imposto": "15% sobre o lucro; vendas até R$ 20 mil por mês são isentas", "Bom para": "Longo prazo"}},
    {"nome": "Fundos imobiliários (FIIs)", "tipo": "Renda variável", "risco": "🟡 Risco médio",
     "desc": "Você vira dono de um pedaço de shoppings, galpões ou prédios. Costumam pagar rendimentos todo mês.",
     "info": {"Como rende": "Aluguéis mensais + valorização", "Liquidez": "Vende na bolsa",
              "Imposto": "Rendimentos hoje isentos para pessoa física; 20% sobre lucro na venda", "Bom para": "Renda mensal no longo prazo"}},
    {"nome": "ETFs", "tipo": "Renda variável", "risco": "🟠 Risco médio a alto",
     "desc": "Um fundo da bolsa que copia um índice, como o Ibovespa. Com uma compra você tem várias empresas.",
     "info": {"Como rende": "Acompanha o índice", "Liquidez": "Alta, vende na bolsa",
              "Custos": "Taxas geralmente baixas", "Bom para": "Começar na renda variável já diversificado"}},
    {"nome": "Criptomoedas", "tipo": "Renda variável", "risco": "🔴 Risco muito alto",
     "desc": "Moedas digitais como o Bitcoin. Sobem ou caem muito em pouco tempo e não têm FGC.",
     "info": {"Como rende": "Só pela valorização", "Liquidez": "Alta, 24h por dia",
              "Cuidado": "Golpes são comuns; use corretoras conhecidas", "Bom para": "Uma parte pequena da carteira, se quiser"}},
]

with abas[3]:
    st.header("Tipos de investimento")
    st.write("Clique em cada um para ver como funciona. Quanto maior o potencial de ganho, maior o risco.")

    filtro = st.radio("Mostrar", ["Todos", "Renda fixa", "Renda variável"], horizontal=True)
    for inv in INVESTIMENTOS:
        if filtro != "Todos" and inv["tipo"] != filtro:
            continue
        with st.expander(f"{inv['nome']}  —  {inv['tipo']}  ·  {inv['risco']}"):
            st.write(inv["desc"])
            colunas = st.columns(len(inv["info"]))
            for coluna, (titulo, texto) in zip(colunas, inv["info"].items()):
                coluna.markdown(f"**{titulo}**  \n{texto}")

    st.subheader("Palavras que você vai ver muito")
    glossario = {
        "Selic": "A taxa básica de juros do Brasil, definida pelo Banco Central.",
        "CDI": "Taxa que anda quase colada com a Selic. “100% do CDI” rende igual a ela.",
        "IPCA": "O índice oficial da inflação.",
        "Liquidez": "A rapidez para transformar o investimento em dinheiro na conta.",
        "FGC": "Devolve até R$ 250 mil por CPF por instituição se o banco quebrar (CDB, LCI, LCA).",
        "Diversificar": "Não colocar todo o dinheiro num lugar só.",
        "Juros compostos": "Juros sobre juros: o rendimento de um mês rende no mês seguinte.",
        "Imposto de Renda": "Na renda fixa é regressivo: 22,5% até 6 meses, caindo até 15% após 2 anos.",
    }
    g1, g2 = st.columns(2)
    for n, (termo, explicacao) in enumerate(glossario.items()):
        (g1 if n % 2 == 0 else g2).markdown(f"**{termo}** — {explicacao}")

# ==================================================================
# ABA 5 — MELHOR FORMA DE INVESTIR
# ==================================================================
with abas[4]:
    st.header("Qual a melhor forma de investir?")
    st.write(
        "Não existe um investimento que seja o melhor para todo mundo. O melhor é o que combina com o seu "
        "objetivo, o seu prazo e o quanto você aguenta ver o dinheiro oscilar. Siga esta ordem:"
    )
    passos = [
        ("Organize seus gastos", "Saiba quanto entra e quanto sai. Use a aba Meu dinheiro."),
        ("Saia das dívidas caras", "Nenhum investimento seguro rende mais que os juros do cartão ou do cheque especial."),
        ("Monte a reserva de emergência", "Em algo seguro e com saque no mesmo dia, como Tesouro Selic."),
        ("Defina objetivos com prazo e valor", "Cada objetivo pode ter um investimento diferente."),
        ("Escolha o investimento pelo prazo", "Curto prazo pede segurança. Longo prazo aguenta renda variável."),
        ("Invista todo mês e diversifique", "R$ 50 todo mês por anos vale mais que R$ 500 uma vez só."),
        ("Continue aprendendo", "Só invista no que você entende."),
    ]
    for numero, (titulo, texto) in enumerate(passos, start=1):
        st.markdown(f"**{numero}. {titulo}**  \n{texto}")

    st.divider()
    st.subheader("Descubra seu perfil de investidor")
    p1 = st.radio("1. Seu investimento caiu 10% em um mês. O que você faz?",
                  ["Tiro tudo na hora, não aguento perder", "Fico preocupado, mas espero", "Aproveito e compro mais"],
                  index=None)
    p2 = st.radio("2. Quando você vai precisar desse dinheiro?",
                  ["Em menos de 2 anos", "Entre 2 e 5 anos", "Daqui a mais de 5 anos"], index=None)
    p3 = st.radio("3. O que importa mais para você?",
                  ["Não perder dinheiro de jeito nenhum", "Equilíbrio entre segurança e ganho",
                   "Ganhar mais, mesmo com sustos no caminho"], index=None)

    if st.button("Ver meu perfil"):
        respostas = [p1, p2, p3]
        if None in respostas:
            st.error("Responda as 3 perguntas para ver seu perfil.")
        else:
            opcoes = [
                ["Tiro tudo na hora, não aguento perder", "Fico preocupado, mas espero", "Aproveito e compro mais"],
                ["Em menos de 2 anos", "Entre 2 e 5 anos", "Daqui a mais de 5 anos"],
                ["Não perder dinheiro de jeito nenhum", "Equilíbrio entre segurança e ganho",
                 "Ganhar mais, mesmo com sustos no caminho"],
            ]
            pontos = sum(opcoes[i].index(r) + 1 for i, r in enumerate(respostas))
            if pontos <= 4:
                st.success("**Conservador.** Segurança em primeiro lugar. Foque em Tesouro Selic, CDBs com FGC, LCI e LCA.")
            elif pontos <= 7:
                st.success("**Moderado.** A maior parte em renda fixa, com uma fatia em ETFs ou fundos imobiliários.")
            else:
                st.success("**Arrojado.** Com a reserva pronta, pode ter uma parte maior em ações e ETFs, sempre diversificando.")

# ==================================================================
# ABA 6 — MEU DINHEIRO (GESTOR)
# ==================================================================
CATEGORIAS = {"Essencial": 0.5, "Desejos": 0.3, "Guardar / investir": 0.2}

with abas[5]:
    st.header("Meu dinheiro")
    st.write("Anote o que entra e o que sai. Você pode baixar seus dados em CSV no final da página.")

    with st.form("nova_mov", clear_on_submit=True):
        st.subheader("Nova movimentação")
        f1, f2, f3, f4, f5 = st.columns([2, 1, 1, 1.3, 1])
        descricao = f1.text_input("Descrição", placeholder="Ex.: salário, lanche")
        valor = f2.number_input("Valor (R$)", min_value=0.0, step=1.0)
        tipo = f3.selectbox("Tipo", ["Saída", "Entrada"])
        categoria = f4.selectbox("Categoria (para saídas)", list(CATEGORIAS.keys()))
        data_mov = f5.date_input("Data", value=date.today(), format="DD/MM/YYYY")
        if st.form_submit_button("Adicionar"):
            if not descricao.strip():
                st.error("Escreva uma descrição, como “salário” ou “lanche”.")
            elif valor <= 0:
                st.error("Digite um valor maior que zero.")
            else:
                st.session_state.movimentacoes.append(
                    {"Data": data_mov, "Descrição": descricao.strip(), "Tipo": tipo,
                     "Categoria": categoria if tipo == "Saída" else "-", "Valor": valor}
                )
                st.success("Movimentação adicionada.")

    movs = pd.DataFrame(st.session_state.movimentacoes)

    if movs.empty:
        st.info("Nenhuma movimentação ainda. Adicione a primeira acima.")
    else:
        movs["Mês"] = pd.to_datetime(movs["Data"]).dt.strftime("%m/%Y")
        meses_disp = sorted(movs["Mês"].unique(), key=lambda m: (m[3:], m[:2]), reverse=True)
        mes = st.selectbox("Mês", meses_disp)
        do_mes = movs[movs["Mês"] == mes]

        entradas = do_mes.loc[do_mes["Tipo"] == "Entrada", "Valor"].sum()
        saidas = do_mes.loc[do_mes["Tipo"] == "Saída", "Valor"].sum()
        t1, t2, t3 = st.columns(3)
        t1.metric("Entradas do mês", brl(entradas))
        t2.metric("Saídas do mês", brl(saidas))
        t3.metric("Sobrou", brl(entradas - saidas))

        st.subheader("Seus gastos x regra 50/30/20")
        if entradas <= 0:
            st.info("Adicione suas entradas do mês para comparar com a regra 50/30/20.")
        else:
            for cat, ideal in CATEGORIAS.items():
                gasto = do_mes.loc[(do_mes["Tipo"] == "Saída") & (do_mes["Categoria"] == cat), "Valor"].sum()
                pct = gasto / entradas
                passou = cat != "Guardar / investir" and pct > ideal
                st.write(f"**{cat}:** {pct:.0%} de {ideal:.0%} recomendado {'⚠️ passou do recomendado' if passou else ''}")
                st.progress(min(pct, 1.0))

        st.subheader("Movimentações do mês")
        tabela = do_mes.drop(columns=["Mês"]).copy()
        tabela["Valor"] = tabela["Valor"].apply(brl)
        tabela["Data"] = pd.to_datetime(tabela["Data"]).dt.strftime("%d/%m/%Y")
        st.dataframe(tabela, width="stretch", hide_index=True)

        c1, c2 = st.columns(2)
        c1.download_button(
            "Baixar todas em CSV",
            movs.drop(columns=["Mês"]).to_csv(index=False, sep=";").encode("utf-8-sig"),
            file_name="meu_dinheiro.csv",
            mime="text/csv",
        )
        if c2.button("Apagar a última movimentação"):
            st.session_state.movimentacoes.pop()
            st.rerun()

    st.divider()
    st.subheader("Minhas metas")
    with st.form("nova_meta", clear_on_submit=True):
        m1, m2 = st.columns([2, 1])
        nome_meta = m1.text_input("Meta", placeholder="Ex.: reserva de emergência")
        alvo = m2.number_input("Valor da meta (R$)", min_value=0.0, step=50.0)
        if st.form_submit_button("Criar meta"):
            if not nome_meta.strip():
                st.error("Dê um nome para a meta.")
            elif alvo <= 0:
                st.error("Digite o valor da meta, maior que zero.")
            else:
                st.session_state.metas.append({"nome": nome_meta.strip(), "alvo": alvo, "guardado": 0.0})

    if not st.session_state.metas:
        st.info("Você ainda não tem metas. Crie a primeira, como sua reserva de emergência.")

    for i, meta in enumerate(st.session_state.metas):
        progresso = min(meta["guardado"] / meta["alvo"], 1.0)
        st.write(f"**{meta['nome']}** — {brl(meta['guardado'])} de {brl(meta['alvo'])} ({progresso:.0%})")
        st.progress(progresso)
        a1, a2, a3, a4 = st.columns([1.2, 1, 1, 1])
        quantia = a1.number_input("Valor", min_value=0.0, step=10.0, key=f"q{i}", label_visibility="collapsed")
        if a2.button("Guardar", key=f"g{i}") and quantia > 0:
            meta["guardado"] += quantia
            st.rerun()
        if a3.button("Retirar", key=f"r{i}") and quantia > 0:
            meta["guardado"] = max(0.0, meta["guardado"] - quantia)
            st.rerun()
        if a4.button("Apagar meta", key=f"d{i}"):
            st.session_state.metas.pop(i)
            st.rerun()
        if progresso >= 1:
            st.success("Meta alcançada! 🎉")

# ==================================================================
# ABA 7 — SIMULADOR
# ==================================================================
with abas[6]:
    st.header("Simulador de investimento")
    st.write("Coloque um valor, a taxa de juros e o tempo. Veja quanto você teria no final e quanto disso é lucro.")

    esq, dir_ = st.columns([1, 2])
    with esq:
        inicial = st.number_input("Valor inicial (R$)", min_value=0.0, value=10.0, step=10.0)
        mensal = st.number_input("Depósito todo mês (R$)", min_value=0.0, value=0.0, step=10.0)
        taxa = st.number_input("Taxa de juros (%)", min_value=0.0, max_value=100.0, value=2.0, step=0.1)
        unidade_taxa = st.radio("A taxa é", ["ao mês", "ao ano"], horizontal=True)
        tempo = st.number_input("Tempo", min_value=1, max_value=1200, value=3, step=1)
        unidade_tempo = st.radio("Em", ["meses", "anos"], horizontal=True)
        tipo_juros = st.radio("Tipo de juros", ["Compostos", "Simples"], horizontal=True)

    meses = int(tempo * 12 if unidade_tempo == "anos" else tempo)
    taxa_dec = taxa / 100
    # Taxa anual convertida para mensal equivalente: (1 + a)^(1/12) - 1
    taxa_mes = (1 + taxa_dec) ** (1 / 12) - 1 if unidade_taxa == "ao ano" else taxa_dec
    composto = tipo_juros == "Compostos"
    valido = (inicial > 0 or mensal > 0) and meses <= 1200

    with dir_:
        if inicial == 0 and mensal == 0:
            st.warning("Coloque um valor inicial ou um depósito mensal.")
        elif meses > 1200:
            st.warning("Use um tempo de no máximo 100 anos.")
        else:
            df = simular(inicial, mensal, taxa_mes, meses, composto)
            outro = simular(inicial, mensal, taxa_mes, meses, not composto)
            final = df["Saldo"].iloc[-1]
            investido = df["Total colocado"].iloc[-1]
            lucro = df["Juros acumulados"].iloc[-1]

            st.caption("Você terá no final")
            st.markdown(f'<div class="big-number">{brl(final)}</div>', unsafe_allow_html=True)
            r1, r2, r3 = st.columns(3)
            r1.metric("Você colocou", brl(investido))
            r2.metric("Lucro com juros", brl(lucro))
            r3.metric("Rendimento", f"{(lucro / investido * 100) if investido else 0:.2f}%".replace(".", ","))

            diferenca = abs(final - outro["Saldo"].iloc[-1])
            if composto:
                st.write(f"Com juros simples você teria {brl(outro['Saldo'].iloc[-1])}. "
                         f"Os juros compostos te deram **{brl(diferenca)} a mais**.")
            else:
                st.write(f"Com juros compostos você teria {brl(outro['Saldo'].iloc[-1])}, "
                         f"ou seja, **{brl(diferenca)} a mais**.")
            if unidade_taxa == "ao ano":
                st.caption(f"{taxa:.2f}% ao ano equivale a {taxa_mes * 100:.3f}% ao mês.".replace(".", ","))

            grafico = df.set_index("Mês")[["Total colocado", "Juros acumulados"]]
            grafico.columns = ["Dinheiro que você colocou", "Juros ganhos"]
            st.bar_chart(grafico, color=["#2D4BD8", "#F5B935"])

    if valido:
        st.subheader("Mês a mês")
        tabela = df.copy()
        if meses > 60:  # tempo longo: mostra ano a ano para não ficar gigante
            tabela = tabela[(tabela["Mês"] % 12 == 0) | (tabela["Mês"] == meses)]
            st.caption("Mostrando o resultado ao fim de cada ano.")
        for coluna in ["Juros no mês", "Total colocado", "Juros acumulados", "Saldo"]:
            tabela[coluna] = tabela[coluna].apply(brl)
        st.dataframe(tabela, width="stretch", hide_index=True)

    aviso("O simulador não desconta imposto de renda nem taxas e considera a taxa constante. "
          "Na vida real os rendimentos variam.", "dica")

# ------------------------------------------------------------------
st.divider()
st.caption(
    "Conteúdo educativo. Não é recomendação de investimento. Regras de imposto e garantias podem mudar; "
    "confira sempre as informações atuais antes de investir."
)
