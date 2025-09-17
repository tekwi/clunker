
import { Router } from 'express';
import { getVehiclePricing, importPricingData } from '../vinPricing';
import csv from 'csv-parser';
import multer from 'multer';
import { Readable } from 'stream';

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
    
    const pricing = await getVehiclePricing(vin, parseInt(year), false, vehicleMake, vehicleModel, vehicleYear);
    
    if (pricing === null) {
      console.log(`❌ API Response: 404 - No pricing data found for VIN: ${vin}, Year: ${year}`);
      return res.status(404).json({ error: 'No pricing data found for this vehicle' });
    }
    
    console.log(`✅ API Response: $${pricing} for VIN: ${vin}, Year: ${year}`);
    res.json({ price: pricing });
    
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
