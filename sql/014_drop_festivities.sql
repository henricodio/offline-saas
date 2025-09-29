-- Eliminar definitivamente estacionalidad: tabla festivities
-- Advertencia: esto elimina datos y dependencias relacionadas

drop table if exists public.festivities cascade;
