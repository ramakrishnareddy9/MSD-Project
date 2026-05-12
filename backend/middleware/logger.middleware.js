/**
 * Request Logger Middleware
 * Logs incoming requests with timestamp, method, URL, IP, and response time.
 * Only requestLogger and errorLogger are used — others were removed (dead code).
 */

import chalk from 'chalk';

/**
 * Custom request logger
 * Logs all incoming requests with color-coded status
 */
export const requestLogger = (req, res, next) => {
  const startTime = Date.now();

  console.log(
    chalk.cyan(`[${new Date().toISOString()}]`),
    chalk.yellow(`${req.method}`),
    chalk.white(req.url),
    chalk.gray(`- IP: ${req.ip || req.connection?.remoteAddress}`)
  );

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const statusColor = res.statusCode >= 500 ? chalk.red
      : res.statusCode >= 400 ? chalk.yellow
      : res.statusCode >= 300 ? chalk.cyan
      : chalk.green;

    console.log(
      chalk.cyan(`[${new Date().toISOString()}]`),
      statusColor(`${res.statusCode}`),
      chalk.yellow(`${req.method}`),
      chalk.white(req.url),
      chalk.gray(`- ${duration}ms`)
    );
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

export default requestLogger;
