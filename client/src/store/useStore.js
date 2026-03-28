import { create } from "zustand";

const GRID = 20;
const MAX_HISTORY = 50;

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function emptyFloor(name = "Floor 1") {
  return { id: uid(), name, walls: [], windows: [], doors: [], rooms: [] };
}

function emptyProject(name = "Untitled") {
  return {
    id: uid(),
    name,
    floors: [emptyFloor()],
    activeFloorId: null, // will be set after creation
  };
}

// --- Room detection: find closed polygons from wall endpoints ---
function detectRooms(walls) {
  if (walls.length < 3) return [];

  // Build adjacency from snapped endpoints
  const key = (x, y) => `${Math.round(x)},${Math.round(y)}`;
  const adj = {};
  const addEdge = (a, b) => {
    if (!adj[a]) adj[a] = new Set();
    adj[a].add(b);
  };

  for (const w of walls) {
    const a = key(w.x1, w.y1);
    const b = key(w.x2, w.y2);
    if (a === b) continue;
    addEdge(a, b);
    addEdge(b, a);
  }

  const parseKey = (k) => {
    const [x, y] = k.split(",").map(Number);
    return { x, y };
  };

  // Find minimal cycles using angle-based traversal
  const visited = new Set();
  const rooms = [];

  const allNodes = Object.keys(adj);
  for (const startNode of allNodes) {
    if ((adj[startNode]?.size || 0) < 2) continue;

    for (const firstNeighbor of adj[startNode]) {
      const path = [startNode, firstNeighbor];
      const pathSet = new Set([startNode + "|" + firstNeighbor]);
      let current = firstNeighbor;
      let prev = startNode;
      let found = false;

      for (let step = 0; step < 20; step++) {
        const neighbors = [...(adj[current] || [])].filter((n) => n !== prev);
        if (neighbors.length === 0) break;

        // Pick the neighbor with smallest left-turn angle
        const cp = parseKey(prev);
        const cc = parseKey(current);
        const inAngle = Math.atan2(cp.y - cc.y, cp.x - cc.x);

        let bestAngle = Infinity;
        let bestNeighbor = null;
        for (const n of neighbors) {
          const cn = parseKey(n);
          let angle = Math.atan2(cn.y - cc.y, cn.x - cc.x) - inAngle;
          if (angle <= 0) angle += 2 * Math.PI;
          if (angle < bestAngle) {
            bestAngle = angle;
            bestNeighbor = n;
          }
        }

        if (!bestNeighbor) break;

        const edgeKey = current + "|" + bestNeighbor;
        if (pathSet.has(edgeKey)) break;

        if (bestNeighbor === startNode && path.length >= 3) {
          found = true;
          break;
        }

        path.push(bestNeighbor);
        pathSet.add(edgeKey);
        prev = current;
        current = bestNeighbor;
      }

      if (found && path.length >= 3) {
        // Normalize room signature to avoid duplicates
        const sorted = [...path].sort().join("|");
        if (!visited.has(sorted)) {
          visited.add(sorted);
          const points = path.map(parseKey);
          // Calculate area using shoelace
          let area = 0;
          for (let i = 0; i < points.length; i++) {
            const j = (i + 1) % points.length;
            area += points[i].x * points[j].y;
            area -= points[j].x * points[i].y;
          }
          area = Math.abs(area) / 2;
          if (area > 100) {
            rooms.push({ id: uid(), points, area: Math.round(area), color: randomRoomColor() });
          }
        }
      }
    }
  }

  return rooms;
}

const ROOM_COLORS = [
  "rgba(59,130,246,0.10)",
  "rgba(16,185,129,0.10)",
  "rgba(245,158,11,0.10)",
  "rgba(239,68,68,0.10)",
  "rgba(139,92,246,0.10)",
  "rgba(236,72,153,0.10)",
  "rgba(14,165,233,0.10)",
];
let colorIdx = 0;
function randomRoomColor() {
  return ROOM_COLORS[colorIdx++ % ROOM_COLORS.length];
}

// --- localStorage helpers ---
function loadProjects() {
  try {
    return JSON.parse(localStorage.getItem("hd_projects") || "[]");
  } catch {
    return [];
  }
}
function saveProjects(list) {
  localStorage.setItem("hd_projects", JSON.stringify(list));
}

const useStore = create((set, get) => ({
  // Project
  project: null,
  savedProjects: loadProjects(),

  // Active floor
  activeFloorId: null,

  // Editor
  tool: "wall", // wall | window | door | select
  gridSize: GRID,
  snapEnabled: true,
  viewMode: "2d",
  showDimensions: true,

  // Wall defaults for new walls
  wallDefaults: { height: 280, thickness: 20, material: "Brick" },
  setWallDefault: (key, val) => set((s) => ({ wallDefaults: { ...s.wallDefaults, [key]: val } })),

  // Drawing
  isDrawing: false,
  drawStart: null,

  // Selection
  selectedId: null,
  selectedType: null, // wall | window | door
  isDragging: false,
  dragOffset: null,

  // Undo / Redo
  history: [],
  future: [],

  // --- Helpers ---
  getFloor: () => {
    const { project, activeFloorId } = get();
    if (!project) return null;
    return project.floors.find((f) => f.id === activeFloorId) || project.floors[0];
  },

  snap: (val) => {
    const { snapEnabled, gridSize } = get();
    return snapEnabled ? Math.round(val / gridSize) * gridSize : val;
  },

  // --- History ---
  _pushHistory: () => {
    const { project, history } = get();
    if (!project) return;
    const snapshot = JSON.parse(JSON.stringify(project));
    const newHistory = [...history, snapshot].slice(-MAX_HISTORY);
    set({ history: newHistory, future: [] });
  },

  undo: () => {
    const { history, project, future } = get();
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    set({
      history: history.slice(0, -1),
      future: [JSON.parse(JSON.stringify(project)), ...future],
      project: prev,
      activeFloorId: prev.activeFloorId || prev.floors[0]?.id,
    });
  },

  redo: () => {
    const { future, project, history } = get();
    if (future.length === 0) return;
    const next = future[0];
    set({
      future: future.slice(1),
      history: [...history, JSON.parse(JSON.stringify(project))],
      project: next,
      activeFloorId: next.activeFloorId || next.floors[0]?.id,
    });
  },

  // Modify floor helper (auto-pushes history & detects rooms)
  _modifyFloor: (fn) => {
    const s = get();
    if (!s.project) return;
    s._pushHistory();
    const floors = s.project.floors.map((f) => {
      if (f.id !== s.activeFloorId) return f;
      const updated = fn(f);
      updated.rooms = detectRooms(updated.walls);
      return updated;
    });
    set({ project: { ...s.project, floors } });
  },

  // --- Tools ---
  setTool: (tool) => set({ tool, selectedId: null, selectedType: null }),
  setViewMode: (mode) => set({ viewMode: mode }),
  toggleSnap: () => set((s) => ({ snapEnabled: !s.snapEnabled })),
  toggleDimensions: () => set((s) => ({ showDimensions: !s.showDimensions })),

  // --- Drawing ---
  startDrawing: (point) => set({ isDrawing: true, drawStart: point }),
  stopDrawing: () => set({ isDrawing: false, drawStart: null }),

  // --- Elements ---
  addWall: (wall) => {
    const d = get().wallDefaults;
    get()._modifyFloor((f) => ({
      ...f,
      walls: [...f.walls, { ...wall, id: uid(), thickness: d.thickness, height: d.height, material: d.material }],
    }));
  },

  addWindow: (win) => {
    get()._modifyFloor((f) => ({
      ...f,
      windows: [...f.windows, { ...win, id: uid(), width: 100, height: 120, rotation: 0 }],
    }));
  },

  addDoor: (door) => {
    get()._modifyFloor((f) => ({
      ...f,
      doors: [...f.doors, { ...door, id: uid(), width: 90, height: 210, rotation: 0 }],
    }));
  },

  removeWall: (id) => {
    get()._modifyFloor((f) => ({ ...f, walls: f.walls.filter((w) => w.id !== id) }));
    set({ selectedId: null, selectedType: null });
  },
  removeWindow: (id) => {
    get()._modifyFloor((f) => ({ ...f, windows: f.windows.filter((w) => w.id !== id) }));
    set({ selectedId: null, selectedType: null });
  },
  removeDoor: (id) => {
    get()._modifyFloor((f) => ({ ...f, doors: f.doors.filter((d) => d.id !== id) }));
    set({ selectedId: null, selectedType: null });
  },

  updateWall: (id, data) => {
    get()._modifyFloor((f) => ({
      ...f,
      walls: f.walls.map((w) => (w.id === id ? { ...w, ...data } : w)),
    }));
  },

  updateWindow: (id, data) => {
    get()._modifyFloor((f) => ({
      ...f,
      windows: f.windows.map((w) => (w.id === id ? { ...w, ...data } : w)),
    }));
  },

  updateDoor: (id, data) => {
    get()._modifyFloor((f) => ({
      ...f,
      doors: f.doors.map((d) => (d.id === id ? { ...d, ...data } : d)),
    }));
  },

  // --- Rotate element (windows/doors) ---
  rotateElement: (id, type, angleDeg) => {
    if (type === "window") {
      get()._modifyFloor((f) => ({
        ...f,
        windows: f.windows.map((w) =>
          w.id === id ? { ...w, rotation: ((w.rotation || 0) + angleDeg) % 360 } : w
        ),
      }));
    }
    if (type === "door") {
      get()._modifyFloor((f) => ({
        ...f,
        doors: f.doors.map((d) =>
          d.id === id ? { ...d, rotation: ((d.rotation || 0) + angleDeg) % 360 } : d
        ),
      }));
    }
  },

  // --- Resize element (windows/doors) ---
  resizeElement: (id, type, newWidth, newHeight) => {
    const w = Math.max(20, newWidth);
    const h = Math.max(20, newHeight);
    if (type === "window") {
      get()._modifyFloor((f) => ({
        ...f,
        windows: f.windows.map((win) => (win.id === id ? { ...win, width: w, height: h } : win)),
      }));
    }
    if (type === "door") {
      get()._modifyFloor((f) => ({
        ...f,
        doors: f.doors.map((d) => (d.id === id ? { ...d, width: w, height: h } : d)),
      }));
    }
  },

  // --- Selection & Drag ---
  selectElement: (id, type) => set({ selectedId: id, selectedType: type }),
  clearSelection: () => set({ selectedId: null, selectedType: null }),

  startDrag: (offset) => set({ isDragging: true, dragOffset: offset }),
  stopDrag: () => set({ isDragging: false, dragOffset: null }),

  moveElement: (id, type, dx, dy) => {
    const snap = get().snap;
    get()._modifyFloor((f) => {
      if (type === "wall") {
        return {
          ...f,
          walls: f.walls.map((w) =>
            w.id === id
              ? { ...w, x1: snap(w.x1 + dx), y1: snap(w.y1 + dy), x2: snap(w.x2 + dx), y2: snap(w.y2 + dy) }
              : w
          ),
        };
      }
      if (type === "window") {
        return {
          ...f,
          windows: f.windows.map((w) => (w.id === id ? { ...w, x: snap(w.x + dx), y: snap(w.y + dy) } : w)),
        };
      }
      if (type === "door") {
        return {
          ...f,
          doors: f.doors.map((d) => (d.id === id ? { ...d, x: snap(d.x + dx), y: snap(d.y + dy) } : d)),
        };
      }
      return f;
    });
  },

  // --- Floors ---
  addFloor: () => {
    const s = get();
    if (!s.project) return;
    s._pushHistory();
    const floor = emptyFloor(`Floor ${s.project.floors.length + 1}`);
    set({
      project: { ...s.project, floors: [...s.project.floors, floor] },
      activeFloorId: floor.id,
    });
  },

  removeFloor: (id) => {
    const s = get();
    if (!s.project || s.project.floors.length <= 1) return;
    s._pushHistory();
    const floors = s.project.floors.filter((f) => f.id !== id);
    set({
      project: { ...s.project, floors },
      activeFloorId: floors[0].id,
    });
  },

  setActiveFloor: (id) => set({ activeFloorId: id }),

  renameFloor: (id, name) => {
    const s = get();
    if (!s.project) return;
    set({
      project: {
        ...s.project,
        floors: s.project.floors.map((f) => (f.id === id ? { ...f, name } : f)),
      },
    });
  },

  duplicateFloor: (id) => {
    const s = get();
    if (!s.project) return;
    s._pushHistory();
    const src = s.project.floors.find((f) => f.id === id);
    if (!src) return;
    const dup = JSON.parse(JSON.stringify(src));
    dup.id = uid();
    dup.name = src.name + " (copy)";
    dup.walls = dup.walls.map((w) => ({ ...w, id: uid() }));
    dup.windows = dup.windows.map((w) => ({ ...w, id: uid() }));
    dup.doors = dup.doors.map((d) => ({ ...d, id: uid() }));
    set({
      project: { ...s.project, floors: [...s.project.floors, dup] },
      activeFloorId: dup.id,
    });
  },

  // --- Project CRUD (localStorage) ---
  newProject: () => {
    const p = emptyProject();
    p.activeFloorId = p.floors[0].id;
    set({ project: p, activeFloorId: p.floors[0].id, history: [], future: [] });
  },

  saveProject: () => {
    const { project, savedProjects } = get();
    if (!project) return;
    const entry = { ...project, savedAt: Date.now() };
    const idx = savedProjects.findIndex((p) => p.id === project.id);
    let list;
    if (idx >= 0) {
      list = [...savedProjects];
      list[idx] = entry;
    } else {
      list = [entry, ...savedProjects];
    }
    saveProjects(list);
    set({ savedProjects: list });
  },

  loadProject: (id) => {
    const { savedProjects } = get();
    const p = savedProjects.find((pr) => pr.id === id);
    if (!p) return;
    const project = JSON.parse(JSON.stringify(p));
    set({
      project,
      activeFloorId: project.activeFloorId || project.floors[0]?.id,
      history: [],
      future: [],
    });
  },

  deleteProject: (id) => {
    const { savedProjects, project } = get();
    const list = savedProjects.filter((p) => p.id !== id);
    saveProjects(list);
    set({
      savedProjects: list,
      ...(project?.id === id ? { project: null, activeFloorId: null } : {}),
    });
  },

  renameProject: (name) => {
    const { project } = get();
    if (!project) return;
    set({ project: { ...project, name } });
  },

  // Export data for PDF / DXF
  getProjectData: () => {
    const { project } = get();
    return project ? JSON.parse(JSON.stringify(project)) : null;
  },
}));

export default useStore;
