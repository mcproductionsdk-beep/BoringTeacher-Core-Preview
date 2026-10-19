// Registry is instance-scoped to avoid cross-game global state.
export function createGameRegistry() {
  const adapters = new Map();
  let active = null;
  return {
    registerGame(adapter) {
      if (!adapter?.id || typeof adapter.start !== "function") throw new TypeError("Invalid game adapter.");
      if (adapters.has(adapter.id)) throw new Error("Duplicate game adapter.");
      adapters.set(adapter.id, adapter);
    },
    async start(id, context) {
      const next = adapters.get(id);
      if (!next) throw new Error("Unknown game adapter.");
      if (active?.destroy) await active.destroy();
      active = null;
      await next.start(context);
      active = next;
    },
    pause() { active?.pause?.(); },
    resume() { active?.resume?.(); },
    reset() { active?.reset?.(); },
    async destroy() { const prior = active; active = null; await prior?.destroy?.(); }
  };
}
