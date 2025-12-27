import { NextResponse } from 'next/server';
import fs from 'fs';
import { getRenderPath } from '../../../../../lib/render-registry';

interface Params {
  params: { renderId: string };
}

export async function GET(_: Request, { params }: Params) {
  const path = getRenderPath(params.renderId);
  if (!path || !fs.existsSync(path)) {
    return NextResponse.json({ error: 'Render no encontrado' }, { status: 404 });
  }
  const file = await fs.promises.readFile(path);
  return new NextResponse(file, {
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Disposition': `attachment; filename="${params.renderId}.mp4"`
    }
  });
}
