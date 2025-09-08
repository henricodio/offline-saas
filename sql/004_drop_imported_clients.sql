-- Eliminar la tabla auxiliar de importación si ya no se utiliza
drop table if exists public.imported_clients cascade;
-- Nota: eliminará también índices y políticas asociadas si existen.
