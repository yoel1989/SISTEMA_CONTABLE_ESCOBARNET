-- Cotizaciones: descripción (después del cliente) y observaciones (al final).
-- Ejecutar después de 0011_cotizaciones.sql.

alter table public.cotizaciones add column if not exists descripcion text not null default '';

-- "notas" pasa a llamarse "observaciones". Se conserva el contenido existente.
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'cotizaciones' and column_name = 'notas') then
    alter table public.cotizaciones rename column notas to observaciones;
  end if;
end
$$;
