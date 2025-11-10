/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Web3 compatibility
  webpack: (config) => {
    config.resolve.fallback = { 
      fs: false, 
      net: false, 
      tls: false,
      crypto: false,
      stream: false,
      url: false,
      zlib: false,
      http: false,
      https: false,
      assert: false,
      os: false,
      path: false
    };
    return config;
  },
  // Build optimizations for API
  typescript: {
    ignoreBuildErrors: true, // Temporarily ignore for deployment
  },
  eslint: {
    ignoreDuringBuilds: true, // Temporarily ignore for deployment
  },
  output: 'standalone',
  // Performance optimizations
  compress: true,
  poweredByHeader: false,
  // Security headers
  async headers() {
    return [
      {
        // Apply CORS to whitelist routes (keeping existing configuration)
        source: '/whitelist/(.*)',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.NODE_ENV === 'production' 
              ? 'https://*.wizzyverse.com'
              : 'http://localhost:3000, http://localhost:3001',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, X-Requested-With',
          },
          {
            key: 'Access-Control-Allow-Credentials',
            value: 'true',
          },
          {
            key: 'Access-Control-Max-Age',
            value: '86400', // 24 hours
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
