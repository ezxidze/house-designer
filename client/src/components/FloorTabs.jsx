import useStore from "../store/useStore";

export default function FloorTabs() {
  const { project, activeFloorId, setActiveFloor, addFloor, removeFloor, duplicateFloor, renameFloor } = useStore();

  if (!project) return null;

  return (
    <div className="flex items-center gap-1 px-3 py-1 bg-gray-100 border-b border-gray-200 text-xs select-none overflow-x-auto">
      {project.floors.map((floor) => (
        <div
          key={floor.id}
          className={`group flex items-center gap-1 px-2.5 py-1 rounded cursor-pointer transition-all ${
            activeFloorId === floor.id
              ? "bg-blue-600 text-white shadow"
              : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
          }`}
          onClick={() => setActiveFloor(floor.id)}
          onDoubleClick={() => {
            const name = prompt("Rename floor:", floor.name);
            if (name) renameFloor(floor.id, name);
          }}
        >
          <span className="font-medium">{floor.name}</span>
          <button
            onClick={(e) => { e.stopPropagation(); duplicateFloor(floor.id); }}
            title="Duplicate floor"
            className={`opacity-0 group-hover:opacity-100 text-[10px] px-0.5 rounded ${
              activeFloorId === floor.id ? "hover:bg-blue-700" : "hover:bg-gray-200"
            }`}
          >
            ⧉
          </button>
          {project.floors.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); removeFloor(floor.id); }}
              title="Delete floor"
              className={`opacity-0 group-hover:opacity-100 text-[10px] px-0.5 rounded ${
                activeFloorId === floor.id ? "hover:bg-red-500" : "hover:bg-red-100 text-red-500"
              }`}
            >
              ✕
            </button>
          )}
        </div>
      ))}
      <button
        onClick={addFloor}
        className="px-2 py-1 rounded bg-white border border-dashed border-gray-300 text-gray-400 hover:border-blue-400 hover:text-blue-500 transition"
      >
        + Floor
      </button>
    </div>
  );
}
