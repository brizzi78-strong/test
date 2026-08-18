create table if not exists stores(
  id text primary key,
  name text not null,
  city text not null
);

create table if not exists inventory(
  id uuid primary key,
  store_id text not null references stores(id),
  name text not null,
  gtin text,
  lot text not null,
  exp date not null,
  qty integer not null check(qty >= 0),
  location text,
  unit_value numeric(12,2) default 0,
  monthly_velocity numeric(12,2) default 0,
  status text default 'active',
  verified_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists idx_inventory_exp on inventory(exp);
create index if not exists idx_inventory_store on inventory(store_id);
create index if not exists idx_inventory_name on inventory(name);

create table if not exists audit(
  id uuid primary key,
  ts timestamptz default now(),
  action text,
  detail text,
  store_id text,
  role text
);

create index if not exists idx_audit_ts on audit(ts desc);

create table if not exists transfers(
  id uuid primary key,
  ts timestamptz default now(),
  item_name text,
  from_store text,
  to_store text,
  qty integer,
  protected_value numeric(12,2),
  status text
);

create index if not exists idx_transfers_ts on transfers(ts desc);
