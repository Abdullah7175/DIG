import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { 
  vehicles, 
  tracking_positions, 
  tracking_events, 
  tracking_alerts, 
  tracking_reports, 
  tracking_settings,
  geofences,
  vehicle_geofences
} from '@shared/schema';
import { eq, desc, and, or, gte, lte, count } from 'drizzle-orm';
import { getTraccarService } from '../services/traccarService';
import { requireAuth } from '../auth';

const router = Router();

// WebSocket endpoint - this will be handled by the WebSocket service
// This route should be defined before authentication middleware
router.get('/websocket', (req, res) => {
  // This route exists to provide a valid HTTP endpoint for WebSocket upgrade
  // The actual WebSocket handling is done by the WebSocket service
  res.status(426).json({ error: 'Upgrade Required - This endpoint requires WebSocket upgrade' });
});

// Apply authentication to all other routes
router.use(requireAuth);

// Cleanup old positions periodically (keep only last 1000 per vehicle)
setInterval(async () => {
  try {
    // Get all vehicles
    const allVehicles = await db.select({ id: vehicles.id }).from(vehicles);
    
    for (const vehicle of allVehicles) {
      try {
        // Count positions for this vehicle
        const [countResult] = await db
          .select({ count: count() })
          .from(tracking_positions)
          .where(eq(tracking_positions.vehicle_id, vehicle.id));
        
        if (countResult && countResult.count > 1000) {
          // Delete old positions, keeping only the latest 1000
          const positionsToDelete = await db
            .select({ id: tracking_positions.id })
            .from(tracking_positions)
            .where(eq(tracking_positions.vehicle_id, vehicle.id))
            .orderBy(desc(tracking_positions.fix_time))
            .offset(1000);
          
          if (positionsToDelete.length > 0) {
            const idsToDelete = positionsToDelete.map(p => p.id);
            await db
              .delete(tracking_positions)
              .where(
                or(...idsToDelete.map(id => eq(tracking_positions.id, id)))
              );
            
            console.log(`Cleaned up ${idsToDelete.length} old positions for vehicle ${vehicle.id}`);
          }
        }
      } catch (vehicleError) {
        // Skip this vehicle if there's an error, continue with next
        console.log(`Skipping cleanup for vehicle ${vehicle.id}:`, vehicleError instanceof Error ? vehicleError.message : String(vehicleError));
        continue;
      }
    }
  } catch (error) {
    // Log error but don't crash - database might be temporarily unavailable
    console.log('Error during position cleanup (will retry later):', error instanceof Error ? error.message : String(error));
  }
}, 300000); // Run cleanup every 5 minutes

// Cleanup old events periodically (keep only last 500 per vehicle)
setInterval(async () => {
  try {
    // Get all vehicles
    const allVehicles = await db.select({ id: vehicles.id }).from(vehicles);
    
    for (const vehicle of allVehicles) {
      try {
        // Count events for this vehicle
        const [countResult] = await db
          .select({ count: count() })
          .from(tracking_events)
          .where(eq(tracking_events.vehicle_id, vehicle.id));
        
        if (countResult && countResult.count > 500) {
          // Delete old events, keeping only the latest 500
          const eventsToDelete = await db
            .select({ id: tracking_events.id })
            .from(tracking_events)
            .where(eq(tracking_events.vehicle_id, vehicle.id))
            .orderBy(desc(tracking_events.event_time))
            .offset(500);
          
          if (eventsToDelete.length > 0) {
            const idsToDelete = eventsToDelete.map(e => e.id);
            await db
              .delete(tracking_events)
              .where(
                or(...idsToDelete.map(id => eq(tracking_events.id, id)))
              );
            
            console.log(`Cleaned up ${idsToDelete.length} old events for vehicle ${vehicle.id}`);
          }
        }
      } catch (vehicleError) {
        // Skip this vehicle if there's an error, continue with next
        console.log(`Skipping event cleanup for vehicle ${vehicle.id}:`, vehicleError instanceof Error ? vehicleError.message : String(vehicleError));
        continue;
      }
    }
  } catch (error) {
    // Log error but don't crash - database might be temporarily unavailable
    console.log('Error during event cleanup (will retry later):', error instanceof Error ? error.message : String(error));
  }
}, 600000); // Run cleanup every 10 minutes

// Validation schemas
const createDeviceSchema = z.object({
  vehicleId: z.number(),
  name: z.string().min(1),
  uniqueId: z.string().min(1),
  model: z.string().optional(),
  category: z.string().optional(),
  imei: z.string().optional(),
  phone: z.string().optional(),
  contact: z.string().optional(),
  trackerCompanyId: z.string().optional(),
  protocol: z.string().optional(),
  port: z.string().optional(),
  attributes: z.record(z.any()).optional(),
});

const updateTrackingSettingsSchema = z.object({
  overspeedLimit: z.number().optional(),
  idleTimeout: z.number().optional(),
  motionThreshold: z.number().optional(),
  geofenceAlerts: z.boolean().optional(),
  overspeedAlerts: z.boolean().optional(),
  maintenanceAlerts: z.boolean().optional(),
  fuelAlerts: z.boolean().optional(),
});

const createGeofenceSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  geometryType: z.enum(['circle', 'polygon', 'polyline']),
  coordinates: z.string(), // JSON string
  radius: z.number().optional(),
  color: z.string().optional(),
});

const generateReportSchema = z.object({
  vehicleIds: z.array(z.number()),
  reportType: z.enum(['trip', 'stop', 'summary', 'route']),
  from: z.string().transform(str => new Date(str)),
  to: z.string().transform(str => new Date(str)),
});

// Device Management Routes
router.post('/devices', async (req, res) => {
  try {
    const { 
      vehicleId, 
      name, 
      uniqueId, 
      model, 
      category, 
      imei, 
      phone, 
      contact, 
      trackerCompanyId, 
      protocol, 
      port, 
      attributes 
    } = createDeviceSchema.parse(req.body);
    
    // Create device in Traccar
    const traccarService = getTraccarService();
    const device = await traccarService.createDevice({
      name,
      uniqueId,
      model,
      category,
      imei,
      phone,
      contact,
      trackerCompanyId,
      protocol,
      port,
      attributes,
    });

    // Update vehicle with Traccar device info
    await db
      .update(vehicles)
      .set({
        traccar_device_id: device.id,
        traccar_unique_id: device.uniqueId,
        tracking_enabled: true,
        updated_at: new Date(),
      })
      .where(eq(vehicles.id, vehicleId));

    res.json({ success: true, device });
  } catch (error) {
    console.error('Error creating tracking device:', error);
    res.status(500).json({ error: 'Failed to create tracking device' });
  }
});

router.get('/devices', async (req, res) => {
  try {
    const traccarService = getTraccarService();
    const devices = await traccarService.getDevices();
    res.json(devices);
  } catch (error) {
    console.error('Error fetching devices:', error);
    res.status(500).json({ error: 'Failed to fetch devices' });
  }
});

router.get('/devices/:id', async (req, res) => {
  try {
    const deviceId = parseInt(req.params.id);
    const traccarService = getTraccarService();
    const device = await traccarService.getDevice(deviceId);
    res.json(device);
  } catch (error) {
    console.error('Error fetching device:', error);
    res.status(500).json({ error: 'Failed to fetch device' });
  }
});

router.put('/devices/:id', async (req, res) => {
  try {
    const deviceId = parseInt(req.params.id);
    const updateData = req.body;
    
    const traccarService = getTraccarService();
    const device = await traccarService.updateDevice(deviceId, updateData);
    res.json(device);
  } catch (error) {
    console.error('Error updating device:', error);
    res.status(500).json({ error: 'Failed to update device' });
  }
});

router.delete('/devices/:id', async (req, res) => {
  try {
    const deviceId = parseInt(req.params.id);
    
    // Find vehicle with this device ID
    const [vehicle] = await db
      .select()
      .from(vehicles)
      .where(eq(vehicles.traccar_device_id, deviceId));

    if (vehicle) {
      // Update vehicle to disable tracking
      await db
        .update(vehicles)
        .set({
          traccar_device_id: null,
          traccar_unique_id: null,
          tracking_enabled: false,
          updated_at: new Date(),
        })
        .where(eq(vehicles.id, vehicle.id));
    }

    // Delete device from Traccar
    const traccarService = getTraccarService();
    await traccarService.deleteDevice(deviceId);

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting device:', error);
    res.status(500).json({ error: 'Failed to delete device' });
  }
});

// Position Routes
router.get('/positions', async (req, res) => {
  try {
    const { vehicleId, from, to, limit = 100 } = req.query;
    
    const whereConditions = [];
    
    if (vehicleId) {
      whereConditions.push(eq(tracking_positions.vehicle_id, parseInt(vehicleId as string)));
    }
    
    if (from && to) {
      whereConditions.push(
        and(
          gte(tracking_positions.fix_time, new Date(from as string)),
          lte(tracking_positions.fix_time, new Date(to as string))
        )
      );
    }
    
    const positions = await db
      .select()
      .from(tracking_positions)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(desc(tracking_positions.fix_time))
      .limit(parseInt(limit as string));

    res.json(positions);
  } catch (error) {
    console.error('Error fetching positions:', error);
    res.status(500).json({ error: 'Failed to fetch positions' });
  }
});

router.get('/positions/latest', async (req, res) => {
  try {
    const { vehicleIds } = req.query;
    
    // If no vehicleIds provided, return empty array instead of error
    if (!vehicleIds) {
      return res.json([]);
    }

    const traccarService = getTraccarService();
    const deviceIds = (vehicleIds as string).split(',').map(id => parseInt(id));
    const positions = await traccarService.getLatestPositions(deviceIds);
    
    res.json(positions);
  } catch (error) {
    console.error('Error fetching latest positions:', error);
    res.status(500).json({ error: 'Failed to fetch latest positions' });
  }
});

// Event Routes
router.get('/events', async (req, res) => {
  try {
    const { vehicleId, from, to, limit = 100 } = req.query;
    
    const whereConditions = [];
    
    if (vehicleId) {
      whereConditions.push(eq(tracking_events.vehicle_id, parseInt(vehicleId as string)));
    }
    
    if (from && to) {
      whereConditions.push(
        and(
          gte(tracking_events.event_time, new Date(from as string)),
          lte(tracking_events.event_time, new Date(to as string))
        )
      );
    }
    
    const events = await db
      .select()
      .from(tracking_events)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(desc(tracking_events.event_time))
      .limit(parseInt(limit as string));

    res.json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Alert Routes
router.get('/alerts', async (req, res) => {
  try {
    const { vehicleId, acknowledged, limit = 50 } = req.query;
    
    const whereConditions = [];
    
    if (vehicleId) {
      whereConditions.push(eq(tracking_alerts.vehicle_id, parseInt(vehicleId as string)));
    }
    
    if (acknowledged !== undefined) {
      whereConditions.push(eq(tracking_alerts.acknowledged, acknowledged === 'true'));
    }
    
    const alerts = await db
      .select()
      .from(tracking_alerts)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(desc(tracking_alerts.created_at))
      .limit(parseInt(limit as string));

    res.json(alerts);
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

router.put('/alerts/:id/acknowledge', async (req, res) => {
  try {
    const alertId = parseInt(req.params.id);
    const userId = req.user.id;
    
    await db
      .update(tracking_alerts)
      .set({
        acknowledged: true,
        acknowledged_by: userId,
        acknowledged_at: new Date(),
      })
      .where(eq(tracking_alerts.id, alertId));

    res.json({ success: true });
  } catch (error) {
    console.error('Error acknowledging alert:', error);
    res.status(500).json({ error: 'Failed to acknowledge alert' });
  }
});

// Settings Routes
router.get('/settings/:vehicleId', async (req, res) => {
  try {
    const vehicleId = parseInt(req.params.vehicleId);
    
    const [settings] = await db
      .select()
      .from(tracking_settings)
      .where(eq(tracking_settings.vehicle_id, vehicleId));

    res.json(settings || {});
  } catch (error) {
    console.error('Error fetching tracking settings:', error);
    res.status(500).json({ error: 'Failed to fetch tracking settings' });
  }
});

router.put('/settings/:vehicleId', async (req, res) => {
  try {
    const vehicleId = parseInt(req.params.vehicleId);
    const settings = updateTrackingSettingsSchema.parse(req.body);
    
    // Check if settings exist
    const [existing] = await db
      .select()
      .from(tracking_settings)
      .where(eq(tracking_settings.vehicle_id, vehicleId));

    if (existing) {
      // Update existing settings
      const [updated] = await db
        .update(tracking_settings)
        .set({
          ...settings,
          updated_at: new Date(),
        })
        .where(eq(tracking_settings.vehicle_id, vehicleId))
        .returning();
      
      res.json(updated);
    } else {
      // Create new settings
      const [created] = await db
        .insert(tracking_settings)
        .values({
          vehicle_id: vehicleId,
          ...settings,
        })
        .returning();
      
      res.json(created);
    }
  } catch (error) {
    console.error('Error updating tracking settings:', error);
    res.status(500).json({ error: 'Failed to update tracking settings' });
  }
});

// Geofence Routes
router.get('/geofences', async (req, res) => {
  try {
    const geofencesList = await db
      .select()
      .from(geofences)
      .orderBy(desc(geofences.created_at));

    res.json(geofencesList);
  } catch (error) {
    console.error('Error fetching geofences:', error);
    res.status(500).json({ error: 'Failed to fetch geofences' });
  }
});

router.post('/geofences', async (req, res) => {
  try {
    const geofenceData = createGeofenceSchema.parse(req.body);
    
    const [geofence] = await db
      .insert(geofences)
      .values({
        name: geofenceData.name,
        description: geofenceData.description,
        geometry_type: geofenceData.geometryType,
        coordinates: geofenceData.coordinates,
        radius: geofenceData.radius?.toString() || null,
        color: geofenceData.color,
      })
      .returning();

    res.json(geofence);
  } catch (error) {
    console.error('Error creating geofence:', error);
    res.status(500).json({ error: 'Failed to create geofence' });
  }
});

router.get('/geofences/:id', async (req, res) => {
  try {
    const geofenceId = parseInt(req.params.id);
    
    const [geofence] = await db
      .select()
      .from(geofences)
      .where(eq(geofences.id, geofenceId));

    if (!geofence) {
      return res.status(404).json({ error: 'Geofence not found' });
    }

    res.json(geofence);
  } catch (error) {
    console.error('Error fetching geofence:', error);
    res.status(500).json({ error: 'Failed to fetch geofence' });
  }
});

router.put('/geofences/:id', async (req, res) => {
  try {
    const geofenceId = parseInt(req.params.id);
    const updateData = req.body;
    
    const [geofence] = await db
      .update(geofences)
      .set({
        ...updateData,
        updated_at: new Date(),
      })
      .where(eq(geofences.id, geofenceId))
      .returning();

    res.json(geofence);
  } catch (error) {
    console.error('Error updating geofence:', error);
    res.status(500).json({ error: 'Failed to update geofence' });
  }
});

router.delete('/geofences/:id', async (req, res) => {
  try {
    const geofenceId = parseInt(req.params.id);
    
    await db
      .delete(geofences)
      .where(eq(geofences.id, geofenceId));

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting geofence:', error);
    res.status(500).json({ error: 'Failed to delete geofence' });
  }
});

// Vehicle-Geofence Assignment Routes
router.post('/vehicles/:vehicleId/geofences/:geofenceId', async (req, res) => {
  try {
    const vehicleId = parseInt(req.params.vehicleId);
    const geofenceId = parseInt(req.params.geofenceId);
    
    const [assignment] = await db
      .insert(vehicle_geofences)
      .values({
        vehicle_id: vehicleId,
        geofence_id: geofenceId,
      })
      .returning();

    res.json(assignment);
  } catch (error) {
    console.error('Error assigning geofence to vehicle:', error);
    res.status(500).json({ error: 'Failed to assign geofence to vehicle' });
  }
});

router.delete('/vehicles/:vehicleId/geofences/:geofenceId', async (req, res) => {
  try {
    const vehicleId = parseInt(req.params.vehicleId);
    const geofenceId = parseInt(req.params.geofenceId);
    
    await db
      .delete(vehicle_geofences)
      .where(
        and(
          eq(vehicle_geofences.vehicle_id, vehicleId),
          eq(vehicle_geofences.geofence_id, geofenceId)
        )
      );

    res.json({ success: true });
  } catch (error) {
    console.error('Error removing geofence from vehicle:', error);
    res.status(500).json({ error: 'Failed to remove geofence from vehicle' });
  }
});

// Report Routes
router.post('/reports/generate', async (req, res) => {
  try {
    const { vehicleIds, reportType, from, to } = generateReportSchema.parse(req.body);
    
    const traccarService = getTraccarService();
    let reportData;
    
    switch (reportType) {
      case 'trip':
        reportData = await traccarService.getTripsReport(vehicleIds, from, to);
        break;
      case 'stop':
        reportData = await traccarService.getStopsReport(vehicleIds, from, to);
        break;
      case 'summary':
        reportData = await traccarService.getSummaryReport(vehicleIds, from, to);
        break;
      case 'route':
        reportData = await traccarService.getRouteReport(vehicleIds, from, to);
        break;
      default:
        return res.status(400).json({ error: 'Invalid report type' });
    }

    // Store report in database
    for (const vehicleId of vehicleIds) {
      await db.insert(tracking_reports).values({
        vehicle_id: vehicleId,
        report_type: reportType,
        start_time: from,
        end_time: to,
        report_data: JSON.stringify(reportData),
      });
    }

    res.json(reportData);
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

router.get('/reports/:vehicleId', async (req, res) => {
  try {
    const vehicleId = parseInt(req.params.vehicleId);
    const { limit = 50 } = req.query;
    
    const reports = await db
      .select()
      .from(tracking_reports)
      .where(eq(tracking_reports.vehicle_id, vehicleId))
      .orderBy(desc(tracking_reports.generated_at))
      .limit(parseInt(limit as string));

    res.json(reports);
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// Command Routes
router.post('/commands', async (req, res) => {
  try {
    const { deviceId, command, parameters = {} } = req.body;
    
    if (!deviceId || !command) {
      return res.status(400).json({ error: 'deviceId and command are required' });
    }

    const traccarService = getTraccarService();
    await traccarService.sendCommand(deviceId, command, parameters);

    res.json({ success: true });
  } catch (error) {
    console.error('Error sending command:', error);
    res.status(500).json({ error: 'Failed to send command' });
  }
});

// Statistics Route
router.get('/statistics', async (req, res) => {
  try {
    const { from, to } = req.query;
    
    const traccarService = getTraccarService();
    const statistics = await traccarService.getStatistics(
      from ? new Date(from as string) : undefined,
      to ? new Date(to as string) : undefined
    );

    res.json(statistics);
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// WebSocket URL Route
router.get('/websocket-url', (req, res) => {
  try {
    const traccarService = getTraccarService();
    const wsUrl = traccarService.getWebSocketUrl();
    res.json({ websocketUrl: wsUrl });
  } catch (error) {
    console.error('Error getting WebSocket URL:', error);
    res.status(500).json({ error: 'Failed to get WebSocket URL' });
  }
});

// Tracker Companies Route
router.get('/tracker-companies', async (req, res) => {
  try {
    // Mock tracker companies data - in a real implementation, this would come from a database
    const trackerCompanies = [
      { id: 1, name: 'Teltonika', description: 'Professional GPS tracking solutions' },
      { id: 2, name: 'Queclink', description: 'IoT and telematics solutions' },
      { id: 3, name: 'Calamp', description: 'Connected vehicle solutions' },
      { id: 4, name: 'Sierra Wireless', description: 'IoT connectivity solutions' },
      { id: 5, name: 'Concox', description: 'GPS tracking devices' },
      { id: 6, name: 'Jimi IoT', description: 'Smart tracking solutions' },
      { id: 7, name: 'Osmand', description: 'Open source tracking platform' },
      { id: 8, name: 'GT06', description: 'GPS tracking protocol' },
    ];
    
    res.json(trackerCompanies);
  } catch (error) {
    console.error('Error fetching tracker companies:', error);
    res.status(500).json({ error: 'Failed to fetch tracker companies' });
  }
});

export default router;
