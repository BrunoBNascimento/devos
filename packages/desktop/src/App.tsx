import { useState, useCallback } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  type Node,
  type Edge
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Play, Terminal, Box, Search, Settings, X, Save } from 'lucide-react';

const initialNodes: Node[] = [
  {
    id: '1',
    position: { x: 250, y: 50 },
    data: { label: 'Start (Context Ingestion)' },
    type: 'input',
    style: { background: '#1e293b', color: '#fff', border: '1px solid #334155', borderRadius: '8px', padding: '10px' }
  },
  {
    id: '2',
    position: { x: 250, y: 150 },
    data: { label: 'Planning (Epics & Tasks)' },
    style: { background: '#1e293b', color: '#fff', border: '1px solid #334155', borderRadius: '8px', padding: '10px' }
  },
  {
    id: '3',
    position: { x: 250, y: 250 },
    data: { label: 'Developing (Coding)' },
    style: { background: '#1e293b', color: '#fff', border: '1px solid #334155', borderRadius: '8px', padding: '10px' }
  },
  {
    id: '4',
    position: { x: 250, y: 350 },
    data: { label: 'Verification (Lint/Build/Test)' },
    style: { background: '#1e293b', color: '#fff', border: '1px solid #334155', borderRadius: '8px', padding: '10px' }
  },
  {
    id: '5',
    position: { x: 250, y: 450 },
    data: { label: 'Reviewing (Code Review)' },
    style: { background: '#1e293b', color: '#fff', border: '1px solid #334155', borderRadius: '8px', padding: '10px' }
  },
  {
    id: '6',
    position: { x: 250, y: 550 },
    data: { label: 'Pull Request' },
    type: 'output',
    style: { background: '#1e293b', color: '#fff', border: '1px solid #334155', borderRadius: '8px', padding: '10px' }
  },
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: '#94a3b8' } },
  { id: 'e2-3', source: '2', target: '3', animated: true, style: { stroke: '#94a3b8' } },
  { id: 'e3-4', source: '3', target: '4', animated: true, style: { stroke: '#94a3b8' } },
  { id: 'e4-5', source: '4', target: '5', animated: true, style: { stroke: '#94a3b8' } },
  { id: 'e5-6', source: '5', target: '6', animated: true, style: { stroke: '#94a3b8' } },
];

function App() {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [taskInput, setTaskInput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [engine, setEngine] = useState('claude');
  const [useWsl, setUseWsl] = useState(false);
  const [isWindows, setIsWindows] = useState(false);
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [configContent, setConfigContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Check platform on mount
  useState(() => {
    if ((window as any).devosAPI?.isWindows) {
      setIsWindows(true);
    }
  });

  const openSettings = async () => {
    setIsSettingsOpen(true);
    if ((window as any).devosAPI) {
      const res = await (window as any).devosAPI.readConfig();
      if (res.success) setConfigContent(res.content);
      else setConfigContent(`# Error loading config: ${res.error}`);
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    if ((window as any).devosAPI) {
      await (window as any).devosAPI.saveConfig(configContent);
    }
    setIsSaving(false);
    setIsSettingsOpen(false);
  };

  const onNodesChange = useCallback(
    (changes: any) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [],
  );
  const onEdgesChange = useCallback(
    (changes: any) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [],
  );

  const handleRun = async () => {
    if (!taskInput.trim()) return;
    setIsRunning(true);
    setLogs((prev) => [...prev, `Starting DevOS workflow for: ${taskInput}...`]);

    // Setup listener if API is available (Electron)
    if ((window as any).devosAPI) {
      (window as any).devosAPI.onStream((logLine: string) => {
        setLogs((prev) => [...prev, logLine]);
      });

      try {
        const result = await (window as any).devosAPI.executeTask(taskInput, engine, useWsl);
        setLogs((prev) => [...prev, `Workflow completed with code: ${result.code}`]);
      } catch (err) {
        setLogs((prev) => [...prev, `Error: ${String(err)}`]);
      }
    } else {
      // Browser fallback (mock)
      setTimeout(() => {
        setLogs((prev) => [...prev, `[Mock] Phase: Planning completed.`]);
        setNodes(nds => nds.map(n => n.id === '2' ? { ...n, style: { ...n.style, background: '#059669', borderColor: '#34d399' } } : n));
      }, 2000);
    }
  };

  return (
    <div className="h-screen w-full flex flex-col bg-slate-900 text-slate-100 font-sans">
      
      {/* Topbar */}
      <div className="h-16 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-950/50 backdrop-blur-sm z-10">
        <div className="flex items-center gap-2 font-bold text-xl tracking-tight text-white">
          <Box className="w-6 h-6 text-blue-500" />
          DevOS Desktop
        </div>
        
        <div className="flex items-center gap-4 flex-1 max-w-2xl mx-12">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              className="w-full bg-slate-800 border border-slate-700 rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-200 placeholder:text-slate-500 transition-all"
              placeholder="Paste Jira Task ID or describe the feature..."
              value={taskInput}
              onChange={(e) => setTaskInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRun()}
            />
          </div>
          
          {isWindows && (
            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
              <input 
                type="checkbox" 
                checked={useWsl} 
                onChange={e => setUseWsl(e.target.checked)} 
                className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-blue-600 focus:ring-offset-slate-900"
              />
              Use WSL
            </label>
          )}

          <select 
            value={engine}
            onChange={e => setEngine(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="claude">Claude CLI</option>
            <option value="gemini">Gemini CLI</option>
          </select>

          <button
            onClick={handleRun}
            disabled={isRunning || !taskInput.trim()}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-400 text-white px-5 py-2 rounded-full text-sm font-medium transition-all shadow-lg shadow-blue-900/20"
          >
            <Play className="w-4 h-4" />
            {isRunning ? 'Running...' : 'Start'}
          </button>
          <button
            onClick={openSettings}
            className="flex items-center justify-center p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* React Flow Canvas */}
        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            fitView
            className="bg-slate-900"
            colorMode="dark"
          >
            <Background color="#334155" gap={16} />
            <Controls className="bg-slate-800 border-slate-700 fill-slate-300" />
          </ReactFlow>
        </div>

        {/* Logs Panel */}
        <div className="w-96 border-l border-slate-800 bg-slate-950 flex flex-col">
          <div className="p-4 border-b border-slate-800 flex items-center gap-2 font-medium text-sm text-slate-300">
            <Terminal className="w-4 h-4" />
            Execution Logs
          </div>
          <div className="flex-1 p-4 overflow-y-auto font-mono text-xs text-slate-400 space-y-2">
            {logs.length === 0 ? (
              <div className="text-slate-600 italic text-center mt-10">No active execution. Enter a task and press Start.</div>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="whitespace-pre-wrap">{log}</div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-3/4 max-w-4xl h-3/4 flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/50">
              <div className="flex items-center gap-2 font-semibold text-slate-200">
                <Settings className="w-4 h-4 text-slate-400" />
                config.yaml
              </div>
              <button onClick={() => setIsSettingsOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 p-4 bg-[#0d1117]">
              <textarea
                className="w-full h-full bg-transparent text-slate-300 font-mono text-sm focus:outline-none resize-none"
                value={configContent}
                onChange={(e) => setConfigContent(e.target.value)}
                spellCheck={false}
              />
            </div>
            <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex justify-end gap-3">
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={saveSettings}
                disabled={isSaving}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-lg text-sm font-medium transition-all"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving...' : 'Save Config'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
