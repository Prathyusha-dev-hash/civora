const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { config } = require('./config/env');
const healthRoutes = require('./routes/health.routes');
const v1Routes = require('./routes/v1');
const errorHandler = require('./middleware/error.middleware');
const { requestId } = require('./utils/http');

const app = express();

app.disable('x-powered-by');
// On Vercel every request arrives through its edge proxy
app.set('trust proxy', process.env.VERCEL ? true : 'loopback');

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

const allowedOrigins = config.corsOrigin.split(',').map((o) => o.trim()).filter(Boolean);
app.use(
  cors({
    origin: (origin, cb) => cb(null, !origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)),
    credentials: false,
  })
);

app.use((req, res, next) => {
  res.locals.requestId = req.get('X-Request-ID') || requestId();
  res.setHeader('X-Request-ID', res.locals.requestId);
  next();
});

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

app.use('/', healthRoutes);
app.use('/api/v1', healthRoutes);
app.use('/api/v1', v1Routes);

app.use((req, res) => {
  res.status(404).json({ success: false, error: { code: 'ROUTE_NOT_FOUND', message: `Route not found: ${req.method} ${req.originalUrl}` } });
});

app.use(errorHandler);

module.exports = app;
