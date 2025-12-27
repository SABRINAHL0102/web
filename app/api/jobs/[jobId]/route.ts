import { NextResponse } from 'next/server';
import { jobQueue } from '../../../../lib/jobs';

interface Params {
  params: { jobId: string };
}

export async function GET(_: Request, { params }: Params) {
  const job = jobQueue.getJob(params.jobId);
  if (!job) return NextResponse.json({ error: 'Trabajo no encontrado' }, { status: 404 });
  return NextResponse.json(job);
}
