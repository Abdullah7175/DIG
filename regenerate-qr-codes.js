import { db } from './server/db.ts';
import { vehicles } from './shared/schema.ts';
import { generateQRCode } from './server/lib/qr-generator.ts';
import { eq } from 'drizzle-orm';

async function regenerateAllQRCodes() {
  try {
    console.log('Starting QR code regeneration...');
    
    // Get all vehicles
    const allVehicles = await db.select().from(vehicles);
    console.log(`Found ${allVehicles.length} vehicles to process`);
    
    for (const vehicle of allVehicles) {
      try {
        console.log(`Processing vehicle ${vehicle.id} (${vehicle.vehicle_register_number})`);
        
        // Generate new QR code with public URL
        const publicUrl = `http://localhost:5000/public/vehicle/${vehicle.id}`;
        const qrCode = await generateQRCode(publicUrl);
        
        // Update the vehicle with new QR code
        await db.update(vehicles)
          .set({ qr_code: qrCode })
          .where(eq(vehicles.id, vehicle.id));
        
        console.log(`✅ Updated QR code for vehicle ${vehicle.id}: ${publicUrl}`);
        
        // Small delay to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`❌ Error processing vehicle ${vehicle.id}:`, error);
      }
    }
    
    console.log('✅ QR code regeneration completed!');
    
  } catch (error) {
    console.error('❌ Error during QR code regeneration:', error);
  } finally {
    process.exit(0);
  }
}

regenerateAllQRCodes();
