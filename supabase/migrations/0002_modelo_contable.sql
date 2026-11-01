-- Fase 1: modelo contable, tesorería, configuración y vistas de balance.
-- Ejecutar después de 0001_profiles_rbac.sql. Moneda base: COP.

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------

-- Configuración parametrizable (p. ej. valor por defecto de TV satelital).
create table public.configuracion (
  clave text primary key,
  valor jsonb not null,
  updated_at timestamptz not null default now()
);

-- Cuentas de recaudo y custodia: Efectivo, Nequi, Daviplata, Préstamos, Deudas de socios.
create table public.cuentas_pago (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  tipo text not null check (tipo in ('efectivo', 'nequi', 'daviplata', 'prestamo', 'deuda_socio', 'otra')),
  saldo_inicial numeric(14, 2) not null default 0,
  activa boolean not null default true,
  created_at timestamptz not null default now()
);

-- Líneas de ingreso: cada sede, cliente de internet o TV satelital, y otros ingresos.
create table public.fuentes_ingreso (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('sede', 'internet', 'tv_satelital', 'otro')),
  nombre text not null,
  monto_mensual numeric(14, 2) not null default 0 check (monto_mensual >= 0),
  variable boolean not null default false,
  activa boolean not null default true,
  desde date,
  hasta date,
  created_at timestamptz not null default now(),
  check (hasta is null or desde is null or hasta >= desde)
);

-- Categorías de gasto agrupadas: sedes, televisión, créditos/pasivos, otros.
create table public.categorias_gasto (
  id uuid primary key default gen_random_uuid(),
  grupo text not null check (grupo in ('sede', 'tv', 'credito', 'otro')),
  nombre text not null,
  activa boolean not null default true,
  created_at timestamptz not null default now()
);

-- Movimientos. Los montos en $0 son válidos y no alteran los cálculos.
create table public.movimientos (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('ingreso', 'gasto')),
  fecha date not null,
  monto numeric(14, 2) not null check (monto >= 0),
  fuente_ingreso_id uuid references public.fuentes_ingreso (id),
  categoria_gasto_id uuid references public.categorias_gasto (id),
  cuenta_pago_id uuid not null references public.cuentas_pago (id),
  descripcion text not null default '',
  created_by uuid references auth.users (id) default auth.uid(),
  created_at timestamptz not null default now(),
  -- Un ingreso necesita fuente de ingreso; un gasto, categoría de gasto. Nunca ambas.
  check (
    (tipo = 'ingreso' and fuente_ingreso_id is not null and categoria_gasto_id is null)
    or
    (tipo = 'gasto' and categoria_gasto_id is not null and fuente_ingreso_id is null)
  )
);

create index movimientos_fecha_idx on public.movimientos (fecha);
create index movimientos_cuenta_idx on public.movimientos (cuenta_pago_id);

-- Transferencias entre cuentas: mueven dinero sin alterar el balance mensual.
create table public.transferencias (
  id uuid primary key default gen_random_uuid(),
  fecha date not null,
  monto numeric(14, 2) not null check (monto > 0),
  cuenta_origen_id uuid not null references public.cuentas_pago (id),
  cuenta_destino_id uuid not null references public.cuentas_pago (id),
  nota text not null default '',
  created_by uuid references auth.users (id) default auth.uid(),
  created_at timestamptz not null default now(),
  check (cuenta_origen_id <> cuenta_destino_id)
);

create index transferencias_fecha_idx on public.transferencias (fecha);

-- ---------------------------------------------------------------------------
-- Row Level Security: todos leen, solo admin escribe
-- ---------------------------------------------------------------------------

alter table public.configuracion enable row level security;
alter table public.cuentas_pago enable row level security;
alter table public.fuentes_ingreso enable row level security;
alter table public.categorias_gasto enable row level security;
alter table public.movimientos enable row level security;
alter table public.transferencias enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'configuracion', 'cuentas_pago', 'fuentes_ingreso',
    'categorias_gasto', 'movimientos', 'transferencias'
  ]
  loop
    execute format(
      'create policy "%1$s: leer" on public.%1$I for select to authenticated using (true)',
      t
    );
    execute format(
      'create policy "%1$s: admin inserta" on public.%1$I for insert to authenticated with check ((select public.es_admin()))',
      t
    );
    execute format(
      'create policy "%1$s: admin actualiza" on public.%1$I for update to authenticated using ((select public.es_admin())) with check ((select public.es_admin()))',
      t
    );
    execute format(
      'create policy "%1$s: admin elimina" on public.%1$I for delete to authenticated using ((select public.es_admin()))',
      t
    );
  end loop;
end
$$;

-- ---------------------------------------------------------------------------
-- Vistas (security_invoker: respetan las políticas RLS del usuario que consulta)
-- ---------------------------------------------------------------------------

-- Balance mensual: Balance = Total ingresos - Total gastos.
create view public.v_balance_mensual
with (security_invoker = true) as
select
  date_trunc('month', m.fecha)::date as mes,
  coalesce(sum(m.monto) filter (where m.tipo = 'ingreso'), 0) as total_ingresos,
  coalesce(sum(m.monto) filter (where m.tipo = 'gasto'), 0) as total_gastos,
  coalesce(sum(m.monto) filter (where m.tipo = 'ingreso'), 0)
    - coalesce(sum(m.monto) filter (where m.tipo = 'gasto'), 0) as balance
from public.movimientos m
group by 1;

-- Saldo por cuenta: saldo inicial + movimientos + transferencias recibidas - transferencias enviadas.
create view public.v_saldo_cuentas
with (security_invoker = true) as
select
  c.id as cuenta_id,
  c.nombre,
  c.tipo,
  c.activa,
  c.saldo_inicial
    + coalesce((select sum(m.monto) from public.movimientos m
                where m.cuenta_pago_id = c.id and m.tipo = 'ingreso'), 0)
    - coalesce((select sum(m.monto) from public.movimientos m
                where m.cuenta_pago_id = c.id and m.tipo = 'gasto'), 0)
    + coalesce((select sum(t.monto) from public.transferencias t
                where t.cuenta_destino_id = c.id), 0)
    - coalesce((select sum(t.monto) from public.transferencias t
                where t.cuenta_origen_id = c.id), 0) as saldo
from public.cuentas_pago c;

-- ---------------------------------------------------------------------------
-- Catálogos semilla
-- ---------------------------------------------------------------------------

insert into public.configuracion (clave, valor) values
  ('tv_satelital_valor_defecto', '38000'::jsonb),
  ('moneda', '"COP"'::jsonb);

insert into public.cuentas_pago (nombre, tipo) values
  ('Efectivo', 'efectivo'),
  ('Nequi', 'nequi'),
  ('Daviplata', 'daviplata'),
  ('Préstamos', 'prestamo'),
  ('Deudas de socios', 'deuda_socio');

insert into public.fuentes_ingreso (tipo, nombre, variable) values
  ('otro', 'Otros ingresos', true);

insert into public.categorias_gasto (grupo, nombre) values
  ('sede', 'Gastos de sedes'),
  ('tv', 'Gastos de televisión'),
  ('credito', 'Créditos y pasivos financieros'),
  ('otro', 'Otros gastos');
