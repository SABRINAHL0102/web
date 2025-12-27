import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { prisma } from '../../../lib/prisma';
import { defaultProjectState } from '../../../lib/agent';

export async function GET() {
  const projects = await prisma.project.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json(projects);
}

export async function POST(request: Request) {
  const body = await request.json();
  const state = defaultProjectState({ ...body, id: body.id || randomUUID() });
  const project = await prisma.project.create({
    data: {
      id: state.id,
      title: state.title,
      style: state.style,
      targetDuration: state.targetDuration,
      aspectRatio: state.aspectRatio,
      fps: state.fps,
      projectState: state,
      scenes: {
        create: state.scenes.map((scene, index) => ({
          id: scene.id,
          title: scene.title || `Escena ${index + 1}`,
          duration: Math.round(scene.duration),
          visualPrompt: scene.visualPrompt,
          shotType: scene.shotType,
          cameraMotion: scene.cameraMotion,
          transitionIn: scene.transitionIn,
          transitionOut: scene.transitionOut,
          assets: JSON.stringify(scene.assets || []),
          index
        }))
      },
      audio: {
        create: {
          musicPrompt: state.audio.musicPrompt,
          sfx: JSON.stringify(state.audio.sfx || []),
          voiceover: JSON.stringify(state.audio.voiceover || {})
        }
      }
    }
  });
  return NextResponse.json({ project, state });
}
