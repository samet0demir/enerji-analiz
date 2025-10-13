/**
 * Test EPİAŞ API data publication delay
 * Check when data becomes available after the actual hour
 */

import { getRealTimeGeneration } from '../services/epias.service';
import dotenv from 'dotenv';

dotenv.config();

const testDelay = async () => {
  console.log('🔍 Testing EPİAŞ Data Publication Delay...\n');

  const now = new Date();
  console.log(`Current Time: ${now.toISOString()}`);
  console.log(`Istanbul Time: ${now.toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })}\n`);

  try {
    console.log('📊 Fetching real-time generation data...');
    const data = await getRealTimeGeneration();

    if (data && data.length > 0) {
      // Sort by date desc
      const sorted = data.sort((a: any, b: any) => {
        const dateA = new Date(a.date + ' ' + a.hour);
        const dateB = new Date(b.date + ' ' + b.hour);
        return dateB.getTime() - dateA.getTime();
      });

      const latest = sorted[0];
      const latestTime = new Date(latest.date);
      const latestHour = parseInt(latest.hour.split(':')[0]);
      latestTime.setHours(latestHour);

      console.log(`\n📅 Latest Available Data:`);
      console.log(`   Date: ${latest.date}`);
      console.log(`   Hour: ${latest.hour}`);
      console.log(`   Total Generation: ${latest.total} MW`);

      const delayMinutes = Math.floor((now.getTime() - latestTime.getTime()) / 1000 / 60);
      const delayHours = Math.floor(delayMinutes / 60);
      const remainingMinutes = delayMinutes % 60;

      console.log(`\n⏱️  Publication Delay:`);
      console.log(`   ${delayHours} hours ${remainingMinutes} minutes`);

      console.log(`\n💡 Recommendation:`);
      if (delayMinutes < 30) {
        console.log('   ✅ 15-minute interval is appropriate');
        console.log('   Data is published quickly, frequent checks make sense');
      } else if (delayMinutes < 90) {
        console.log('   ⚠️  30-minute interval would be better');
        console.log('   Data is delayed, 15-min checks might fetch same data');
      } else {
        console.log('   ✅ 1-hour interval is sufficient');
        console.log(`   Data is delayed by ${delayHours}+ hours, no need for frequent checks`);
      }

      console.log(`\n📋 All Available Data Points (last 5):`);
      sorted.slice(0, 5).forEach((record: any) => {
        console.log(`   ${record.date} ${record.hour} - ${record.total} MW`);
      });

    } else {
      console.log('❌ No data received from EPİAŞ API');
    }

  } catch (error: any) {
    console.error('❌ Error testing delay:', error.message);
  }
};

testDelay();
