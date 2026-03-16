-- Migration: Add recurrence columns to gastos and facturas
-- Date: 2026-03-16

-- Add columns to gastos
ALTER TABLE gastos ADD COLUMN IF NOT EXISTS es_recurrente BOOLEAN DEFAULT FALSE;
ALTER TABLE gastos ADD COLUMN IF NOT EXISTS frecuencia TEXT DEFAULT 'unico';

-- Add columns to facturas
ALTER TABLE facturas ADD COLUMN IF NOT EXISTS es_recurrente BOOLEAN DEFAULT FALSE;
ALTER TABLE facturas ADD COLUMN IF NOT EXISTS frecuencia TEXT DEFAULT 'unico';

-- Comment explaining values for frecuencia:
-- 'unico', 'semanal', 'quincenal', 'mensual', 'bimestral', 'trimestral', 'semestral', 'anual'
