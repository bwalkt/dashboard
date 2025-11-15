import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { headerValidator } from './middleware/headerValidation';

const app = express();
const PORT = process.env.PORT || 8090;

// Basic security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
  });
  
  next();
});

// Conditional header validation
const useHeaderValidation = process.env.ENABLE_HEADER_VALIDATION !== 'false';
if (useHeaderValidation) {
  console.log('🔒 Header validation enabled');
  app.use(headerValidator.validate());
} else {
  console.log('⚠️  Header validation disabled');
}

// Health check (always allowed)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: Date.now(),
    uptime: process.uptime(),
    env: process.env.NODE_ENV || 'development'
  });
});

// Test endpoint
app.get('/api/test', (req, res) => {
  const user = (req as any).user || { authenticated: false };
  
  res.json({
    message: 'Hello from server!',
    authenticated: user.authenticated,
    authMethod: user.method,
    timestamp: Date.now(),
    headers: {
      userAgent: req.get('user-agent'),
      customAuth: req.get('x-custom-auth') ? '***' : undefined,
      fingerprint: req.get('x-server-fingerprint')
    }
  });
});

// Protected endpoint
app.get('/api/protected', (req, res) => {
  const user = (req as any).user;
  
  if (!user?.authenticated) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  res.json({
    message: 'This is protected data',
    user: user,
    timestamp: Date.now()
  });
});

// Auth endpoints (always allowed)
app.post('/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  // Mock authentication
  if (email === 'test@example.com' && password === 'password') {
    res.cookie('accessToken', 'mock-jwt-token', { 
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production',
      maxAge: 3600000 // 1 hour
    });
    
    res.json({ success: true, user: { email } });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

app.post('/auth/logout', (req, res) => {
  res.clearCookie('accessToken');
  res.json({ success: true });
});

// Metrics endpoint
app.get('/metrics', (req, res) => {
  const memUsage = process.memoryUsage();
  
  res.json({
    uptime: process.uptime(),
    memory: {
      rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`
    },
    env: process.env.NODE_ENV,
    nodeVersion: process.version,
    headerValidation: useHeaderValidation
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Not found',
    path: req.originalUrl 
  });
});

// Error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Metrics: http://localhost:${PORT}/metrics`);
  console.log(`❤️  Health: http://localhost:${PORT}/health`);
  console.log(`🔧 Test endpoint: http://localhost:${PORT}/api/test`);
});

export default app;