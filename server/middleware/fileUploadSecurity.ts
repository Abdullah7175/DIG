import type { Request, Response, NextFunction } from "express";
import type { Express } from "express";
import fs from "fs";
import path from "path";

/**
 * File upload security middleware following OWASP guidelines
 */

// Allowed image MIME types
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/tiff",
];

// Allowed document MIME types
const ALLOWED_DOCUMENT_TYPES = [
  "application/pdf",
  "application/msword", // .doc
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
];

// Allowed file extensions
const ALLOWED_IMAGE_EXTENSIONS = [".jpeg", ".jpg", ".png", ".tif", ".tiff"];
const ALLOWED_DOCUMENT_EXTENSIONS = [".pdf", ".doc", ".docx"];

// File size limits (in bytes)
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024; // 10MB

// File type enum
export enum FileType {
  IMAGE = "image",
  DOCUMENT = "document",
}

/**
 * Validate file MIME type
 */
function validateMimeType(file: Express.Multer.File, allowedTypes: string[]): boolean {
  return allowedTypes.includes(file.mimetype.toLowerCase());
}

/**
 * Validate file extension
 */
function validateExtension(filename: string, allowedExtensions: string[]): boolean {
  const ext = path.extname(filename).toLowerCase();
  return allowedExtensions.includes(ext);
}

/**
 * Validate file size
 */
function validateFileSize(file: Express.Multer.File, maxSize: number): boolean {
  return file.size <= maxSize;
}

/**
 * Check file magic bytes (file signature) to verify actual file type
 * This prevents spoofing by checking the actual file content
 */
function validateFileSignature(file: Express.Multer.File): Promise<boolean> {
  return new Promise((resolve) => {
    const stream = fs.createReadStream(file.path, { start: 0, end: 20 });
    const chunks: Buffer[] = [];
    
    stream.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });
    
    stream.on("end", () => {
      const buffer = Buffer.concat(chunks);
      const ext = path.extname(file.originalname).toLowerCase();
      
      // Check magic bytes based on extension
      let isValid = false;
      
      if (ext === ".jpg" || ext === ".jpeg") {
        // JPEG: FF D8 FF
        isValid = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
      } else if (ext === ".png") {
        // PNG: 89 50 4E 47 0D 0A 1A 0A
        isValid = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
      } else if (ext === ".tif" || ext === ".tiff") {
        // TIFF: 49 49 2A 00 (little-endian) or 4D 4D 00 2A (big-endian)
        isValid = 
          (buffer[0] === 0x49 && buffer[1] === 0x49 && buffer[2] === 0x2a && buffer[3] === 0x00) ||
          (buffer[0] === 0x4d && buffer[1] === 0x4d && buffer[2] === 0x00 && buffer[3] === 0x2a);
      } else if (ext === ".pdf") {
        // PDF: %PDF
        isValid = buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46;
      } else if (ext === ".doc") {
        // DOC: D0 CF 11 E0 A1 B1 1A E1 (OLE2 format)
        isValid = buffer[0] === 0xd0 && buffer[1] === 0xcf && buffer[2] === 0x11 && buffer[3] === 0xe0;
      } else if (ext === ".docx") {
        // DOCX: PK (ZIP format, since DOCX is a ZIP archive)
        isValid = buffer[0] === 0x50 && buffer[1] === 0x4b;
      } else {
        isValid = false;
      }
      
      resolve(isValid);
    });
    
    stream.on("error", () => {
      resolve(false);
    });
  });
}

/**
 * Sanitize filename to prevent directory traversal and other attacks
 */
function sanitizeFilename(filename: string): string {
  // Remove path components
  let sanitized = path.basename(filename);
  
  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, "");
  
  // Remove special characters that could be dangerous
  sanitized = sanitized.replace(/[<>:"|?*\x00-\x1f]/g, "");
  
  // Limit length
  if (sanitized.length > 255) {
    const ext = path.extname(sanitized);
    sanitized = sanitized.substring(0, 255 - ext.length) + ext;
  }
  
  return sanitized;
}

/**
 * Delete file if validation fails
 */
function deleteFile(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error("Error deleting file:", error);
  }
}

/**
 * Main file upload security middleware
 */
export function validateFileUpload(fileType: FileType = FileType.IMAGE) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const files = req.files as Express.Multer.File[] | undefined;
      
      if (!files || files.length === 0) {
        return next(); // No files to validate
      }
      
      const allowedMimeTypes = fileType === FileType.IMAGE 
        ? ALLOWED_IMAGE_TYPES 
        : ALLOWED_DOCUMENT_TYPES;
      
      const allowedExtensions = fileType === FileType.IMAGE
        ? ALLOWED_IMAGE_EXTENSIONS
        : ALLOWED_DOCUMENT_EXTENSIONS;
      
      const maxSize = fileType === FileType.IMAGE
        ? MAX_IMAGE_SIZE
        : MAX_DOCUMENT_SIZE;
      
      const validationErrors: string[] = [];
      const filesToDelete: string[] = [];
      
      for (const file of files) {
        // Validate MIME type
        if (!validateMimeType(file, allowedMimeTypes)) {
          validationErrors.push(
            `File ${file.originalname}: Invalid MIME type. Allowed types: ${allowedMimeTypes.join(", ")}`
          );
          filesToDelete.push(file.path);
          continue;
        }
        
        // Validate extension
        if (!validateExtension(file.originalname, allowedExtensions)) {
          validationErrors.push(
            `File ${file.originalname}: Invalid file extension. Allowed extensions: ${allowedExtensions.join(", ")}`
          );
          filesToDelete.push(file.path);
          continue;
        }
        
        // Validate file size
        if (!validateFileSize(file, maxSize)) {
          const maxSizeMB = maxSize / (1024 * 1024);
          validationErrors.push(
            `File ${file.originalname}: File size exceeds maximum allowed size of ${maxSizeMB}MB`
          );
          filesToDelete.push(file.path);
          continue;
        }
        
        // Validate file signature (magic bytes)
        const isValidSignature = await validateFileSignature(file);
        if (!isValidSignature) {
          validationErrors.push(
            `File ${file.originalname}: File signature does not match file extension. Possible file spoofing.`
          );
          filesToDelete.push(file.path);
          continue;
        }
        
        // Sanitize filename
        file.originalname = sanitizeFilename(file.originalname);
      }
      
      // Delete invalid files
      for (const filePath of filesToDelete) {
        deleteFile(filePath);
      }
      
      // Remove invalid files from request
      if (filesToDelete.length > 0) {
        req.files = files.filter(f => !filesToDelete.includes(f.path)) as Express.Multer.File[];
      }
      
      // Return error if any validation failed
      if (validationErrors.length > 0) {
        return res.status(400).json({
          message: "File validation failed",
          errors: validationErrors,
        });
      }
      
      next();
    } catch (error) {
      console.error("File validation error:", error);
      return res.status(500).json({ message: "File validation error" });
    }
  };
}

/**
 * Middleware to validate mixed file types (both images and documents)
 */
export async function validateMixedFileUpload(req: Request, res: Response, next: NextFunction) {
  const files = req.files as Express.Multer.File[] | undefined;
  
  if (!files || files.length === 0) {
    return next();
  }
  
  const validationErrors: string[] = [];
  const filesToDelete: string[] = [];
  
  for (const file of files) {
    const ext = path.extname(file.originalname).toLowerCase();
    let fileType: FileType;
    let maxSize: number;
    let allowedMimeTypes: string[];
    let allowedExtensions: string[];
    
    // Determine file type based on extension
    if (ALLOWED_IMAGE_EXTENSIONS.includes(ext)) {
      fileType = FileType.IMAGE;
      maxSize = MAX_IMAGE_SIZE;
      allowedMimeTypes = ALLOWED_IMAGE_TYPES;
      allowedExtensions = ALLOWED_IMAGE_EXTENSIONS;
    } else if (ALLOWED_DOCUMENT_EXTENSIONS.includes(ext)) {
      fileType = FileType.DOCUMENT;
      maxSize = MAX_DOCUMENT_SIZE;
      allowedMimeTypes = ALLOWED_DOCUMENT_TYPES;
      allowedExtensions = ALLOWED_DOCUMENT_EXTENSIONS;
    } else {
      validationErrors.push(
        `File ${file.originalname}: Invalid file type. Only images (jpeg, jpg, png, tif) and documents (pdf, doc, docx) are allowed.`
      );
      filesToDelete.push(file.path);
      continue;
    }
    
    // Validate MIME type
    if (!validateMimeType(file, allowedMimeTypes)) {
      validationErrors.push(
        `File ${file.originalname}: Invalid MIME type.`
      );
      filesToDelete.push(file.path);
      continue;
    }
    
    // Validate file size
    if (!validateFileSize(file, maxSize)) {
      const maxSizeMB = maxSize / (1024 * 1024);
      validationErrors.push(
        `File ${file.originalname}: File size exceeds maximum allowed size of ${maxSizeMB}MB`
      );
      filesToDelete.push(file.path);
      continue;
    }
    
    // Validate file signature (magic bytes) - await the promise
    const isValidSignature = await validateFileSignature(file);
    if (!isValidSignature) {
      validationErrors.push(
        `File ${file.originalname}: File signature does not match file extension. Possible file spoofing.`
      );
      filesToDelete.push(file.path);
      continue;
    }
    
    // Sanitize filename
    file.originalname = sanitizeFilename(file.originalname);
  }
  
  // Delete invalid files
  for (const filePath of filesToDelete) {
    deleteFile(filePath);
  }
  
  // Remove invalid files from request
  if (filesToDelete.length > 0) {
    req.files = files.filter(f => !filesToDelete.includes(f.path)) as Express.Multer.File[];
  }
  
  if (validationErrors.length > 0) {
    return res.status(400).json({
      message: "File validation failed",
      errors: validationErrors,
    });
  }
  
  next();
}

