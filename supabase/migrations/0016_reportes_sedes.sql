-- Reportes mensuales de extraccion por sede (Telegram).
-- Los genera un workflow de GitHub Actions con la clave de servicio, que se salta RLS.
-- Ejecutar después de 0015_bucket_marca.sql.

create table public.reportes_sedes (
  id uuid primary key default gen_random_uuid(),
  sede_clave text not null,
  sede text not null,
  periodo_inicio date not null,
  periodo_fin date not null,
  archivo_path text not null unique,   -- ruta dentro del bucket reportes-sedes
  archivo_nombre text not null,
  total_ventas numeric(14, 2) not null default 0,
  total_mensajes int not null default 0,
  created_at timestamptz not null default now(),
  constraint reportes_sedes_periodo_unico unique (sede_clave, periodo_inicio),
  constraint reportes_sedes_periodo_valido check (periodo_fin >= periodo_inicio)
);

create index reportes_sedes_periodo_idx on public.reportes_sedes (periodo_inicio desc, sede);

alter table public.reportes_sedes enable row level security;

-- Todos los usuarios autenticados pueden ver los reportes.
-- No hay políticas de escritura: solo la clave de servicio (workflow) escribe.
create policy "reportes_sedes: leer" on public.reportes_sedes
  for select to authenticated using (true);

-- Bucket privado: los PDF no son accesibles sin un enlace firmado.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('reportes-sedes', 'reportes-sedes', false, 10485760, array['application/pdf'])
on conflict (id) do nothing;

-- Usuarios autenticados pueden leer los PDF (necesario para generar enlaces firmados).
create policy "reportes-sedes: leer"
  on storage.objects for select to authenticated
  using (bucket_id = 'reportes-sedes');
