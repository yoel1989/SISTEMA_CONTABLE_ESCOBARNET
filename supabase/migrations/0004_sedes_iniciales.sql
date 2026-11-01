-- Sedes reales como fuentes de ingreso. Montos mensuales en $0 hasta que se definan.
-- Idempotente: se puede ejecutar más de una vez sin duplicar sedes.
-- Ejecutar después de 0003_auditoria.sql.

insert into public.fuentes_ingreso (tipo, nombre, monto_mensual, variable)
select 'sede', v.nombre, 0, false
from (values
  ('LA TORTUGA'),
  ('MANANTIALES 1'),
  ('MANANTIALES 2'),
  ('TROPEZON'),
  ('BRISAS'),
  ('CAÑO PESCADO')
) as v(nombre)
where not exists (
  select 1 from public.fuentes_ingreso f where f.nombre = v.nombre
);
