# DIG - Hospital Management System

A comprehensive Hospital Management System with GPS tracking integration using Traccar.

## Features

- Vehicle Registration and Management
- Real-time GPS Tracking with Traccar integration
- QR Code Generation and Verification
- Owner, Driver, and Conductor Management
- Dashboard with Statistics
- WebSocket-based Real-time Updates
- User Authentication and Authorization

## Tech Stack

- **Frontend**: React, Vite, TailwindCSS
- **Backend**: Node.js, Express.js, TypeScript
- **Database**: PostgreSQL
- **GPS Tracking**: Traccar
- **ORM**: Drizzle ORM

## Setup

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- Java 17+ (for Traccar)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Abdullah7175/DIG.git
cd DIG
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env` file in the root directory:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/database_name
JWT_SECRET=your_jwt_secret_here
TRACCAR_API_URL=http://localhost:8082
TRACCAR_USERNAME=admin
TRACCAR_PASSWORD=admin
```

4. Start Traccar backend:
```bash
cd traccar-backend
java -jar target/tracker-server.jar debug.xml
```

5. Start the main application:
```bash
npm run dev
```

## Project Structure

```
├── client/          # React frontend application
├── server/          # Express.js backend API
├── shared/          # Shared TypeScript schemas
├── traccar-backend/ # Traccar GPS tracking server
└── scripts/         # Utility scripts
```

## Documentation

- [DEPLOYMENT.md](DEPLOYMENT.md) - Production deployment guide
- [FIXES_SUMMARY.md](FIXES_SUMMARY.md) - Summary of fixes and improvements
- [QUICK_START.md](QUICK_START.md) - Quick start guide

## License

ISC

