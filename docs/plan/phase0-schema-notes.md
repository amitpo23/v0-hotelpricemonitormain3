# Phase 0 — Schema Reconstruction Notes (2026-07-05)

- Both original Supabase projects were deleted (NXDOMAIN) — all historical data lost.
- New free project: `supabase-yellow-candle` (ref uirkjwabkdgeokirexza, us-east-1, PG17, org "guyofiror" free plan).
- Schema rebuilt from: scripts/001+002, supabase/migrations/*, root create-*.sql, plus
  `20260705000001_reconstruct_core_tables.sql` (16 tables reconstructed from code usage).
- external_data_cache: kept the 20251230 migration version; the older variant inside
  create-decision-agent-tables.sql was skipped (column mismatch: cache_key).
- RLS enabled on ALL public tables with interim policy `allow_authenticated_all`
  (any logged-in user, full access). Phase 1 replaces this with per-hotel org policies.
- Legacy `competitors` table kept as empty read-target for competitor-agent; merge decision in Phase 1.
- Admin user amitporat1981@gmail.com created + approved (password delivered separately).
