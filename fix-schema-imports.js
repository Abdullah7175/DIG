import fs from 'fs';
import path from 'path';

const schemaPath = path.join(process.cwd(), 'dist/shared/schema.js');

try {
  if (!fs.existsSync(schemaPath)) {
    console.log('⚠️  Schema file not found, skipping fix');
    process.exit(0);
  }

  let content = fs.readFileSync(schemaPath, 'utf8');
  
  // Check if imports are missing
  const hasCreateInsertSchema = content.includes("import { createInsertSchema } from \"drizzle-zod\"");
  const hasZod = content.includes("import { z } from \"zod\"");
  
  if (!hasCreateInsertSchema || !hasZod) {
    // Find the first import line and add the missing imports after it
    if (!hasCreateInsertSchema && !hasZod) {
      content = content.replace(
        /(import \{ pgTable[^}]+\} from "drizzle-orm\/pg-core";)/,
        `$1\nimport { createInsertSchema } from "drizzle-zod";\nimport { z } from "zod";`
      );
    } else if (!hasCreateInsertSchema) {
      content = content.replace(
        /(import \{ pgTable[^}]+\} from "drizzle-orm\/pg-core";)/,
        `$1\nimport { createInsertSchema } from "drizzle-zod";`
      );
    } else if (!hasZod) {
      content = content.replace(
        /(import \{ createInsertSchema \} from "drizzle-zod";)/,
        `$1\nimport { z } from "zod";`
      );
    }
    
    fs.writeFileSync(schemaPath, content, 'utf8');
    console.log('✅ Fixed missing imports in schema.js');
  } else {
    console.log('✅ Imports are already present');
  }
} catch (error) {
  console.error('❌ Error fixing schema file:', error.message);
  process.exit(1);
}

