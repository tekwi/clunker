import { Router } from 'express';
import { getVehicleMakes, getVehicleModelsForMake, refreshVehicleModelsForMake, initializeVehicleData } from '../vehicleDataService';

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

export default router;