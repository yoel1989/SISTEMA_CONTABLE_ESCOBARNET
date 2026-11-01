-- Fase 5: agregaciones para el dashboard.
-- Ejecutar después de 0009_saldos_manuales_sin_cuentas_en_movimientos.sql.
-- Las vistas usan security_invoker: respetan las políticas RLS del usuario que consulta.

-- Ingresos por línea de negocio (sede, internet, tv_satelital, otro) y mes.
create or replace view public.v_ingresos_por_linea
with (security_invoker = true) as
select
  date_trunc('month', m.fecha)::date as mes,
  f.tipo as linea,
  sum(m.monto) as total
from public.movimientos m
join public.fuentes_ingreso f on f.id = m.fuente_ingreso_id
where m.tipo = 'ingreso'
group by 1, 2;

-- Gastos por grupo (sede, tv, credito, otro), categoría y mes.
create or replace view public.v_gastos_por_categoria
with (security_invoker = true) as
select
  date_trunc('month', m.fecha)::date as mes,
  c.grupo,
  c.id as categoria_id,
  c.nombre,
  sum(m.monto) as total
from public.movimientos m
join public.categorias_gasto c on c.id = m.categoria_gasto_id
where m.tipo = 'gasto'
group by 1, 2, 3, 4;
