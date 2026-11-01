-- Permite leer el logo de la empresa sin sesión, para mostrarlo en la página de login.
-- Solo el logo es público: el resto del bucket "cotizaciones" y la configuración siguen protegidos.
-- Ejecutar después de 0013_quitar_archivo_referencia.sql.

create policy "logo: lectura anónima"
  on storage.objects for select to anon
  using (bucket_id = 'cotizaciones' and name like 'logo/%');

create policy "configuracion: logo visible sin sesión"
  on public.configuracion for select to anon
  using (clave = 'logo_path');
