-- Add limit date for recurrence
ALTER TABLE gastos ADD COLUMN IF NOT EXISTS fecha_limite_recurrencia DATE;
ALTER TABLE facturas ADD COLUMN IF NOT EXISTS fecha_limite_recurrencia DATE;

-- Ensure previous columns exist (just in case)
ALTER TABLE gastos ADD COLUMN IF NOT EXISTS es_recurrente BOOLEAN DEFAULT FALSE;
ALTER TABLE gastos ADD COLUMN IF NOT EXISTS frecuencia TEXT DEFAULT 'unico';

ALTER TABLE facturas ADD COLUMN IF NOT EXISTS es_recurrente BOOLEAN DEFAULT FALSE;
ALTER TABLE facturas ADD COLUMN IF NOT EXISTS frecuencia TEXT DEFAULT 'unico';
