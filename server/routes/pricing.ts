
import { Router } from 'express';
import { getVehiclePricing, importPricingData } from '../vinPricing';
import csv from 'csv-parser';
import multer from 'multer';
import { Readable } from 'stream';
import { db } from '../db';
import { adminSettings } from '../../shared/schema';
import { eq } from 'drizzle-orm';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Get pricing for a specific VIN and year
router.post('/lookup', async (req, res) => {
  try {
    const { vin, year, vehicleMake, vehicleModel, vehicleYear } = req.body;
    
    if (!vin || !year) {
      return res.status(400).json({ error: 'VIN and year are required' });
    }
    
    if (vin.length !== 17) {
      return res.status(400).json({ error: 'VIN must be 17 characters long' });
    }
    
    const rawPricing = await getVehiclePricing(
      vin, 
      parseInt(year), 
      false, 
      vehicleMake || undefined, 
      vehicleModel || undefined, 
      vehicleYear || undefined
    );
    
    if (rawPricing === null) {
      console.log(`❌ API Response: 404 - No pricing data found for VIN: ${vin}, Year: ${year}`);
      return res.status(404).json({ error: 'No pricing data found for this vehicle' });
    }
    
    // Fetch margin and service charge settings
    const settings = await db
      .select()
      .from(adminSettings)
      .where(eq(adminSettings.settingKey, 'margin_type'))
      .limit(1);
    
    const marginType = settings[0]?.settingValue || 'percentage';
    
    const marginValueSettings = await db
      .select()
      .from(adminSettings)
      .where(eq(adminSettings.settingKey, 'margin_value'))
      .limit(1);
    
    const marginValue = parseFloat(marginValueSettings[0]?.settingValue || '10');
    
    const serviceChargeSettings = await db
      .select()
      .from(adminSettings)
      .where(eq(adminSettings.settingKey, 'service_charge'))
      .limit(1);
    
    const serviceCharge = parseFloat(serviceChargeSettings[0]?.settingValue || '50');
    
    // Calculate final price with margin and service charge
    let finalPrice = rawPricing;
    
    // Apply margin
    if (marginType === 'percentage') {
      finalPrice = rawPricing * (1 - marginValue / 100);
    } else {
      finalPrice = rawPricing - marginValue;
    }
    
    // Subtract service charge
    finalPrice = finalPrice - serviceCharge;
    
    // Ensure price doesn't go negative
    finalPrice = Math.max(0, finalPrice);
    
    console.log(`✅ Pricing Calculation for VIN: ${vin}`);
    console.log(`   Raw Price: $${rawPricing}`);
    console.log(`   Margin Type: ${marginType}`);
    console.log(`   Margin Value: ${marginType === 'percentage' ? marginValue + '%' : '$' + marginValue}`);
    console.log(`   Service Charge: $${serviceCharge}`);
    console.log(`   Final Offer Price: $${finalPrice.toFixed(2)}`);
    
    res.json({ price: Math.round(finalPrice) });
    
  } catch (error) {
    console.error('Pricing lookup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Import CSV pricing data
router.post('/import', upload.single('csvFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'CSV file is required' });
    }
    
    const results: any[] = [];
    const stream = Readable.from(req.file.buffer);
    
    await new Promise((resolve, reject) => {
      stream
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', resolve)
        .on('error', reject);
    });
    
    const imported = await importPricingData(results);
    
    res.json({ 
      message: `Successfully imported ${imported} pricing records`,
      imported 
    });
    
  } catch (error) {
    console.error('CSV import error:', error);
    res.status(500).json({ error: 'Failed to import CSV data' });
  }
});

export default router;
