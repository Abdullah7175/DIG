# DIG API Documentation

## Overview
Secure API endpoint for DIG to fetch vehicle data in JSON format.

## Endpoint

**URL:** `/api/dig/vehicles`  
**Method:** `GET`  
**Authentication:** Required (API Token)

## Authentication

The API requires a valid token for authentication. **We recommend using the query parameter method** for simplicity.

### Option 1: Query Parameter (Recommended)
```http
GET /api/dig/vehicles?token=YOUR_API_TOKEN HTTP/1.1
Host: your-domain.com
```

**Example URL:**
```
http://202.61.47.28:5000/api/dig/vehicles?token=YOUR_API_TOKEN
```

### Option 2: Authorization Header
```http
GET /api/dig/vehicles HTTP/1.1
Host: your-domain.com
Authorization: Bearer YOUR_API_TOKEN
```

### Option 3: X-API-Key Header
```http
GET /api/dig/vehicles HTTP/1.1
Host: your-domain.com
X-API-Key: YOUR_API_TOKEN
```

## Response Format

### Success Response (200 OK)

```json
[
  {
    "Vehicle_no": "ABC-123",
    "make_company": "Toyota",
    "model_number": "Corolla 2020",
    "vehicle_type_name": "Sedan",
    "owner_name": "John Doe",
    "owner_address": "123 Main Street, City",
    "owner_contact": "+92-300-1234567"
  },
  {
    "Vehicle_no": "XYZ-456",
    "make_company": "Honda",
    "model_number": "Civic 2021",
    "vehicle_type_name": "Sedan",
    "owner_name": "Jane Smith",
    "owner_address": "456 Park Avenue, City",
    "owner_contact": "+92-300-9876543"
  }
]
```

### Error Responses

#### 401 Unauthorized (No Token)
```json
{
  "error": "Unauthorized",
  "message": "API token required. Provide token via Authorization header (Bearer token), X-API-Key header, or token query parameter."
}
```

#### 403 Forbidden (Invalid Token)
```json
{
  "error": "Forbidden",
  "message": "Invalid API token"
}
```

#### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "message": "Failed to fetch vehicle data"
}
```

## Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `Vehicle_no` | string | Vehicle registration number |
| `make_company` | string | Vehicle manufacturer/company |
| `model_number` | string | Vehicle model number |
| `vehicle_type_name` | string | Vehicle type/category name (e.g., "Sedan", "Bus", "Truck") |
| `owner_name` | string | Vehicle owner's name |
| `owner_address` | string | Vehicle owner's address |
| `owner_contact` | string | Vehicle owner's contact number |

## Data Filtering

- **Only active vehicles** are returned (vehicles with `status = 'active'`)
- Data is **cached for 10 minutes** for performance
- Response includes `X-Cache` header indicating cache status:
  - `X-Cache: HIT` - Data served from cache
  - `X-Cache: MISS` - Data fetched from database

## Example Usage

### cURL
```bash
# Using Authorization header
curl -H "Authorization: Bearer YOUR_API_TOKEN" \
     https://your-domain.com/api/dig/vehicles

# Using X-API-Key header
curl -H "X-API-Key: YOUR_API_TOKEN" \
     https://your-domain.com/api/dig/vehicles

# Using query parameter
curl "https://your-domain.com/api/dig/vehicles?token=YOUR_API_TOKEN"
```

### JavaScript (Fetch API)
```javascript
// Using Query Parameter (Recommended)
const token = 'YOUR_API_TOKEN';
const url = `http://202.61.47.28:5000/api/dig/vehicles?token=${token}`;

fetch(url)
  .then(response => response.json())
  .then(data => {
    console.log('Vehicle data:', data);
    // Process the data
  })
  .catch(error => console.error('Error:', error));

// Using async/await
async function fetchVehicles() {
  try {
    const token = 'YOUR_API_TOKEN';
    const response = await fetch(`http://202.61.47.28:5000/api/dig/vehicles?token=${token}`);
    const vehicles = await response.json();
    console.log(vehicles);
    return vehicles;
  } catch (error) {
    console.error('Error fetching vehicles:', error);
  }
}
```

### Python (Requests)
```python
import requests

# Using Query Parameter (Recommended)
token = 'YOUR_API_TOKEN'
url = f'http://202.61.47.28:5000/api/dig/vehicles?token={token}'

response = requests.get(url)
if response.status_code == 200:
    vehicles = response.json()
    print(f"Found {len(vehicles)} vehicles")
    for vehicle in vehicles:
        print(f"Vehicle: {vehicle['Vehicle_no']} - Owner: {vehicle['owner_name']}")
else:
    print(f"Error: {response.status_code} - {response.text}")
```

### PHP
```php
<?php
// Using Query Parameter (Recommended)
$token = 'YOUR_API_TOKEN';
$url = "http://202.61.47.28:5000/api/dig/vehicles?token={$token}";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
curl_close($ch);

$vehicles = json_decode($response, true);
if ($vehicles) {
    echo "Found " . count($vehicles) . " vehicles\n";
    foreach ($vehicles as $vehicle) {
        echo "Vehicle: {$vehicle['Vehicle_no']} - Owner: {$vehicle['owner_name']}\n";
    }
} else {
    echo "Error fetching vehicles\n";
}
?>
```

## Setup Instructions

### Step 1: Generate a Secure API Token

Generate a strong, random token that will be used permanently. Use one of these methods:

#### Method A: Using OpenSSL (Linux/Mac - Recommended)
```bash
openssl rand -hex 32
```

**Example output:**
```
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
```

#### Method B: Using Node.js
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### Method C: Using Python
```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

#### Method D: Using Online Generator (if available)
Visit: https://www.random.org/strings/ (generate 64-character hexadecimal string)

**Important:** 
- Token should be **at least 64 characters** long
- Keep it **secret and secure**
- This token will be **permanent** - share it with DIG once
- **Never commit** the token to version control

### Step 2: Configure Environment Variable

Add the token to your `.env` file on the server:

```bash
# Edit .env file
nano /opt/DIG/.env

# Add this line (replace with your generated token):
DIG_API_TOKEN=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
```

**Or set it directly as environment variable:**
```bash
export DIG_API_TOKEN=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
```

### Step 3: Restart Application

After setting the environment variable, restart your application:

```bash
cd /opt/DIG
pm2 restart front
pm2 logs front --lines 50  # Check for "Redis connected successfully" and any errors
```

### Step 4: Test the API

Test the API with your token:

```bash
# Replace YOUR_TOKEN with the actual token you generated
curl "http://202.61.47.28:5000/api/dig/vehicles?token=YOUR_TOKEN"
```

**Expected Response:**
```json
[
  {
    "Vehicle_no": "ABC-123",
    "make_company": "Toyota",
    "model_number": "Corolla 2020",
    "vehicle_type_name": "Sedan",
    "owner_name": "John Doe",
    "owner_address": "123 Main Street",
    "owner_contact": "+92-300-1234567"
  }
]
```

### Step 5: Share Token with DIG

Once tested successfully, share the following information with DIG:

**API Endpoint URL:**
```
http://202.61.47.28:5000/api/dig/vehicles?token=YOUR_GENERATED_TOKEN
```

**Or provide separately:**
- **Base URL:** `http://202.61.47.28:5000/api/dig/vehicles`
- **Token:** `YOUR_GENERATED_TOKEN`
- **Usage:** Append `?token=YOUR_GENERATED_TOKEN` to the URL

## Security Best Practices

1. **Keep token secret** - Never commit tokens to version control
2. **Use HTTPS** - Always use HTTPS in production
3. **Rotate tokens** - Change tokens periodically
4. **Monitor usage** - Check logs for unauthorized access attempts
5. **Rate limiting** - Consider implementing rate limiting for production

## Rate Limiting

Currently, there's no rate limiting implemented. For production use, consider:
- Implementing rate limiting (e.g., 100 requests per minute per token)
- Monitoring API usage
- Setting up alerts for unusual activity

## Caching

- Data is cached for **10 minutes** to improve performance
- Cache is automatically invalidated when vehicle data changes
- Check `X-Cache` header to see if data came from cache

## Support

For issues or questions, contact the development team.

