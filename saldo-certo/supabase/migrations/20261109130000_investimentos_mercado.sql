-- =====================================================================
-- Saldo Certo — investimentos acompanhados pelo mercado
-- Aportes em Ações, FIIs e Cripto podem guardar o código do ativo (ticker)
-- e o preço na data da compra. O app busca a cotação atual para mostrar
-- quanto o aporte vale hoje e projetar com o ritmo dos últimos 12 meses.
-- Renda fixa/poupança continuam com a taxa informada pelo usuário.
-- =====================================================================

alter table public.investments
  add column ticker         text          null,  -- ex.: PETR4, MXRF11, BTC
  add column purchase_price numeric(18,8) null;  -- preço (R$) na data do aporte

-- A regra antiga exigia prazo junto com a taxa e não conhecia o ticker.
alter table public.investments drop constraint investments_yield_fields_chk;

alter table public.investments
  add constraint investments_ticker_chk
    check (ticker is null or ticker ~ '^[A-Z0-9][A-Z0-9.\-]{0,19}$'),
  add constraint investments_purchase_price_chk
    check (purchase_price is null or purchase_price > 0),
  -- Taxa informada: só aportes, sem ticker, com período e prazo.
  add constraint investments_rate_fields_chk
    check (
      (rate is null and rate_period is null)
      or (rate is not null and rate_period is not null and term_months is not null
          and ticker is null and operation = 'aporte')
    ),
  -- Ativo de mercado: só aportes de Ações/FIIs/Cripto, sempre com o preço de compra.
  add constraint investments_market_fields_chk
    check (
      (ticker is null and purchase_price is null)
      or (ticker is not null and purchase_price is not null and operation = 'aporte'
          and type in ('Ações', 'FIIs', 'Cripto'))
    ),
  -- Prazo só faz sentido com taxa ou com ticker (prazo da projeção).
  add constraint investments_term_mode_chk
    check (term_months is null or rate is not null or ticker is not null);

comment on column public.investments.ticker is 'Código do ativo na bolsa/cripto (PETR4, MXRF11, BTC...).';
comment on column public.investments.purchase_price is 'Preço do ativo em R$ na data do aporte, usado para calcular o valor atual.';
