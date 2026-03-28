import useStore from "../store/useStore";

const WALL_MATERIALS = ["Brick", "Concrete", "Wood", "Drywall", "Stone", "Cinder Block", "SIP Panel", "Foam Block"];

export default function PropertiesPanel() {
  const {
    getFloor, selectedId, selectedType,
    removeWall, removeWindow, removeDoor,
    updateWall, updateWindow, updateDoor,
    wallDefaults, setWallDefault, tool,
  } = useStore();

  const floor = getFloor();
  const walls = floor?.walls || [];
  const windows = floor?.windows || [];
  const doors = floor?.doors || [];
  const rooms = floor?.rooms || [];

  const selWall = selectedType === "wall" ? walls.find((w) => w.id === selectedId) : null;
  const selWindow = selectedType === "window" ? windows.find((w) => w.id === selectedId) : null;
  const selDoor = selectedType === "door" ? doors.find((d) => d.id === selectedId) : null;

  return (
    <div className="w-64 bg-gray-50 border-l border-gray-200 overflow-y-auto text-xs flex flex-col">
      {/* Selected element properties */}
      {(selWall || selWindow || selDoor) && (
        <div className="p-3 border-b border-gray-200 bg-blue-50">
          <h3 className="font-bold text-blue-800 mb-2 text-sm">Properties</h3>

          {selWall && (
            <div className="space-y-1.5">
              <div className="text-gray-600">
                Length: {Math.round(Math.sqrt((selWall.x2 - selWall.x1) ** 2 + (selWall.y2 - selWall.y1) ** 2))} cm
              </div>
              <label className="flex items-center gap-1">
                Height:
                <input type="number" value={selWall.height} onChange={(e) => updateWall(selWall.id, { height: +e.target.value })}
                  className="w-16 border rounded px-1 py-0.5" /> cm
              </label>
              <label className="flex items-center gap-1">
                Thickness:
                <input type="number" value={selWall.thickness} onChange={(e) => updateWall(selWall.id, { thickness: +e.target.value })}
                  className="w-16 border rounded px-1 py-0.5" /> cm
              </label>
              <label className="flex items-center gap-1">
                Material:
                <select value={selWall.material} onChange={(e) => updateWall(selWall.id, { material: e.target.value })}
                  className="border rounded px-1 py-0.5">
                  {WALL_MATERIALS.map((m) => <option key={m}>{m}</option>)}
                </select>
              </label>
              <button onClick={() => removeWall(selWall.id)} className="mt-1 text-red-600 hover:text-red-800 font-medium">Delete wall</button>
            </div>
          )}

          {selWindow && (
            <div className="space-y-1.5">
              <div className="text-gray-600">Position: ({Math.round(selWindow.x)}, {Math.round(selWindow.y)})</div>
              <label className="flex items-center gap-1">
                Width:
                <input type="number" value={selWindow.width} onChange={(e) => updateWindow(selWindow.id, { width: +e.target.value })}
                  className="w-16 border rounded px-1 py-0.5" /> cm
              </label>
              <label className="flex items-center gap-1">
                Height:
                <input type="number" value={selWindow.height} onChange={(e) => updateWindow(selWindow.id, { height: +e.target.value })}
                  className="w-16 border rounded px-1 py-0.5" /> cm
              </label>
              <label className="flex items-center gap-1">
                Sill H:
                <input type="number" value={selWindow.sillHeight || 90} onChange={(e) => updateWindow(selWindow.id, { sillHeight: +e.target.value })}
                  className="w-16 border rounded px-1 py-0.5" /> cm
              </label>
              <label className="flex items-center gap-1">
                Rotation:
                <input type="number" value={selWindow.rotation || 0} step="15" onChange={(e) => updateWindow(selWindow.id, { rotation: +e.target.value % 360 })}
                  className="w-16 border rounded px-1 py-0.5" /> °
              </label>
              <label className="flex items-center gap-1">
                Frame:
                <select value={selWindow.material || "PVC"} onChange={(e) => updateWindow(selWindow.id, { material: e.target.value })}
                  className="border rounded px-1 py-0.5">
                  <option>PVC</option><option>Aluminum</option><option>Wood</option>
                </select>
              </label>
              <label className="flex items-center gap-1">
                Glass:
                <select value={selWindow.glassType || "Double"} onChange={(e) => updateWindow(selWindow.id, { glassType: e.target.value })}
                  className="border rounded px-1 py-0.5">
                  <option>Single</option><option>Double</option><option>Triple</option><option>Tinted</option>
                </select>
              </label>
              <button onClick={() => removeWindow(selWindow.id)} className="mt-1 text-red-600 hover:text-red-800 font-medium">Delete window</button>
            </div>
          )}

          {selDoor && (
            <div className="space-y-1.5">
              <div className="text-gray-600">Position: ({Math.round(selDoor.x)}, {Math.round(selDoor.y)})</div>
              <label className="flex items-center gap-1">
                Width:
                <input type="number" value={selDoor.width} onChange={(e) => updateDoor(selDoor.id, { width: +e.target.value })}
                  className="w-16 border rounded px-1 py-0.5" /> cm
              </label>
              <label className="flex items-center gap-1">
                Height:
                <input type="number" value={selDoor.height} onChange={(e) => updateDoor(selDoor.id, { height: +e.target.value })}
                  className="w-16 border rounded px-1 py-0.5" /> cm
              </label>
              <label className="flex items-center gap-1">
                Rotation:
                <input type="number" value={selDoor.rotation || 0} step="15" onChange={(e) => updateDoor(selDoor.id, { rotation: +e.target.value % 360 })}
                  className="w-16 border rounded px-1 py-0.5" /> °
              </label>
              <label className="flex items-center gap-1">
                Material:
                <select value={selDoor.material || "Wood"} onChange={(e) => updateDoor(selDoor.id, { material: e.target.value })}
                  className="border rounded px-1 py-0.5">
                  <option>Wood</option><option>Metal</option><option>Glass</option><option>PVC</option>
                </select>
              </label>
              <label className="flex items-center gap-1">
                Type:
                <select value={selDoor.doorType || "Single"} onChange={(e) => updateDoor(selDoor.id, { doorType: e.target.value })}
                  className="border rounded px-1 py-0.5">
                  <option>Single</option><option>Double</option><option>Sliding</option><option>Folding</option>
                </select>
              </label>
              <button onClick={() => removeDoor(selDoor.id)} className="mt-1 text-red-600 hover:text-red-800 font-medium">Delete door</button>
            </div>
          )}
        </div>
      )}

      {/* Wall defaults - shown when wall tool is active and nothing selected */}
      {tool === "wall" && !selWall && !selWindow && !selDoor && (
        <div className="p-3 border-b border-gray-200 bg-amber-50">
          <h3 className="font-bold text-amber-800 mb-2 text-sm">New Wall Settings</h3>
          <div className="space-y-1.5">
            <label className="flex items-center gap-1">
              Height:
              <input type="number" value={wallDefaults.height} onChange={(e) => setWallDefault("height", +e.target.value)}
                className="w-16 border rounded px-1 py-0.5" /> cm
            </label>
            <label className="flex items-center gap-1">
              Thickness:
              <input type="number" value={wallDefaults.thickness} onChange={(e) => setWallDefault("thickness", +e.target.value)}
                className="w-16 border rounded px-1 py-0.5" /> cm
            </label>
            <label className="flex items-center gap-1">
              Material:
              <select value={wallDefaults.material} onChange={(e) => setWallDefault("material", e.target.value)}
                className="border rounded px-1 py-0.5">
                {WALL_MATERIALS.map((m) => <option key={m}>{m}</option>)}
              </select>
            </label>
            <p className="text-[10px] text-amber-600 mt-1">These settings apply to all new walls you draw.</p>
          </div>
        </div>
      )}

      {/* Elements summary */}
      <div className="p-3 flex-1">
        <h3 className="font-bold text-gray-800 mb-2 text-sm">Elements</h3>

        <Section title={`Walls (${walls.length})`}>
          {walls.map((wall, i) => {
            const len = Math.round(Math.sqrt((wall.x2 - wall.x1) ** 2 + (wall.y2 - wall.y1) ** 2));
            return (
              <ElementRow
                key={wall.id}
                selected={selectedId === wall.id}
                onClick={() => useStore.getState().selectElement(wall.id, "wall")}
                onDelete={() => removeWall(wall.id)}
                label={`Wall ${i + 1}`}
                detail={`${len}cm | ${wall.material}`}
              />
            );
          })}
        </Section>

        <Section title={`Windows (${windows.length})`}>
          {windows.map((win, i) => (
            <ElementRow
              key={win.id}
              selected={selectedId === win.id}
              onClick={() => useStore.getState().selectElement(win.id, "window")}
              onDelete={() => removeWindow(win.id)}
              label={`Window ${i + 1}`}
              detail={`${win.width}x${win.height}cm`}
            />
          ))}
        </Section>

        <Section title={`Doors (${doors.length})`}>
          {doors.map((door, i) => (
            <ElementRow
              key={door.id}
              selected={selectedId === door.id}
              onClick={() => useStore.getState().selectElement(door.id, "door")}
              onDelete={() => removeDoor(door.id)}
              label={`Door ${i + 1}`}
              detail={`${door.width}x${door.height}cm`}
            />
          ))}
        </Section>

        <Section title={`Rooms (${rooms.length})`}>
          {rooms.map((room, i) => (
            <div key={room.id} className="px-2 py-1 text-gray-600 bg-white rounded border border-gray-100 mb-0.5">
              Room {i + 1}: {(room.area / 10000).toFixed(2)} m²
            </div>
          ))}
        </Section>

        {walls.length === 0 && windows.length === 0 && doors.length === 0 && (
          <p className="text-gray-400 text-center py-6 text-xs">
            Draw walls, place windows and doors to start designing.
          </p>
        )}
      </div>

      {/* Keyboard hints */}
      <div className="p-2 border-t border-gray-200 text-[10px] text-gray-400 space-y-0.5">
        <div><b>V</b> Select  <b>W</b> Wall  <b>N</b> Window  <b>D</b> Door</div>
        <div><b>R</b> Rotate 15°  <b>Shift+R</b> 90°</div>
        <div><b>Ctrl+Z</b> Undo  <b>Ctrl+Y</b> Redo  <b>Del</b> Delete</div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="mb-3">
      <h4 className="font-semibold text-gray-600 mb-1">{title}</h4>
      {children}
    </div>
  );
}

function ElementRow({ selected, onClick, onDelete, label, detail }) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center justify-between px-2 py-1 rounded cursor-pointer mb-0.5 transition-colors ${
        selected ? "bg-blue-100 border border-blue-300" : "bg-white border border-gray-100 hover:bg-gray-100"
      }`}
    >
      <div>
        <span className="font-medium text-gray-700">{label}</span>
        <span className="text-gray-400 ml-1">{detail}</span>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="text-red-400 hover:text-red-600 px-1"
      >
        ×
      </button>
    </div>
  );
}
