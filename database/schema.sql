-- AutoIntel AI
-- PostgreSQL / Supabase relational schema

create table if not exists public.manufacturers (
    id bigint generated always as identity primary key,
    name text not null unique,
    created_at timestamptz not null default now()
);

create table if not exists public.vehicle_models (
    id bigint generated always as identity primary key,

    manufacturer_id bigint not null
        references public.manufacturers(id)
        on delete cascade,

    model_name text not null,
    created_at timestamptz not null default now(),

    unique (manufacturer_id, model_name)
);

create table if not exists public.model_years (
    id bigint generated always as identity primary key,

    vehicle_model_id bigint not null
        references public.vehicle_models(id)
        on delete cascade,

    model_year integer not null,
    created_at timestamptz not null default now(),

    unique (vehicle_model_id, model_year)
);

create table if not exists public.recalls (
    id bigint generated always as identity primary key,

    model_year_id bigint not null
        references public.model_years(id)
        on delete cascade,

    campaign_number text not null,
    component text,
    summary text,
    consequence text,
    remedy text,
    report_received_date date,

    raw_payload jsonb,

    created_at timestamptz not null default now(),

    unique (model_year_id, campaign_number)
);

create table if not exists public.complaints (
    id bigint generated always as identity primary key,

    model_year_id bigint not null
        references public.model_years(id)
        on delete cascade,

    odi_number text not null unique,

    component text,
    complaint_date date,
    incident_date date,

    crash boolean not null default false,
    fire boolean not null default false,

    injuries integer not null default 0
        check (injuries >= 0),

    deaths integer not null default 0
        check (deaths >= 0),

    description text,
    raw_payload jsonb,

    created_at timestamptz not null default now()
);

create table if not exists public.ingestion_runs (
    id uuid primary key default gen_random_uuid(),

    source_name text not null,
    entity_type text not null,

    started_at timestamptz not null default now(),
    completed_at timestamptz,

    status text not null default 'RUNNING'
        check (status in ('RUNNING', 'SUCCESS', 'FAILED')),

    rows_received integer not null default 0,
    rows_inserted integer not null default 0,
    rows_failed integer not null default 0,

    error_message text
);

create index if not exists idx_vehicle_models_manufacturer
    on public.vehicle_models(manufacturer_id);

create index if not exists idx_model_years_vehicle
    on public.model_years(vehicle_model_id);

create index if not exists idx_recalls_model_year
    on public.recalls(model_year_id);

create index if not exists idx_recalls_component
    on public.recalls(component);

create index if not exists idx_complaints_model_year
    on public.complaints(model_year_id);

create index if not exists idx_complaints_component
    on public.complaints(component);

create index if not exists idx_complaints_date
    on public.complaints(complaint_date);