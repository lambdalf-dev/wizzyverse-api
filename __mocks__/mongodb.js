// __mocks__/mongodb.js
// Mock MongoDB client and related functionality for Jest tests

const mockCollection = {
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
  insertOne: jest.fn(),
  insertMany: jest.fn(),
  deleteOne: jest.fn(),
  deleteMany: jest.fn(),
  find: jest.fn().mockReturnValue({
    toArray: jest.fn().mockResolvedValue([])
  }),
  countDocuments: jest.fn().mockResolvedValue(0),
  aggregate: jest.fn().mockReturnValue({
    toArray: jest.fn().mockResolvedValue([])
  })
};

const mockDb = {
  collection: jest.fn().mockReturnValue(mockCollection)
};

const mockClient = {
  db: jest.fn().mockReturnValue(mockDb),
  connect: jest.fn().mockResolvedValue(undefined),
  close: jest.fn().mockResolvedValue(undefined)
};

const MongoClient = jest.fn().mockImplementation(() => mockClient);

// Mock ObjectId
const ObjectId = jest.fn().mockImplementation((id) => ({
  toString: () => id || 'mock-object-id',
  toHexString: () => id || 'mock-object-id'
}));

// Mock BSON types
const Binary = jest.fn();
const Code = jest.fn();
const DBRef = jest.fn();
const Decimal128 = jest.fn();
const Double = jest.fn();
const Int32 = jest.fn();
const Long = jest.fn();
const MaxKey = jest.fn();
const MinKey = jest.fn();
const Timestamp = jest.fn();
const UUID = jest.fn();

module.exports = {
  MongoClient,
  ObjectId,
  Binary,
  Code,
  DBRef,
  Decimal128,
  Double,
  Int32,
  Long,
  MaxKey,
  MinKey,
  Timestamp,
  UUID,
  // Export mock objects for test access
  __mockClient: mockClient,
  __mockDb: mockDb,
  __mockCollection: mockCollection
};
