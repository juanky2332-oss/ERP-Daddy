-- 1. Añadir columna perfil a todas las tablas de negocio
ALTER TABLE facturas ADD COLUMN IF NOT EXISTS perfil TEXT DEFAULT 'personal';
ALTER TABLE gastos ADD COLUMN IF NOT EXISTS perfil TEXT DEFAULT 'personal';
ALTER TABLE presupuestos ADD COLUMN IF NOT EXISTS perfil TEXT DEFAULT 'personal';
ALTER TABLE albaranes ADD COLUMN IF NOT EXISTS perfil TEXT DEFAULT 'personal';
ALTER TABLE contactos ADD COLUMN IF NOT EXISTS perfil TEXT DEFAULT 'personal';

-- Especial para contadores: necesitamos clave compuesta para duplicar numeración
ALTER TABLE contadores DROP CONSTRAINT IF EXISTS contadores_pkey;
ALTER TABLE contadores ADD COLUMN IF NOT EXISTS perfil TEXT DEFAULT 'personal';
ALTER TABLE contadores ADD PRIMARY KEY (tipo, perfil, anio); -- Añadimos año también por si acaso

-- 2. Asegurar que los contadores existen para ambos perfiles si queremos numeración separada
-- (Opcional: Si el usuario quiere numeración única, podemos ignorar esto y usar perfil='global')
-- Basado en el requerimiento de "hacer por duplicado", asumo numeración separada.

-- Insertar contadores para el perfil compartido si no existen
INSERT INTO contadores (tipo, anio, ultimo_numero, perfil)
SELECT tipo, anio, 0, 'compartido'
FROM contadores
WHERE perfil = 'personal'
ON CONFLICT DO NOTHING;

-- 3. Índices para performance
CREATE INDEX IF NOT EXISTS idx_facturas_perfil ON facturas(perfil);
CREATE INDEX IF NOT EXISTS idx_gastos_perfil ON gastos(perfil);
CREATE INDEX IF NOT EXISTS idx_presupuestos_perfil ON presupuestos(perfil);
CREATE INDEX IF NOT EXISTS idx_albaranes_perfil ON albaranes(perfil);
CREATE INDEX IF NOT EXISTS idx_contactos_perfil ON contactos(perfil);
