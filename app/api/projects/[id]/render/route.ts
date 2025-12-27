import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { ProjectStateSchema } from '../../../../../lib/types';
import { jobQueue } from '../../../../../lib/jobs';
import { renderProject } from '../../../../../lib/render';
import { registerRender } from '../../../../../lib/render-registry';

interface Params {
  params: { id: string };
}

jobQueue.registerProcessor('render', async (job) => {
  const { project } = job.payload as any;
  const result = await renderProject(project);
  registerRender(result.renderId, result.renderPath);
  return result;
});

export async function POST(_: Request, { params }: Params) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 });
  const state = ProjectStateSchema.parse(project.projectState);
  const job = jobQueue.addJob('render', { project: state });
  return NextResponse.json({ jobId: job.id });
}
