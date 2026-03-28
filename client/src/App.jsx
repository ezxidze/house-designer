import useStore from "./store/useStore";
import Toolbar from "./components/Toolbar";
import ProjectBar from "./components/ProjectBar";
import FloorTabs from "./components/FloorTabs";
import Editor2D from "./components/Editor2D";
import Viewer3D from "./components/Viewer3D";
import PropertiesPanel from "./components/PropertiesPanel";

export default function App() {
  const viewMode = useStore((s) => s.viewMode);
  const project = useStore((s) => s.project);

  if (!project) {
    return (
      <div className="flex flex-col h-screen bg-gray-50">
        <div className="flex items-center px-4 py-2 bg-gray-900 text-white">
          <span className="text-sm font-bold text-blue-400">HouseDesigner</span>
        </div>
        <ProjectBar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">&#x1F3E0;</div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">House Designer</h1>
            <p className="text-gray-500 mb-6">BIM/CAD web application for designing houses</p>
            <button
              onClick={() => useStore.getState().newProject()}
              className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 shadow-lg"
            >
              Create New Project
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <Toolbar />
      <ProjectBar />
      <FloorTabs />
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-hidden">
          {viewMode === "2d" ? <Editor2D /> : <Viewer3D />}
        </div>
        <PropertiesPanel />
      </div>
    </div>
  );
}
