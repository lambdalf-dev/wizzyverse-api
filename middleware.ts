import { NextRequest, NextResponse } from 'next/server';

// Get allowed origins from environment variables
const getAllowedOrigins = (): string[] => {
  const baseOrigins = [
    // Development
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
  ];

  // Add production domain if specified
  const productionDomain = process.env.ALLOWED_DOMAIN;
  if (productionDomain) {
    // Add specific subdomains if provided
    const subdomainsEnv = process.env.ALLOWED_SUBDOMAINS;
    
    if (subdomainsEnv && subdomainsEnv.trim() !== '') {
      // Parse comma-separated subdomains
      const subdomains = subdomainsEnv.split(',').map(s => s.trim()).filter(s => s !== '');
      
      // Add each subdomain
      subdomains.forEach(subdomain => {
        baseOrigins.push(`https://${subdomain}.${productionDomain}`);
      });
    } else {
      // No subdomains specified, only allow the main domain
      baseOrigins.push(`https://${productionDomain}`);
    }
  }

  // Add additional allowed URLs from environment variable
  const additionalUrlsEnv = process.env.ADDITIONAL_ALLOWED_URLS;
  if (additionalUrlsEnv && additionalUrlsEnv.trim() !== '') {
    // Parse comma-separated URLs
    const additionalUrls = additionalUrlsEnv.split(',').map(url => url.trim()).filter(url => url !== '');
    
    // Add each additional URL
    additionalUrls.forEach(url => {
      // Validate URL format
      if (url.startsWith('http://') || url.startsWith('https://')) {
        baseOrigins.push(url);
      } else {
        console.warn(`Invalid URL format in ADDITIONAL_ALLOWED_URLS: ${url}`);
      }
    });
  }

  return baseOrigins;
};

const allowedOrigins = getAllowedOrigins();

// Function to check if origin is allowed
function isOriginAllowed(origin: string): boolean {
  // Check exact matches first
  if (allowedOrigins.includes(origin)) {
    return true;
  }
  
  // Check if it's a subdomain of the allowed domain
  const productionDomain = process.env.ALLOWED_DOMAIN;
  if (productionDomain && origin.startsWith('https://') && origin.endsWith(`.${productionDomain}`)) {
    return true;
  }
  
  return false;
}

export function middleware(request: NextRequest) {
  const origin = request.headers.get('origin');
  const method = request.method;
  
  // Only apply CORS to API routes
  const isApiRoute = request.nextUrl.pathname.startsWith('/whitelist') ||
                     request.nextUrl.pathname.startsWith('/metadata');
  
  if (!isApiRoute) {
    return NextResponse.next();
  }
  
  // In development, always allow localhost origins
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isLocalhost = origin && (
    origin.startsWith('http://localhost:') ||
    origin.startsWith('http://127.0.0.1:')
  );
  
  // Determine if origin should be allowed
  const shouldAllowOrigin = origin && (
    (isDevelopment && isLocalhost) ||
    isOriginAllowed(origin)
  );
  
  // Handle preflight requests
  if (method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 200 });
    
    if (shouldAllowOrigin) {
      response.headers.set('Access-Control-Allow-Origin', origin);
    }
    
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-API-Key');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Max-Age', '86400');
    
    return response;
  }
  
  // For non-preflight requests, continue and add CORS headers in the response
  const response = NextResponse.next();
  
  if (shouldAllowOrigin) {
    response.headers.set('Access-Control-Allow-Origin', origin!);
  }
  
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-API-Key');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  
  // Ensure API routes return JSON content type
  if (isApiRoute) {
    response.headers.set('Content-Type', 'application/json');
  }
  
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}; 