-- Analyze query performance for vehicles endpoint
-- This will help identify slow queries

-- Enable query timing
\timing on

-- Simulate the getAllVehicles query without filters
EXPLAIN ANALYZE
SELECT 
    v.*,
    o.*,
    d.*,
    c.*,
    u.*,
    vc.*,
    vt.*
FROM vehicles v
LEFT JOIN owners o ON v.owner_id = o.id
LEFT JOIN drivers d ON v.driver_id = d.id
LEFT JOIN conductors c ON v.conductor_id = c.id
LEFT JOIN users u ON v.registered_by = u.id
LEFT JOIN vehicle_categories vc ON v.vehicle_category_id = vc.id
LEFT JOIN vehicle_types vt ON v.vehicle_type_id = vt.id
ORDER BY v.created_at DESC
LIMIT 20
OFFSET 0;

-- Check if indexes are being used
EXPLAIN ANALYZE
SELECT COUNT(*) FROM vehicles;

-- Check index usage statistics
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE tablename IN ('vehicles', 'owners', 'drivers', 'conductors', 'vehicle_categories', 'vehicle_types')
ORDER BY tablename, indexname;

-- Check table statistics (last analyzed)
SELECT 
    schemaname,
    tablename,
    last_analyze,
    last_autoanalyze,
    n_live_tup as live_tuples,
    n_dead_tup as dead_tuples
FROM pg_stat_user_tables
WHERE tablename IN ('vehicles', 'owners', 'drivers', 'conductors', 'vehicle_categories', 'vehicle_types')
ORDER BY tablename;

