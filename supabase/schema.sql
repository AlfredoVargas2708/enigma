-- Ejecutar en el SQL Editor de Supabase (proyecto: sntovswinqyalxdctuci)

create table if not exists matches (
  id bigint generated always as identity primary key,
  day text not null,
  time text not null,
  category text not null,
  type text not null,
  players jsonb not null default '[]'::jsonb,
  instance text,
  result text,
  stats jsonb not null default '{}'::jsonb,
  -- usada solo para deduplicar partidos importados desde el TXT
  signature text generated always as (day || '|' || time || '|' || category || '|' || players::text) stored
);

create unique index if not exists matches_signature_idx on matches (signature);

-- Suma/resta atómica de una estadística de un jugador dentro de un partido, sin bajar de 0.
create or replace function increment_match_stat(
  match_id bigint,
  player_name text,
  stat_key text,
  delta bigint
)
returns bigint
language plpgsql
as $$
declare
  current_stats jsonb;
  current_value bigint;
  updated_value bigint;
begin
  select stats into current_stats from matches where id = match_id for update;
  if current_stats is null then
    current_stats := '{}'::jsonb;
  end if;

  current_value := coalesce((current_stats -> player_name ->> stat_key)::bigint, 0);
  updated_value := greatest(current_value + delta, 0);

  current_stats := jsonb_set(
    current_stats,
    array[player_name],
    coalesce(current_stats -> player_name, '{}'::jsonb) || jsonb_build_object(stat_key, updated_value),
    true
  );

  update matches set stats = current_stats where id = match_id;
  return updated_value;
end;
$$;

-- RLS: la app usa solo la clave "anon/publishable" (nunca la service_role),
-- por eso se habilitan políticas explícitas para ese rol en vez de dejar la tabla abierta sin RLS.
alter table matches enable row level security;

create policy "anon puede leer partidos" on matches
  for select to anon using (true);

create policy "anon puede insertar partidos" on matches
  for insert to anon with check (true);

create policy "anon puede editar partidos" on matches
  for update to anon using (true) with check (true);
