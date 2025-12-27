import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { handleChatMessage } from '../../../../../lib/agent';
import { ProjectStateSchema } from '../../../../../lib/types';

interface Params {
  params: { id: string };
}

export async function POST(request: Request, { params }: Params) {
  const { message } = await request.json();
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 });
  const state = ProjectStateSchema.parse(project.projectState);
  const { action, updated, response } = handleChatMessage(message, state);
  await prisma.project.update({ where: { id: params.id }, data: { projectState: updated } });
  return NextResponse.json({ action, state: updated, response });
}
