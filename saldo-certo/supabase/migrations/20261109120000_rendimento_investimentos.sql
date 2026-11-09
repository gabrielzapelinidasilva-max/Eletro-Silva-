-- =====================================================================
-- Saldo Certo — rendimento dos investimentos
-- Cada aporte pode ter uma taxa de juros (ao mês ou ao ano) e um prazo,
-- usados para projetar quanto o investimento vai render.
-- Colunas opcionais: lançamentos antigos continuam válidos.
-- =====================================================================

alter table public.investments
  add column rate        numeric(7,4) null,  -- taxa em %, ex.: 1.0000 = 1%
  add column rate_period text         null,  -- 'mensal' ou 'anual'
  add column term_months integer      null;  -- prazo em meses

alter table public.investments
  add constraint investments_rate_chk
    check (rate is null or (rate > 0 and rate <= 1000)),
  add constraint investments_rate_period_chk
    check (rate_period is null or rate_period in ('mensal', 'anual')),
  add constraint investments_term_chk
    check (term_months is null or term_months between 1 and 600),
  -- Os três campos andam juntos e só valem para aportes.
  add constraint investments_yield_fields_chk
    check (
      (rate is null and rate_period is null and term_months is null)
      or (rate is not null and rate_period is not null and term_months is not null and operation = 'aporte')
    );

comment on column public.investments.rate is 'Taxa de juros em % (ex.: 1 = 1%), por mês ou por ano conforme rate_period.';
comment on column public.investments.rate_period is 'Período da taxa: mensal ou anual.';
comment on column public.investments.term_months is 'Prazo do investimento em meses, para a projeção do rendimento.';
