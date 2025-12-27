import { randomUUID } from 'crypto';

export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface Job<T = any> {
  id: string;
  type: string;
  status: JobStatus;
  payload: T;
  result?: any;
  error?: string;
}

export class InMemoryJobQueue {
  private jobs: Job[] = [];
  private processors: Record<string, (job: Job) => Promise<any>> = {};
  private polling: NodeJS.Timeout | null = null;

  registerProcessor(type: string, handler: (job: Job) => Promise<any>) {
    this.processors[type] = handler;
    this.start();
  }

  addJob<T>(type: string, payload: T): Job {
    const job: Job<T> = { id: randomUUID(), type, status: 'queued', payload };
    this.jobs.push(job);
    this.start();
    return job;
  }

  getJob(id: string): Job | undefined {
    return this.jobs.find((j) => j.id === id);
  }

  private start() {
    if (this.polling) return;
    this.polling = setInterval(() => this.tick(), 500);
  }

  private async tick() {
    const job = this.jobs.find((j) => j.status === 'queued');
    if (!job) return;
    job.status = 'processing';
    const handler = this.processors[job.type];
    if (!handler) {
      job.status = 'failed';
      job.error = 'No processor registered';
      return;
    }
    try {
      const result = await handler(job);
      job.result = result;
      job.status = 'completed';
    } catch (err: any) {
      job.status = 'failed';
      job.error = err?.message || 'Error en trabajo';
    }
  }
}

export const jobQueue = new InMemoryJobQueue();
