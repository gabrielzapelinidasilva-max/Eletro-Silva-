# Grana Jovem

Mentoria de dinheiro para jovens, feita em Python com Streamlit. Este app é separado do site da Eletro Silva (Next.js) e não interfere no deploy da Vercel.

Abas: Início · Cuidar do dinheiro · Como guardar · Tipos de investimento · Melhor forma de investir · Meu dinheiro · Simulador.

## Rodando localmente

```bash
cd grana-jovem
pip install -r requirements.txt
streamlit run app.py        # http://localhost:8501
```

## Publicando de graça

No [Streamlit Community Cloud](https://share.streamlit.io): **Create app**, escolha este repositório e informe `grana-jovem/app.py` como arquivo principal.

As movimentações e metas da aba **Meu dinheiro** ficam só na sessão do navegador e somem ao recarregar a página; use o botão de CSV para guardar uma cópia.
