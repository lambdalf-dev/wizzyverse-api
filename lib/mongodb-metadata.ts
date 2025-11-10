import { MongoClient, MongoClientOptions } from 'mongodb';

if (!process.env.METADATA_MONGODB_URI) {
  throw new Error('Please add your Mongo URI to .env.local');
}

const uri = process.env.METADATA_MONGODB_URI;
const options: MongoClientOptions = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  const globalWithMongo = global as typeof globalThis & {
    _mongoMetadataClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoMetadataClientPromise) {
    client = new MongoClient(uri, options);
    globalWithMongo._mongoMetadataClientPromise = client.connect();
  }
  clientPromise = globalWithMongo._mongoMetadataClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

// Export a module-scoped MongoClient promise. By doing this in a
// separate module, the client can be shared across functions.
export default clientPromise;

