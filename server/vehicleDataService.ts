
import { db } from './db';
import { vehicleMakes, vehicleModels } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

const VEHICLE_MAKES = [
  "ACURA", "AMERICAN GENERAL", "AUDI", "BENTLEY", "BMW", "BUICK", "CADILLAC",
  "CHEVROLET", "CHRYSLER", "DAEWOO", "DODGE", "FERRARI", "FORD", "GMC",
  "HONDA", "HYUNDAI", "INFINITI", "ISUZU", "JAGUAR", "JEEP", "KIA",
  "LAND ROVER", "LEXUS", "LINCOLN", "MAZDA", "MERCEDES-BENZ", "MERCURY",
  "MITSUBISHI", "NISSAN", "NISSAN DIESEL", "OLDSMOBILE", "PLYMOUTH",
  "PONTIAC", "PORSCHE", "ROLLS-ROYCE", "SAAB", "SATURN", "SUBARU",
  "SUZUKI", "TOYOTA", "VOLKSWAGEN", "VOLVO"
];

export async function initializeVehicleData() {
  console.log('Initializing vehicle data...');
  
  try {
    // First, populate makes
    await populateVehicleMakes();
    
    // Then, populate models for each make and recent years
    await populateVehicleModels();
    
    console.log('Vehicle data initialization complete');
  } catch (error) {
    console.error('Error initializing vehicle data:', error);
  }
}

async function populateVehicleMakes() {
  console.log('Populating vehicle makes...');
  
  for (const make of VEHICLE_MAKES) {
    try {
      // Check if make already exists
      const existing = await db.select().from(vehicleMakes).where(eq(vehicleMakes.make, make)).limit(1);
      
      if (existing.length === 0) {
        await db.insert(vehicleMakes).values({
          make: make,
          isActive: true
        });
        console.log(`Added make: ${make}`);
      }
    } catch (error) {
      console.error(`Error adding make ${make}:`, error);
    }
  }
}

async function populateVehicleModels() {
  console.log('Populating vehicle models...');
  
  const makes = await db.select().from(vehicleMakes).where(eq(vehicleMakes.isActive, true));
  const currentYear = new Date().getFullYear();
  const startYear = currentYear - 25; // Get models for last 25 years
  
  for (const makeRecord of makes) {
    console.log(`Fetching models for ${makeRecord.make}...`);
    
    for (let year = startYear; year <= currentYear + 1; year++) {
      try {
        await fetchAndStoreModelsForMakeAndYear(makeRecord.id, makeRecord.make, year.toString());
        
        // Add a small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error fetching models for ${makeRecord.make} ${year}:`, error);
      }
    }
  }
}

async function fetchAndStoreModelsForMakeAndYear(makeId: string, make: string, year: string) {
  try {
    const response = await fetch(`https://www.picknpull.com/cash-for-junk-cars/api/models?year=${year}&make=${make}`);
    
    if (!response.ok) {
      console.log(`No models found for ${make} ${year} (Status: ${response.status})`);
      return;
    }
    
    // Check if response has content
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.log(`Invalid content type for ${make} ${year}: ${contentType}`);
      return;
    }
    
    // Get the response text first to check if it's empty
    const responseText = await response.text();
    if (!responseText.trim()) {
      console.log(`Empty response for ${make} ${year}`);
      return;
    }
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (jsonError) {
      console.log(`Invalid JSON response for ${make} ${year}: ${responseText.substring(0, 100)}...`);
      return;
    }
    
    if (Array.isArray(data) && data.length > 0) {
      for (const item of data) {
        if (item.model) {
          try {
            // Check if this make/model/year combination already exists
            const existing = await db.select()
              .from(vehicleModels)
              .where(
                and(
                  eq(vehicleModels.makeId, makeId),
                  eq(vehicleModels.model, item.model),
                  eq(vehicleModels.year, year)
                )
              )
              .limit(1);
            
            if (existing.length === 0) {
              await db.insert(vehicleModels).values({
                makeId: makeId,
                model: item.model,
                year: year,
                isActive: true
              });
            }
          } catch (error) {
            console.error(`Error storing model ${item.model} for ${make} ${year}:`, error);
          }
        }
      }
      console.log(`Stored models for ${make} ${year}: ${data.length} models`);
    } else {
      console.log(`No valid models in response for ${make} ${year}`);
    }
  } catch (error) {
    console.error(`Error fetching models for ${make} ${year}:`, error);
  }
}

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

export async function refreshVehicleModelsForMake(makeName: string) {
  console.log(`Refreshing models for ${makeName}...`);
  
  const makeRecord = await db.select().from(vehicleMakes).where(eq(vehicleMakes.make, makeName)).limit(1);
  
  if (makeRecord.length === 0) {
    console.error(`Make ${makeName} not found`);
    return;
  }
  
  const currentYear = new Date().getFullYear();
  const startYear = currentYear - 10; // Refresh last 10 years
  
  for (let year = startYear; year <= currentYear + 1; year++) {
    await fetchAndStoreModelsForMakeAndYear(makeRecord[0].id, makeName, year.toString());
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`Refreshed models for ${makeName}`);
}
