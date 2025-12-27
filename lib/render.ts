import { exec as execCallback } from 'child_process';
import fs from 'fs';
import path from 'path';
import util from 'util';
import { ProjectState, Scene } from './types';

const exec = util.promisify(execCallback);
const FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';
const rendersRoot = path.join(process.cwd(), '.renders');

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function resolutionFromAspect(aspectRatio: string) {
  if (aspectRatio === '9:16') return '1080x1920';
  if (aspectRatio === '1:1') return '1080x1080';
  return '1280x720';
}

async function renderScene(scene: Scene, opts: { index: number; aspect: string; fps: number; dir: string }) {
  const size = resolutionFromAspect(opts.aspect);
  const out = path.join(opts.dir, `scene-${opts.index}.mp4`);
  const text = scene.visualPrompt || scene.title || `Escena ${opts.index + 1}`;
  const bgColor = ['#0b1021', '#111827', '#0f172a'][opts.index % 3];
  const cmd = `ffmpeg -y -f lavfi -i "color=c=${bgColor}:s=${size}:d=${scene.duration}" -vf "drawtext=fontfile=${FONT}:fontsize=40:fontcolor=white:text='${escapeQuotes(
    text
  )}':x=(w-text_w)/2:y=(h-text_h)/2" -c:v libx264 -pix_fmt yuv420p -r ${opts.fps} ${out}`;
  await exec(cmd);
  return out;
}

function escapeQuotes(input: string) {
  return input.replace(/'/g, "\\'");
}

async function concatVideos(files: string[], target: string) {
  const listPath = `${target}.txt`;
  const list = files.map((file) => `file '${file.replace(/'/g, "'\\''")}'`).join('\n');
  fs.writeFileSync(listPath, list);
  await exec(`ffmpeg -y -f concat -safe 0 -i ${listPath} -c copy ${target}`);
}

async function generateAudio(duration: number, prompt?: string) {
  const audioPath = path.join(rendersRoot, `music-${Date.now()}.wav`);
  const frequency = prompt?.toLowerCase().includes('épico') ? 80 : 320;
  await exec(`ffmpeg -y -f lavfi -i "sine=frequency=${frequency}:duration=${duration}:sample_rate=44100" -filter:a "volume=0.3" ${audioPath}`);
  return audioPath;
}

async function addSubtitles(videoPath: string, subtitles: string, output: string) {
  const srtPath = `${output}.srt`;
  fs.writeFileSync(srtPath, subtitles);
  await exec(`ffmpeg -y -i ${videoPath} -vf subtitles=${srtPath} -c:a copy ${output}`);
}

function buildSubtitles(scenes: Scene[]): string {
  let current = 0;
  return scenes
    .map((scene, idx) => {
      const start = current;
      const end = current + scene.duration;
      current = end;
      return `${idx + 1}\n${formatTime(start)} --> ${formatTime(end)}\n${scene.visualPrompt || scene.title}\n\n`;
    })
    .join('');
}

function formatTime(seconds: number) {
  const date = new Date(seconds * 1000);
  const hh = String(date.getUTCHours()).padStart(2, '0');
  const mm = String(date.getUTCMinutes()).padStart(2, '0');
  const ss = String(date.getUTCSeconds()).padStart(2, '0');
  const ms = String(date.getUTCMilliseconds()).padStart(3, '0');
  return `${hh}:${mm}:${ss},${ms}`;
}

export async function renderProject(project: ProjectState) {
  ensureDir(rendersRoot);
  const dir = path.join(rendersRoot, `${project.id}-${Date.now()}`);
  ensureDir(dir);
  const clips: string[] = [];
  for (const [index, scene] of project.scenes.entries()) {
    const clip = await renderScene(scene, { index, aspect: project.aspectRatio, fps: project.fps, dir });
    clips.push(clip);
  }
  const concatenated = path.join(dir, 'video-temp.mp4');
  await concatVideos(clips, concatenated);
  const totalDuration = project.scenes.reduce((acc, scene) => acc + scene.duration, 0) || 5;
  const music = await generateAudio(totalDuration, project.audio?.musicPrompt);
  const withAudio = path.join(dir, 'video-with-audio.mp4');
  await exec(`ffmpeg -y -i ${concatenated} -i ${music} -shortest -c:v copy -c:a aac ${withAudio}`);

  let finalPath = path.join(dir, 'final.mp4');
  if (project.subtitles?.enabled) {
    const subtitles = buildSubtitles(project.scenes);
    await addSubtitles(withAudio, subtitles, finalPath);
  } else {
    await exec(`cp ${withAudio} ${finalPath}`);
  }

  return { renderPath: finalPath, renderId: path.basename(dir), duration: totalDuration };
}
