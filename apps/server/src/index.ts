import express from 'express';
import http from 'http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes.js';
import workspaceRoutes from './routes/workspace.routes.js';
import { setupYjsWebSocketServer } from './websocket/yjs.server.js';
import { setupSocketGateway } from './websocket/socket.gateway.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

const PORT = Number(process.env.PORT) || 4000;
const CLIENT_URL = (process.env.CLIENT_URL || 'http://localhost:3000').replace(/\/$/, '');

// Initialize WebSockets
setupYjsWebSocketServer(server);
setupSocketGateway(server);

// Middlewares
app.use(helmet({
  contentSecurityPolicy: false // Disabled for dev flexibility
}));

// Trust reverse proxy (Render sits behind one) – needed for secure cookies & correct IP
app.set('trust proxy', 1);

app.use(cors({
  origin: (origin, callback) => {
    // Dynamically reflect request origin so credentials work seamlessly with Vercel and local dev
    callback(null, true);
  },
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/workspaces', workspaceRoutes);

app.get('/', (_req, res) => {
  res.json({
    name: 'CodeSphere API Server',
    status: 'online',
    frontendUrl: CLIENT_URL,
    message: `CodeSphere Web IDE interface is running on ${CLIENT_URL}`,
    endpoints: {
      health: '/health',
      auth: '/api/v1/auth',
      workspaces: '/api/v1/workspaces',
    }
  });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[CodeSphere Server] Running on http://0.0.0.0:${PORT}`);
});

export { app, server };
