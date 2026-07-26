import { useState, useCallback } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  Node,
  Edge
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Play, Terminal, Box, Search } from 'lucide-react';

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
        const result = await (window as any).devosAPI.executeTask(taskInput, engine);
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
    </div>
  );
}

export default App;
