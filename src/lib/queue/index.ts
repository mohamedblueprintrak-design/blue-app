/**
 * BullMQ Job Queue Module
 *
 * Provides centralized queue management for background job processing.
 * Queues are used for email sending, notifications, automations, report
 * generation, and cleanup tasks.
 *
 * Usage:
 *   import { getQueue, QUEUES } from '@/lib/queue';
 *
 *   const emailQueue = getQueue(QUEUES.EMAIL);
 *   await emailQueue.add('send-welcome', { to: 'user@example.com', ... });
 */

import { Queue, Worker, Job } from 'bullmq';
import { getSharedRedisConnection } from './redis';
import { log } from '@/lib/logger';

// ============================================
// Queue Name Definitions
// ============================================

export const QUEUES = {
  EMAIL: 'email',
  NOTIFICATION: 'notification',
  AUTOMATION: 'automation',
  REPORT: 'report',
  CLEANUP: 'cleanup',
} as const;

export type QueueName = typeof QUEUES[keyof typeof QUEUES];

// ============================================
// Queue Default Options
// ============================================

const DEFAULT_QUEUE_OPTIONS = {
  defaultJobOptions: {
    removeOnComplete: {
      count: 1000, // Keep last 1000 completed jobs
      age: 24 * 3600, // Remove after 24 hours
    },
    removeOnFail: {
      count: 5000, // Keep last 5000 failed jobs for debugging
    },
    attempts: 3,
    backoff: {
      type: 'exponential' as const,
      delay: 1000, // 1s, 2s, 4s
    },
  },
};

// ============================================
// Queue Instances Cache
// ============================================

const queueCache = new Map<string, Queue>();

/**
 * Get or create a BullMQ Queue by name.
 * Queues are cached to avoid creating duplicate connections.
 *
 * @param name - The queue name (use QUEUES constants)
 * @returns A BullMQ Queue instance
 */
export function getQueue(name: QueueName): Queue {
  const existing = queueCache.get(name);
  if (existing) {
    return existing;
  }

  const connection = getSharedRedisConnection();
  const queue = new Queue(name, {
    connection,
    ...DEFAULT_QUEUE_OPTIONS,
  });

  queueCache.set(name, queue);

  log.info(`[Queue] Queue "${name}" created`);

  return queue;
}

// ============================================
// Worker Management
// ============================================

interface WorkerRegistry {
  [queueName: string]: Worker;
}

const activeWorkers: WorkerRegistry = {};

/**
 * Worker status information
 */
export interface WorkerStatus {
  queueName: string;
  isRunning: boolean;
  isPaused: boolean;
  jobsProcessed: number;
  jobsFailed: number;
}

/**
 * Create and start a worker for a given queue.
 *
 * @param queueName - The queue to consume from
 * @param processor - The job processing function
 * @param concurrency - Number of concurrent jobs (default: 1)
 * @returns The Worker instance
 */
export function startWorker(
  queueName: QueueName,
  processor: (job: Job) => Promise<void>,
  concurrency: number = 1
): Worker {
  // If a worker already exists for this queue, close it first
  if (activeWorkers[queueName]) {
    log.warn(`[Queue] Worker for "${queueName}" already exists — closing old worker`);
    activeWorkers[queueName].close();
  }

  const connection = getSharedRedisConnection();

  const worker = new Worker(queueName, processor, {
    connection,
    concurrency,
    limiter: {
      max: 10, // Max 10 jobs
      duration: 1000, // Per second
    },
  });

  worker.on('completed', (job: Job) => {
    log.info(`[Queue] Job completed`, {
      queue: queueName,
      jobId: job.id,
      jobName: job.name,
    });
  });

  worker.on('failed', (job: Job | undefined, err: Error) => {
    log.error(`[Queue] Job failed`, err, {
      queue: queueName,
      jobId: job?.id,
      jobName: job?.name,
      attemptsMade: job?.attemptsMade,
    });
  });

  worker.on('error', (err: Error) => {
    log.error(`[Queue] Worker error`, err, { queue: queueName });
  });

  activeWorkers[queueName] = worker;

  log.info(`[Queue] Worker started for "${queueName}" (concurrency: ${concurrency})`);

  return worker;
}

/**
 * Get status of all active workers
 */
export async function getWorkersStatus(): Promise<WorkerStatus[]> {
  const statuses: WorkerStatus[] = [];

  for (const [queueName, worker] of Object.entries(activeWorkers)) {
    const isRunning = worker.isRunning();
    const isPaused = worker.isPaused();

    statuses.push({
      queueName,
      isRunning,
      isPaused,
      jobsProcessed: 0, // BullMQ doesn't expose this directly
      jobsFailed: 0,
    });
  }

  return statuses;
}

/**
 * Close all active workers gracefully
 */
export async function closeAllWorkers(): Promise<void> {
  const closePromises = Object.entries(activeWorkers).map(async ([name, worker]) => {
    try {
      await worker.close();
      log.info(`[Queue] Worker for "${name}" closed`);
    } catch (error) {
      log.error(`[Queue] Error closing worker for "${name}":`, error);
    }
  });

  await Promise.all(closePromises);

  // Clear the registry
  for (const key of Object.keys(activeWorkers)) {
    delete activeWorkers[key];
  }
}

/**
 * Start all workers with their respective processors.
 * This is called by the /api/cron/workers endpoint.
 */
export async function startAllWorkers(): Promise<void> {
  // Dynamic imports to avoid circular dependencies
  const { emailProcessor } = await import('./processors/email');
  const { notificationProcessor } = await import('./processors/notification');
  const { automationProcessor } = await import('./processors/automation');

  startWorker(QUEUES.EMAIL, emailProcessor, 5);
  startWorker(QUEUES.NOTIFICATION, notificationProcessor, 10);
  startWorker(QUEUES.AUTOMATION, automationProcessor, 3);

  log.info('[Queue] All workers started');
}

// ============================================
// Job Helpers
// ============================================

/**
 * Add a job to a queue with a typed payload.
 * This is a convenience wrapper around queue.add().
 */
export async function addJob(
  queueName: QueueName,
  jobName: string,
  data: Record<string, unknown>,
  options?: {
    priority?: number;
    delay?: number;
    attempts?: number;
  }
): Promise<Job> {
  const queue = getQueue(queueName);

  const job = await queue.add(jobName, data, {
    priority: options?.priority,
    delay: options?.delay,
    attempts: options?.attempts,
  });

  log.info(`[Queue] Job added`, {
    queue: queueName,
    jobName,
    jobId: job.id,
  });

  return job;
}
