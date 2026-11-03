# Estado del proyecto: ERP ESCOBAR.NET

Código: `erp\` (Next.js 16 + TypeScript + Tailwind + Supabase). Idioma de la interfaz: español. Moneda: COP.

## Fases
- 0 base y login; 1 modelo contable con RLS; 2 movimientos (hoja mensual) y auditoría; 3 importación CSV (el usuario no la quiso; sigue en /importar); 4 tesorería; 5 dashboard con gráficas; 6 cotizaciones (PDF, Excel, Word con logo).
- Pasada visual hecha con el agente ui-polisher.
- **Fase 7 no empezada:** integrar "Crear Recibos Televisión" y "Extracción de Datos Sedes". Faltan sus URLs o rutas locales.

## Migraciones de Supabase (ejecutar en orden, cada una una sola vez)
0001 perfiles y roles · 0002 modelo contable · 0003 auditoría · 0004 sedes · 0005 día de cobro y clientes · 0006 categorías de gasto reales · 0007 borrar genéricas · 0008 borrar "Gastos de sedes" · 0009 saldos manuales (sin cuenta en movimientos, sin transferencias) · 0010 vistas del dashboard · 0011 cotizaciones · 0012 descripción y observaciones · 0013 quitar archivo de referencia · 0014 logo legible sin sesión · 0015 bucket público `marca` para el logo.

Después de la 0015 hay que volver a subir el logo en /cotizaciones.

## Último avance (27/10/2026)
- Balance acumulado: suma de todos los meses y años de `v_balance_mensual`, sin límite de fecha. Aparece en Inicio ("Balance acumulado total") y en Tesorería (con "Diferencia" contra la suma de cuentas editadas a mano).
- Movimientos: "Balance acumulado al cierre" suma hasta el mes seleccionado.
- Inicio: gráfica "Ingresos frente a gastos por mes" (reusa `GraficaIngresosGastos` de `app/dashboard/graficos.tsx`), desde el primer mes registrado hasta hoy. La tabla de ingresos por fuente del mes se conserva plegada.
- `app/grafica-ingresos-fuente.tsx` quedó sin uso; se puede borrar.
- Servidor: `npm run build` y luego `npm start -- --port 3000` desde `erp\`. Si el build da `EPERM` en `.next`, borrar la carpeta `.next` y compilar otra vez (OneDrive la bloquea). Tras cada cambio hay que recompilar y reiniciar; `npm start` no recarga solo.
- Tipos verificados con `npx tsc --noEmit`.

## Despliegue (02/11/2026)
- Código en GitHub: https://github.com/yoel1989/SISTEMA_CONTABLE_ESCOBARNET (rama `main`, commit `47e60f3`). El repo local está en `erp\` (git inicializado ahí, no en la raíz).
- App en Vercel (plan Hobby): https://sistema-contable-escobarnet-vbgq.vercel.app. Funciona desde el celular.
- Variables en Vercel: `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`. No se usa la integración de Supabase del Marketplace.
- Hobby es para uso personal y no comercial. Como es un emprendimiento, hay que decidir antes de usarlo para la operación diaria: pagar Pro o cambiar de hosting. El código no cambia en ninguno de los dos casos.
- Cada `git push` a `main` redespliega solo.
- La CLI de Vercel no tiene sesión en la consola de Claude Code. Para desplegar por CLI hay que usar `VERCEL_TOKEN` o hacerlo desde la web.

## Pendientes
- Decidir el plan de Vercel (Pro o cambiar de hosting) antes de usarlo en el negocio.
- Si el login usa enlaces de correo: agregar `https://sistema-contable-escobarnet-vbgq.vercel.app` en Supabase, en Authentication > URL Configuration.
- Próxima sesión: decidir si la gráfica de Inicio muestra todo el historial o solo los últimos 12 o 24 meses.
- Revisar en navegador: paleta nueva (fondo gris cálido, marca azul #1e4fa3, módulos verde, ámbar, cian y violeta) y el logo con degradado en la barra y en el login.
- Revisar en teléfono.
- Lentitud: parte depende de la región de Supabase. Preguntar la región en Project Settings > General. Si no es São Paulo, sugerir mover el proyecto. Ya se cambió getUser por getClaims en proxy, lib/auth y la barra superior.
- Indicadores de Movimientos, Tesorería y Dashboard sin icono ni variación.
- Cabeceras pegajosas de la hoja mensual dentro de un contenedor con scroll horizontal.
- El indicador "N" de la esquina es el de desarrollo de Next (solo aparece con `npm run dev`).
- Seguridad: el remoto de git de `recibos-app` tiene un token de GitHub en texto plano. Revocarlo.

## Preferencias del usuario
- Sin modo oscuro. Quiere colores más fuertes y aspecto profesional.
- Acciones desde la hoja, sin pantallas de detalle. Confirmación antes de quitar conceptos.
- Quitar un concepto: se borra si nunca se usó; si tiene movimientos, se desactiva.
- El build falla con `EPERM` en `.next` cuando hay un servidor corriendo, y el proyecto está dentro de OneDrive. Mover el proyecto fuera de OneDrive si vuelve a pasar.
