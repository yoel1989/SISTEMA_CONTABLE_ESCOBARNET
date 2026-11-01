-- Fase 2: auditoría de cambios en tablas financieras.
-- Ejecutar después de 0002_modelo_contable.sql.

create table public.audit_log (
  id bigint generated always as identity primary key,
  tabla text not null,
  registro_id text,
  accion text not null check (accion in ('INSERT', 'UPDATE', 'DELETE')),
  usuario_id uuid default auth.uid(),
  fecha timestamptz not null default now(),
  cambios jsonb
);

alter table public.audit_log enable row level security;

-- Solo admins pueden leer la auditoría. Nadie la escribe directamente: lo hace el trigger.
create policy "audit_log: admin lee"
  on public.audit_log for select
  to authenticated
  using ((select public.es_admin()));

create or replace function public.registrar_auditoria()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.audit_log (tabla, registro_id, accion, usuario_id, cambios)
  values (
    TG_TABLE_NAME,
    coalesce(to_jsonb(new) ->> 'id', to_jsonb(old) ->> 'id', to_jsonb(new) ->> 'clave', to_jsonb(old) ->> 'clave'),
    TG_OP,
    auth.uid(),
    case TG_OP
      when 'INSERT' then to_jsonb(new)
      when 'DELETE' then to_jsonb(old)
      else jsonb_build_object('antes', to_jsonb(old), 'despues', to_jsonb(new))
    end
  );
  return null;
end;
$$;

create trigger auditar_movimientos
  after insert or update or delete on public.movimientos
  for each row execute function public.registrar_auditoria();

create trigger auditar_transferencias
  after insert or update or delete on public.transferencias
  for each row execute function public.registrar_auditoria();

create trigger auditar_fuentes_ingreso
  after insert or update or delete on public.fuentes_ingreso
  for each row execute function public.registrar_auditoria();

create trigger auditar_categorias_gasto
  after insert or update or delete on public.categorias_gasto
  for each row execute function public.registrar_auditoria();

create trigger auditar_cuentas_pago
  after insert or update or delete on public.cuentas_pago
  for each row execute function public.registrar_auditoria();

create trigger auditar_configuracion
  after insert or update or delete on public.configuracion
  for each row execute function public.registrar_auditoria();
