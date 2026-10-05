# AutoIntel Database

AutoIntel uses PostgreSQL hosted on Supabase.

## Main entities

- manufacturers
- vehicle_models
- model_years
- recalls
- complaints
- ingestion_runs

## Relationships

Manufacturer
-> Vehicle Model
-> Model Year
-> Recalls
-> Complaints

## Design decisions

- Relational normalization is used for vehicle master data.
- NHTSA source records are preserved in JSONB (`raw_payload`) for auditability.
- Unique constraints make ingestion idempotent.
- Foreign keys enforce referential integrity.
- Indexes are added on commonly filtered and joined columns.
- `ingestion_runs` provides basic pipeline observability.
