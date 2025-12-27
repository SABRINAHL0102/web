import { randomUUID } from 'crypto';
import { Action, ActionSchema, ProjectState, ProjectStateSchema, Scene } from './types';

const SAFE_BLOCKLIST = ['violencia extrema', 'ilegal', 'daño', 'odio', 'abuso'];

export function isSafe(text: string): { allowed: boolean; reason?: string } {
  const lower = text.toLowerCase();
  const hit = SAFE_BLOCKLIST.find((item) => lower.includes(item));
  if (hit) {
    return { allowed: false, reason: `El modo seguro bloqueó la solicitud relacionada con: ${hit}` };
  }
  return { allowed: true };
}

export function defaultProjectState(partial?: Partial<ProjectState>): ProjectState {
  const parsed = ProjectStateSchema.parse({
    id: partial?.id || randomUUID(),
    title: partial?.title || 'Proyecto demo',
    style: partial?.style || 'cinematic',
    targetDuration: partial?.targetDuration || 20,
    aspectRatio: partial?.aspectRatio || '16:9',
    fps: partial?.fps || 30,
    scenes: partial?.scenes || [
      {
        id: randomUUID(),
        title: 'Apertura',
        duration: 5,
        visualPrompt: 'Vista aérea de ciudad futurista',
        shotType: 'wide',
        cameraMotion: 'dolly-in',
        assets: [],
        transitionIn: 'fade',
        transitionOut: 'slide'
      }
    ],
    audio: partial?.audio || {
      musicPrompt: 'pista electrónica ligera',
      sfx: [],
      voiceover: { text: 'Bienvenido a tu nuevo video', voice: 'neutral', language: 'es', speed: 1 }
    },
    subtitles: partial?.subtitles || { enabled: true, style: 'clean', transcript: [] },
    versionHistory: partial?.versionHistory || []
  });
  return parsed;
}

function inferAction(message: string, state: ProjectState): Action {
  const text = message.toLowerCase();
  if (text.includes('nuevo video') || text.includes('desde cero') || text.includes('crear')) {
    return { type: 'CREATE_PROJECT', payload: { id: randomUUID(), title: 'Proyecto', scenes: [] } } as Action;
  }
  if (text.includes('agrega escena') || text.includes('nueva escena')) {
    const scene: Partial<Scene> = {
      id: randomUUID(),
      title: 'Nueva escena',
      duration: 4,
      visualPrompt: message,
      transitionIn: 'fade',
      transitionOut: 'fade'
    };
    return { type: 'ADD_SCENE', payload: scene } as Action;
  }
  if (text.includes('elimina') || text.includes('borra escena')) {
    const lastId = state.scenes[state.scenes.length - 1]?.id;
    return { type: 'REMOVE_SCENE', payload: { id: lastId || '' } } as Action;
  }
  if (text.includes('render')) {
    return { type: 'RENDER', payload: {} } as Action;
  }
  if (text.includes('subtítulo') || text.includes('subtitulo')) {
    return { type: 'SET_SUBTITLES', payload: { enabled: true } } as Action;
  }
  if (text.includes('música') || text.includes('musica')) {
    return { type: 'SET_AUDIO', payload: { musicPrompt: message } } as Action;
  }
  if (text.includes('voz') || text.includes('narración')) {
    return { type: 'SET_VOICEOVER', payload: { text: message } } as Action;
  }
  return { type: 'EDIT_SCENE', payload: { id: state.scenes[0]?.id || randomUUID(), data: { visualPrompt: message } } } as Action;
}

export function handleChatMessage(message: string, current: ProjectState): { action: Action; updated: ProjectState; response: string } {
  const safety = isSafe(message);
  if (!safety.allowed) {
    return {
      action: { type: 'RENDER', payload: {} },
      updated: current,
      response: safety.reason || 'Solicitud bloqueada'
    };
  }

  const action = inferAction(message, current);
  const validatedAction = ActionSchema.parse(action);
  const updated = applyAction(validatedAction, current);
  const response = describeUpdate(validatedAction, updated);

  return { action: validatedAction, updated, response };
}

function applyAction(action: Action, state: ProjectState): ProjectState {
  const snapshot = { ...state };
  const next = { ...state, versionHistory: [...state.versionHistory, snapshot] } as ProjectState;
  switch (action.type) {
    case 'CREATE_PROJECT':
      return defaultProjectState({ ...action.payload, scenes: [] });
    case 'ADD_SCENE':
      return { ...next, scenes: [...state.scenes, { ...state.scenes[state.scenes.length - 1], ...action.payload, id: action.payload.id || randomUUID() } as Scene] };
    case 'EDIT_SCENE':
      return {
        ...next,
        scenes: state.scenes.map((scene) => (scene.id === action.payload.id ? { ...scene, ...action.payload.data } : scene))
      };
    case 'REMOVE_SCENE':
      return { ...next, scenes: state.scenes.filter((scene) => scene.id !== action.payload.id) };
    case 'REORDER_SCENES':
      return { ...next, scenes: action.payload.order.map((id) => state.scenes.find((s) => s.id === id)).filter(Boolean) as Scene[] };
    case 'SET_STYLE':
      return { ...next, style: action.payload.style, aspectRatio: action.payload.aspectRatio || state.aspectRatio, fps: action.payload.fps || state.fps, targetDuration: action.payload.targetDuration || state.targetDuration };
    case 'SET_AUDIO':
      return { ...next, audio: { ...state.audio, ...action.payload } };
    case 'SET_VOICEOVER':
      return {
        ...next,
        audio: {
          ...state.audio,
          voiceover: {
            text: action.payload.text,
            voice: action.payload.voice || state.audio.voiceover?.voice || 'neutral',
            language: action.payload.language || state.audio.voiceover?.language || 'es',
            speed: action.payload.speed || state.audio.voiceover?.speed || 1
          }
        }
      };
    case 'SET_SUBTITLES':
      return { ...next, subtitles: { ...state.subtitles, ...action.payload } };
    case 'RENDER':
    default:
      return next;
  }
}

function describeUpdate(action: Action, state: ProjectState): string {
  switch (action.type) {
    case 'ADD_SCENE':
      return `Se agregó una escena (${action.payload.title || 'Nueva escena'}). Total: ${state.scenes.length}.`;
    case 'EDIT_SCENE':
      return 'Escena actualizada.';
    case 'REMOVE_SCENE':
      return 'Escena eliminada.';
    case 'SET_STYLE':
      return `Estilo cambiado a ${action.payload.style}.`;
    case 'SET_AUDIO':
      return 'Audio configurado.';
    case 'SET_VOICEOVER':
      return 'Narración actualizada.';
    case 'SET_SUBTITLES':
      return `Subtítulos ${action.payload.enabled ? 'activados' : 'desactivados'}.`;
    case 'REORDER_SCENES':
      return 'Se reordenaron las escenas.';
    case 'CREATE_PROJECT':
      return 'Proyecto inicializado.';
    case 'RENDER':
      return 'Render encolado.';
    default:
      return 'Actualizado.';
  }
}
