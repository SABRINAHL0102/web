import { prisma } from '../lib/prisma';
import { defaultProjectState } from '../lib/agent';

async function main() {
  const state = defaultProjectState({ title: 'Demo Marketing', style: 'cinematic', targetDuration: 20 });
  await prisma.project.upsert({
    where: { id: state.id },
    update: {},
    create: {
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
  console.log('Seed completado con proyecto demo:', state.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
