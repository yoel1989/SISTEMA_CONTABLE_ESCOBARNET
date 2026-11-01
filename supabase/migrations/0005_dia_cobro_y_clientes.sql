-- Día de cobro por fuente de ingreso y carga inicial de clientes.
-- Ejecutar después de 0004_sedes_iniciales.sql.
-- Idempotente: se puede ejecutar más de una vez.

-- Día del mes en que se cobra cada ingreso. Se limita a 1–28 para que exista en todos los meses.
alter table public.fuentes_ingreso
  add column if not exists dia_cobro smallint not null default 28
  check (dia_cobro between 1 and 28);

-- Clientes de internet. Montos en $0 por ahora.
insert into public.fuentes_ingreso (tipo, nombre, monto_mensual, variable, dia_cobro)
select 'internet', v.nombre, 0, false, v.dia
from (values
  ('CLIENTE LA TORTUGA ANGEL', 5),
  ('CLIENTE CAÑO PESCADO LEJOS', 9),
  ('CLIENTE SANTABARBARA ERIKA', 9),
  ('CLIENTE SANTABARBARA PABLO REYES', 5),
  ('CLIENTE SANTABARBARA DON JESUS', 9),
  ('CLIENTE SANTABARBARA YULIANA', 5),
  ('CLIENTE SANTABARBARA TATO', 5),
  ('CLIENTE VIEJITA TORTUGA', 26)
) as v(nombre, dia)
where not exists (
  select 1 from public.fuentes_ingreso f where f.nombre = v.nombre
);

-- Clientes de TV satelital. Montos en $0 por ahora.
-- Los que no tienen día en la hoja quedan en 28 (valor por defecto).
insert into public.fuentes_ingreso (tipo, nombre, monto_mensual, variable, dia_cobro)
select 'tv_satelital', v.nombre, 0, false, v.dia
from (values
  ('Victor Manuel Cabazo', 5),
  ('Blanca Nuri Garzon', 5),
  ('Yasmin Viana Torres', 5),
  ('Fanny Barbosa', 5),
  ('Leo Lopez Romero', 5),
  ('Maicol Garzon - Gladys - caserio brisas', 5),
  ('Pablino Escobar', 5),
  ('Gonzalo Olarte', 5),
  ('Jaime Pardo - Umaña', 5),
  ('Mariela Sandoval', 5),
  ('Chano', 5),
  ('Daniel Gutierrez', 5),
  ('Jesus', 5),
  ('Jorge', 5),
  ('ALEJANDRO', 1),
  ('JONATHAN', 5),
  ('WILMAR peña', 5),
  ('MIYER ESCOBAR', 16),
  ('PACHO RAMOS', 5),
  ('IDALI MARTINEZ', 5),
  ('HECTOR LEON', 5),
  ('JOSE RUBEN CHIVATA', 5),
  ('PAOLA ESCOBAR', 5),
  ('JUSTO URREGO', 5),
  ('FERNANDO HERNADEZ', 18),
  ('BONIFACIO', 28),
  ('LEIDY YANETH BETANCUR', 28),
  ('CAÑO BLANCO - DOIMAR', 28),
  ('COSTEÑO', 28),
  ('PACHO RAMOS - ERNESTO', 28),
  ('ISABEL', 28)
) as v(nombre, dia)
where not exists (
  select 1 from public.fuentes_ingreso f where f.nombre = v.nombre
);

-- Las sedes ya creadas en 0004 toman el día 28 por el valor por defecto.
