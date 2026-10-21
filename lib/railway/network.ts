import type {
  Endpoint,
  Track,
  Network,
  Link,
  PathId,
  Route,
  RouteLink,
} from "./types";
import { endpoints, activePaths, pathLength } from "./geometry";
export const endpointKey = (id: string, end: number) => `${id}:${end}`;
export const routeKey = (id: string, pathId: PathId = "main") =>
  JSON.stringify([id, pathId]);
const routeEndKey = (id: string, pathId: PathId, end: number) =>
  JSON.stringify([id, pathId, end]);
export function compatible(a: Endpoint, b: Endpoint): boolean {
  return (
    a.pieceId !== b.pieceId &&
    Math.hypot(a.x - b.x, a.y - b.y) < 1e-6 &&
    a.dx * b.dx + a.dy * b.dy < -1 + 1e-6
  );
}
export function nextRoute(
  n: Network,
  id: string,
  pathId: PathId,
  end: 0 | 1,
): RouteLink | undefined {
  return n.routeLinks.get(routeEndKey(id, pathId, end));
}
export function buildNetwork(tracks: Track[]): Network {
  const all = tracks.flatMap(endpoints),
    links = new Map<string, Link>(),
    routes = new Map<string, Route>(),
    routeLinks = new Map<string, RouteLink>();
  const buckets = new Map<string, Endpoint[]>();
  for (const ep of all) {
    const key = `${ep.x.toFixed(6)},${ep.y.toFixed(6)}`;
    const b = buckets.get(key) || [];
    b.push(ep);
    buckets.set(key, b);
  }
  for (const b of buckets.values())
    if (b.length === 2 && compatible(b[0], b[1])) {
      const [a, c] = b;
      links.set(endpointKey(a.pieceId, a.end), {
        pieceId: c.pieceId,
        end: c.end,
      });
      links.set(endpointKey(c.pieceId, c.end), {
        pieceId: a.pieceId,
        end: a.end,
      });
    }
  // Physical ports are shared; active paths are independent graph nodes, even on one tile.
  const portRoutes = new Map<string, { route: Route; side: 0 | 1 }>();
  for (const t of tracks)
    for (const p of activePaths(t)) {
      const r: Route = {
        pieceId: t.id,
        pathId: p.id,
        length: pathLength(t, p.id),
        ports: p.ports,
      };
      routes.set(routeKey(t.id, p.id), r);
      for (const side of [0, 1] as const)
        portRoutes.set(endpointKey(t.id, p.ports[side]), { route: r, side });
    }
  for (const r of routes.values())
    for (const side of [0, 1] as const) {
      const link = links.get(endpointKey(r.pieceId, r.ports[side]));
      if (!link) continue;
      const entry = portRoutes.get(endpointKey(link.pieceId, link.end));
      if (entry)
        routeLinks.set(routeEndKey(r.pieceId, r.pathId, side), {
          pieceId: entry.route.pieceId,
          pathId: entry.route.pathId,
          end: entry.side,
        });
    }
  const visited = new Set<string>(),
    components: string[][] = [];
  for (const key of routes.keys()) {
    if (visited.has(key)) continue;
    const stack = [key],
      component: string[] = [];
    while (stack.length) {
      const current = stack.pop()!;
      if (visited.has(current)) continue;
      visited.add(current);
      component.push(current);
      const r = routes.get(current)!;
      for (const side of [0, 1] as const) {
        const next = routeLinks.get(routeEndKey(r.pieceId, r.pathId, side));
        if (next) stack.push(routeKey(next.pieceId, next.pathId));
      }
    }
    components.push(component);
  }
  const loops = components.filter(
    (c) =>
      c.length > 1 &&
      c.every((key) => {
        const r = routes.get(key)!;
        return (
          routeLinks.has(routeEndKey(r.pieceId, r.pathId, 0)) &&
          routeLinks.has(routeEndKey(r.pieceId, r.pathId, 1))
        );
      }),
  );
  const epByKey = new Map(
    all.map((ep) => [endpointKey(ep.pieceId, ep.end), ep]),
  );
  const openEnds: Endpoint[] = [];
  for (const r of routes.values())
    for (const side of [0, 1] as const)
      if (!routeLinks.has(routeEndKey(r.pieceId, r.pathId, side)))
        openEnds.push(epByKey.get(endpointKey(r.pieceId, r.ports[side]))!);
  return { links, routes, routeLinks, components, loops, openEnds };
}
export function loopLengthFor(
  n: Network,
  id: string,
  pathId: PathId = "main",
): number {
  const c = n.loops.find((c) => c.includes(routeKey(id, pathId)));
  return c ? c.reduce((sum, key) => sum + n.routes.get(key)!.length, 0) : 0;
}
