-- Fase 0: perfiles y roles con Row Level Security.
-- Ejecutar en el SQL Editor de Supabase.

create type public.rol_usuario as enum ('admin', 'lectura');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text not null default '',
  rol public.rol_usuario not null default 'lectura',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Crea un perfil automáticamente al crear un usuario en Auth.
-- Por defecto nace como 'lectura'; solo un admin puede elevarlo.
create or replace function public.crear_perfil_nuevo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, nombre)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'nombre', ''));
  return new;
end;
$$;

create trigger al_crear_usuario
  after insert on auth.users
  for each row execute function public.crear_perfil_nuevo();

-- Función auxiliar para las políticas: ¿el usuario actual es admin?
create or replace function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and rol = 'admin'
  );
$$;

-- Todos los usuarios autenticados ven los perfiles (necesario para mostrar nombres).
create policy "perfiles: ver"
  on public.profiles for select
  to authenticated
  using (true);

-- Solo admins cambian perfiles (incluido el rol de otros usuarios).
create policy "perfiles: admin actualiza"
  on public.profiles for update
  to authenticated
  using (public.es_admin())
  with check (public.es_admin());

-- Nadie inserta ni borra perfiles directamente: lo hace el trigger y la cascada de auth.users.
