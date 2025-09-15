
import { db } from './db';
import { vehicleMakes, vehicleModels } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

export async function getVehicleMakes() {
  return await db.select().from(vehicleMakes).where(eq(vehicleMakes.isActive, true)).orderBy(vehicleMakes.make);
}

export async function getVehicleModelsForMake(makeName: string, year?: string) {
  const makeRecord = await db.select().from(vehicleMakes).where(eq(vehicleMakes.make, makeName)).limit(1);
  
  if (makeRecord.length === 0) {
    return [];
  }
  
  let query = db.select({
    model: vehicleModels.model,
    year: vehicleModels.year
  })
  .from(vehicleModels)
  .where(
    and(
      eq(vehicleModels.makeId, makeRecord[0].id),
      eq(vehicleModels.isActive, true)
    )
  );
  
  if (year) {
    query = query.where(
      and(
        eq(vehicleModels.makeId, makeRecord[0].id),
        eq(vehicleModels.isActive, true),
        eq(vehicleModels.year, year)
      )
    );
  }
  
  const models = await query.orderBy(vehicleModels.model);
  
  // Return unique models
  const uniqueModels = Array.from(new Set(models.map(m => m.model)));
  return uniqueModels.map(model => ({ model }));
}


