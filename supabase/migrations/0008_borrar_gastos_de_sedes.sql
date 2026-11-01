-- Elimina la categoría "Gastos de sedes" (genérica de la fase 1) junto con sus movimientos de prueba.
-- Los borrados quedan registrados en audit_log.
-- Ejecutar después de 0007_borrar_categorias_genericas.sql. Idempotente.

delete from public.movimientos
where categoria_gasto_id in (
  select id from public.categorias_gasto where nombre = 'Gastos de sedes'
);

delete from public.categorias_gasto
where nombre = 'Gastos de sedes';
