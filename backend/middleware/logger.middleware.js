/**
 * Request Logger Middleware
 * Logs incoming requests with timestamp, method, URL, IP, and response time
 */

import chalk from 'chalk';

/**
 * Custom request logger
 * Logs all incoming requests with color-coded status
 */
export const requestLogger = (req, res, next) => {
  const startTime = Date.now();

  // Log request
  console.log(chalk.cyan(`[${new Date().toISOString()}]`), 
              chalk.yellow(`${req.method}`), 
              chalk.white(req.url),
              chalk.gray(`- IP: ${req.ip || req.connection.remoteAddress}`));

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const statusColor = res.statusCode >= 500 ? chalk.red
                      : res.statusCode >= 400 ? chalk.yellow
                      : res.statusCode >= 300 ? chalk.cyan
                      : chalk.green;

    console.log(chalk.cyan(`[${new Date().toISOString()}]`), 
                statusColor(`${res.statusCode}`),
                chalk.yellow(`${req.method}`),
                chalk.white(req.url),
                chalk.gray(`- ${duration}ms`));
  });

  next();
};

/**
 * API endpoint logger
 * Logs detailed information for API routes only
 */
export const apiLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // Log API request details
  const logData = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
    userId: req.user?.id || 'anonymous'
  };

  console.log(chalk.blue('[API]'), JSON.stringify(logData, null, 2));

  // Log response
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    console.log(chalk.blue('[API Response]'), 
                chalk.white(`${req.method} ${req.url}`),
                chalk.gray(`Status: ${res.statusCode} - ${duration}ms`));
  });

  next();
};

/**
 * Error logger
 * Logs errors with stack trace in development
 */
export const errorLogger = (err, req, res, next) => {
  const errorLog = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    userId: req.user?.id || 'anonymous'
  };

  console.error(chalk.red('[ERROR]'), JSON.stringify(errorLog, null, 2));
  
  next(err);
};

/**
 * Authentication logger
 * Logs authentication attempts
 */
export const authLogger = (req, res, next) => {
  const authLog = {
    timestamp: new Date().toISOString(),
    event: 'auth_attempt',
    method: req.method,
    url: req.url,
    ip: req.ip || req.connection.remoteAddress,
    email: req.body?.email || 'unknown'
  };

  console.log(chalk.magenta('[AUTH]'), JSON.stringify(authLog, null, 2));
  
  // Log result after response
  res.on('finish', () => {
    if (res.statusCode === 200 || res.statusCode === 201) {
      console.log(chalk.green('[AUTH SUCCESS]'), authLog.email);
    } else {
      console.log(chalk.red('[AUTH FAILED]'), authLog.email, `- Status: ${res.statusCode}`);
    }
  });

  next();
};

/**
 * Database operation logger
 * Logs database operations (create, update, delete)
 */
export const dbLogger = (operation, model, data) => {
  const dbLog = {
    timestamp: new Date().toISOString(),
    operation: operation,
    model: model,
    data: data
  };

  console.log(chalk.blue('[DB]'), JSON.stringify(dbLog, null, 2));
};

export default requestLogger;
