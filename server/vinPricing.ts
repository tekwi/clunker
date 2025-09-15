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

// Function to get year from VIN (10th character)
function getYearFromVin(vin: string): number | null {
  if (vin.length < 10) return null;
  const vinYearChar = vin.charAt(9).toUpperCase();
  const possibleYears = VIN_YEAR_MAP[vinYearChar] || [];

  if (possibleYears.length === 0) return null;

  // For VIN year characters that map to two possible years,
  // choose the later year (2010-2039 range) for newer vehicles
  return Math.max(...possibleYears);
}

// Function to remove outliers and calculate median
function calculateMedianWithoutOutliers(prices: number[]): number {
  if (prices.length === 0) return 0;
  if (prices.length === 1) return prices[0];

  // Sort prices
  const sortedPrices = [...prices].sort((a, b) => a - b);

  // Remove outliers using IQR method
  if (sortedPrices.length >= 4) {
    const q1Index = Math.floor(sortedPrices.length * 0.25);
    const q3Index = Math.floor(sortedPrices.length * 0.75);
    const q1 = sortedPrices[q1Index];
    const q3 = sortedPrices[q3Index];
    const iqr = q3 - q1;
    const lowerBound = q1 - (1.5 * iqr);
    const upperBound = q3 + (1.5 * iqr);

    const filteredPrices = sortedPrices.filter(price => price >= lowerBound && price <= upperBound);

    if (filteredPrices.length > 0) {
      // Calculate median of filtered prices
      const mid = Math.floor(filteredPrices.length / 2);
      return filteredPrices.length % 2 === 0
        ? Math.round((filteredPrices[mid - 1] + filteredPrices[mid]) / 2)
        : filteredPrices[mid];
    }
  }

  // If we can't remove outliers or no prices left after filtering, use median of all prices
  const mid = Math.floor(sortedPrices.length / 2);
  return sortedPrices.length % 2 === 0
    ? Math.round((sortedPrices[mid - 1] + sortedPrices[mid]) / 2)
    : sortedPrices[mid];
}

export async function getVehiclePricing(submittedVin: string, submittedYear: number, isManualEntry: boolean = false): Promise<number | null> {
  try {
    let vinToUse = submittedVin;
    let vinPrefix = vinToUse.substring(0, 8).toUpperCase();
    let decodedMake = getMakeFromVin(vinToUse);
    let vinYear = getYearFromVin(vinToUse);

    console.log(`Searching for VIN: ${submittedVin}`);
    console.log(`VIN Prefix: ${vinPrefix}, Decoded Make: ${decodedMake}, VIN Year: ${vinYear}, Submitted Year: ${submittedYear}`);

    // Search 1: Exact VIN prefix match (first 8 characters) with year filtering
    let result = await db.execute(sql`
      SELECT sale_price, vin, lot_year, lot_make, lot_model
      FROM vehicle_pricing
      WHERE LEFT(vin, 8) = ${vinPrefix}
      AND sale_price > 0
      AND vin IS NOT NULL
      ORDER BY lot_year DESC
      LIMIT 100
    `);

    let rows = Array.isArray(result[0]) ? result[0] : [];
    console.log(`VIN prefix search found ${rows.length} rows before year filtering`);

    // Filter by year if we have VIN year or submitted year
    const targetYear = vinYear || submittedYear;
    if (targetYear && rows.length > 0) {
      // Allow ±2 years flexibility for better matching
      const yearTolerance = 2;
      rows = rows.filter(row => {
        const rowYear = Number(row.lot_year);
        return rowYear >= (targetYear - yearTolerance) && rowYear <= (targetYear + yearTolerance);
      });
      console.log(`After year filtering (${targetYear} ±${yearTolerance}): ${rows.length} rows`);
    }

    // Search 2: If no matches with year filtering, try make-based search
    if (rows.length === 0 && decodedMake && !isManualEntry) {
      console.log(`No VIN prefix matches with year, searching by make: ${decodedMake}`);
      result = await db.execute(sql`
        SELECT sale_price, vin, lot_year, lot_make, lot_model
        FROM vehicle_pricing
        WHERE lot_make = ${decodedMake}
        AND sale_price > 0
        AND vin IS NOT NULL
        ORDER BY lot_year DESC
        LIMIT 200
      `);

      rows = Array.isArray(result[0]) ? result[0] : [];
      console.log(`Make-based search found ${rows.length} rows for make: ${decodedMake}`);

      // Apply year filtering to make-based results
      if (targetYear && rows.length > 0) {
        const yearTolerance = 3; // Slightly more tolerance for make-based search
        rows = rows.filter(row => {
          const rowYear = Number(row.lot_year);
          return rowYear >= (targetYear - yearTolerance) && rowYear <= (targetYear + yearTolerance);
        });
        console.log(`After year filtering for make search (${targetYear} ±${yearTolerance}): ${rows.length} rows`);
      }
    }

    // Search 3: If still no matches, try shorter VIN prefix without strict year filtering
    if (rows.length === 0) {
      const shorterPrefix = vinToUse.substring(0, 6); // Use potentially corrected VIN
      console.log(`No matches, searching by shorter VIN prefix: ${shorterPrefix}`);
      const result = await db.execute(sql`
        SELECT sale_price, vin, lot_year, lot_make, lot_model
        FROM vehicle_pricing
        WHERE LEFT(vin, 6) = ${shorterPrefix}
        AND sale_price > 0
        AND vin IS NOT NULL
        ORDER BY lot_year DESC
        LIMIT 100
      `);

      rows = Array.isArray(result[0]) ? result[0] : [];
      console.log(`Shorter prefix search found ${rows.length} rows`);
    }

    if (rows.length === 0) {
      console.log(`No pricing data found for VIN: ${submittedVin}`);
      return null;
    }

    // Convert to proper format and calculate pricing
    const validPrices = rows
      .filter(row => row && row.sale_price > 0)
      .map(row => Number(row.sale_price))
      .filter(price => price > 0 && price < 1000000); // Remove obviously invalid high prices

    if (validPrices.length === 0) {
      console.log('No valid prices found');
      return null;
    }

    console.log(`Found ${validPrices.length} valid prices: [${validPrices.map(p => `$${p}`).join(', ')}]`);

    if (validPrices.length === 1) {
      console.log(`Single match found: $${validPrices[0]}`);
      return validPrices[0];
    }

    // Calculate median with outlier removal for multiple matches
    const medianPrice = calculateMedianWithoutOutliers(validPrices);

    console.log(`Multiple matches (${validPrices.length}), median: $${medianPrice}`);
    console.log(`Price range: $${Math.min(...validPrices)} - $${Math.max(...validPrices)}`);

    return medianPrice;

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