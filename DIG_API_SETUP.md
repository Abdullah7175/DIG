# DIG API Setup Guide

## Quick Setup

### 1. Generate API Token

Generate a secure random token:

```bash
# On Linux/Mac
openssl rand -hex 32

# Or using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Example output: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6`

### 2. Add Token to Environment Variables

Add to your `.env` file:

```bash
DIG_API_TOKEN=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
```

Or set it directly:

```bash
export DIG_API_TOKEN=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
```

### 3. Restart Application

```bash
cd /opt/DIG
pm2 restart front
pm2 logs front --lines 50  # Check for any errors
```

## Testing the API

### Test with cURL (Query Parameter Method)

```bash
# Replace YOUR_TOKEN with the actual token you generated
curl "http://202.61.47.28:5000/api/dig/vehicles?token=YOUR_TOKEN"

# Pretty print JSON (if jq is installed)
curl "http://202.61.47.28:5000/api/dig/vehicles?token=YOUR_TOKEN" | jq

# Save to file
curl "http://202.61.47.28:5000/api/dig/vehicles?token=YOUR_TOKEN" -o vehicles.json
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

## API Endpoint Details

- **URL:** `http://202.61.47.28:5000/api/dig/vehicles`
- **Method:** `GET`
- **Authentication:** Required (see methods below)

## Authentication Method (Query Parameter - Recommended)

**Simple URL format:**
```
http://202.61.47.28:5000/api/dig/vehicles?token=YOUR_API_TOKEN
```

**How it works:**
- Add `?token=` followed by your token to the URL
- No headers needed
- Works with any HTTP client
- Easy to use in any programming language

## Response Fields

- `Vehicle_no` - Vehicle registration number
- `make_company` - Vehicle manufacturer
- `model_number` - Vehicle model
- `vehicle_type_name` - Vehicle type/category name
- `owner_name` - Owner's name
- `owner_address` - Owner's address
- `owner_contact` - Owner's contact number

## Sharing Token with DIG

Once you've tested the API successfully, share this information with DIG:

**Complete URL (Easiest):**
```
http://202.61.47.28:5000/api/dig/vehicles?token=YOUR_GENERATED_TOKEN
```

**Or provide separately:**
- **Base URL:** `http://202.61.47.28:5000/api/dig/vehicles`
- **Token:** `YOUR_GENERATED_TOKEN`
- **Usage:** Append `?token=YOUR_GENERATED_TOKEN` to the URL

**Example for DIG:**
```
They can use this URL directly:
http://202.61.47.28:5000/api/dig/vehicles?token=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
```

## Notes

- Only **active vehicles** are returned
- Data is **cached for 10 minutes** for performance
- Cache is automatically invalidated when vehicles are updated
- Response includes `X-Cache` header (HIT/MISS)
- Token is **permanent** - share once, use forever

## Security

- Keep the token secret and secure
- Use HTTPS in production
- Rotate tokens periodically
- Monitor API access logs

## Troubleshooting

### 401 Unauthorized
- Check if `DIG_API_TOKEN` is set in environment variables
- Verify token is correct
- Check token format (no extra spaces)

### 403 Forbidden
- Token is invalid
- Generate a new token and update environment variable

### 500 Internal Server Error
- Check application logs: `pm2 logs front`
- Verify database connection
- Check Redis connection (if enabled)

