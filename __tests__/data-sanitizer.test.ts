import { sanitizeMongoDocument, sanitizeMongoDocuments } from '@/lib/utils/data-sanitizer';

describe('data-sanitizer', () => {
  describe('sanitizeMongoDocument', () => {
    it('should remove _id field from document', () => {
      const document = {
        _id: '507f1f77bcf86cd799439011',
        name: 'Test Document',
        value: 123,
        nested: { data: 'test' }
      };

      const result = sanitizeMongoDocument(document);

      expect(result).toEqual({
        name: 'Test Document',
        value: 123,
        nested: { data: 'test' }
      });
      expect(result).not.toHaveProperty('_id');
    });

    it('should handle document with multiple _id fields', () => {
      const document = {
        _id: '507f1f77bcf86cd799439011',
        name: 'Test Document',
        _id_backup: 'backup_id',
        value: 123
      };

      const result = sanitizeMongoDocument(document);

      expect(result).toEqual({
        name: 'Test Document',
        _id_backup: 'backup_id', // Only removes exact _id field
        value: 123
      });
      expect(result).not.toHaveProperty('_id');
    });

    it('should handle document with nested _id fields', () => {
      const document = {
        _id: '507f1f77bcf86cd799439011',
        name: 'Test Document',
        nested: {
          _id: 'nested_id',
          data: 'test'
        }
      };

      const result = sanitizeMongoDocument(document);

      expect(result).toEqual({
        name: 'Test Document',
        nested: {
          _id: 'nested_id', // Only removes top-level _id
          data: 'test'
        }
      });
      expect(result).not.toHaveProperty('_id');
    });

    it('should handle document without _id field', () => {
      const document = {
        name: 'Test Document',
        value: 123,
        nested: { data: 'test' }
      };

      const result = sanitizeMongoDocument(document);

      expect(result).toEqual({
        name: 'Test Document',
        value: 123,
        nested: { data: 'test' }
      });
    });

    it('should handle empty object', () => {
      const document = {};

      const result = sanitizeMongoDocument(document);

      expect(result).toEqual({});
    });

    it('should handle null input', () => {
      const result = sanitizeMongoDocument(null);

      expect(result).toBeNull();
    });

    it('should handle undefined input', () => {
      const result = sanitizeMongoDocument(undefined);

      expect(result).toBeUndefined();
    });

    it('should handle non-object input (string)', () => {
      const result = sanitizeMongoDocument('not an object');

      expect(result).toBe('not an object');
    });

    it('should handle non-object input (number)', () => {
      const result = sanitizeMongoDocument(123);

      expect(result).toBe(123);
    });

    it('should handle non-object input (boolean)', () => {
      const result = sanitizeMongoDocument(true);

      expect(result).toBe(true);
    });

    it('should handle non-object input (array)', () => {
      const result = sanitizeMongoDocument([1, 2, 3]);

      // Arrays are treated as objects and destructured, converting to object with numeric keys
      expect(result).toEqual({ "0": 1, "1": 2, "2": 3 });
    });

    it('should handle document with only _id field', () => {
      const document = { _id: '507f1f77bcf86cd799439011' };

      const result = sanitizeMongoDocument(document);

      expect(result).toEqual({});
    });

    it('should handle document with _id as null', () => {
      const document = {
        _id: null,
        name: 'Test Document',
        value: 123
      };

      const result = sanitizeMongoDocument(document);

      expect(result).toEqual({
        name: 'Test Document',
        value: 123
      });
      expect(result).not.toHaveProperty('_id');
    });

    it('should handle document with _id as undefined', () => {
      const document = {
        _id: undefined,
        name: 'Test Document',
        value: 123
      };

      const result = sanitizeMongoDocument(document);

      expect(result).toEqual({
        name: 'Test Document',
        value: 123
      });
      expect(result).not.toHaveProperty('_id');
    });
  });

  describe('sanitizeMongoDocuments', () => {
    it('should sanitize array of documents', () => {
      const documents = [
        { _id: 'id1', name: 'Document 1', value: 1 },
        { _id: 'id2', name: 'Document 2', value: 2 },
        { _id: 'id3', name: 'Document 3', value: 3 }
      ];

      const result = sanitizeMongoDocuments(documents);

      expect(result).toEqual([
        { name: 'Document 1', value: 1 },
        { name: 'Document 2', value: 2 },
        { name: 'Document 3', value: 3 }
      ]);
      expect(result[0]).not.toHaveProperty('_id');
      expect(result[1]).not.toHaveProperty('_id');
      expect(result[2]).not.toHaveProperty('_id');
    });

    it('should handle empty array', () => {
      const documents: any[] = [];

      const result = sanitizeMongoDocuments(documents);

      expect(result).toEqual([]);
    });

    it('should handle array with mixed document types', () => {
      const documents = [
        { _id: 'id1', name: 'Document 1' },
        { name: 'Document 2' }, // No _id
        { _id: 'id3', value: 3 }
      ];

      const result = sanitizeMongoDocuments(documents);

      expect(result).toEqual([
        { name: 'Document 1' },
        { name: 'Document 2' },
        { value: 3 }
      ]);
    });

    it('should handle array with null/undefined documents', () => {
      const documents = [
        { _id: 'id1', name: 'Document 1' },
        null,
        { _id: 'id3', value: 3 },
        undefined
      ];

      const result = sanitizeMongoDocuments(documents);

      expect(result).toEqual([
        { name: 'Document 1' },
        null,
        { value: 3 },
        undefined
      ]);
    });

    it('should handle non-array input (string)', () => {
      const result = sanitizeMongoDocuments('not an array' as any);

      expect(result).toBe('not an array');
    });

    it('should handle non-array input (object)', () => {
      const result = sanitizeMongoDocuments({} as any);

      expect(result).toEqual({});
    });

    it('should handle non-array input (number)', () => {
      const result = sanitizeMongoDocuments(123 as any);

      expect(result).toBe(123);
    });

    it('should handle non-array input (null)', () => {
      const result = sanitizeMongoDocuments(null as any);

      expect(result).toBeNull();
    });

    it('should handle non-array input (undefined)', () => {
      const result = sanitizeMongoDocuments(undefined as any);

      expect(result).toBeUndefined();
    });

    it('should handle array with non-object elements', () => {
      const documents = [
        { _id: 'id1', name: 'Document 1' },
        'string element',
        123,
        true,
        { _id: 'id2', value: 2 }
      ];

      const result = sanitizeMongoDocuments(documents);

      expect(result).toEqual([
        { name: 'Document 1' },
        'string element',
        123,
        true,
        { value: 2 }
      ]);
    });

    it('should handle array with nested arrays', () => {
      const documents = [
        { _id: 'id1', name: 'Document 1', items: [1, 2, 3] },
        { _id: 'id2', name: 'Document 2', nested: { _id: 'nested_id', data: 'test' } }
      ];

      const result = sanitizeMongoDocuments(documents);

      expect(result).toEqual([
        { name: 'Document 1', items: [1, 2, 3] },
        { name: 'Document 2', nested: { _id: 'nested_id', data: 'test' } }
      ]);
      expect(result[0]).not.toHaveProperty('_id');
      expect(result[1]).not.toHaveProperty('_id');
    });
  });
});
