import useStore from "../store/useStore";

const tools = [
  { id: "select", label: "Select", icon: "↖", hint: "V" },
  { id: "wall", label: "Wall", icon: "▬", hint: "W" },
  { id: "window", label: "Window", icon: "▭", hint: "N" },
  { id: "door", label: "Door", icon: "▯", hint: "D" },
];

export default function Toolbar() {
  const {
    tool, setTool, viewMode, setViewMode,
    snapEnabled, toggleSnap, showDimensions, toggleDimensions,
    undo, redo, history, future,
  } = useStore();

  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white select-none">
      <span className="text-sm font-bold px-2 text-blue-400 tracking-tight">HouseDesigner</span>
      <div className="w-px h-5 bg-gray-700" />

      {tools.map((t) => (
        <button
          key={t.id}
          onClick={() => setTool(t.id)}
          title={`${t.label} (${t.hint})`}
          className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
            tool === t.id
              ? "bg-blue-600 text-white shadow-md"
              : "bg-gray-800 hover:bg-gray-700 text-gray-400"
          }`}
        >
          <span className="mr-1">{t.icon}</span>{t.label}
        </button>
      ))}

      <div className="w-px h-5 bg-gray-700" />

      {/* Undo / Redo */}
      <button
        onClick={undo}
        disabled={history.length === 0}
        title="Undo (Ctrl+Z)"
        className="px-2 py-1 rounded text-xs bg-gray-800 hover:bg-gray-700 text-gray-400 disabled:opacity-30"
      >
        ↩
      </button>
      <button
        onClick={redo}
        disabled={future.length === 0}
        title="Redo (Ctrl+Y)"
        className="px-2 py-1 rounded text-xs bg-gray-800 hover:bg-gray-700 text-gray-400 disabled:opacity-30"
      >
        ↪
      </button>

      <div className="w-px h-5 bg-gray-700" />

      <button
        onClick={toggleSnap}
        title="Toggle snap to grid"
        className={`px-2.5 py-1 rounded text-xs font-medium ${
          snapEnabled ? "bg-green-700 text-green-200" : "bg-gray-800 text-gray-500"
        }`}
      >
        Snap
      </button>

      <button
        onClick={toggleDimensions}
        title="Toggle dimension lines"
        className={`px-2.5 py-1 rounded text-xs font-medium ${
          showDimensions ? "bg-purple-700 text-purple-200" : "bg-gray-800 text-gray-500"
        }`}
      >
        Dims
      </button>

      <div className="flex-1" />

      <button
        onClick={() => setViewMode("2d")}
        className={`px-3 py-1 rounded-l text-xs font-semibold ${
          viewMode === "2d" ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
        }`}
      >
        2D
      </button>
      <button
        onClick={() => setViewMode("3d")}
        className={`px-3 py-1 rounded-r text-xs font-semibold ${
          viewMode === "3d" ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
        }`}
      >
        3D
      </button>
    </div>
  );
}
