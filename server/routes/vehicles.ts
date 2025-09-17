import { Router } from 'express';
import { getVehicleMakes, getVehicleModelsForMake, refreshVehicleModelsForMake, initializeVehicleData } from '../vehicleDataService';
import { vehicleDataFetcher } from '../vehicleDataFetcher';
import { getMakeFromVin, getYearFromVin } from '../vinPricing';

const router = Router();

// Get all vehicle makes
router.get('/makes', async (req, res) => {
  try {
    const makes = await getVehicleMakes();
    console.log(`Found ${makes.length} vehicle makes`);
    res.json(makes.map(make => ({ make: make.make })));
  } catch (error) {
    console.error('Error fetching makes:', error);
    res.status(500).json({ error: 'Failed to fetch vehicle makes' });
  }
});

// Get models for a specific make and optional year
router.get('/models', async (req, res) => {
  try {
    const { make, year } = req.query;

    if (!make) {
      return res.status(400).json({ error: 'Make parameter is required' });
    }

    const models = await getVehicleModelsForMake(make as string, year as string);
    res.json(models);
  } catch (error) {
    console.error('Error fetching models:', error);
    res.status(500).json({ error: 'Failed to fetch vehicle models' });
  }
});

// Fetch and populate vehicle data from PicknPull API
router.post('/fetch-data', async (req, res) => {
  try {
    console.log('Starting vehicle data fetch from PicknPull API...');
    
    // Run the fetch process
    await vehicleDataFetcher.fetchAndStoreAllVehicleData();
    
    // Get final stats
    const stats = await vehicleDataFetcher.getDataStats();
    
    res.json({
      success: true,
      message: 'Vehicle data fetch completed successfully',
      stats
    });
    
  } catch (error) {
    console.error('Error during vehicle data fetch:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch vehicle data',
      details: error.message 
    });
  }
});

// Get current data statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await vehicleDataFetcher.getDataStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Decode VIN to extract make and year
router.post('/decode-vin', async (req, res) => {
  try {
    const { vin } = req.body;

    if (!vin || vin.length !== 17) {
      return res.status(400).json({ error: 'Valid 17-character VIN is required' });
    }

    const make = getMakeFromVin(vin);
    const year = getYearFromVin(vin);

    console.log(`VIN decode: ${vin} -> Make: ${make}, Year: ${year}`);

    res.json({
      make: make,
      year: year,
      success: true
    });

  } catch (error) {
    console.error('Error decoding VIN:', error);
    res.status(500).json({ error: 'Failed to decode VIN' });
  }
});

export default router;