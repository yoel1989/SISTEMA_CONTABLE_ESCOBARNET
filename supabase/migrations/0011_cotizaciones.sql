-- Fase 6: cotizaciones, sus ítems y repositorio de archivos.
-- Ejecutar después de 0010_vistas_dashboard.sql.

create table public.cotizaciones (
  id uuid primary key default gen_random_uuid(),
  numero text not null unique,
  cliente text not null,
  fecha date not null default current_date,
  estado text not null default 'borrador'
    check (estado in ('borrador', 'enviada', 'aceptada', 'rechazada')),
  total numeric(14, 2) not null default 0 check (total >= 0),
  notas text not null default '',
  archivo_path text,      -- archivo subido al repositorio (Storage), opcional
  archivo_nombre text,
  created_by uuid references auth.users (id) default auth.uid(),
  created_at timestamptz not null default now()
);

create table public.cotizacion_items (
  id uuid primary key default gen_random_uuid(),
  cotizacion_id uuid not null references public.cotizaciones (id) on delete cascade,
  orden int not null default 0,
  descripcion text not null,
  cantidad numeric(12, 2) not null check (cantidad > 0),
  precio_unitario numeric(14, 2) not null check (precio_unitario >= 0),
  subtotal numeric(14, 2) generated always as (cantidad * precio_unitario) stored
);

create index cotizacion_items_cotizacion_idx on public.cotizacion_items (cotizacion_id);

alter table public.cotizaciones enable row level security;
alter table public.cotizacion_items enable row level security;

-- Todos leen; solo admin escribe.
create policy "cotizaciones: leer" on public.cotizaciones for select to authenticated using (true);
create policy "cotizaciones: admin inserta" on public.cotizaciones for insert to authenticated with check ((select public.es_admin()));
create policy "cotizaciones: admin actualiza" on public.cotizaciones for update to authenticated using ((select public.es_admin())) with check ((select public.es_admin()));
create policy "cotizaciones: admin elimina" on public.cotizaciones for delete to authenticated using ((select public.es_admin()));

create policy "items: leer" on public.cotizacion_items for select to authenticated using (true);
create policy "items: admin inserta" on public.cotizacion_items for insert to authenticated with check ((select public.es_admin()));
create policy "items: admin actualiza" on public.cotizacion_items for update to authenticated using ((select public.es_admin())) with check ((select public.es_admin()));
create policy "items: admin elimina" on public.cotizacion_items for delete to authenticated using ((select public.es_admin()));

create trigger auditar_cotizaciones
  after insert or update or delete on public.cotizaciones
  for each row execute function public.registrar_auditoria();

create trigger auditar_cotizacion_items
  after insert or update or delete on public.cotizacion_items
  for each row execute function public.registrar_auditoria();

-- Repositorio de archivos: bucket privado. Se accede con URLs firmadas.
insert into storage.buckets (id, name, public, file_size_limit)
values ('cotizaciones', 'cotizaciones', false, 10485760)
on conflict (id) do nothing;

create policy "cotizaciones archivos: leer"
  on storage.objects for select to authenticated
  using (bucket_id = 'cotizaciones');

create policy "cotizaciones archivos: admin sube"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'cotizaciones' and (select public.es_admin()));

create policy "cotizaciones archivos: admin elimina"
  on storage.objects for delete to authenticated
  using (bucket_id = 'cotizaciones' and (select public.es_admin()));
