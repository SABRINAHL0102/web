import { z } from 'zod';

export const SceneSchema = z.object({
  id: z.string(),
  title: z.string().default('Scene'),
  duration: z.number().min(1).max(120).default(5),
  visualPrompt: z.string().optional(),
  shotType: z.string().optional(),
  cameraMotion: z.string().optional(),
  assets: z.array(z.string()).default([]),
  transitionIn: z.string().default('fade'),
  transitionOut: z.string().default('fade')
});

export const AudioStateSchema = z.object({
  musicPrompt: z.string().optional(),
  sfx: z.array(z.string()).default([]),
  voiceover: z.object({
    text: z.string().optional(),
    voice: z.string().default('neutral'),
    language: z.string().default('es'),
    speed: z.number().default(1)
  }).default({})
});

export const SubtitleStateSchema = z.object({
  enabled: z.boolean().default(true),
  style: z.string().default('clean'),
  transcript: z.array(z.object({
    start: z.number(),
    end: z.number(),
    text: z.string()
  })).default([])
});

export const ProjectStateSchema = z.object({
  id: z.string(),
  title: z.string().default('Nuevo proyecto'),
  style: z.string().default('cinematic'),
  targetDuration: z.number().default(20),
  aspectRatio: z.string().default('16:9'),
  fps: z.number().default(30),
  scenes: z.array(SceneSchema).default([]),
  audio: AudioStateSchema.default({}),
  subtitles: SubtitleStateSchema.default({}),
  versionHistory: z.array(z.record(z.any())).default([])
});

export type ProjectState = z.infer<typeof ProjectStateSchema>;
export type Scene = z.infer<typeof SceneSchema>;

export const ActionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('CREATE_PROJECT'), payload: ProjectStateSchema.partial() }),
  z.object({ type: z.literal('ADD_SCENE'), payload: SceneSchema.partial() }),
  z.object({ type: z.literal('EDIT_SCENE'), payload: z.object({ id: z.string(), data: SceneSchema.partial() }) }),
  z.object({ type: z.literal('REMOVE_SCENE'), payload: z.object({ id: z.string() }) }),
  z.object({ type: z.literal('REORDER_SCENES'), payload: z.object({ order: z.array(z.string()) }) }),
  z.object({ type: z.literal('SET_STYLE'), payload: z.object({ style: z.string(), aspectRatio: z.string().optional(), fps: z.number().optional(), targetDuration: z.number().optional() }) }),
  z.object({ type: z.literal('SET_AUDIO'), payload: AudioStateSchema.partial() }),
  z.object({ type: z.literal('SET_VOICEOVER'), payload: z.object({ text: z.string(), voice: z.string().optional(), language: z.string().optional(), speed: z.number().optional() }) }),
  z.object({ type: z.literal('SET_SUBTITLES'), payload: SubtitleStateSchema.partial() }),
  z.object({ type: z.literal('RENDER'), payload: z.record(z.any()).optional() })
]);

export type Action = z.infer<typeof ActionSchema>;
