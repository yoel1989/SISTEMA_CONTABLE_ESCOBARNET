-- Los movimientos ya no se vinculan a una cuenta. Las cuentas pasan a ser saldos
-- manuales que el administrador organiza en Tesorería.
-- Ejecutar después de 0008_borrar_gastos_de_sedes.sql.

-- 1. La vista de saldos depende de transferencias y de movimientos.cuenta_pago_id: se elimina primero.
drop view if exists public.v_saldo_cuentas;

-- 2. Transferencias: ya no se usan (el dinero se mueve fuera del sistema).
drop table if exists public.transferencias;

-- 3. Movimientos: sin cuenta de pago.
drop index if exists public.movimientos_cuenta_idx;
alter table public.movimientos drop column if exists cuenta_pago_id;

-- 4. Cuentas: el saldo es un valor editable, no se calcula.
alter table public.cuentas_pago rename column saldo_inicial to saldo;
