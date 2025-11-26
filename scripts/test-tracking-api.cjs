// Using built-in fetch (Node.js 18+)

// Test the external tracking API
async function testTrackingAPI() {
  try {
    console.log('🔄 Testing external tracking API...');
    
    // Format dates for API (YYYY-MM-DD HH:mm:ss)
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - (60 * 60 * 1000));
    
    const formatDate = (date) => {
      return date.toISOString().slice(0, 19).replace('T', ' ');
    };

    const startStr = encodeURIComponent(formatDate(oneHourAgo));
    const endStr = encodeURIComponent(formatDate(now));

    const url = `http://tracking.esspl.com.pk:8080/api/api.php?api=user&ver=1.0&key=C717EAE19022F2E4D3684FC22192C283&cmd=OBJECT_GET_OSP,${startStr},${endStr}`;
    
    console.log('📡 API URL:', url);
    console.log('⏰ Time range:', formatDate(oneHourAgo), 'to', formatDate(now));
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'HospitalManagementSystem/1.0'
      },
      timeout: 30000
    });

    console.log('📊 Response status:', response.status, response.statusText);
    console.log('📋 Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ API Response received');
    console.log('📦 Data type:', typeof data);
    console.log('📏 Data length:', Array.isArray(data) ? data.length : 'Not an array');
    
    if (Array.isArray(data) && data.length > 0) {
      console.log('🎯 Sample record:', JSON.stringify(data[0], null, 2));
    } else if (data && typeof data === 'object') {
      console.log('🎯 Single record:', JSON.stringify(data, null, 2));
    } else {
      console.log('📄 Full response:', JSON.stringify(data, null, 2));
    }

  } catch (error) {
    console.error('❌ Error testing API:', error.message);
    if (error.code) {
      console.error('🔍 Error code:', error.code);
    }
  }
}

testTrackingAPI();
