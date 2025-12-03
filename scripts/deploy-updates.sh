#!/bin/bash

# Deployment script for tracking service updates
# Usage: ./scripts/deploy-updates.sh

echo "🚀 Deploying tracking service updates..."

# Build the application
echo "📦 Building application..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed! Aborting deployment."
    exit 1
fi

echo "✅ Build completed successfully!"

# Copy built files to production directory (adjust path as needed)
# Uncomment and modify these lines based on your server setup:

# echo "📁 Copying files to production..."
# cp -r dist/* /opt/DIG/
# cp package.json /opt/DIG/
# cp package-lock.json /opt/DIG/

# Restart PM2 process
echo "🔄 Restarting PM2 process..."
# pm2 restart dig

echo "🎉 Deployment completed!"

# Test the API connectivity
echo "🧪 Testing API connectivity..."
node scripts/test-external-api.cjs

echo "✨ All done!"


