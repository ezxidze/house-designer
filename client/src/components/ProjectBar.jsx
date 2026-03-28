import { useState } from "react";
import useStore from "../store/useStore";
import { generatePDF } from "../utils/pdf";
import { generateDXF } from "../utils/dxf";

export default function ProjectBar() {
  const {
    project, savedProjects, renameProject,
    newProject, saveProject, loadProject, deleteProject,
    getProjectData,
  } = useStore();

  const [showList, setShowList] = useState(false);
  const [showExport, setShowExport] = useState(false);

  const handlePDF = () => {
    const data = getProjectData();
    if (data) generatePDF(data);
    setShowExport(false);
  };

  const handleDXF = () => {
    const data = getProjectData();
    if (data) generateDXF(data);
    setShowExport(false);
  };

  const handleJSON = () => {
    const data = getProjectData();
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${data.name}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExport(false);
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          if (data.floors) {
            useStore.setState({
              project: data,
              activeFloorId: data.activeFloorId || data.floors[0]?.id,
              history: [],
              future: [],
            });
          }
        } catch { /* ignore */ }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  if (!project) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-white border-b border-gray-200">
        <button onClick={newProject} className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-blue-700">
          New Project
        </button>
        <button onClick={handleImport} className="bg-gray-200 text-gray-700 px-3 py-1.5 rounded text-sm hover:bg-gray-300">
          Import JSON
        </button>
        <div className="w-px h-5 bg-gray-300" />
        {savedProjects.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-xs text-gray-500">Saved:</span>
            {savedProjects.map((p) => (
              <div key={p.id} className="flex items-center bg-gray-100 rounded text-xs">
                <button onClick={() => loadProject(p.id)} className="px-2 py-1 hover:bg-gray-200 rounded-l text-gray-700">
                  {p.name}
                </button>
                <button onClick={() => deleteProject(p.id)} className="px-1 py-1 hover:bg-red-100 text-red-400 rounded-r">
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-white border-b border-gray-200 text-sm select-none">
      <input
        type="text"
        value={project.name}
        onChange={(e) => renameProject(e.target.value)}
        className="border border-gray-300 rounded px-2 py-1 w-44 text-sm font-medium"
      />

      <button onClick={saveProject} className="bg-blue-600 text-white px-3 py-1 rounded text-xs font-medium hover:bg-blue-700">
        Save
      </button>
      <button onClick={newProject} className="bg-gray-200 text-gray-700 px-3 py-1 rounded text-xs hover:bg-gray-300">
        New
      </button>

      {/* Open saved */}
      <div className="relative">
        <button
          onClick={() => setShowList(!showList)}
          className="bg-gray-200 text-gray-700 px-3 py-1 rounded text-xs hover:bg-gray-300"
        >
          Open {savedProjects.length > 0 && `(${savedProjects.length})`}
        </button>
        {showList && (
          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-50 w-56 max-h-60 overflow-y-auto">
            {savedProjects.length === 0 && <div className="p-3 text-gray-400 text-xs">No saved projects</div>}
            {savedProjects.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 border-b border-gray-50">
                <button onClick={() => { loadProject(p.id); setShowList(false); }} className="text-left flex-1 text-gray-700 text-xs hover:text-blue-600">
                  {p.name}
                </button>
                <button onClick={() => deleteProject(p.id)} className="text-red-400 hover:text-red-600 ml-2 text-xs">
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <button onClick={handleImport} className="bg-gray-200 text-gray-700 px-3 py-1 rounded text-xs hover:bg-gray-300">
        Import
      </button>

      <div className="flex-1" />

      {/* Export dropdown */}
      <div className="relative">
        <button
          onClick={() => setShowExport(!showExport)}
          className="bg-green-600 text-white px-3 py-1 rounded text-xs font-medium hover:bg-green-700"
        >
          Export
        </button>
        {showExport && (
          <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-50 w-40">
            <button onClick={handlePDF} className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 text-gray-700">
              PDF Report
            </button>
            <button onClick={handleDXF} className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 text-gray-700 border-t border-gray-100">
              DXF (CAD)
            </button>
            <button onClick={handleJSON} className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 text-gray-700 border-t border-gray-100">
              JSON
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
