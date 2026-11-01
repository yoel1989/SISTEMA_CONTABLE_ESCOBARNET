-- Elimina las categorías genéricas de la fase 1 que ya no se usan.
-- Solo borra las que no tienen movimientos asociados; las que sí tengan se conservan.
-- Ejecutar después de 0006_categorias_gasto_reales.sql. Idempotente.

delete from public.categorias_gasto c
where c.nombre in (
    'Gastos de sedes',
    'Gastos de televisión',
    'Créditos y pasivos financieros',
    'Otros gastos'
  )
  and not exists (
    select 1 from public.movimientos m where m.categoria_gasto_id = c.id
  );
