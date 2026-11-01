-- Quita el archivo de referencia de las cotizaciones. El logo de empresa se conserva.
-- Ejecutar después de 0012_descripcion_observaciones_logo.sql.
--
-- Nota: los archivos ya subidos quedan en el bucket "cotizaciones" sin uso. Supabase no
-- permite borrarlos con SQL; se eliminan desde Storage en el panel (todo menos la carpeta "logo").

alter table public.cotizaciones drop column if exists archivo_path;
alter table public.cotizaciones drop column if exists archivo_nombre;
