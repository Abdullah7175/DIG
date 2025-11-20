# Traccar Cleanup Summary

## Tables to Drop (Run `scripts/remove-traccar-tables.sql`)

1. `vehicle_geofences` - Junction table for vehicle-geofence relationships
2. `tracking_settings` - Vehicle tracking settings
3. `tracking_reports` - Tracking reports
4. `tracking_alerts` - Tracking alerts
5. `tracking_events` - Tracking events
6. `tracking_positions` - Tracking positions
7. `geofences` - Geofence definitions
8. `tracking_sessions` - User tracking sessions
9. `user_traccar_access` - Traccar user access mapping

## Columns to Remove from `vehicles` Table

1. `traccar_device_id` - Traccar device ID
2. `traccar_unique_id` - Traccar unique identifier
3. `last_position_update` - Last position update timestamp
4. `current_status` - Current tracking status
5. `last_latitude` - Last known latitude
6. `last_longitude` - Last known longitude
7. `last_speed` - Last known speed
8. `last_course` - Last known course
9. `tracking_enabled` - Tracking enabled flag

## Indexes to Drop

1. `idx_vehicles_traccar_device_id`
2. `idx_vehicles_tracking_enabled`
3. `idx_vehicles_current_status`

## Code Files Modified

1. `shared/schema.ts` - Removed Traccar-related columns and commented-out table definitions
2. `client/src/pages/Dashboard.jsx` - Updated Traccar reference to "System status"
3. `client/src/store/tracking.ts` - Still contains Traccar-related interfaces (can be removed if not used)

## Missing Performance Indexes

See `scripts/add-missing-indexes.sql` for additional indexes that should be added for better query performance.

## Execution Order

1. Run `scripts/remove-traccar-tables.sql` to drop tables and columns
2. Run `scripts/add-missing-indexes.sql` to add performance indexes
3. Rebuild the project: `npm run build:backend`

