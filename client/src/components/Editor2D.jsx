import { useRef, useState, useCallback, useEffect } from "react";
import useStore from "../store/useStore";

const CANVAS_W = 1200;
const CANVAS_H = 800;
const HANDLE_SIZE = 7;
const ROT_HANDLE_DIST = 28;

export default function Editor2D() {
  const canvasRef = useRef(null);

  const {
    tool, gridSize, snap, showDimensions,
    isDrawing, drawStart, startDrawing, stopDrawing,
    addWall, addWindow, addDoor,
    selectedId, selectedType, selectElement, clearSelection,
    isDragging, startDrag, stopDrag, moveElement,
    rotateElement, resizeElement,
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

  // Resize state
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState(null); // 'tl','tr','bl','br'
  const [resizeStart, setResizeStart] = useState(null);
  const [resizeOriginal, setResizeOriginal] = useState(null);

  // Rotation state
  const [isRotating, setIsRotating] = useState(false);
  const [rotStartAngle, setRotStartAngle] = useState(0);
  const [rotOriginal, setRotOriginal] = useState(0);

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

  const getRawPos = useCallback((e) => {
    const el = canvasRef.current;
    if (!el) return { x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (CANVAS_W / rect.width),
      y: (e.clientY - rect.top) * (CANVAS_H / rect.height),
    };
  }, []);

  // Get selected element data
  const getSelectedEl = useCallback(() => {
    if (!selectedId) return null;
    if (selectedType === "window") return windows.find((w) => w.id === selectedId);
    if (selectedType === "door") return doors.find((d) => d.id === selectedId);
    return null;
  }, [selectedId, selectedType, windows, doors]);

  // Scale factor for element drawing (width in cm -> pixels)
  const elScale = 0.35;

  // Get corner handles + rotation handle for a selected window/door
  const getHandles = useCallback((el) => {
    if (!el) return { corners: [], rotHandle: null };
    const hw = (el.width * elScale) / 2;
    const hh = (el.height * elScale) / 2;
    const rot = ((el.rotation || 0) * Math.PI) / 180;
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);

    const transform = (lx, ly) => ({
      x: el.x + lx * cos - ly * sin,
      y: el.y + lx * sin + ly * cos,
    });

    const corners = [
      { key: "tl", ...transform(-hw, -hh) },
      { key: "tr", ...transform(hw, -hh) },
      { key: "br", ...transform(hw, hh) },
      { key: "bl", ...transform(-hw, hh) },
    ];

    const rotHandle = transform(0, -hh - ROT_HANDLE_DIST);

    return { corners, rotHandle };
  }, []);

  // Hit test for handles
  const hitTestHandles = useCallback(
    (pos) => {
      const el = getSelectedEl();
      if (!el) return null;
      const { corners, rotHandle } = getHandles(el);

      // Rotation handle
      if (rotHandle && Math.hypot(pos.x - rotHandle.x, pos.y - rotHandle.y) < HANDLE_SIZE + 4) {
        return { type: "rotate" };
      }

      // Corner handles
      for (const c of corners) {
        if (Math.abs(pos.x - c.x) < HANDLE_SIZE + 2 && Math.abs(pos.y - c.y) < HANDLE_SIZE + 2) {
          return { type: "resize", handle: c.key };
        }
      }
      return null;
    },
    [getSelectedEl, getHandles]
  );

  // Hit test elements (with rotation awareness)
  const hitTest = useCallback(
    (pos) => {
      // Windows
      for (const w of windows) {
        if (hitRotatedRect(pos, w, w.width * elScale, w.height * elScale)) {
          return { id: w.id, type: "window" };
        }
      }
      // Doors
      for (const d of doors) {
        if (hitRotatedRect(pos, d, d.width * elScale, d.height * elScale)) {
          return { id: d.id, type: "door" };
        }
      }
      // Walls
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
    const rawPos = getRawPos(e);

    if (tool === "select") {
      // Check handles first (resize / rotate)
      const handleHit = hitTestHandles(rawPos);
      if (handleHit) {
        const el = getSelectedEl();
        if (handleHit.type === "resize") {
          setIsResizing(true);
          setResizeHandle(handleHit.handle);
          setResizeStart(rawPos);
          setResizeOriginal({ width: el.width, height: el.height });
          return;
        }
        if (handleHit.type === "rotate") {
          setIsRotating(true);
          const angle = Math.atan2(rawPos.y - el.y, rawPos.x - el.x);
          setRotStartAngle(angle);
          setRotOriginal(el.rotation || 0);
          return;
        }
      }

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
    const rawPos = getRawPos(e);
    setMousePos(pos);

    if (tool === "wall" && isDrawing) {
      setPreviewEnd(pos);
    }

    // Resize
    if (isResizing && resizeStart && resizeOriginal && selectedId) {
      const el = getSelectedEl();
      if (el) {
        const rot = ((el.rotation || 0) * Math.PI) / 180;
        const cos = Math.cos(-rot);
        const sin = Math.sin(-rot);

        // Delta in local space
        const dx = rawPos.x - resizeStart.x;
        const dy = rawPos.y - resizeStart.y;
        const localDx = dx * cos - dy * sin;
        const localDy = dx * sin + dy * cos;

        let newW = resizeOriginal.width;
        let newH = resizeOriginal.height;

        if (resizeHandle === "tr" || resizeHandle === "br") newW = resizeOriginal.width + localDx / elScale;
        if (resizeHandle === "tl" || resizeHandle === "bl") newW = resizeOriginal.width - localDx / elScale;
        if (resizeHandle === "bl" || resizeHandle === "br") newH = resizeOriginal.height + localDy / elScale;
        if (resizeHandle === "tl" || resizeHandle === "tr") newH = resizeOriginal.height - localDy / elScale;

        resizeElement(selectedId, selectedType, Math.round(newW), Math.round(newH));
      }
      return;
    }

    // Rotate
    if (isRotating && selectedId) {
      const el = getSelectedEl();
      if (el) {
        const currentAngle = Math.atan2(rawPos.y - el.y, rawPos.x - el.x);
        let delta = ((currentAngle - rotStartAngle) * 180) / Math.PI;
        // Snap to 15 degree increments
        delta = Math.round(delta / 15) * 15;
        const newRot = (rotOriginal + delta) % 360;
        if (selectedType === "window") {
          useStore.getState().updateWindow(el.id, { rotation: newRot });
        } else if (selectedType === "door") {
          useStore.getState().updateDoor(el.id, { rotation: newRot });
        }
      }
      return;
    }

    // Drag move
    if (tool === "select" && isDragging && selectedId && dragLast) {
      const dx = pos.x - dragLast.x;
      const dy = pos.y - dragLast.y;
      if (dx !== 0 || dy !== 0) {
        moveElement(selectedId, selectedType, dx, dy);
        setDragLast(pos);
      }
    }
  };

  const handleMouseUp = () => {
    if (tool === "wall" && isDrawing && drawStart) {
      const pos = mousePos;
      const len = Math.sqrt((pos.x - drawStart.x) ** 2 + (pos.y - drawStart.y) ** 2);
      if (len > 10) {
        addWall({ x1: drawStart.x, y1: drawStart.y, x2: pos.x, y2: pos.y });
      }
      stopDrawing();
      setPreviewEnd(null);
    }

    if (isResizing) {
      setIsResizing(false);
      setResizeHandle(null);
      setResizeStart(null);
      setResizeOriginal(null);
    }

    if (isRotating) {
      setIsRotating(false);
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
      // R = rotate selected by 15° (Shift+R = 90°)
      if ((e.key === "r" || e.key === "R" || e.key === "к" || e.key === "К") && !e.ctrlKey) {
        const s = useStore.getState();
        if (s.selectedId && (s.selectedType === "window" || s.selectedType === "door")) {
          const angle = e.shiftKey ? 90 : 15;
          s.rotateElement(s.selectedId, s.selectedType, angle);
        }
      }
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
      ctx.strokeStyle = "#e0e0e0";
      ctx.lineWidth = 1;
      for (let x = 0; x <= CANVAS_W; x += gridSize * 5) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_H); ctx.stroke();
      }
      for (let y = 0; y <= CANVAS_H; y += gridSize * 5) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_W, y); ctx.stroke();
      }

      // Rooms
      for (const room of rooms) {
        if (room.points.length < 3) continue;
        ctx.fillStyle = room.color || "rgba(59,130,246,0.08)";
        ctx.beginPath();
        ctx.moveTo(room.points[0].x, room.points[0].y);
        for (let i = 1; i < room.points.length; i++) ctx.lineTo(room.points[i].x, room.points[i].y);
        ctx.closePath();
        ctx.fill();
        const cx = room.points.reduce((s, p) => s + p.x, 0) / room.points.length;
        const cy = room.points.reduce((s, p) => s + p.y, 0) / room.points.length;
        ctx.fillStyle = "rgba(37,99,235,0.6)";
        ctx.font = "bold 13px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`${(room.area / 10000).toFixed(2)} m²`, cx, cy + 5);
        ctx.textAlign = "start";
      }

      // Walls
      ctx.lineCap = "round";
      for (const wall of walls) {
        const isSel = selectedId === wall.id && selectedType === "wall";
        ctx.strokeStyle = isSel ? "#2563eb" : "#374151";
        ctx.lineWidth = wall.thickness || 20;
        ctx.beginPath();
        ctx.moveTo(wall.x1, wall.y1);
        ctx.lineTo(wall.x2, wall.y2);
        ctx.stroke();
        if (isSel) {
          ctx.strokeStyle = "rgba(37,99,235,0.3)";
          ctx.lineWidth = (wall.thickness || 20) + 10;
          ctx.beginPath(); ctx.moveTo(wall.x1, wall.y1); ctx.lineTo(wall.x2, wall.y2); ctx.stroke();
        }
        if (showDimensions) drawDimension(ctx, wall.x1, wall.y1, wall.x2, wall.y2, wall.thickness || 20);
      }

      // Preview wall
      if (isDrawing && drawStart && previewEnd) {
        ctx.strokeStyle = "#3b82f6";
        ctx.lineWidth = 20;
        ctx.setLineDash([8, 4]);
        ctx.beginPath(); ctx.moveTo(drawStart.x, drawStart.y); ctx.lineTo(previewEnd.x, previewEnd.y); ctx.stroke();
        ctx.setLineDash([]);
        const len = Math.round(Math.sqrt((previewEnd.x - drawStart.x) ** 2 + (previewEnd.y - drawStart.y) ** 2));
        ctx.fillStyle = "#3b82f6";
        ctx.font = "bold 14px monospace";
        ctx.fillText(`${len} cm`, previewEnd.x + 12, previewEnd.y - 12);
      }

      // Windows (with rotation)
      for (const win of windows) {
        const isSel = selectedId === win.id && selectedType === "window";
        const w = win.width * elScale;
        const h = win.height * elScale;
        const rot = ((win.rotation || 0) * Math.PI) / 180;

        ctx.save();
        ctx.translate(win.x, win.y);
        ctx.rotate(rot);

        // Selection glow
        if (isSel) {
          ctx.fillStyle = "rgba(37,99,235,0.12)";
          ctx.fillRect(-w / 2 - 5, -h / 2 - 5, w + 10, h + 10);
        }

        // Window body
        ctx.fillStyle = isSel ? "#93bbfc" : "#bfdbfe";
        ctx.strokeStyle = isSel ? "#1d4ed8" : "#2563eb";
        ctx.lineWidth = 2;
        ctx.fillRect(-w / 2, -h / 2, w, h);
        ctx.strokeRect(-w / 2, -h / 2, w, h);

        // Glass cross
        ctx.strokeStyle = "rgba(255,255,255,0.7)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-w / 2 + 3, 0); ctx.lineTo(w / 2 - 3, 0);
        ctx.moveTo(0, -h / 2 + 2); ctx.lineTo(0, h / 2 - 2);
        ctx.stroke();

        // Size label
        ctx.fillStyle = "#1e40af";
        ctx.font = "9px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`${win.width}×${win.height}`, 0, h / 2 + 12);

        ctx.restore();

        // Handles (drawn in world space)
        if (isSel) drawElementHandles(ctx, win, w, h);
      }

      // Doors (with rotation)
      for (const door of doors) {
        const isSel = selectedId === door.id && selectedType === "door";
        const w = door.width * elScale;
        const h = door.height * elScale;
        const rot = ((door.rotation || 0) * Math.PI) / 180;

        ctx.save();
        ctx.translate(door.x, door.y);
        ctx.rotate(rot);

        if (isSel) {
          ctx.fillStyle = "rgba(37,99,235,0.12)";
          ctx.fillRect(-w / 2 - 5, -h / 2 - 5, w + 10, h + 10);
        }

        ctx.fillStyle = isSel ? "#93bbfc" : "#fde68a";
        ctx.strokeStyle = isSel ? "#1d4ed8" : "#d97706";
        ctx.lineWidth = 2;
        ctx.fillRect(-w / 2, -h / 2, w, h);
        ctx.strokeRect(-w / 2, -h / 2, w, h);

        // Door swing arc
        ctx.strokeStyle = isSel ? "#2563eb" : "#d97706";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.arc(-w / 2, 0, w, -Math.PI / 2, 0);
        ctx.stroke();
        ctx.setLineDash([]);

        // Size label
        ctx.fillStyle = "#92400e";
        ctx.font = "9px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`${door.width}×${door.height}`, 0, h / 2 + 12);

        ctx.restore();

        if (isSel) drawElementHandles(ctx, door, w, h);
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

      // Coords
      ctx.fillStyle = "#64748b";
      ctx.font = "11px monospace";
      ctx.fillText(`(${mousePos.x}, ${mousePos.y})`, 8, CANVAS_H - 8);

      // Tool hint
      const hints = {
        wall: "Click+drag to draw wall",
        window: "Click to place window",
        door: "Click to place door",
        select: "Click select | Drag move | Handles resize | R rotate 15° | Shift+R 90°",
      };
      ctx.fillStyle = "#94a3b8";
      ctx.font = "11px sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(hints[useStore.getState().tool] || "", CANVAS_W - 8, CANVAS_H - 8);
      ctx.textAlign = "start";
    },
    [walls, windows, doors, rooms, isDrawing, drawStart, previewEnd, gridSize, mousePos, showDimensions, selectedId, selectedType]
  );

  // Draw resize handles + rotation handle for an element
  function drawElementHandles(ctx, el, w, h) {
    const { corners, rotHandle } = getHandles(el);

    // Corner resize handles
    for (const c of corners) {
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#2563eb";
      ctx.lineWidth = 2;
      ctx.fillRect(c.x - HANDLE_SIZE / 2, c.y - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
      ctx.strokeRect(c.x - HANDLE_SIZE / 2, c.y - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
    }

    // Line from top-center to rotation handle
    const topCenter = {
      x: (corners[0].x + corners[1].x) / 2,
      y: (corners[0].y + corners[1].y) / 2,
    };
    ctx.strokeStyle = "#2563eb";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 2]);
    ctx.beginPath();
    ctx.moveTo(topCenter.x, topCenter.y);
    ctx.lineTo(rotHandle.x, rotHandle.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Rotation handle (circle)
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#2563eb";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(rotHandle.x, rotHandle.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Rotation arrow icon
    ctx.strokeStyle = "#2563eb";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(rotHandle.x, rotHandle.y, 3, -Math.PI * 0.8, Math.PI * 0.4);
    ctx.stroke();
  }

  const canvasCallback = useCallback(
    (node) => {
      canvasRef.current = node;
      if (node) draw(node.getContext("2d"));
    },
    [draw]
  );

  // Cursor logic
  let cursor = "crosshair";
  if (tool === "select") {
    cursor = isDragging ? "grabbing" : isResizing ? "nwse-resize" : isRotating ? "grabbing" : "default";
  }

  return (
    <canvas
      ref={canvasCallback}
      width={CANVAS_W}
      height={CANVAS_H}
      className="border border-gray-300 bg-white w-full h-full"
      style={{ cursor }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => {
        if (isDrawing) { stopDrawing(); setPreviewEnd(null); }
        if (isDragging) { stopDrag(); setDragLast(null); }
        if (isResizing) { setIsResizing(false); setResizeHandle(null); }
        if (isRotating) { setIsRotating(false); }
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

function hitRotatedRect(pos, el, w, h) {
  const rot = ((el.rotation || 0) * Math.PI) / 180;
  const cos = Math.cos(-rot);
  const sin = Math.sin(-rot);
  const dx = pos.x - el.x;
  const dy = pos.y - el.y;
  const lx = dx * cos - dy * sin;
  const ly = dx * sin + dy * cos;
  return Math.abs(lx) < w / 2 + 6 && Math.abs(ly) < h / 2 + 6;
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

  ctx.strokeStyle = "#94a3b8";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(ax1, ay1); ctx.lineTo(ax2, ay2); ctx.stroke();

  const tickLen = 6;
  ctx.beginPath();
  ctx.moveTo(ax1 - nx * tickLen, ay1 - ny * tickLen); ctx.lineTo(ax1 + nx * tickLen, ay1 + ny * tickLen);
  ctx.moveTo(ax2 - nx * tickLen, ay2 - ny * tickLen); ctx.lineTo(ax2 + nx * tickLen, ay2 + ny * tickLen);
  ctx.stroke();

  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(x1 + nx * (thickness / 2 + 4), y1 + ny * (thickness / 2 + 4));
  ctx.lineTo(ax1 + nx * 4, ay1 + ny * 4);
  ctx.moveTo(x2 + nx * (thickness / 2 + 4), y2 + ny * (thickness / 2 + 4));
  ctx.lineTo(ax2 + nx * 4, ay2 + ny * 4);
  ctx.stroke();

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
