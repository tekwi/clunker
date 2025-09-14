import { db } from './db';
import { sql } from 'drizzle-orm';

// VIN year character mapping
const VIN_YEAR_MAP: { [key: string]: number[] } = {
  'A': [1980, 2010], 'B': [1981, 2011], 'C': [1982, 2012], 'D': [1983, 2013],
  'E': [1984, 2014], 'F': [1985, 2015], 'G': [1986, 2016], 'H': [1987, 2017],
  'J': [1988, 2018], 'K': [1989, 2019], 'L': [1990, 2020], 'M': [1991, 2021],
  'N': [1992, 2022], 'P': [1993, 2023], 'R': [1994, 2024], 'S': [1995, 2025],
  'T': [1996, 2026], 'V': [1997, 2027], 'W': [1998, 2028], 'X': [1999, 2029],
  'Y': [2000, 2030], '1': [2001, 2031], '2': [2002, 2032], '3': [2003, 2033],
  '4': [2004, 2034], '5': [2005, 2035], '6': [2006, 2036], '7': [2007, 2037],
  '8': [2008, 2038], '9': [2009, 2039]
};

// World Manufacturer Identifier (WMI) to Make mapping - first 3 characters
const WMI_TO_MAKE: { [key: string]: string } = {
  // BMW
  'WBA': 'BMW', 'WBS': 'BMW', 'WBY': 'BMW',
  // Mercedes-Benz
  'WDD': 'MERZ', 'WDF': 'MERZ', 'WDC': 'MERZ',
  // Audi
  'WAU': 'AUDI', 'WA1': 'AUDI',
  // Volkswagen
  'WVW': 'VOLK', 'WV1': 'VOLK', 'WV2': 'VOLK',
  // Porsche
  'WP0': 'PORS', 'WP1': 'PORS',
  // Ford
  '1FA': 'FORD', '1FB': 'FORD', '1FC': 'FORD', '1FD': 'FORD', '1FE': 'FORD', '1FF': 'FORD', '1FG': 'FORD', '1FH': 'FORD', '1FJ': 'FORD', '1FK': 'FORD', '1FL': 'FORD', '1FM': 'FORD', '1FN': 'FORD', '1FP': 'FORD', '1FR': 'FORD', '1FS': 'FORD', '1FT': 'FORD', '1FU': 'FORD', '1FV': 'FORD', '1FW': 'FORD', '1FX': 'FORD', '1FY': 'FORD', '1FZ': 'FORD',
  // GM (Chevrolet, GMC, Cadillac, Buick)
  '1G1': 'CHEV', '1G2': 'PONT', '1G3': 'OLDSM', '1G4': 'BUIC', '1G6': 'CADI', '1GC': 'CHEV', '1GD': 'CHEV', '1GE': 'CHEV', '1GH': 'CHEV', '1GK': 'CHEV', '1GM': 'CHEV', '1GN': 'CHEV', '1GP': 'PONT', '1GR': 'PONT', '1GS': 'PONT', '1GT': 'GMC', '1GU': 'GMC', '1GW': 'CHEV', '1GX': 'CHEV', '1GY': 'CADI', '1GZ': 'CHEV',
  // Chrysler/Dodge/Jeep
  '1C3': 'DODS', '1C4': 'JEEP', '1C6': 'DODS', '1C7': 'JEEP', '1C8': 'CHRYS', '2C3': 'DODS', '2C4': 'CHRYS', '2C7': 'DODS', '2C8': 'CHRYS',
  // Toyota
  '4T1': 'TOYT', '4T3': 'TOYT', '4T4': 'TOYT', '5TD': 'TOYT', '5TF': 'TOYT', '5TJ': 'TOYT', 'JT2': 'TOYT', 'JT3': 'TOYT', 'JT4': 'TOYT', 'JT6': 'TOYT', 'JT7': 'TOYT', 'JT8': 'TOYT', 'JTA': 'TOYT', 'JTB': 'TOYT', 'JTC': 'TOYT', 'JTD': 'TOYT', 'JTE': 'TOYT', 'JTF': 'TOYT', 'JTG': 'TOYT', 'JTH': 'TOYT', 'JTJ': 'TOYT', 'JTK': 'TOYT', 'JTL': 'TOYT', 'JTM': 'TOYT', 'JTN': 'TOYT',
  // Honda/Acura
  '1HG': 'HOND', '1HF': 'HOND', '2HG': 'HOND', '2HF': 'HOND', '19U': 'ACUR', 'JH4': 'ACUR', 'JHM': 'HOND',
  // Nissan/Infiniti
  '1N4': 'NISS', '1N6': 'NISS', '3N1': 'NISS', '3N6': 'NISS', 'JN1': 'NISS', 'JN6': 'NISS', 'JN8': 'NISS', 'JNA': 'INFI', 'JNK': 'INFI', 'JNR': 'INFI', 'JNX': 'INFI',
  // Mazda
  '1YV': 'MAZD', '4F2': 'MAZD', '4F4': 'MAZD', 'JM1': 'MAZD', 'JM3': 'MAZD', 'JM7': 'MAZD',
  // Subaru
  '4S3': 'SUBA', '4S4': 'SUBA', '4S6': 'SUBA', 'JF1': 'SUBA', 'JF2': 'SUBA',
  // Mitsubishi
  '4A3': 'MITS', '4A4': 'MITS', 'JA3': 'MITS', 'JA4': 'MITS',
  // Hyundai/Kia
  'KMH': 'HYUN', 'KMJ': 'HYUN', 'KMF': 'HYUN', 'KNA': 'KIA', 'KND': 'KIA', 'KNE': 'KIA', 'KNM': 'KIA',
  // Land Rover/Jaguar
  'SAL': 'LAND', 'SAJ': 'JAGU', 'SAT': 'LAND',
  // Volvo
  'YV1': 'VOLV', 'YV4': 'VOLV',
  // Tesla
  '5YJ': 'TESL', '7SA': 'TESL',
  // MINI
  'WMW': 'MINI',
  // Lexus (removing duplicates - JTH and JT6 already assigned to Toyota above)
  // Genesis
  'KMU': 'GENE',
  // Alfa Romeo
  'ZAR': 'ALFA',
  // Maserati
  'ZAM': 'MASE',
  // Ferrari
  'ZFF': 'FERR',
  // Lamborghini
  'ZHW': 'LAMB',
  // Bentley
  'SCC': 'BENT',
  // Rolls-Royce
  'SCA': 'ROLL',
};

// Function to decode make from VIN
function getMakeFromVin(vin: string): string | null {
  if (vin.length < 3) return null;
  const wmi = vin.substring(0, 3).toUpperCase();
  return WMI_TO_MAKE[wmi] || null;
}

interface PricingMatch {
  sale_price: number;
  vin: string;
  lot_year: number;
  lot_make: string;
  lot_model: string;
}

interface RawPricingMatch {
  sale_price: any;
  vin: any;
  lot_year: any;
  lot_make: any;
  lot_model: any;
}

export async function getVehiclePricing(submittedVin: string, submittedYear: number): Promise<number | null> {
  try {
    // Extract first 8 characters for exact VIN prefix matching
    const vinPrefix = submittedVin.substring(0, 8).toUpperCase();

    // Decode make from VIN
    const decodedMake = getMakeFromVin(submittedVin);

    // Extract 10th character for year validation
    const vinYearChar = submittedVin.charAt(9).toUpperCase();
    const possibleYears = VIN_YEAR_MAP[vinYearChar] || [];

    // Determine which year to use based on context
    let targetYear = submittedYear;
    if (possibleYears.length > 0) {
      // Choose the year closest to submitted year
      targetYear = possibleYears.reduce((prev, curr) => 
        Math.abs(curr - submittedYear) < Math.abs(prev - submittedYear) ? curr : prev
      );
    }

    console.log(`Searching for VIN: ${submittedVin}`);
    console.log(`VIN Prefix: ${vinPrefix}, Decoded Make: ${decodedMake}, Target Year: ${targetYear}`);

    // Primary search: Exact VIN prefix match (first 8 characters) + year
    let rawMatches = await db.execute(sql`
      SELECT sale_price, vin, lot_year, lot_make, lot_model
      FROM vehicle_pricing 
      WHERE LEFT(vin, 8) = ${vinPrefix}
      AND ABS(lot_year - ${targetYear}) <= 1
      AND sale_price > 0
      AND vin IS NOT NULL
      AND LENGTH(vin) >= 8
      ORDER BY ABS(lot_year - ${targetYear}), sale_price
    `);

    console.log('Raw matches from VIN prefix search:', rawMatches);

    // MySQL returns [rows, metadata] - we only want the rows
    const rows = Array.isArray(rawMatches) && Array.isArray(rawMatches[0]) ? rawMatches[0] : rawMatches;
    
    let matches = (rows as any[]).map((row: any) => {
      console.log('Processing VIN prefix row:', row);
      // Skip if this is metadata (array of column definitions)
      if (Array.isArray(row) || typeof row === 'string') {
        return null;
      }
      return {
        sale_price: row.sale_price ? Number(row.sale_price) : 0,
        vin: row.vin ? String(row.vin) : '',
        lot_year: row.lot_year ? Number(row.lot_year) : 0,
        lot_make: row.lot_make ? String(row.lot_make) : '',
        lot_model: row.lot_model ? String(row.lot_model) : ''
      };
    }).filter(match => match !== null);

    // If no exact VIN prefix matches and we have a decoded make, search by make + year
    if (matches.length === 0 && decodedMake) {
      console.log(`No exact VIN prefix matches, searching by make: ${decodedMake}`);
      rawMatches = await db.execute(sql`
        SELECT sale_price, vin, lot_year, lot_make, lot_model
        FROM vehicle_pricing 
        WHERE lot_make = ${decodedMake}
        AND ABS(lot_year - ${targetYear}) <= 2
        AND sale_price > 0
        AND vin IS NOT NULL
        AND LENGTH(vin) >= 8
        ORDER BY ABS(lot_year - ${targetYear}), sale_price
        LIMIT 50
      `);

      const makeRows = Array.isArray(rawMatches) && Array.isArray(rawMatches[0]) ? rawMatches[0] : rawMatches;
      matches = (makeRows as any[]).map((row: any) => {
        console.log('Make-based search raw row:', row);
        if (Array.isArray(row) || typeof row === 'string') {
          return null;
        }
        return {
          sale_price: row.sale_price ? Number(row.sale_price) : 0,
          vin: row.vin ? String(row.vin) : '',
          lot_year: row.lot_year ? Number(row.lot_year) : 0,
          lot_make: row.lot_make ? String(row.lot_make) : '',
          lot_model: row.lot_model ? String(row.lot_model) : ''
        };
      }).filter(match => match !== null);
    }

    // If still no matches, broaden search to similar VIN prefix (first 6 characters)
    if (matches.length === 0) {
      const shorterPrefix = vinPrefix.substring(0, 6);
      console.log(`No make matches, searching by shorter VIN prefix: ${shorterPrefix}`);
      rawMatches = await db.execute(sql`
        SELECT sale_price, vin, lot_year, lot_make, lot_model
        FROM vehicle_pricing 
        WHERE LEFT(vin, 6) = ${shorterPrefix}
        AND ABS(lot_year - ${targetYear}) <= 2
        AND sale_price > 0
        AND vin IS NOT NULL
        AND LENGTH(vin) >= 6
        ORDER BY ABS(lot_year - ${targetYear}), sale_price
        LIMIT 20
      `);

      const prefixRows = Array.isArray(rawMatches) && Array.isArray(rawMatches[0]) ? rawMatches[0] : rawMatches;
      matches = (prefixRows as any[]).map((row: any) => {
        console.log('Shorter prefix search raw row:', row);
        if (Array.isArray(row) || typeof row === 'string') {
          return null;
        }
        return {
          sale_price: row.sale_price ? Number(row.sale_price) : 0,
          vin: row.vin ? String(row.vin) : '',
          lot_year: row.lot_year ? Number(row.lot_year) : 0,
          lot_make: row.lot_make ? String(row.lot_make) : '',
          lot_model: row.lot_model ? String(row.lot_model) : ''
        };
      }).filter(match => match !== null);
    }

    if (matches.length === 0) {
      console.log(`No pricing matches found for VIN: ${submittedVin}, Make: ${decodedMake}, Year: ${targetYear}`);
      return null;
    }

    console.log(`Found ${matches.length} matches:`, matches.map(m => ({
      make: m.lot_make,
      model: m.lot_model,
      year: m.lot_year,
      price: m.sale_price,
      vin_prefix: m.vin ? m.vin.substring(0, 8) : 'N/A'
    })));

    if (matches.length === 1) {
      console.log(`Single match found: $${matches[0].sale_price} (${matches[0].lot_make} ${matches[0].lot_model})`);
      return matches[0].sale_price;
    }

    // Multiple matches - calculate average with standard deviation filtering
    const prices = matches.map(m => m.sale_price).filter(price => price > 0 && !isNaN(price));

    if (prices.length === 0) {
      console.log('No valid prices found in matches');
      return null;
    }

    const mean = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const variance = prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / prices.length;
    const stdDev = Math.sqrt(variance);

    // Filter out prices that are more than 2 standard deviations from mean
    const filteredPrices = prices.filter(price => 
      Math.abs(price - mean) <= 2 * stdDev
    );

    if (filteredPrices.length === 0) {
      // If all prices were outliers, use the original mean
      console.log(`All prices were outliers, using original mean: $${mean}`);
      return Math.round(mean);
    }

    const filteredAverage = filteredPrices.reduce((sum, price) => sum + price, 0) / filteredPrices.length;

    console.log(`Multiple matches (${matches.length}), filtered average: $${filteredAverage}`);
    console.log(`Removed ${prices.length - filteredPrices.length} outliers`);
    console.log(`Price range: $${Math.min(...filteredPrices)} - $${Math.max(...filteredPrices)}`);

    return Math.round(filteredAverage);

  } catch (error) {
    console.error('Error getting vehicle pricing:', error);
    return null;
  }
}

export async function importPricingData(csvData: any[]): Promise<number> {
  try {
    let imported = 0;

    for (const row of csvData) {
      // Skip rows with invalid VINs or prices
      if (!row.VIN || row.VIN.length !== 17 || !row['Sale Price'] || row['Sale Price'] <= 0) {
        continue;
      }

      await db.execute(sql`
        INSERT INTO vehicle_pricing (
          automobile, lot_year, lot_make, lot_model, drivetrain,
          vehicle_body_style, vehicle_engine, vin, invoice_date,
          sale_price, lot_run_condition, sale_title_type,
          damage_type_description, secondary_damage_type_description,
          yard_zip, odometer_reading, yard_number, yard_name,
          yard_city, yard_state, title_type, title_state,
          lot_color, transmission_type, lot_link, lot_fuel_type,
          lot_sold_run, rerun_count, airbag_depl_flg, business_unit
        ) VALUES (
          ${row.Automobile}, ${parseFloat(row['Lot Year']) || null}, 
          ${row['Lot Make']}, ${row['Lot Model']}, ${row.Drivetrain},
          ${row['Vehicle Body Style']}, ${row['Vehicle Engine']}, 
          ${row.VIN}, ${row['Invoice Date'] ? new Date(row['Invoice Date']) : null},
          ${parseFloat(row['Sale Price'])}, ${row['Lot Run Condition']}, 
          ${row['Sale Title Type']}, ${row['Damage Type Descrition']},
          ${row['Secondary Damage Type Description']}, ${row['Yard ZIP']},
          ${row['Odometer Reading']}, ${parseFloat(row['Yard Number']) || null},
          ${row['Yard Name']}, ${row['Yard city']}, ${row['Yard State']},
          ${row['Title Type']}, ${row['Title State']}, ${row['Lot Color']},
          ${row['Transmission Type']}, ${row['Lot Link']}, ${row['Lot Fuel Type']},
          ${parseInt(row.lot_sold_run) || null}, ${parseInt(row.rerun_count) || null},
          ${parseInt(row.airbag_depl_flg) || null}, ${row.business_unit}
        )
      `);

      imported++;
    }

    console.log(`Successfully imported ${imported} pricing records`);
    return imported;

  } catch (error) {
    console.error('Error importing pricing data:', error);
    throw error;
  }
}