-- Categorías de gasto reales, agrupadas como en la hoja, y monto mensual por defecto.
-- Ejecutar después de 0005_dia_cobro_y_clientes.sql.
-- Idempotente: se puede ejecutar más de una vez.

-- Monto mensual de referencia por categoría. Los movimientos reales siguen siendo la fuente de verdad.
alter table public.categorias_gasto
  add column if not exists monto_mensual numeric(14, 2) not null default 0
  check (monto_mensual >= 0);

-- Gastos de sedes
insert into public.categorias_gasto (grupo, nombre, monto_mensual)
select 'sede', v.nombre, v.monto
from (values
  ('MENSUALIDADES A NOMBRE DE NORBEY', 0),
  ('PAGO SIN IP', 0),
  ('MENSUALIDADES A NOMBRE DE DIEGO', 0),
  ('INTERESES MIGUEL', 0),
  ('MENSUALIDADES A NOMBRE DE YOEL (tarjeta de credito)', 0),
  ('TARJETA NU', 0)
) as v(nombre, monto)
where not exists (
  select 1 from public.categorias_gasto c where c.nombre = v.nombre
);

-- Gastos de televisión
insert into public.categorias_gasto (grupo, nombre, monto_mensual)
select 'tv', v.nombre, v.monto
from (values
  ('PAGO MENSUALIDAD MARIA 1', 243000),
  ('PAGO MENSUALIDAD MARIA 2', 82000),
  ('PAGO CLICK HD DIRECTO', 0)
) as v(nombre, monto)
where not exists (
  select 1 from public.categorias_gasto c where c.nombre = v.nombre
);

-- Pago de créditos
insert into public.categorias_gasto (grupo, nombre, monto_mensual)
select 'credito', v.nombre, 0
from (values
  ('PAGO NEQUI 1'),
  ('PAGO NEQUI 2')
) as v(nombre)
where not exists (
  select 1 from public.categorias_gasto c where c.nombre = v.nombre
);

-- Otros gastos
insert into public.categorias_gasto (grupo, nombre, monto_mensual)
select 'otro', 'PRESTAMO TOLIMA', 0
where not exists (
  select 1 from public.categorias_gasto c where c.nombre = 'PRESTAMO TOLIMA'
);
