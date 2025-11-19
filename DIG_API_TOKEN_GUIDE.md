# DIG API Token Setup Guide

## Quick Start: Creating and Using the Token

### Step 1: Generate Token (On Your Server)

SSH into your server and run:

```bash
# Generate a secure 64-character token
openssl rand -hex 32
```

**Example output:**
```
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
```

**Copy this token** - you'll need it for the next steps.

### Step 2: Add Token to Environment Variables

```bash
# Navigate to your project directory
cd /opt/DIG

# Edit .env file
nano .env

# Add this line (replace with your generated token):
DIG_API_TOKEN=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2

# Save and exit (Ctrl+X, then Y, then Enter)
```

**Or set it directly:**
```bash
export DIG_API_TOKEN=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
```

### Step 3: Restart Application

```bash
cd /opt/DIG
npm run build
pm2 restart front
pm2 logs front --lines 20  # Check for any errors
```

### Step 4: Test the Token

```bash
# Replace YOUR_TOKEN with the actual token you generated
curl "http://202.61.47.28:5000/api/dig/vehicles?token=YOUR_TOKEN"
```

**Expected:** JSON array with vehicle data  
**If you get 401/403:** Check that token is set correctly in `.env`

### Step 5: Share with DIG

Provide DIG with the **complete URL**:

```
http://202.61.47.28:5000/api/dig/vehicles?token=YOUR_GENERATED_TOKEN
```

**Or provide separately:**
- **Endpoint:** `http://202.61.47.28:5000/api/dig/vehicles`
- **Token:** `YOUR_GENERATED_TOKEN`
- **Usage:** Add `?token=YOUR_GENERATED_TOKEN` to the URL

---

## Complete Example

### 1. Generate Token
```bash
$ openssl rand -hex 32
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
```

### 2. Add to .env
```bash
$ nano /opt/DIG/.env
# Add: DIG_API_TOKEN=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
```

### 3. Restart
```bash
$ cd /opt/DIG
$ npm run build
$ pm2 restart front
```

### 4. Test
```bash
$ curl "http://202.61.47.28:5000/api/dig/vehicles?token=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2"
```

### 5. Share with DIG
```
Complete URL: http://202.61.47.28:5000/api/dig/vehicles?token=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
```

---

## Security Notes

✅ **DO:**
- Generate a strong random token (64+ characters)
- Keep token secret
- Use HTTPS in production (if available)
- Monitor API access logs

❌ **DON'T:**
- Share token publicly
- Commit token to Git
- Use simple/weak tokens
- Change token frequently (unless compromised)

---

## How DIG Will Use It

DIG can use the token in their code like this:

### Simple HTTP Request
```
GET http://202.61.47.28:5000/api/dig/vehicles?token=YOUR_TOKEN
```

### In Code (Any Language)
```javascript
// JavaScript
const url = 'http://202.61.47.28:5000/api/dig/vehicles?token=YOUR_TOKEN';
fetch(url).then(r => r.json()).then(console.log);

// Python
import requests
data = requests.get('http://202.61.47.28:5000/api/dig/vehicles?token=YOUR_TOKEN').json()

// PHP
$data = json_decode(file_get_contents('http://202.61.47.28:5000/api/dig/vehicles?token=YOUR_TOKEN'), true);
```

---

## Troubleshooting

### Token Not Working?
1. Check `.env` file has `DIG_API_TOKEN=...`
2. Verify token has no extra spaces
3. Restart application: `pm2 restart front`
4. Check logs: `pm2 logs front`

### Getting 401 Unauthorized?
- Token not set in environment variables
- Token has extra spaces or newlines
- Application not restarted after setting token

### Getting 403 Forbidden?
- Token is incorrect
- Token doesn't match `DIG_API_TOKEN` in `.env`

### Getting 500 Error?
- Check application logs: `pm2 logs front`
- Verify database connection
- Check Redis connection (if enabled)

---

## Token Management

### View Current Token (if needed)
```bash
grep DIG_API_TOKEN /opt/DIG/.env
```

### Change Token
1. Generate new token: `openssl rand -hex 32`
2. Update `.env` file
3. Restart: `pm2 restart front`
4. Share new token with DIG

### Verify Token is Set
```bash
# Check if environment variable is loaded
pm2 env front | grep DIG_API_TOKEN
```

