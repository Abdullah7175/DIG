-- Check existing indexes on vehicles table
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename IN ('vehicles', 'owners', 'drivers', 'conductors', 'vehicle_categories', 'vehicle_types', 'vehicle_documents')
ORDER BY tablename, indexname;

-- Check table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
    pg_total_relation_size(schemaname||'.'||tablename) AS size_bytes
FROM pg_tables
WHERE tablename IN ('vehicles', 'owners', 'drivers', 'conductors', 'vehicle_categories', 'vehicle_types', 'vehicle_documents')
ORDER BY size_bytes DESC;

-- Check row counts
SELECT 'vehicles' as table_name, COUNT(*) as row_count FROM vehicles
UNION ALL
SELECT 'owners', COUNT(*) FROM owners
UNION ALL
SELECT 'drivers', COUNT(*) FROM drivers
UNION ALL
SELECT 'conductors', COUNT(*) FROM conductors
UNION ALL
SELECT 'vehicle_categories', COUNT(*) FROM vehicle_categories
UNION ALL
SELECT 'vehicle_types', COUNT(*) FROM vehicle_types
UNION ALL
SELECT 'vehicle_documents', COUNT(*) FROM vehicle_documents;

