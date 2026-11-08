-- Renombra la sede TERMALES a MIRAVALLE en las fuentes de ingreso.
-- Conserva el id y los movimientos ya registrados. No hace nada si TERMALES no existe
-- o si MIRAVALLE ya existe (evita duplicados).
-- Ejecutar después de 0017_reportes_total_a_enviar_y_borrado.sql.

update public.fuentes_ingreso
set nombre = 'MIRAVALLE'
where tipo = 'sede'
  and nombre = 'TERMALES'
  and not exists (
    select 1 from public.fuentes_ingreso f where f.nombre = 'MIRAVALLE'
  );
