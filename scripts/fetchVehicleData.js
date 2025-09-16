
import 'dotenv/config';
import { vehicleDataFetcher } from '../server/vehicleDataFetcher.js';

console.log('Starting vehicle data fetch...');
console.log('This will take a while as we fetch data from 1935 to current year.');
console.log('The process includes API rate limiting to be respectful to the server.');

async function main() {
  try {
    // Get initial stats
    const initialStats = await vehicleDataFetcher.getDataStats();
    console.log('Initial stats:', initialStats);
    
    // Start the fetch
    await vehicleDataFetcher.fetchAndStoreAllVehicleData();
    
    // Get final stats
    const finalStats = await vehicleDataFetcher.getDataStats();
    console.log('Final stats:', finalStats);
    
    console.log(`Added ${finalStats.totalMakes - initialStats.totalMakes} new makes`);
    console.log(`Added ${finalStats.totalModels - initialStats.totalModels} new models`);
    
  } catch (error) {
    console.error('Error during fetch:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

main();
