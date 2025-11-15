import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface RouteInfo {
  path: string;
  isPublic: boolean;
}

interface RouteDefinition {
  path: string;
  hasAuth: boolean;
}

function extractRoutesFromFile(filePath: string): RouteDefinition[] {
  const routes: RouteDefinition[] = [];
  
  try {
    const content = readFileSync(filePath, 'utf-8');
    
    // Match route definitions with their options
    const routeRegex = /fastify\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]\s*,?\s*(?:\{[^}]*preHandler\s*:\s*authenticateToken[^}]*\})?/gm;
    
    let match;
    while ((match = routeRegex.exec(content)) !== null) {
      const path = match[2];
      const hasAuth = match[0].includes('authenticateToken');
      if (path) {
        routes.push({ path, hasAuth });
      }
    }
    
    // Also check for routes without preHandler (public by default)
    const simpleRouteRegex = /fastify\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*async/gm;
    while ((match = simpleRouteRegex.exec(content)) !== null) {
      const path = match[2];
      // Check if this route was already found with auth
      if (!routes.some(r => r.path === path)) {
        routes.push({ path, hasAuth: false });
      }
    }
  } catch (error) {
    console.error(`Error reading route file ${filePath}:`, error);
  }
  
  return routes;
}

export function getAllowedPaths(): string[] {
  const allowedPaths: string[] = [];
  const routesDir = join(__dirname, '..', 'routes');
  
  // Extract routes from auth.ts
  const authRoutesPath = join(routesDir, 'auth.ts');
  if (existsSync(authRoutesPath)) {
    const authRoutes = extractRoutesFromFile(authRoutesPath);
    // Add routes that don't have authentication
    authRoutes.forEach(route => {
      if (!route.hasAuth) {
        allowedPaths.push(route.path);
      }
    });
  }
  
  // Extract routes from email.ts
  const emailRoutesPath = join(routesDir, 'email.ts');
  if (existsSync(emailRoutesPath)) {
    const emailRoutes = extractRoutesFromFile(emailRoutesPath);
    emailRoutes.forEach(route => {
      if (!route.hasAuth) {
        allowedPaths.push(route.path);
      }
    });
  }
  
  // Extract routes from proxy.ts
  const proxyRoutesPath = join(routesDir, 'proxy.ts');
  if (existsSync(proxyRoutesPath)) {
    const proxyRoutes = extractRoutesFromFile(proxyRoutesPath);
    proxyRoutes.forEach(route => {
      if (!route.hasAuth) {
        allowedPaths.push(route.path);
      }
    });
  }
  
  // Add standard public paths that might not be in route files
  const additionalPublicPaths = [
    '/health',
    '/public',
    '/docs',
    '/assets'
  ];
  
  additionalPublicPaths.forEach(path => {
    if (!allowedPaths.includes(path)) {
      allowedPaths.push(path);
    }
  });
  
  return allowedPaths;
}