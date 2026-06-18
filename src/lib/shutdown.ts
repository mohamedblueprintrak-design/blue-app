import logger from './logger';

type ShutdownCallback = () => Promise<void> | void;

interface CallbackRegistry {
  name: string;
  callback: ShutdownCallback;
}

const registry: CallbackRegistry[] = [];
let isShuttingDown = false;

/**
 * Registers a callback to be executed on graceful shutdown.
 */
export function registerShutdownCallback(name: string, callback: ShutdownCallback): void {
  registry.push({ name, callback });
}

/**
 * Triggers a graceful shutdown of the process.
 */
export async function triggerShutdown(signal: string): Promise<void> {
  if (isShuttingDown) {
    logger.info(`Shutdown already in progress, ignoring signal: ${signal}`);
    return;
  }
  isShuttingDown = true;
  logger.info(`Starting graceful shutdown triggered by: ${signal}`);

  // Create a timeout to force exit if shutdown takes too long
  const forceExitTimeout = setTimeout(() => {
    logger.error('Graceful shutdown timed out, forcing exit.');
    process.exit(1);
  }, 10000); // 10 seconds timeout

  // Prevent timeout from keeping the event loop alive
  forceExitTimeout.unref();

  for (const item of registry) {
    try {
      logger.info(`Running shutdown callback: ${item.name}`);
      await item.callback();
      logger.info(`Successfully completed shutdown callback: ${item.name}`);
    } catch (error) {
      logger.error(`Error executing shutdown callback ${item.name}:`, error);
    }
  }

  clearTimeout(forceExitTimeout);
  logger.info('Graceful shutdown completed successfully.');
  process.exit(0);
}

// Bind process event listeners if in Node/server environment and not testing
if (typeof window === 'undefined' && process.env.NODE_ENV !== 'test') {
  process.on('SIGTERM', () => triggerShutdown('SIGTERM'));
  process.on('SIGINT', () => triggerShutdown('SIGINT'));
}
