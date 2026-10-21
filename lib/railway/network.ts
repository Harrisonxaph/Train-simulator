import type { Endpoint, Track, Network, Link } from "./types";
import { endpoints } from "./geometry";
export const endpointKey = (id: string, end: number) => `${id}:${end}`;
export function compatible(a: Endpoint, b: Endpoint): boolean {
  return (
    a.pieceId !== b.pieceId &&
    Math.hypot(a.x - b.x, a.y - b.y) < 1e-6 &&
    a.dx * b.dx + a.dy * b.dy < -1 + 1e-6
  );
}
export function buildNetwork(tracks: Track[]): Network {
  const all = tracks.flatMap(endpoints),
    links = new Map<string, Link>();
  const buckets = new Map<string, Endpoint[]>();
  for (const ep of all) {
    const key = `${ep.x.toFixed(6)},${ep.y.toFixed(6)}`;
    const bucket = buckets.get(key) || [];
    bucket.push(ep);
    buckets.set(key, bucket);
  }
  for (const bucket of buckets.values()) {
    if (bucket.length === 2 && compatible(bucket[0], bucket[1])) {
      const [a, b] = bucket;
      links.set(endpointKey(a.pieceId, a.end), {
        pieceId: b.pieceId,
        end: b.end,
      });
      links.set(endpointKey(b.pieceId, b.end), {
        pieceId: a.pieceId,
        end: a.end,
      });
    }
  }
  const visited = new Set<string>(),
    components: string[][] = [];
  for (const t of tracks) {
    if (visited.has(t.id)) continue;
    const stack = [t.id],
      component: string[] = [];
    while (stack.length) {
      const id = stack.pop()!;
      if (visited.has(id)) continue;
      visited.add(id);
      component.push(id);
      for (const end of [0, 1]) {
        const next = links.get(endpointKey(id, end));
        if (next && !visited.has(next.pieceId)) stack.push(next.pieceId);
      }
    }
    components.push(component);
  }
  const loops = components.filter(
    (c) =>
      c.length > 1 &&
      c.every(
        (id) => links.has(endpointKey(id, 0)) && links.has(endpointKey(id, 1)),
      ),
  );
  return {
    links,
    components,
    loops,
    openEnds: all.filter((ep) => !links.has(endpointKey(ep.pieceId, ep.end))),
  };
}
