import { Canvas, useLoader } from "@react-three/fiber";
import { OrbitControls, Grid, Environment } from "@react-three/drei";
import useStore from "../store/useStore";
import * as THREE from "three";
import { useMemo } from "react";

// --- Procedural textures ---
function createBrickTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#b5651d";
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = "#8b4513";
  ctx.lineWidth = 2;
  // Brick rows
  for (let row = 0; row < 8; row++) {
    const y = row * 16;
    ctx.strokeRect(0, y, 128, 16);
    const offset = row % 2 === 0 ? 0 : 32;
    for (let col = 0; col < 3; col++) {
      ctx.beginPath();
      ctx.moveTo(offset + col * 64, y);
      ctx.lineTo(offset + col * 64, y + 16);
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  return tex;
}

function createConcreteTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#a0a0a0";
  ctx.fillRect(0, 0, 64, 64);
  for (let i = 0; i < 200; i++) {
    ctx.fillStyle = `rgba(${120 + Math.random() * 40}, ${120 + Math.random() * 40}, ${120 + Math.random() * 40}, 0.3)`;
    ctx.fillRect(Math.random() * 64, Math.random() * 64, 2, 2);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  return tex;
}

function createWoodTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#deb887";
  ctx.fillRect(0, 0, 64, 64);
  for (let i = 0; i < 20; i++) {
    ctx.strokeStyle = `rgba(139, 90, 43, ${0.15 + Math.random() * 0.15})`;
    ctx.lineWidth = 1 + Math.random() * 2;
    ctx.beginPath();
    ctx.moveTo(0, i * 3.2 + Math.random() * 2);
    ctx.bezierCurveTo(16, i * 3.2 + Math.random() * 4, 48, i * 3.2 - Math.random() * 4, 64, i * 3.2 + Math.random() * 2);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  return tex;
}

function createDrywallTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#f5f0e8";
  ctx.fillRect(0, 0, 64, 64);
  for (let i = 0; i < 100; i++) {
    ctx.fillStyle = `rgba(200, 195, 185, ${Math.random() * 0.15})`;
    ctx.fillRect(Math.random() * 64, Math.random() * 64, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  return tex;
}

const textures = {};
function getWallTexture(material) {
  if (textures[material]) return textures[material];
  switch (material) {
    case "Concrete": textures[material] = createConcreteTexture(); break;
    case "Wood": textures[material] = createWoodTexture(); break;
    case "Drywall": textures[material] = createDrywallTexture(); break;
    default: textures[material] = createBrickTexture(); break;
  }
  return textures[material];
}

const MATERIAL_COLORS = {
  Brick: "#c4713b",
  Concrete: "#888888",
  Wood: "#b8860b",
  Drywall: "#eee8d5",
  Stone: "#8a8578",
  "Cinder Block": "#7a7a7a",
  "SIP Panel": "#d4c9a8",
  "Foam Block": "#c8c8c0",
};

function Wall3D({ wall }) {
  const dx = wall.x2 - wall.x1;
  const dy = wall.y2 - wall.y1;
  const length = Math.sqrt(dx * dx + dy * dy) / 100;
  const angle = Math.atan2(dy, dx);
  const height = (wall.height || 280) / 100;
  const thickness = (wall.thickness || 20) / 100;
  const cx = (wall.x1 + wall.x2) / 200;
  const cy = (wall.y1 + wall.y2) / 200;

  const tex = useMemo(() => getWallTexture(wall.material || "Brick"), [wall.material]);

  return (
    <mesh position={[cx, height / 2, cy]} rotation={[0, -angle, 0]} castShadow receiveShadow>
      <boxGeometry args={[length, height, thickness]} />
      <meshStandardMaterial
        map={tex}
        color={MATERIAL_COLORS[wall.material] || "#c4713b"}
        roughness={0.8}
      />
    </mesh>
  );
}

const WIN_FRAME_COLORS = { PVC: "#e8e8e8", Aluminum: "#a0a0a0", Wood: "#b5864a" };
const WIN_GLASS_COLORS = { Single: "#a8d8ea", Double: "#87ceeb", Triple: "#6bb3d9", Tinted: "#5a8a9a" };
const WIN_GLASS_OPACITY = { Single: 0.45, Double: 0.35, Triple: 0.28, Tinted: 0.5 };

function Window3D({ win }) {
  const w = (win.width || 100) / 100;
  const h = (win.height || 120) / 100;
  const sillH = (win.sillHeight || 90) / 100;
  const rot = ((win.rotation || 0) * Math.PI) / 180;
  const frameColor = WIN_FRAME_COLORS[win.material] || "#e8e8e8";
  const glassColor = WIN_GLASS_COLORS[win.glassType] || "#87ceeb";
  const glassOp = WIN_GLASS_OPACITY[win.glassType] || 0.35;

  return (
    <group position={[win.x / 100, sillH + h / 2, win.y / 100]} rotation={[0, -rot, 0]}>
      <mesh>
        <boxGeometry args={[w, h, 0.12]} />
        <meshStandardMaterial color={frameColor} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0, 0.01]}>
        <boxGeometry args={[w - 0.08, h - 0.08, 0.03]} />
        <meshPhysicalMaterial color={glassColor} transparent opacity={glassOp} roughness={0.05} metalness={0.1} clearcoat={1} />
      </mesh>
    </group>
  );
}

const DOOR_COLORS = { Wood: "#8b5e3c", Metal: "#707070", Glass: "#b0c4de", PVC: "#d4d4d4" };
const DOOR_PANEL_COLORS = { Wood: "#a0714b", Metal: "#888888", Glass: "#cce0f0", PVC: "#e8e8e8" };

function Door3D({ door }) {
  const w = (door.width || 90) / 100;
  const h = (door.height || 210) / 100;
  const rot = ((door.rotation || 0) * Math.PI) / 180;
  const mat = door.material || "Wood";
  const isGlass = mat === "Glass";

  return (
    <group position={[door.x / 100, h / 2, door.y / 100]} rotation={[0, -rot, 0]}>
      <mesh>
        <boxGeometry args={[w + 0.06, h + 0.06, 0.14]} />
        <meshStandardMaterial color={DOOR_COLORS[mat]} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0, 0.02]}>
        <boxGeometry args={[w - 0.06, h - 0.06, 0.06]} />
        {isGlass ? (
          <meshPhysicalMaterial color="#cce0f0" transparent opacity={0.4} roughness={0.05} clearcoat={1} />
        ) : (
          <meshStandardMaterial color={DOOR_PANEL_COLORS[mat]} roughness={0.5} />
        )}
      </mesh>
      <mesh position={[w / 2 - 0.1, 0, 0.08]}>
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshStandardMaterial color="#c0c0c0" metalness={0.8} roughness={0.2} />
      </mesh>
    </group>
  );
}

function Room3D({ room }) {
  if (room.points.length < 3) return null;

  const shape = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(room.points[0].x / 100, room.points[0].y / 100);
    for (let i = 1; i < room.points.length; i++) {
      s.lineTo(room.points[i].x / 100, room.points[i].y / 100);
    }
    s.closePath();
    return s;
  }, [room.points]);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]} receiveShadow>
      <shapeGeometry args={[shape]} />
      <meshStandardMaterial
        color="#e8dcc8"
        roughness={0.9}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function FloorPlane() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[6, -0.01, 4]} receiveShadow>
      <planeGeometry args={[20, 14]} />
      <meshStandardMaterial color="#d4cec4" roughness={0.95} side={THREE.DoubleSide} />
    </mesh>
  );
}

export default function Viewer3D() {
  const floor = useStore((s) => s.getFloor());
  const walls = floor?.walls || [];
  const windows = floor?.windows || [];
  const doors = floor?.doors || [];
  const rooms = floor?.rooms || [];

  return (
    <div className="w-full h-full bg-gradient-to-b from-sky-100 to-sky-200">
      <Canvas shadows camera={{ position: [10, 10, 14], fov: 45 }}>
        <ambientLight intensity={0.4} />
        <directionalLight
          position={[15, 20, 10]}
          intensity={1.2}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-left={-15}
          shadow-camera-right={15}
          shadow-camera-top={15}
          shadow-camera-bottom={-15}
        />
        <hemisphereLight args={["#b1e1ff", "#b97a20", 0.3]} />

        <FloorPlane />

        {rooms.map((room) => (
          <Room3D key={room.id} room={room} />
        ))}
        {walls.map((wall) => (
          <Wall3D key={wall.id} wall={wall} />
        ))}
        {windows.map((win) => (
          <Window3D key={win.id} win={win} />
        ))}
        {doors.map((door) => (
          <Door3D key={door.id} door={door} />
        ))}

        <Grid
          args={[30, 30]}
          position={[6, 0.001, 4]}
          cellSize={1}
          cellThickness={0.5}
          cellColor="#b0b0b0"
          sectionSize={5}
          sectionThickness={1}
          sectionColor="#808080"
          fadeDistance={25}
          infiniteGrid
        />

        <OrbitControls makeDefault target={[6, 1, 4]} />

        {/* Sky */}
        <mesh>
          <sphereGeometry args={[50, 16, 16]} />
          <meshBasicMaterial color="#e0f0ff" side={THREE.BackSide} />
        </mesh>
      </Canvas>
    </div>
  );
}
