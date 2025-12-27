'use client';

import { useEffect, useMemo, useState } from 'react';
import { Scene, ProjectState } from '../lib/types';
import { FaMusic, FaPlus, FaSubscript, FaWandMagicSparkles } from 'react-icons/fa6';
import { clsx } from 'clsx';

interface Message {
  sender: 'user' | 'assistant';
  text: string;
}

export default function Home() {
  const [project, setProject] = useState<ProjectState | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [jobId, setJobId] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);

  useEffect(() => {
    const bootstrap = async () => {
      const res = await fetch('/api/projects');
      const list = await res.json();
      if (list.length > 0) {
        setProject(list[0].projectState ?? list[0]);
      } else {
        const created = await fetch('/api/projects', { method: 'POST', body: JSON.stringify({ title: 'Proyecto demo' }) });
        const data = await created.json();
        setProject(data.state);
      }
    };
    bootstrap();
  }, []);

  const sendMessage = async () => {
    if (!input.trim() || !project) return;
    const text = input.trim();
    setMessages((prev) => [...prev, { sender: 'user', text }]);
    setInput('');
    const res = await fetch(`/api/projects/${project.id}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text })
    });
    const data = await res.json();
    if (data.state) setProject(data.state);
    setMessages((prev) => [...prev, { sender: 'assistant', text: data.response || 'Hecho' }]);
  };

  const updateScene = async (sceneId: string, updates: Partial<Scene>) => {
    if (!project) return;
    const nextScenes = project.scenes.map((scene) => (scene.id === sceneId ? { ...scene, ...updates } : scene));
    const updatedProject = { ...project, scenes: nextScenes } as ProjectState;
    setProject(updatedProject);
    await fetch(`/api/projects/${project.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectState: updatedProject })
    });
  };

  const queueRender = async () => {
    if (!project) return;
    setIsRendering(true);
    const res = await fetch(`/api/projects/${project.id}/render`, { method: 'POST' });
    const data = await res.json();
    setJobId(data.jobId);
    pollJob(data.jobId);
  };

  const pollJob = async (id: string) => {
    const interval = setInterval(async () => {
      const res = await fetch(`/api/jobs/${id}`);
      const data = await res.json();
      if (data.status === 'completed') {
        clearInterval(interval);
        setIsRendering(false);
        setDownloadUrl(`/api/renders/${data.result.renderId}/download`);
      }
      if (data.status === 'failed') {
        clearInterval(interval);
        setIsRendering(false);
        alert('Error al renderizar: ' + data.error);
      }
    }, 1000);
  };

  const totalDuration = useMemo(() => project?.scenes?.reduce((acc, scene) => acc + scene.duration, 0) || 0, [project]);

  return (
    <main className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4 lg:p-8">
      <section className="lg:col-span-2 card space-y-4">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white/60">Proyecto</p>
            <h1 className="text-2xl font-semibold">{project?.title || 'Cargando...'}</h1>
            <p className="text-white/60 text-sm">Estilo: {project?.style} · {project?.aspectRatio} · {project?.fps}fps</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => queueRender()} className="btn-primary" disabled={!project || isRendering}>
              {isRendering ? 'Renderizando...' : 'Render'}
            </button>
            {downloadUrl && (
              <a href={downloadUrl} className="btn-secondary" download>
                Descargar MP4
              </a>
            )}
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {project?.scenes.map((scene, idx) => (
            <SceneCard key={scene.id} scene={scene} index={idx} onChange={updateScene} />
          ))}
          <button
            className="border border-dashed border-white/20 rounded-xl p-4 text-center hover:border-accent/60 transition"
            onClick={() => setInput('Agrega escena nueva')}>
            <FaPlus className="mx-auto mb-2" />
            Agregar escena
          </button>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold mb-3">Timeline</h2>
          <div className="flex items-center gap-2">
            {project?.scenes.map((scene, idx) => (
              <div key={scene.id} className="flex-1 bg-white/5 rounded-lg p-3 border border-white/10">
                <p className="text-sm text-white/70">Escena {idx + 1}</p>
                <p className="font-semibold">{scene.title}</p>
                <p className="text-xs text-white/60">{scene.duration}s</p>
              </div>
            ))}
          </div>
          <p className="text-right text-white/60 mt-2 text-sm">Duración total: {totalDuration}s</p>
        </div>
      </section>

      <section className="card flex flex-col h-[80vh]">
        <ChatHeader />
        <div className="flex gap-2 mb-2">
          <QuickAction icon={<FaPlus />} label="Agregar escena" onClick={() => setInput('Agrega una escena 3 después de la 2')} />
          <QuickAction icon={<FaMusic />} label="Cambiar música" onClick={() => setInput('Pon música épica cinematográfica')} />
          <QuickAction icon={<FaSubscript />} label="Subtítulos" onClick={() => setInput('Activa subtítulos en español')} />
        </div>
        <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar">
          {messages.map((m, idx) => (
            <div key={idx} className={clsx('p-3 rounded-xl', m.sender === 'user' ? 'bg-primary/30 ml-auto max-w-[80%]' : 'bg-white/5 mr-auto max-w-[85%]')}>
              <p className="text-xs text-white/60 mb-1">{m.sender === 'user' ? 'Tú' : 'Director AI'}</p>
              <p>{m.text}</p>
            </div>
          ))}
          {messages.length === 0 && <p className="text-white/50 text-sm">Pide algo como “Haz un video de 20s estilo comercial sobre café”.</p>}
        </div>
        <div className="mt-3">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Describe lo que quieres..."
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 focus:outline-none"
            />
            <button onClick={sendMessage} className="btn-primary">Enviar</button>
          </div>
          <p className="text-xs text-white/50 mt-2">Modo seguro: bloquea solicitudes ilegales o sin consentimiento.</p>
        </div>
      </section>
    </main>
  );
}

function SceneCard({ scene, index, onChange }: { scene: Scene; index: number; onChange: (sceneId: string, updates: Partial<Scene>) => void }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm text-white/60">Escena {index + 1}</p>
        <FaWandMagicSparkles className="text-accent" />
      </div>
      <input
        className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-sm"
        value={scene.title}
        onChange={(e) => onChange(scene.id, { title: e.target.value })}
      />
      <textarea
        className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-sm"
        value={scene.visualPrompt || ''}
        placeholder="Prompt visual"
        onChange={(e) => onChange(scene.id, { visualPrompt: e.target.value })}
      />
      <div className="flex gap-2 text-sm">
        <label className="flex-1">
          <span className="text-white/60 text-xs">Duración (s)</span>
          <input
            type="number"
            min={1}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1"
            value={scene.duration}
            onChange={(e) => onChange(scene.id, { duration: Number(e.target.value) })}
          />
        </label>
        <label className="flex-1">
          <span className="text-white/60 text-xs">Transición</span>
          <input
            className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1"
            value={scene.transitionOut || ''}
            onChange={(e) => onChange(scene.id, { transitionOut: e.target.value })}
          />
        </label>
      </div>
    </div>
  );
}

function QuickAction({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-2 rounded-lg text-sm hover:border-accent/60 transition">
      {icon}
      <span>{label}</span>
    </button>
  );
}

function ChatHeader() {
  return (
    <div className="flex items-center justify-between mb-3">
      <div>
        <p className="text-xs text-white/60">AI Video Director</p>
        <h2 className="text-xl font-semibold">Chat creativo</h2>
      </div>
      <div className="text-right text-white/60 text-xs">
        <p>Acciones soportadas:</p>
        <p>Crear, agregar/editar escenas, estilo, audio, subtítulos, render.</p>
      </div>
    </div>
  );
}
