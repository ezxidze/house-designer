import { useRef, useState, useCallback, useEffect } from "react";
import useStore from "../store/useStore";

const CANVAS_W = 1200;
const CANVAS_H = 800;

export default function Editor2D() {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  const {
    tool, gridSize, snap, showDimensions,
    isDrawing, drawStart, startDrawing, stopDrawing,
    addWall, addWindow, addDoor,
    selectedId, selectedType, selectElement, clearSelection,
    isDragging, startDrag, stopDrag, moveElement,
    getFloor, undo, redo, setTool,
  } = useStore();

  const floor = getFloor();
  const walls = floor?.walls || [];
  const windows = floor?.windows || [];
  const doors = floor?.doors || [];
  const rooms = floor?.rooms || [];

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [previewEnd, setPreviewEnd] = useState(null);
  const [dragLast, setDragLast] = useState(null);

  const getPos = useCallback(
    (e) => {
      const el = canvasRef.current;
      if (!el) return { x: 0, y: 0 };
      const rect = el.getBoundingClientRect();
      return {
        x: snap((e.clientX - rect.left) * (CANVAS_W / rect.width)),
        y: snap((e.clientY - rect.top) * (CANVAS_H / rect.height)),
      };
    },
    [snap]
  );

  // --- Hit testing ---
  const hitTest = useCallback(
    (pos) => {
      // Windows (point hit)
      for (const w of windows) {
        if (Math.abs(pos.x - w.x) < 20 && Math.abs(pos.y - w.y) < 12) {
          return { id: w.id, type: "window" };
        }
      }
      // Doors
      for (const d of doors) {
        if (Math.abs(pos.x - d.x) < 22 && Math.abs(pos.y - d.y) < 14) {
          return { id: d.id, type: "door" };
        }
      }
      // Walls (line distance)
      for (const w of walls) {
        const dist = pointToSegDist(pos.x, pos.y, w.x1, w.y1, w.x2, w.y2);
        if (dist < (w.thickness || 20) / 2 + 5) {
          return { id: w.id, type: "wall" };
        }
      }
      return null;
    },
    [walls, windows, doors]
  );

  // Mouse handlers
  const handleMouseDown = (e) => {
    const pos = getPos(e);

    if (tool === "select") {
      const hit = hitTest(pos);
      if (hit) {
        selectElement(hit.id, hit.type);
        startDrag({ x: pos.x, y: pos.y });
        setDragLast(pos);
      } else {
        clearSelection();
      }
      return;
    }

    if (tool === "wall") {
      if (!isDrawing) {
        startDrawing(pos);
        setPreviewEnd(pos);
      }
    } else if (tool === "window") {
      addWindow({ x: pos.x, y: pos.y });
    } else if (tool === "door") {
      addDoor({ x: pos.x, y: pos.y });
    }
  };

  const handleMouseMove = (e) => {
    const pos = getPos(e);
    setMousePos(pos);

    if (tool === "wall" && isDrawing) {
      setPreviewEnd(pos);
    }

    if (tool === "select" && isDragging && selectedId && dragLast) {
      const dx = pos.x - dragLast.x;
      const dy = pos.y - dragLast.y;
      if (dx !== 0 || dy !== 0) {
        moveElement(selectedId, selectedType, dx, dy);
        setDragLast(pos);
      }
    }
  };

  const handleMouseUp = (e) => {
    if (tool === "wall" && isDrawing && drawStart) {
      const pos = getPos(e);
      const len = Math.sqrt((pos.x - drawStart.x) ** 2 + (pos.y - drawStart.y) ** 2);
      if (len > 10) {
        addWall({ x1: drawStart.x, y1: drawStart.y, x2: pos.x, y2: pos.y });
      }
      stopDrawing();
      setPreviewEnd(null);
    }

    if (tool === "select" && isDragging) {
      stopDrag();
      setDragLast(null);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT") return;
      if (e.ctrlKey && e.key === "z") { e.preventDefault(); undo(); }
      if (e.ctrlKey && e.key === "y") { e.preventDefault(); redo(); }
      if (e.key === "v" || e.key === "V" || e.key === "м" || e.key === "М") setTool("select");
      if (e.key === "w" || e.key === "W" || e.key === "ц" || e.key === "Ц") setTool("wall");
      if (e.key === "n" || e.key === "N" || e.key === "т" || e.key === "Т") setTool("window");
      if (e.key === "d" || e.key === "D" || e.key === "в" || e.key === "В") setTool("door");
      if (e.key === "Delete" || e.key === "Backspace") {
        const s = useStore.getState();
        if (s.selectedId) {
          if (s.selectedType === "wall") s.removeWall(s.selectedId);
          else if (s.selectedType === "window") s.removeWindow(s.selectedId);
          else if (s.selectedType === "door") s.removeDoor(s.selectedId);
        }
      }
      if (e.key === "Escape") {
        clearSelection();
        if (isDrawing) { stopDrawing(); setPreviewEnd(null); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, setTool, clearSelection, isDrawing, stopDrawing]);

  // --- Drawing ---
  const draw = useCallback(
    (ctx) => {
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

      // Grid
      ctx.strokeStyle = "#f0f0f0";
      ctx.lineWidth = 0.5;
      for (let x = 0; x <= CANVAS_W; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_H); ctx.stroke();
      }
      for (let y = 0; y <= CANVAS_H; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_W, y); ctx.stroke();
      }
      // Major grid
      ctx.strokeStyle = "#e0e0e0";
      ctx.lineWidth = 1;
      for (let x = 0; x <= CANVAS_W; x += gridSize * 5) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_H); ctx.stroke();
      }
      for (let y = 0; y <= CANVAS_H; y += gridSize * 5) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_W, y); ctx.stroke();
      }

      // Rooms (filled polygons)
      for (const room of rooms) {
        if (room.points.length < 3) continue;
        ctx.fillStyle = room.color || "rgba(59,130,246,0.08)";
        ctx.beginPath();
        ctx.moveTo(room.points[0].x, room.points[0].y);
        for (let i = 1; i < room.points.length; i++) {
          ctx.lineTo(room.points[i].x, room.points[i].y);
        }
        ctx.closePath();
        ctx.fill();

        // Room area label
        const cx = room.points.reduce((s, p) => s + p.x, 0) / room.points.length;
        const cy = room.points.reduce((s, p) => s + p.y, 0) / room.points.length;
        const areaM2 = (room.area / 10000).toFixed(2);
        ctx.fillStyle = "rgba(37,99,235,0.6)";
        ctx.font = "bold 13px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`${areaM2} m²`, cx, cy + 5);
        ctx.textAlign = "start";
      }

      // Walls
      ctx.lineCap = "round";
      for (const wall of walls) {
        const isSelected = selectedId === wall.id && selectedType === "wall";

        // Wall body
        ctx.strokeStyle = isSelected ? "#2563eb" : "#374151";
        ctx.lineWidth = wall.thickness || 20;
        ctx.beginPath();
        ctx.moveTo(wall.x1, wall.y1);
        ctx.lineTo(wall.x2, wall.y2);
        ctx.stroke();

        // Selection highlight
        if (isSelected) {
          ctx.strokeStyle = "rgba(37,99,235,0.3)";
          ctx.lineWidth = (wall.thickness || 20) + 10;
          ctx.beginPath();
          ctx.moveTo(wall.x1, wall.y1);
          ctx.lineTo(wall.x2, wall.y2);
          ctx.stroke();
        }

        // Dimension lines
        if (showDimensions) {
          drawDimension(ctx, wall.x1, wall.y1, wall.x2, wall.y2, wall.thickness || 20);
        }
      }

      // Preview wall
      if (isDrawing && drawStart && previewEnd) {
        ctx.strokeStyle = "#3b82f6";
        ctx.lineWidth = 20;
        ctx.setLineDash([8, 4]);
        ctx.beginPath();
        ctx.moveTo(drawStart.x, drawStart.y);
        ctx.lineTo(previewEnd.x, previewEnd.y);
        ctx.stroke();
        ctx.setLineDash([]);

        const len = Math.round(Math.sqrt((previewEnd.x - drawStart.x) ** 2 + (previewEnd.y - drawStart.y) ** 2));
        ctx.fillStyle = "#3b82f6";
        ctx.font = "bold 14px monospace";
        ctx.fillText(`${len} cm`, previewEnd.x + 12, previewEnd.y - 12);
      }

      // Windows
      for (const win of windows) {
        const isSelected = selectedId === win.id && selectedType === "window";
        const w = 32, h = 8;

        if (isSelected) {
          ctx.fillStyle = "rgba(37,99,235,0.15)";
          ctx.fillRect(win.x - w / 2 - 4, win.y - h / 2 - 4, w + 8, h + 8);
        }

        ctx.fillStyle = isSelected ? "#2563eb" : "#60a5fa";
        ctx.strokeStyle = isSelected ? "#1d4ed8" : "#2563eb";
        ctx.lineWidth = 2;
        ctx.fillRect(win.x - w / 2, win.y - h / 2, w, h);
        ctx.strokeRect(win.x - w / 2, win.y - h / 2, w, h);

        // Glass lines
        ctx.strokeStyle = "rgba(255,255,255,0.6)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(win.x - w / 2 + 4, win.y);
        ctx.lineTo(win.x + w / 2 - 4, win.y);
        ctx.stroke();
      }

      // Doors
      for (const door of doors) {
        const isSelected = selectedId === door.id && selectedType === "door";
        const w = 36, h = 10;

        if (isSelected) {
          ctx.fillStyle = "rgba(37,99,235,0.15)";
          ctx.fillRect(door.x - w / 2 - 4, door.y - h / 2 - 4, w + 8, h + 8);
        }

        ctx.fillStyle = isSelected ? "#2563eb" : "#f59e0b";
        ctx.strokeStyle = isSelected ? "#1d4ed8" : "#d97706";
        ctx.lineWidth = 2;
        ctx.fillRect(door.x - w / 2, door.y - h / 2, w, h);
        ctx.strokeRect(door.x - w / 2, door.y - h / 2, w, h);

        // Door swing arc
        ctx.strokeStyle = isSelected ? "#2563eb" : "#d97706";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.arc(door.x - w / 2, door.y, w, -Math.PI / 2, 0);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Crosshair
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 0.5;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(mousePos.x, 0); ctx.lineTo(mousePos.x, CANVAS_H);
      ctx.moveTo(0, mousePos.y); ctx.lineTo(CANVAS_W, mousePos.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Coordinates
      ctx.fillStyle = "#64748b";
      ctx.font = "11px monospace";
      ctx.fillText(`(${mousePos.x}, ${mousePos.y})`, 8, CANVAS_H - 8);

      // Tool hint
      const hints = { wall: "Click+drag to draw wall", window: "Click to place window", door: "Click to place door", select: "Click to select, drag to move" };
      ctx.fillStyle = "#94a3b8";
      ctx.font = "11px sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(hints[useStore.getState().tool] || "", CANVAS_W - 8, CANVAS_H - 8);
      ctx.textAlign = "start";
    },
    [walls, windows, doors, rooms, isDrawing, drawStart, previewEnd, gridSize, mousePos, showDimensions, selectedId, selectedType]
  );

  // Render canvas
  const canvasCallback = useCallback(
    (node) => {
      canvasRef.current = node;
      if (node) draw(node.getContext("2d"));
    },
    [draw]
  );

  return (
    <canvas
      ref={canvasCallback}
      width={CANVAS_W}
      height={CANVAS_H}
      className="border border-gray-300 bg-white w-full h-full"
      style={{ cursor: tool === "select" ? (isDragging ? "grabbing" : "default") : "crosshair" }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => {
        if (isDrawing) { stopDrawing(); setPreviewEnd(null); }
        if (isDragging) { stopDrag(); setDragLast(null); }
      }}
    />
  );
}

// --- Helpers ---

function pointToSegDist(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = x1 + t * dx, cy = y1 + t * dy;
  return Math.sqrt((px - cx) ** 2 + (py - cy) ** 2);
}

function drawDimension(ctx, x1, y1, x2, y2, thickness) {
  const len = Math.round(Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2));
  if (len < 30) return;

  const dx = x2 - x1, dy = y2 - y1;
  const mag = Math.sqrt(dx * dx + dy * dy);
  const nx = -dy / mag, ny = dx / mag;
  const offset = thickness / 2 + 18;

  const ax1 = x1 + nx * offset, ay1 = y1 + ny * offset;
  const ax2 = x2 + nx * offset, ay2 = y2 + ny * offset;

  // Dimension line
  ctx.strokeStyle = "#94a3b8";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(ax1, ay1);
  ctx.lineTo(ax2, ay2);
  ctx.stroke();

  // Ticks
  const tickLen = 6;
  ctx.beginPath();
  ctx.moveTo(ax1 - nx * tickLen, ay1 - ny * tickLen);
  ctx.lineTo(ax1 + nx * tickLen, ay1 + ny * tickLen);
  ctx.moveTo(ax2 - nx * tickLen, ay2 - ny * tickLen);
  ctx.lineTo(ax2 + nx * tickLen, ay2 + ny * tickLen);
  ctx.stroke();

  // Extension lines
  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(x1 + nx * (thickness / 2 + 4), y1 + ny * (thickness / 2 + 4));
  ctx.lineTo(ax1 + nx * 4, ay1 + ny * 4);
  ctx.moveTo(x2 + nx * (thickness / 2 + 4), y2 + ny * (thickness / 2 + 4));
  ctx.lineTo(ax2 + nx * 4, ay2 + ny * 4);
  ctx.stroke();

  // Label
  const mx = (ax1 + ax2) / 2, my = (ay1 + ay2) / 2;
  const angle = Math.atan2(dy, dx);
  ctx.save();
  ctx.translate(mx, my);
  ctx.rotate(angle);
  ctx.fillStyle = "#64748b";
  ctx.font = "10px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillText(`${len}`, 0, -3);
  ctx.restore();
}
