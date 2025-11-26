// Script to update all management endpoints to allow Manager access
// Managers can: view, create, edit, update status
// Only Admins can: delete, view activity logs

const fs = require('fs');
const path = require('path');

const routesFile = path.join(__dirname, '../server/routes.ts');
let content = fs.readFileSync(routesFile, 'utf8');

// Endpoints that should allow Manager access (GET, POST, PUT, PATCH)
const managerEndpoints = [
  'vehicle-types',
  'fuel-types', 
  'terminals',
  'routes',
  'tracker-companies',
  'tracker-payments',
  'owners',
  'drivers',
  'conductors'
];

// Update GET, POST, PUT, PATCH endpoints to use requireManager
managerEndpoints.forEach(endpoint => {
  // GET by ID
  content = content.replace(
    new RegExp(`app\\.get\\("/api/${endpoint}/:id", requireAuth, requireAdmin,`, 'g'),
    `app.get("/api/${endpoint}/:id", requireAuth, requireManager,`
  );
  
  // POST (create)
  content = content.replace(
    new RegExp(`app\\.post\\("/api/${endpoint}", requireAuth, requireAdmin,`, 'g'),
    `app.post("/api/${endpoint}", requireAuth, requireManager,`
  );
  
  // PUT (update)
  content = content.replace(
    new RegExp(`app\\.put\\("/api/${endpoint}/:id", requireAuth, requireAdmin,`, 'g'),
    `app.put("/api/${endpoint}/:id", requireAuth, requireManager,`
  );
  
  // PATCH (status update)
  content = content.replace(
    new RegExp(`app\\.patch\\("/api/${endpoint}/:id/status", requireAuth, requireAdmin,`, 'g'),
    `app.patch("/api/${endpoint}/:id/status", requireAuth, requireManager,`
  );
  
  // DELETE endpoints should remain Admin only (requireAdminOnly)
  content = content.replace(
    new RegExp(`app\\.delete\\("/api/${endpoint}/:id", requireAuth, requireAdmin,`, 'g'),
    `app.delete("/api/${endpoint}/:id", requireAuth, requireAdminOnly,`
  );
});

// Special cases - main GET endpoints for lists
content = content.replace(
  /app\.get\("\/api\/routes", requireAuth, requireAdmin,/g,
  'app.get("/api/routes", requireAuth, requireManager,'
);

// Activity logs should remain Admin only
content = content.replace(
  /app\.get\("\/api\/activity-logs", requireAuth, requireAdmin,/g,
  'app.get("/api/activity-logs", requireAuth, requireAdminOnly,'
);

// User management should remain Admin only
content = content.replace(
  /app\.get\("\/api\/users", requireAuth, requireAdmin,/g,
  'app.get("/api/users", requireAuth, requireAdminOnly,'
);

content = content.replace(
  /app\.post\("\/api\/users", requireAuth, requireAdmin,/g,
  'app.post("/api/users", requireAuth, requireAdminOnly,'
);

content = content.replace(
  /app\.put\("\/api\/users\/:id", requireAuth, requireAdmin,/g,
  'app.put("/api/users/:id", requireAuth, requireAdminOnly,'
);

content = content.replace(
  /app\.delete\("\/api\/users\/:id", requireAuth, requireAdmin,/g,
  'app.delete("/api/users/:id", requireAuth, requireAdminOnly,'
);

fs.writeFileSync(routesFile, content);
console.log('✅ Updated manager permissions in routes.ts');
console.log('📋 Managers can now: view, create, edit, update status');
console.log('🔒 Admin only: delete operations, user management, activity logs');
