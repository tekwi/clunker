
import axios from 'axios';
import { db } from './db';
import { vehicleMakes, vehicleModels } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

interface PicknPullMake {
  make: string;
}

interface PicknPullModel {
  model: string;
}

export class VehicleDataFetcher {
  private baseUrlMakes = 'https://www.picknpull.com/cash-for-junk-cars/api/makes';
  private baseUrlModels = 'https://www.picknpull.com/cash-for-junk-cars/api/models';
  private startYear = 1935;
  private currentYear = new Date().getFullYear();
  
  async fetchAndStoreAllVehicleData() {
    console.log(`Starting vehicle data fetch from ${this.startYear} to ${this.currentYear}`);
    
    for (let year = this.startYear; year <= this.currentYear; year++) {
      console.log(`Processing year ${year}...`);
      await this.processYear(year);
      
      // Add a small delay to be respectful to the API
      await this.delay(100);
    }
    
    console.log('Vehicle data fetch completed successfully!');
  }
  
  private async processYear(year: number) {
    try {
      // Fetch makes for the year
      const makesResponse = await axios.get<PicknPullMake[]>(`${this.baseUrlMakes}?year=${year}`);
      const makes = makesResponse.data;
      
      console.log(`  Found ${makes.length} makes for year ${year}`);
      
      for (const makeData of makes) {
        const makeName = makeData.make;
        
        // Store or get make
        let make = await this.getOrCreateMake(makeName);
        
        // Fetch models for this year+make combination
        await this.fetchAndStoreModels(year, makeName, make.id);
        
        // Small delay between make requests
        await this.delay(50);
      }
      
    } catch (error) {
      console.error(`Error processing year ${year}:`, error);
    }
  }
  
  private async getOrCreateMake(makeName: string) {
    // Try to find existing make
    const existingMake = await db
      .select()
      .from(vehicleMakes)
      .where(eq(vehicleMakes.make, makeName))
      .limit(1);
    
    if (existingMake.length > 0) {
      return existingMake[0];
    }
    
    // Create new make
    const newMake = await db
      .insert(vehicleMakes)
      .values({ make: makeName })
      .execute();
    
    return await db
      .select()
      .from(vehicleMakes)
      .where(eq(vehicleMakes.make, makeName))
      .limit(1)
      .then(results => results[0]);
  }
  
  private async fetchAndStoreModels(year: number, makeName: string, makeId: string) {
    try {
      const modelsResponse = await axios.get<PicknPullModel[]>(
        `${this.baseUrlModels}?year=${year}&make=${encodeURIComponent(makeName)}`
      );
      const models = modelsResponse.data;
      
      console.log(`    Found ${models.length} models for ${year} ${makeName}`);
      
      for (const modelData of models) {
        const modelName = modelData.model;
        
        // Check if this exact combination already exists
        const existingModel = await db
          .select()
          .from(vehicleModels)
          .where(
            and(
              eq(vehicleModels.makeId, makeId),
              eq(vehicleModels.model, modelName),
              eq(vehicleModels.year, year.toString())
            )
          )
          .limit(1);
        
        if (existingModel.length === 0) {
          // Insert new model
          await db
            .insert(vehicleModels)
            .values({
              makeId,
              model: modelName,
              year: year.toString()
            })
            .execute();
        }
      }
      
    } catch (error) {
      console.error(`Error fetching models for ${year} ${makeName}:`, error);
    }
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // Utility method to get stats
  async getDataStats() {
    const makesCount = await db
      .select({ count: 'COUNT(*)' })
      .from(vehicleMakes)
      .execute();
    
    const modelsCount = await db
      .select({ count: 'COUNT(*)' })
      .from(vehicleModels)
      .execute();
    
    return {
      totalMakes: makesCount[0]?.count || 0,
      totalModels: modelsCount[0]?.count || 0
    };
  }
}

// Export a singleton instance
export const vehicleDataFetcher = new VehicleDataFetcher();
