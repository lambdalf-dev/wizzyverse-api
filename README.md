# Wizzyverse API

A backend API for the Wizzyverse NFT collection, providing whitelist proof management and token metadata delivery. Built with Next.js, TypeScript, and MongoDB.

## 🌟 Features

- **Whitelist Management**
  - GET endpoint to retrieve the proof associated with a specific wallet address
  - Cryptographic proof storage and retrieval
  - Wallet address validation

- **Metadata Delivery**
  - GET endpoint to retrieve token metadata (only for existing and minted tokens)
  - Script to trigger the shuffle and reveal of tokens from the Wizzyverse collection (password-protected, one-time-only operation)
  - Token existence and mint status validation

- **Email Subscriptions**
  - POST endpoint to subscribe an email to sale notifications
  - DELETE endpoint to unsubscribe an email from notifications
  - Support for private and public sale notification types
  - Email validation and normalization

- **Database Integration**
  - MongoDB for data storage
  - Separate databases for proofs, token metadata, and email subscriptions
  - Fast and reliable queries
  - Scalable and flexible architecture

- **API Features**
  - RESTful API design
  - JSON request/response format
  - Ethereum address validation
  - Detailed error responses
  - Health check endpoint
  - CORS support
  - Comprehensive error handling with proper HTTP status codes
  - Clean, focused API responses (no internal database fields)
  - Consistent response formats across all endpoints

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- Yarn package manager
- MongoDB database (local or cloud)

### Installation

1. Clone the repository:
   ```bash
   git clone [repository-url]
   cd wizzyverse-api
   ```

2. Install dependencies:
   ```bash
   yarn install
   ```

3. Set up MongoDB:
   - **Local MongoDB**: Install and start MongoDB locally
   - **MongoDB Atlas**: Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/atlas)
   - Get your MongoDB connection strings

4. Configure environment variables:
   ```bash
   cp env.example .env.local
   ```
   
   Update `.env.local` with your configuration:
   ```bash
   # API Configuration
   NEXT_PUBLIC_API_URL=http://localhost:3000

   # CORS Configuration
   ALLOWED_DOMAIN=wizzyverse.com
   ALLOWED_SUBDOMAINS=mint

   # MongoDB Configuration
   PROOFS_MONGODB_URI=mongodb://localhost:27017/wizzyverse-proofs
   METADATA_MONGODB_URI=mongodb://localhost:27017/wizzyverse-metadata
   SUBSCRIPTIONS_MONGODB_URI=mongodb://localhost:27017/wizzyverse-subscriptions

   # Blockchain Configuration
   CHAIN_ID=137
   CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000
   RPC_URL=https://polygon-rpc.com

   # Shuffle Configuration
   SHUFFLE_PASSWORD=your_secure_password_here

   # Environment
   NODE_ENV=development
   ```

5. Start the development server:
   ```bash
   yarn dev
   ```

6. The API will be available at [http://localhost:3000](http://localhost:3000)

### Docker Setup

1. Build and run with Docker Compose:
   ```bash
   docker-compose up --build
   ```

2. The API will be available at [http://localhost:3000](http://localhost:3000)

## 📡 API Endpoints

### Whitelist Management

#### Get Proof for Wallet

**GET** `/whitelist/[walletAddress]`

Retrieve the cryptographic proof associated with a specific wallet address.

**Parameters:**
- `walletAddress` (path parameter): Ethereum wallet address (0x format)

**Response (Success):**
```json
{
  "walletAddress": "0x1234567890123456789012345678901234567890",
  "alloted": 1,
  "proof": {
    "r": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    "s": "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
    "v": 27
  },
}
```

**Response (Not Found):**
```json
{
  "success": false,
  "error": "Proof not found for this wallet address",
  "walletAddress": "0x1234567890123456789012345678901234567890",
}
```

**Response (Invalid Address):**
```json
{
  "success": false,
  "error": "Invalid wallet address format",
}
```

### Metadata Delivery

#### Get Token Metadata

**GET** `/metadata/[tokenId]`

Retrieve metadata for a specific token. Only returns metadata if the token has been minted on-chain (verified via contract call).

**Parameters:**
- `tokenId` (path parameter): Token ID (integer or string)

**Note:** This endpoint verifies token mint status by calling the contract's `ownerOf()` function. If the token is not minted on-chain, the endpoint returns a 404 error even if metadata exists in the database.

**Response (Success Not Revealed):**
```json
{
  "success": true,
  "tokenId": "123",
  "metadata": {
    "name": "Wizzy the [color] #00123",
    "description": "A unique Wizzyverse NFT",
    "image": "placeholder.png"
  }
}
```

**Response (Success Revealed):**
```json
{
  "success": true,
  "tokenId": "123",
  "metadata": {
    "name": "Wizzy the [color] #00123",
    "description": "A unique Wizzyverse NFT",
    "image": "ipfs://Qm...",
    "animation": "https://viewer.wizzyverse.com/viewer?id=123",
    "attributes": [
      {
        "trait_type": "Background",
        "value": "Cosmic"
      },
      {
        "trait_type": "Eyes",
        "value": "Mystical"
      }
    ]
  }
}
```

**Response (Not Found):**
```json
{
  "success": false,
  "error": "Token not found or not minted",
  "tokenId": "123",
}
```

### Email Subscriptions

#### Subscribe to Notifications

**POST** `/subscriptions/subscribe`

Subscribe an email address to receive sale notifications.

**Request Body:**
```json
{
  "email": "user@example.com",
  "subscriptionType": "privateAndPublic"
}
```

**Request Parameters:**
- `email` (required): Email address to subscribe
- `subscriptionType` (required): Either `"privateAndPublic"` or `"publicOnly"`

**Response (Success):**
```json
{
  "success": true,
  "message": "Successfully subscribed to private and public sale notifications"
}
```

**Response (Invalid Email):**
```json
{
  "success": false,
  "error": "Invalid email format"
}
```

**Response (Missing Parameters):**
```json
{
  "success": false,
  "error": "Email is required"
}
```

#### Unsubscribe from Notifications

**DELETE** `/subscriptions/unsubscribe`

Unsubscribe an email address from all notifications.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Request Parameters:**
- `email` (required): Email address to unsubscribe

**Response (Success - Removed):**
```json
{
  "success": true,
  "message": "Successfully unsubscribed from all notifications"
}
```

**Response (Success - Not Found):**
```json
{
  "success": true,
  "message": "Email was not found in our subscription list"
}
```

**Response (Invalid Email):**
```json
{
  "success": false,
  "error": "Invalid email format"
}
```

### Health Check

**GET** `/health`

Get API status and database connection status.

**Response:**
```json
{
  "status": "healthy",
  "message": "Wizzyverse API is running",
  "databases": {
    "proofs": "connected",
    "metadata": "connected"
  },
  "timestamp": "2024-01-15T10:00:00.000Z"
}
```

## 🛠️ Tech Stack

- **Framework**: Next.js 15
- **Language**: TypeScript
- **Database**: MongoDB
- **Blockchain Confirmation**: ethers.js
- **API**: Next.js API routes
- **Validation**: Custom Ethereum address validation
- **Error Handling**: Comprehensive error responses

## 📁 Project Structure

```
wizzyverse-api/
├── app/                    # Next.js app directory
│   ├── whitelist/          # Whitelist endpoints
│   │   └── [walletAddress]/ # Proof retrieval endpoint
│   ├── metadata/           # Metadata endpoints
│   │   └── [tokenId]/      # Token metadata retrieval
│   ├── subscriptions/      # Email subscription endpoints
│   │   ├── subscribe/      # Subscribe endpoint
│   │   └── unsubscribe/    # Unsubscribe endpoint
│   └── health/             # Health check endpoint
├── lib/                    # Utility functions
│   ├── mongodb-proofs.ts   # Proofs database connection
│   ├── mongodb-metadata.ts # Metadata database connection
│   ├── mongodb-subscriptions.ts # Subscriptions database connection
│   ├── proof-service.ts    # Proof management service
│   ├── metadata-service.ts # Metadata management service
│   └── subscription-service.ts # Subscription management service
├── scripts/                # Utility scripts
│   ├── import-whitelist.js # Import whitelist data script
│   ├── import-metadata.js  # Import metadata script
│   └── shuffle-reveal.js   # Shuffle and reveal script
├── types/                  # TypeScript type definitions
│   ├── proof.ts            # Proof-related types
│   ├── metadata.ts         # Metadata-related types
│   ├── subscription.ts     # Subscription-related types
│   └── error.ts            # Error response types
└── config files            # Configuration files
```

## 🔧 Configuration

### MongoDB Setup

1. **Local MongoDB:**
   - Install MongoDB Community Edition
   - Start MongoDB service
   - Create databases: `wizzyverse-proofs`, `wizzyverse-metadata`, and `wizzyverse-subscriptions`

2. **MongoDB Atlas (Recommended):**
   - Create free account at [MongoDB Atlas](https://www.mongodb.com/atlas)
   - Create a new cluster
   - Get connection strings from "Connect" button
   - Add your IP to whitelist
   - Create two separate databases or use different collections

3. **Environment Variables:**
   Update your `.env.local` with the MongoDB connection strings:
   ```bash
   PROOFS_MONGODB_URI=mongodb://localhost:27017/wizzyverse-proofs
   METADATA_MONGODB_URI=mongodb://localhost:27017/wizzyverse-metadata
   SUBSCRIPTIONS_MONGODB_URI=mongodb://localhost:27017/wizzyverse-subscriptions
   ```

### Database Schemas

#### Proofs Database

The proofs database stores cryptographic proofs associated with wallet addresses:

```typescript
{
  walletAddress: string;      // Ethereum address (indexed, unique)
  alloted: number             // Number of spots allocated
  proof: {
    r: string;                // Proof component r
    s: string;                // Proof component s
    v: number;                // Proof component v
  };
}
```

#### Metadata Database

The metadata database stores token metadata:

```typescript
{
  tokenId: string | null;     // Token ID (null initially, assigned by shuffle/reveal script)
  metadata: {
    image: string;
    attributes: Array<{
      trait_type: string;
      value: string | number;
    }>;
  };
}
```

**Note:** The `tokenId` field starts as `null` when metadata is imported. The shuffle/reveal script assigns tokenIds to records, mapping them to actual minted token IDs. The tokenId field has a sparse unique index, meaning only non-null values are indexed and must be unique.

#### Subscriptions Database

The subscriptions database stores email subscriptions:

```typescript
{
  email: string;               // Email address (indexed, unique)
  subscriptionType: 'privateAndPublic' | 'publicOnly';
  subscribedAt: Date;          // Subscription timestamp
}
```

### Environment Variables

Create a `.env.local` file for environment-specific configuration:

```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3000

# CORS Configuration
ALLOWED_DOMAIN=wizzyverse.com
ALLOWED_SUBDOMAINS=

# MongoDB Configuration
PROOFS_MONGODB_URI=mongodb://localhost:27017/wizzyverse-proofs
METADATA_MONGODB_URI=mongodb://localhost:27017/wizzyverse-metadata
SUBSCRIPTIONS_MONGODB_URI=mongodb://localhost:27017/wizzyverse-subscriptions

# Blockchain Configuration
CHAIN_ID=137
CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000
RPC_URL=https://polygon-rpc.com

# Shuffle Configuration
SHUFFLE_PASSWORD=your_secure_password_here

# Environment
NODE_ENV=development
```

## 📦 Database Management

### Import Whitelist Data

Import whitelist data from a JSON file into MongoDB:

```bash
# Using yarn script
yarn import-whitelist <path-to-json-file>

# Direct node execution
node scripts/import-whitelist.js <path-to-json-file>
```

**Examples:**
```bash
# Import from wizzyverse-ms data directory
yarn import-whitelist ../wizzyverse-ms/data/whitelist-records.json

# Import from local data file
yarn import-whitelist ./data/whitelist-records.json
```

**Features:**
- ✅ Validates Ethereum address format
- ✅ Validates proof structure (r, s, v)
- ✅ Normalizes addresses to lowercase
- ✅ Creates unique index on walletAddress
- ✅ Clears existing data before import (ensures clean data)
- ✅ Shows import progress and statistics

**JSON File Format:**
```json
{
  "0x1234567890123456789012345678901234567890": {
    "alloted": 5,
    "proof": {
      "r": "0x...",
      "s": "0x...",
      "v": 27
    }
  }
}
```

### Import Metadata

Import token metadata from a JSON file into MongoDB:

```bash
# Using yarn script
yarn import-metadata <path-to-json-file>

# Direct node execution
node scripts/import-metadata.js <path-to-json-file>
```

**Examples:**
```bash
# Import from data directory
yarn import-metadata ../data/metadata.json

# Import from local data file
yarn import-metadata ./data/metadata.json
```

**Features:**
- ✅ Validates image and attributes structure
- ✅ Sets tokenId to null initially (will be assigned by shuffle/reveal script)
- ✅ Creates sparse unique index on tokenId (only indexes non-null values)
- ✅ Clears existing data before import (ensures clean data)
- ✅ Shows import progress and statistics

**JSON File Format:**
```json
{
  "00001": {
    "image": "00001.png",
    "attributes": [
      {
        "trait_type": "Background",
        "value": "Cosmic"
      },
      {
        "trait_type": "Eyes",
        "value": "Mystical"
      }
    ]
  },
  "00002": {
    "image": "00002.png",
    "attributes": [
      {
        "trait_type": "Type",
        "value": "Prismatic"
      }
    ]
  }
}
```

### Shuffle and Reveal Tokens

Trigger the shuffle and reveal process for all tokens in the Wizzyverse collection. This script initiates the randomization and metadata assignment process.

**⚠️ Important:** This script is password-protected and can only be executed successfully once. Subsequent executions will return an error.

**Usage:**
```bash
# Using yarn script
yarn shuffle-reveal

# Direct node execution
node scripts/shuffle-reveal.js
```

**Features:**
- ✅ Password-protected execution
- ✅ One-time-only operation (prevents accidental re-execution)
- ✅ Shuffles and assigns metadata to all tokens
- ✅ Updates token metadata in database
- ✅ Comprehensive logging and progress tracking

**Environment Variables:**
The script requires the following environment variables:
- `METADATA_MONGODB_URI`: MongoDB connection string for metadata database
- `SHUFFLE_PASSWORD`: Password required to execute the shuffle operation

**Example Output:**
```
🔐 Password required to execute shuffle and reveal
✅ Password verified
🔄 Starting shuffle and reveal process...
📊 Processing 10000 tokens...
✅ Shuffle and reveal completed successfully
📊 Total tokens processed: 10000
```

## 🧪 Testing

### API Testing

Test the APIs using curl or Postman:

```bash
# Get proof for wallet
curl http://localhost:3000/whitelist/0x1234567890123456789012345678901234567890

# Get token metadata
curl http://localhost:3000/metadata/123

# Subscribe to notifications
curl -X POST http://localhost:3000/api/subscriptions/subscribe \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "subscriptionType": "privateAndPublic"}'

# Unsubscribe from notifications
curl -X DELETE http://localhost:3000/api/subscriptions/unsubscribe \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'

# Health check
curl http://localhost:3000/health
```

### Error Testing

```bash
# Test invalid wallet address format
curl http://localhost:3000/whitelist/invalid-address

# Test non-existent token
curl http://localhost:3000/metadata/99999
```

## 🚀 Deployment

### Docker Deployment

1. Build the production image:
   ```bash
   docker build -t wizzyverse-api .
   ```

2. Run the container:
   ```bash
   docker run -p 3000:3000 wizzyverse-api
   ```

### Vercel Deployment

1. Connect your repository to Vercel
2. Configure environment variables
3. Deploy automatically on push to main branch

## 📝 License

This project is not licensed.

## 🙏 Acknowledgments

- Built with modern web technologies
- Special thanks to all contributors
- Designed for the Wizzyverse NFT collection
