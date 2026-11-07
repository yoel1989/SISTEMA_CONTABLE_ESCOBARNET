-- Reportes de sedes: columna "total a enviar" y borrado solo para administradores.
-- Ejecutar después de 0016_reportes_sedes.sql.

-- Total a enviar calculado por el generador (ventas - comisiones - comisión alcanza + cobro TV).
-- Puede quedar vacío en reportes generados antes de esta migración.
alter table public.reportes_sedes
  add column if not exists total_a_enviar numeric(14, 2);

-- Borrar reportes: solo administradores (la limpieza de PDF también requiere permiso).
create policy "reportes_sedes: admin elimina"
  on public.reportes_sedes for delete to authenticated
  using ((select public.es_admin()));

create policy "reportes-sedes: admin elimina"
  on storage.objects for delete to authenticated
  using (bucket_id = 'reportes-sedes' and (select public.es_admin()));
