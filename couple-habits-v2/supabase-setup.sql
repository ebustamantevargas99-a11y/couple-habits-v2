-- =============================================
-- EJECUTA ESTO EN SUPABASE → SQL Editor
-- =============================================

-- Tabla principal: cada pareja tiene una "sala"
CREATE TABLE rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(6) UNIQUE NOT NULL,
  data JSONB DEFAULT '{}',
  setup JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para buscar por código rápido
CREATE INDEX idx_rooms_code ON rooms(code);

-- Función para actualizar el timestamp automáticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger que actualiza updated_at en cada cambio
CREATE TRIGGER rooms_updated_at
  BEFORE UPDATE ON rooms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Habilitar Realtime para la tabla rooms
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;

-- Políticas de seguridad (permitir acceso público por ahora)
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to rooms"
  ON rooms FOR ALL
  USING (true)
  WITH CHECK (true);
