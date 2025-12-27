const registry = new Map<string, string>();

export function registerRender(id: string, filepath: string) {
  registry.set(id, filepath);
}

export function getRenderPath(id: string) {
  return registry.get(id);
}
