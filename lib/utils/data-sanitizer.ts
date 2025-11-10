/**
 * Utility functions for sanitizing data before sending to API responses
 */

/**
 * Sanitize MongoDB document by removing internal fields like ObjectIDs
 * @param document - The MongoDB document to sanitize
 * @returns Sanitized document without internal fields
 */
export function sanitizeMongoDocument(document: any): any {
  if (!document || typeof document !== 'object') {
    return document;
  }
  
  const { _id, ...sanitizedDocument } = document;
  return sanitizedDocument;
}

/**
 * Sanitize an array of MongoDB documents
 * @param documents - Array of MongoDB documents to sanitize
 * @returns Array of sanitized documents
 */
export function sanitizeMongoDocuments(documents: any[]): any[] {
  if (!Array.isArray(documents)) {
    return documents;
  }
  
  return documents.map(doc => sanitizeMongoDocument(doc));
} 