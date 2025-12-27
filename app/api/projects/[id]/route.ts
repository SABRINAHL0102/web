import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

interface Params {
  params: { id: string };
}

export async function GET(_: Request, { params }: Params) {
  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
  return NextResponse.json(project);
}

export async function PATCH(request: Request, { params }: Params) {
  const data = await request.json();
  const project = await prisma.project.update({ where: { id: params.id }, data });
  return NextResponse.json(project);
}
