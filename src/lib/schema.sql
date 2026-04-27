-- ============================================================
-- AUREN — Schema completo do banco de dados
-- Executar no Supabase SQL Editor:
-- https://supabase.com/dashboard/project/qvfbrrxdfvavmucwssql/sql/new
-- ============================================================

-- ── Extensions ───────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── 1. profiles ──────────────────────────────────────────────
create table if not exists profiles (
  id                    uuid primary key references auth.users on delete cascade,
  nome                  text,
  telefone              text,
  cidade                text,
  idioma                text default 'pt' check (idioma in ('pt', 'es')),
  genero                text,
  nivel_gamificacao     int  default 1,
  foto_url              text,
  endereco_comercial    text,
  endereco_residencial  text,
  taxa_deslocamento     decimal(10, 2),
  created_at            timestamptz default now()
);

-- Cria perfil automaticamente quando um usuário se registra.
-- search_path = public é obrigatório em funções security definer no Supabase.
-- O bloco exception garante que uma falha aqui nunca aborte o signUp.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, created_at)
  values (new.id, now())
  on conflict (id) do nothing;
  return new;
exception
  when others then
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ── 2. clientes ──────────────────────────────────────────────
create table if not exists clientes (
  id                uuid primary key default uuid_generate_v4(),
  profissional_id   uuid not null references profiles(id) on delete cascade,
  nome              text not null,
  telefone          text,
  servico_favorito  text,
  alergias          text,
  cor_favorita      text,
  aniversario       date,
  observacoes       text,
  total_visitas     int     default 0,
  total_gasto       decimal(10, 2) default 0,
  vip               boolean default false,
  ativa             boolean default true,
  created_at        timestamptz default now()
);

-- ── 3. servicos ──────────────────────────────────────────────
create table if not exists servicos (
  id                uuid primary key default uuid_generate_v4(),
  profissional_id   uuid not null references profiles(id) on delete cascade,
  nome              text not null,
  valor             decimal(10, 2) not null,
  duracao_minutos   int not null,
  descricao         text,
  foto_url          text,
  ativo             boolean default true,
  created_at        timestamptz default now()
);

-- ── 4. agendamentos ──────────────────────────────────────────
create table if not exists agendamentos (
  id                uuid primary key default uuid_generate_v4(),
  profissional_id   uuid not null references profiles(id) on delete cascade,
  cliente_id        uuid references clientes(id) on delete set null,
  servico_id        uuid references servicos(id) on delete set null,
  data_hora         timestamptz not null,
  status            text default 'pendente'
                      check (status in ('pendente', 'confirmado', 'finalizado', 'cancelado')),
  valor             decimal(10, 2),
  tipo_endereco     text default 'comercial'
                      check (tipo_endereco in ('comercial', 'residencial', 'domicilio')),
  observacoes       text,
  created_at        timestamptz default now()
);

-- ── 5. financeiro ────────────────────────────────────────────
create table if not exists financeiro (
  id                uuid primary key default uuid_generate_v4(),
  profissional_id   uuid not null references profiles(id) on delete cascade,
  agendamento_id    uuid references agendamentos(id) on delete set null,
  valor             decimal(10, 2) not null,
  metodo_pagamento  text check (metodo_pagamento in (
                      'zelle', 'cartao', 'dinheiro', 'cheque', 'venmo', 'cashapp'
                    )),
  tipo              text not null check (tipo in ('receita', 'despesa')),
  categoria         text,
  created_at        timestamptz default now()
);

-- ── Row Level Security ────────────────────────────────────────
alter table profiles     enable row level security;
alter table clientes     enable row level security;
alter table servicos     enable row level security;
alter table agendamentos enable row level security;
alter table financeiro   enable row level security;

-- profiles: usuário só vê e edita o próprio perfil
create policy "profiles: leitura própria"
  on profiles for select using (auth.uid() = id);
create policy "profiles: edição própria"
  on profiles for update using (auth.uid() = id);

-- clientes: profissional acessa apenas seus próprios clientes
create policy "clientes: select"
  on clientes for select using (auth.uid() = profissional_id);
create policy "clientes: insert"
  on clientes for insert with check (auth.uid() = profissional_id);
create policy "clientes: update"
  on clientes for update using (auth.uid() = profissional_id);
create policy "clientes: delete"
  on clientes for delete using (auth.uid() = profissional_id);

-- servicos
create policy "servicos: select"
  on servicos for select using (auth.uid() = profissional_id);
create policy "servicos: insert"
  on servicos for insert with check (auth.uid() = profissional_id);
create policy "servicos: update"
  on servicos for update using (auth.uid() = profissional_id);
create policy "servicos: delete"
  on servicos for delete using (auth.uid() = profissional_id);

-- agendamentos
create policy "agendamentos: select"
  on agendamentos for select using (auth.uid() = profissional_id);
create policy "agendamentos: insert"
  on agendamentos for insert with check (auth.uid() = profissional_id);
create policy "agendamentos: update"
  on agendamentos for update using (auth.uid() = profissional_id);
create policy "agendamentos: delete"
  on agendamentos for delete using (auth.uid() = profissional_id);

-- financeiro
create policy "financeiro: select"
  on financeiro for select using (auth.uid() = profissional_id);
create policy "financeiro: insert"
  on financeiro for insert with check (auth.uid() = profissional_id);
create policy "financeiro: update"
  on financeiro for update using (auth.uid() = profissional_id);
create policy "financeiro: delete"
  on financeiro for delete using (auth.uid() = profissional_id);

-- ── Indexes ───────────────────────────────────────────────────
create index if not exists idx_clientes_profissional     on clientes(profissional_id);
create index if not exists idx_servicos_profissional     on servicos(profissional_id);
create index if not exists idx_agendamentos_profissional on agendamentos(profissional_id);
create index if not exists idx_agendamentos_data         on agendamentos(data_hora);
create index if not exists idx_financeiro_profissional   on financeiro(profissional_id);
