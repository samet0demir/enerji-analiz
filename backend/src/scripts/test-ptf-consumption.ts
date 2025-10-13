/**
 * Test Script - PTF and Consumption API
 *
 * Purpose: Test EPİAŞ PTF and Consumption API endpoints
 * Usage: ts-node src/scripts/test-ptf-consumption.ts
 */

import { getPtfData, getConsumptionData } from '../services/epias.service';
import dotenv from 'dotenv';

dotenv.config();

const testApis = async () => {
  console.log('🧪 Testing EPİAŞ PTF and Consumption APIs\n');

  // Test date range (last 3 days)
  const today = new Date();
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(today.getDate() - 3);

  const startDate = threeDaysAgo.toISOString().split('T')[0];
  const endDate = today.toISOString().split('T')[0];

  console.log(`📅 Test Date Range: ${startDate} to ${endDate}\n`);

  // Test PTF API
  console.log('1️⃣ Testing PTF (Piyasa Takas Fiyatı) API...');
  try {
    const ptfData = await getPtfData(startDate, endDate);
    console.log(`✅ PTF API Success!`);
    console.log(`📊 Received ${ptfData.length} records`);

    if (ptfData.length > 0) {
      console.log(`📋 Sample PTF Data (first 3):`);
      ptfData.slice(0, 3).forEach((item: any, idx: number) => {
        console.log(`   ${idx + 1}. Date: ${item.date}, Price: ${item.price} ₺/MWh`);
      });
    }
  } catch (error: any) {
    console.error(`❌ PTF API Failed: ${error.message}`);
  }

  console.log('\n---\n');

  // Test Consumption API
  console.log('2️⃣ Testing Consumption (Tüketim) API...');
  try {
    const consumptionData = await getConsumptionData(startDate, endDate);
    console.log(`✅ Consumption API Success!`);
    console.log(`📊 Received ${consumptionData.length} records`);

    if (consumptionData.length > 0) {
      console.log(`📋 Sample Consumption Data (first 3):`);
      consumptionData.slice(0, 3).forEach((item: any, idx: number) => {
        console.log(`   ${idx + 1}. Date: ${item.date}, Consumption: ${item.consumption} MWh`);
      });
    }
  } catch (error: any) {
    console.error(`❌ Consumption API Failed: ${error.message}`);
  }

  console.log('\n✅ Test completed!\n');
};

// Execute test
testApis()
  .then(() => {
    console.log('🎯 All tests completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
