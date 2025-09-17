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
    
    // Debug: Check if PORSCHE exists
    const porscheMakes = makes.filter(m => m.make.toUpperCase().includes('PORSCHE') || m.make.toUpperCase().includes('PORS'));
    console.log(`Porsche-related makes:`, porscheMakes.map(m => m.make));
    
    res.json(makes.map(make => ({ make: make.make })));
  } catch (error) {
    console.error('Error fetching makes:', error);
    res.status(500).json({ error: 'Failed to fetch vehicle makes' });
  }
});

// Get models for a specific make and optional year
router.get('/models', async (req, res) => {
  try {
    let { make, year } = req.query;

    if (!make) {
      return res.status(400).json({ error: 'Make parameter is required' });
    }

    // Apply the same flexible matching logic used in VIN decode
    const availableMakes = await getVehicleMakes();
    console.log(`Available makes in database:`, availableMakes.map(m => m.make).slice(0, 10)); // Show first 10 for debugging
    console.log(`Looking for make: "${make}"`);
    
    // First try exact match (case insensitive)
    let exactMatch = availableMakes.find(m => 
      m.make.toLowerCase() === (make as string).toLowerCase()
    );
    console.log(`Exact match found: ${exactMatch ? exactMatch.make : 'None'}`);
    
    // If no exact match, try partial matches
    if (!exactMatch) {
      console.log(`Trying partial matches for: ${make}`);
      // Try to find a make that contains the requested make
      exactMatch = availableMakes.find(m => 
        m.make.toLowerCase().includes((make as string).toLowerCase()) ||
        (make as string).toLowerCase().includes(m.make.toLowerCase())
      );
      console.log(`Partial match found: ${exactMatch ? exactMatch.make : 'None'}`);
      
      // Try common variations and abbreviations
      if (!exactMatch) {
        console.log(`Trying abbreviation matches for: ${make}`);
        const makeUpper = (make as string).toUpperCase();
        exactMatch = availableMakes.find(m => {
          const dbMakeUpper = m.make.toUpperCase();
          const isMatch = (
            // Handle common abbreviations
            (makeUpper === 'CHEV' && dbMakeUpper === 'CHEVROLET') ||
            (makeUpper === 'CHEVROLET' && dbMakeUpper === 'CHEV') ||
            (makeUpper === 'MERZ' && dbMakeUpper.includes('MERCEDES')) ||
            (makeUpper === 'MERCEDES-BENZ' && dbMakeUpper.includes('MERCEDES')) ||
            (makeUpper === 'VOLK' && dbMakeUpper === 'VOLKSWAGEN') ||
            (makeUpper === 'VOLKSWAGEN' && dbMakeUpper === 'VOLK') ||
            (makeUpper === 'PORS' && dbMakeUpper === 'PORSCHE') ||
            (makeUpper === 'PORSCHE' && dbMakeUpper === 'PORS') ||
            // Add more common patterns
            dbMakeUpper.startsWith(makeUpper) ||
            makeUpper.startsWith(dbMakeUpper)
          );
          if (isMatch) {
            console.log(`Abbreviation match found: ${makeUpper} -> ${dbMakeUpper}`);
          }
          return isMatch;
        });
        console.log(`Abbreviation match result: ${exactMatch ? exactMatch.make : 'None'}`);
      }
    }
    
    // Use the matched make name from database if found
    if (exactMatch) {
      const originalMake = make;
      make = exactMatch.make;
      console.log(`✅ Make mapping successful: "${originalMake}" -> "${make}"`);
    } else {
      console.log(`❌ No make match found for: "${req.query.make}"`);
      console.log(`Available makes sample:`, availableMakes.map(m => m.make).slice(0, 20));
      // Return empty array if no make match found
      return res.json([]);
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

    let make = getMakeFromVin(vin);
    const year = getYearFromVin(vin);

    // If we got a make, try to find the exact match in our database
    if (make) {
      const availableMakes = await getVehicleMakes();
      
      // First try exact match (case insensitive)
      let exactMatch = availableMakes.find(m => 
        m.make.toLowerCase() === make!.toLowerCase()
      );
      
      // If no exact match, try partial matches
      if (!exactMatch) {
        // Try to find a make that contains the decoded make
        exactMatch = availableMakes.find(m => 
          m.make.toLowerCase().includes(make!.toLowerCase()) ||
          make!.toLowerCase().includes(m.make.toLowerCase())
        );
        
        // Try common variations and abbreviations
        if (!exactMatch) {
          const makeUpper = make.toUpperCase();
          exactMatch = availableMakes.find(m => {
            const dbMakeUpper = m.make.toUpperCase();
            return (
              // Handle common abbreviations
              (makeUpper === 'CHEV' && dbMakeUpper === 'CHEVROLET') ||
              (makeUpper === 'CHEVROLET' && dbMakeUpper === 'CHEV') ||
              (makeUpper === 'MERZ' && dbMakeUpper.includes('MERCEDES')) ||
              (makeUpper === 'MERCEDES-BENZ' && dbMakeUpper.includes('MERCEDES')) ||
              (makeUpper === 'VOLK' && dbMakeUpper === 'VOLKSWAGEN') ||
              (makeUpper === 'VOLKSWAGEN' && dbMakeUpper === 'VOLK') ||
              (makeUpper === 'PORS' && dbMakeUpper === 'PORSCHE') ||
              (makeUpper === 'PORSCHE' && dbMakeUpper === 'PORS') ||
              // Add more common patterns
              dbMakeUpper.startsWith(makeUpper) ||
              makeUpper.startsWith(dbMakeUpper)
            );
          });
        }
      }
      
      // Use the matched make name from database if found
      if (exactMatch) {
        make = exactMatch.make;
      }
    }

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