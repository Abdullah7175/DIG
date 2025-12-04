#!/usr/bin/env node

/**
 * Test script for external tracking API connectivity
 * Usage: node scripts/test-external-api.cjs
 */

const API_CONFIG = {
  baseUrl: 'http://tracking.esspl.com.pk:8080/api/api.php',
  api: 'user',
  version: '1.0',
  apiKey: 'C717EAE19022F2E4D3684FC22192C283'
};

async function testApiConnectivity() {
  console.log('🔍 Testing external API connectivity...\n');
  
  // Test different time ranges
  const tests = [
    {
      name: 'Last Hour',
      start: new Date(Date.now() - 60 * 60 * 1000),
      end: new Date()
    },
    {
      name: 'Last 6 Hours', 
      start: new Date(Date.now() - 6 * 60 * 60 * 1000),
      end: new Date()
    },
    {
      name: 'Yesterday',
      start: new Date(Date.now() - 24 * 60 * 60 * 1000),
      end: new Date(Date.now() - 23 * 60 * 60 * 1000)
    }
  ];

  for (const test of tests) {
    console.log(`📡 Testing: ${test.name}`);
    console.log(`   Period: ${test.start.toISOString()} to ${test.end.toISOString()}`);
    
    try {
      const startTime = Date.now();
      const result = await fetchTrackingData(test.start, test.end);
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      console.log(`   ✅ Success: ${result.length} records found in ${responseTime}ms`);
      
      if (result.length > 0) {
        const sample = result[0];
        console.log(`   📄 Sample record:`, {
          event_desc: sample.event_desc,
          name: sample.name,
          dt_tracker: sample.dt_tracker,
          speed: sample.speed
        });
      }
      
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`);
      if (error.code) {
        console.log(`   🔧 Error Code: ${error.code}`);
      }
    }
    
    console.log(''); // Empty line
  }
}

async function fetchTrackingData(startDate, endDate) {
  const formatDate = (date) => {
    return date.toISOString().slice(0, 19).replace('T', ' ');
  };

  const startStr = encodeURIComponent(formatDate(startDate));
  const endStr = encodeURIComponent(formatDate(endDate));

  const url = `${API_CONFIG.baseUrl}?api=${API_CONFIG.api}&ver=${API_CONFIG.version}&key=${API_CONFIG.apiKey}&cmd=OBJECT_GET_OSP,${startStr},${endStr}`;
  
  console.log(`   🌐 URL: ${url}`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'HospitalManagementSystem-Test/1.0',
        'Connection': 'keep-alive'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Handle different response formats
    if (Array.isArray(data)) {
      return data;
    } else if (data && Array.isArray(data.data)) {
      return data.data;
    } else if (data && typeof data === 'object') {
      return [data];
    }
    
    return [];
    
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// Network diagnostics
async function runNetworkDiagnostics() {
  console.log('🔧 Running network diagnostics...\n');
  
  const { spawn } = require('child_process');
  
  // Test DNS resolution
  console.log('🌐 Testing DNS resolution...');
  try {
    const dns = require('dns').promises;
    const addresses = await dns.lookup('tracking.esspl.com.pk');
    console.log(`   ✅ DNS resolved: ${addresses.address}`);
  } catch (error) {
    console.log(`   ❌ DNS resolution failed: ${error.message}`);
  }
  
  // Test ping (if available)
  console.log('\n🏓 Testing ping...');
  const ping = spawn('ping', ['-c', '3', 'tracking.esspl.com.pk'], { stdio: 'pipe' });
  
  let pingOutput = '';
  ping.stdout.on('data', (data) => {
    pingOutput += data.toString();
  });
  
  ping.on('close', (code) => {
    if (code === 0) {
      console.log('   ✅ Ping successful');
      const lines = pingOutput.split('\n');
      const statsLine = lines.find(line => line.includes('min/avg/max'));
      if (statsLine) {
        console.log(`   📊 ${statsLine.trim()}`);
      }
    } else {
      console.log('   ❌ Ping failed or command not available');
    }
  });
  
  // Wait for ping to complete
  await new Promise(resolve => {
    ping.on('close', resolve);
    setTimeout(resolve, 5000); // Timeout after 5 seconds
  });
}

// Main execution
async function main() {
  console.log('🚀 External API Connectivity Test\n');
  console.log('='.repeat(50));
  
  await runNetworkDiagnostics();
  console.log('\n' + '='.repeat(50));
  await testApiConnectivity();
  
  console.log('✨ Test completed!');
}

main().catch(console.error);



