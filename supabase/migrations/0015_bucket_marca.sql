-- Bucket público "marca" solo para el logo de la empresa.
-- Un bucket público sirve el archivo por una URL directa, sin firmar cada petición,
-- y el navegador lo guarda en caché: el logo aparece al instante.
-- Ejecutar después de 0014_logo_publico_login.sql.

insert into storage.buckets (id, name, public, file_size_limit)
values ('marca', 'marca', true, 2097152)
on conflict (id) do nothing;

-- Solo el administrador sube, reemplaza o borra el logo. La lectura pública viene del bucket público.
create policy "marca: admin sube"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'marca' and (select public.es_admin()));

create policy "marca: admin reemplaza"
  on storage.objects for update to authenticated
  using (bucket_id = 'marca' and (select public.es_admin()))
  with check (bucket_id = 'marca' and (select public.es_admin()));

create policy "marca: admin elimina"
  on storage.objects for delete to authenticated
  using (bucket_id = 'marca' and (select public.es_admin()));
