
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

interface PricingMatch {
  sale_price: number;
  vin: string;
  lot_year: number;
  lot_make: string;
  lot_model: string;
}

export async function getVehiclePricing(submittedVin: string, submittedYear: number): Promise<number | null> {
  try {
    // Extract first 8 characters for make/model matching
    const vinPrefix = submittedVin.substring(0, 8);
    
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
    
    // Query for matches based on VIN prefix and year
    const matches = await db.execute(sql`
      SELECT sale_price, vin, lot_year, lot_make, lot_model
      FROM vehicle_pricing 
      WHERE LEFT(vin, 8) = ${vinPrefix}
      AND ABS(lot_year - ${targetYear}) <= 1
      AND sale_price > 0
      ORDER BY ABS(lot_year - ${targetYear})
    `) as PricingMatch[];
    
    if (matches.length === 0) {
      console.log(`No pricing matches found for VIN prefix: ${vinPrefix}, Year: ${targetYear}`);
      return null;
    }
    
    if (matches.length === 1) {
      console.log(`Single match found: $${matches[0].sale_price}`);
      return matches[0].sale_price;
    }
    
    // Multiple matches - calculate average with standard deviation filtering
    const prices = matches.map(m => m.sale_price);
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
