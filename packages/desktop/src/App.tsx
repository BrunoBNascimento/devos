import { useState, useCallback, useEffect } from 'react';
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
import { 
  Play, Square, Terminal, Box, Search, Settings, 
  Activity, Brain, Inbox, ToggleLeft, ToggleRight,
  Database, FileText, Save, LayoutDashboard, RefreshCw, Clock
} from 'lucide-react';

const initialNodes: Node[] = [
  { id: '1', position: { x: 250, y: 50 }, data: { label: 'Start (Context Ingestion)' }, type: 'input', style: { background: '#1e293b', color: '#fff', border: '1px solid #334155', borderRadius: '8px', padding: '10px' } },
  { id: '2', position: { x: 250, y: 150 }, data: { label: 'Planning (Epics & Tasks)' }, style: { background: '#1e293b', color: '#fff', border: '1px solid #334155', borderRadius: '8px', padding: '10px' } },
  { id: '3', position: { x: 250, y: 250 }, data: { label: 'Developing (Coding)' }, style: { background: '#1e293b', color: '#fff', border: '1px solid #334155', borderRadius: '8px', padding: '10px' } },
  { id: '4', position: { x: 250, y: 350 }, data: { label: 'Verification (Lint/Build/Test)' }, style: { background: '#1e293b', color: '#fff', border: '1px solid #334155', borderRadius: '8px', padding: '10px' } },
  { id: '5', position: { x: 250, y: 450 }, data: { label: 'Reviewing (Code Review)' }, style: { background: '#1e293b', color: '#fff', border: '1px solid #334155', borderRadius: '8px', padding: '10px' } },
  { id: '6', position: { x: 250, y: 550 }, data: { label: 'Pull Request' }, type: 'output', style: { background: '#1e293b', color: '#fff', border: '1px solid #334155', borderRadius: '8px', padding: '10px' } },
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: '#94a3b8' } },
  { id: 'e2-3', source: '2', target: '3', animated: true, style: { stroke: '#94a3b8' } },
  { id: 'e3-4', source: '3', target: '4', animated: true, style: { stroke: '#94a3b8' } },
  { id: 'e4-5', source: '4', target: '5', animated: true, style: { stroke: '#94a3b8' } },
  { id: 'e5-6', source: '5', target: '6', animated: true, style: { stroke: '#94a3b8' } },
];

function App() {
  const [currentTab, setCurrentTab] = useState('workflow');
  
  // Workflow State
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [taskInput, setTaskInput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [engine, setEngine] = useState('claude');
  const [useWsl, setUseWsl] = useState(false);
  const [isWindows, setIsWindows] = useState(false);
  
  // Config State
  const [configContent, setConfigContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Dashboards State
  const [metrics, setMetrics] = useState<any[]>([]);
  const [knowledgeFiles, setKnowledgeFiles] = useState<string[]>([]);
  const [pendingTasks, setPendingTasks] = useState<string[]>([]);

  // Crawler State
  const [crawlerStatus, setCrawlerStatus] = useState('idle');
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [syncInterval, setSyncInterval] = useState('off');

  // Init
  useEffect(() => {
    if ((window as any).devosAPI?.isWindows) {
      setIsWindows(true);
      setUseWsl(true);
    }
    fetchData();

    if ((window as any).devosAPI) {
      (window as any).devosAPI.getCrawlerStatus().then((s: any) => {
        setCrawlerStatus(s.status);
        setLastSync(s.lastSync);
        setSyncInterval(s.interval);
      });

      (window as any).devosAPI.onCrawlerState((state: any) => {
        setCrawlerStatus(state.status);
        setLastSync(state.lastSync);
        setSyncInterval(state.interval);
        
        // If it just finished syncing, auto-refresh metrics
        if (state.status === 'idle' && state.lastSync) {
          fetchData();
        }
      });
    }
  }, []);

  const fetchData = async () => {
    if ((window as any).devosAPI) {
      const c = await (window as any).devosAPI.readConfig();
      if (c.success) setConfigContent(c.content);
      
      const m = await (window as any).devosAPI.readMetrics();
      if (m.success) {
        try { setMetrics(JSON.parse(m.content)); } catch(e) { setMetrics([]); }
      }
      
      const k = await (window as any).devosAPI.readKnowledge();
      if (k.success) setKnowledgeFiles(k.files);
      
      const p = await (window as any).devosAPI.readPendingTasks();
      if (p.success) setPendingTasks(p.files);
    }
  };

  const handleSyncIntegrations = async () => {
    if ((window as any).devosAPI) {
      await (window as any).devosAPI.syncIntegrations(useWsl, engine);
    }
  };

  const handleChangeInterval = async (interval: string) => {
    if ((window as any).devosAPI) {
      await (window as any).devosAPI.setSyncInterval(interval);
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    if ((window as any).devosAPI) {
      await (window as any).devosAPI.saveConfig(configContent);
    }
    setIsSaving(false);
  };

  const handleRun = async () => {
    if (!taskInput.trim()) return;
    setIsRunning(true);
    setLogs((prev) => [...prev, `[SYSTEM] Starting DevOS workflow for: ${taskInput}...`]);

    if ((window as any).devosAPI) {
      (window as any).devosAPI.onStream((logLine: string) => {
        setLogs((prev) => [...prev, logLine]);
      });
      try {
        const result = await (window as any).devosAPI.executeTask(taskInput, engine, useWsl);
        setLogs((prev) => [...prev, `[SYSTEM] Workflow completed with code: ${result.code}`]);
      } catch (err) {
        setLogs((prev) => [...prev, `[ERROR] ${String(err)}`]);
      } finally {
        setIsRunning(false);
      }
    } else {
      setTimeout(() => {
        setLogs((prev) => [...prev, `[Mock] Completed.`]);
        setIsRunning(false);
      }, 2000);
    }
  };

  const handleStop = async () => {
    if ((window as any).devosAPI) {
      await (window as any).devosAPI.stopTask();
      setLogs((prev) => [...prev, `[SYSTEM] Task stopped by user.`]);
      setIsRunning(false);
    }
  };

  const onNodesChange = useCallback((changes: any) => setNodes((nds) => applyNodeChanges(changes, nds)), []);
  const onEdgesChange = useCallback((changes: any) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);

  const renderSidebar = () => (
    <div className="w-16 bg-slate-950 border-r border-slate-800 flex flex-col items-center py-6 gap-6 z-20">
      <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/50 mb-4">
        <Box className="w-6 h-6 text-white" />
      </div>
      
      <button onClick={() => setCurrentTab('workflow')} className={`p-3 rounded-xl transition-all ${currentTab === 'workflow' ? 'bg-slate-800 text-blue-400' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}`}>
        <LayoutDashboard className="w-5 h-5" />
      </button>
      <button onClick={() => setCurrentTab('metrics')} className={`p-3 rounded-xl transition-all ${currentTab === 'metrics' ? 'bg-slate-800 text-purple-400' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}`}>
        <Activity className="w-5 h-5" />
      </button>
      <button onClick={() => setCurrentTab('knowledge')} className={`p-3 rounded-xl transition-all ${currentTab === 'knowledge' ? 'bg-slate-800 text-emerald-400' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}`}>
        <Brain className="w-5 h-5" />
      </button>
      <button onClick={() => setCurrentTab('config')} className={`p-3 rounded-xl transition-all mt-auto ${currentTab === 'config' ? 'bg-slate-800 text-slate-200' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}`}>
        <Settings className="w-5 h-5" />
      </button>
    </div>
  );

  const renderWorkflowTab = () => (
    <div className="flex-1 flex flex-col h-full relative">
      <div className="h-16 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-900/80 backdrop-blur-md absolute top-0 left-0 right-0 z-10">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-2xl">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              className="w-full bg-slate-950 border border-slate-800 rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-200 placeholder:text-slate-600 transition-all"
              placeholder="Paste Jira Task ID or describe the feature..."
              value={taskInput}
              onChange={(e) => setTaskInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !isRunning && handleRun()}
              disabled={isRunning}
            />
          </div>
          
          <select 
            value={engine}
            onChange={e => setEngine(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-300"
          >
            <option value="claude">Claude CLI</option>
            <option value="gemini">Gemini CLI</option>
          </select>

          {isWindows && (
            <div 
              className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer hover:text-slate-200 transition-colors"
              onClick={() => setUseWsl(!useWsl)}
            >
              {useWsl ? <ToggleRight className="w-6 h-6 text-blue-500" /> : <ToggleLeft className="w-6 h-6 text-slate-600" />}
              <span>Use WSL</span>
            </div>
          )}

          {!isRunning ? (
            <button
              onClick={handleRun}
              disabled={!taskInput.trim()}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white px-5 py-2 rounded-full text-sm font-medium transition-all shadow-lg shadow-blue-900/20 ml-2"
            >
              <Play className="w-4 h-4 fill-current" /> Start
            </button>
          ) : (
            <button
              onClick={handleStop}
              className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 px-5 py-2 rounded-full text-sm font-medium transition-all border border-red-500/20 ml-2"
            >
              <Square className="w-4 h-4 fill-current" /> Stop
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex pt-16 min-h-0">
        <div className="flex-1 relative bg-slate-900">
          <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} fitView colorMode="dark">
            <Background color="#334155" gap={16} />
            <Controls className="bg-slate-800 border-slate-700 fill-slate-300" />
          </ReactFlow>
        </div>
        <div className="w-96 border-l border-slate-800 bg-slate-950 flex flex-col min-h-0">
          <div className="p-4 border-b border-slate-800 flex items-center gap-2 font-medium text-sm text-slate-300">
            <Terminal className="w-4 h-4 text-slate-500" /> Execution Logs
          </div>
          <div className="flex-1 p-4 overflow-y-auto font-mono text-xs text-slate-400 space-y-1">
            {logs.length === 0 ? (
              <div className="text-slate-700 italic text-center mt-10">Waiting for commands...</div>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="whitespace-pre-wrap break-all leading-relaxed">{log}</div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderMetricsTab = () => {
    let lastSyncStr = "Never";
    if (lastSync) {
      const d = new Date(lastSync);
      lastSyncStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    return (
      <div className="flex-1 p-8 overflow-y-auto flex flex-col gap-8">
        
        {/* Integrations Crawler Panel */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-xl flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${crawlerStatus === 'syncing' ? 'bg-blue-500/20 text-blue-400 animate-pulse' : 'bg-slate-800 text-slate-400'}`}>
              <RefreshCw className={`w-5 h-5 ${crawlerStatus === 'syncing' ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <h2 className="text-white font-semibold">Integrations Sync</h2>
              <div className="text-sm text-slate-400 flex items-center gap-2">
                <Clock className="w-3 h-3" /> Last synced: {lastSyncStr}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800">
              {['off', '30m', '1h', '4h'].map(opt => (
                <button
                  key={opt}
                  onClick={() => handleChangeInterval(opt)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${syncInterval === opt ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  {opt.toUpperCase()}
                </button>
              ))}
            </div>
            
            <button
              onClick={handleSyncIntegrations}
              disabled={crawlerStatus === 'syncing'}
              className="bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 disabled:text-slate-600 text-slate-200 px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 border border-slate-700"
            >
              <RefreshCw className={`w-4 h-4 ${crawlerStatus === 'syncing' ? 'animate-spin text-blue-500' : ''}`} />
              {crawlerStatus === 'syncing' ? 'Syncing...' : 'Sync Now'}
            </button>
          </div>
        </div>

        {/* DORA Metrics Grid */}
        <div>
          <h1 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <Activity className="text-purple-500" /> DORA Metrics
          </h1>
          <div className="grid grid-cols-3 gap-6">
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <div className="text-slate-400 text-sm font-medium mb-2">Lead Time for Changes</div>
              <div className="text-3xl font-bold text-white">
                {metrics.length > 0 ? metrics[metrics.length-1]?.lead_time || 'N/A' : 'No Data'}
              </div>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <div className="text-slate-400 text-sm font-medium mb-2">Deployment Frequency</div>
              <div className="text-3xl font-bold text-white">
                {metrics.length > 0 ? metrics[metrics.length-1]?.deploy_frequency || 'N/A' : 'No Data'}
              </div>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <div className="text-slate-400 text-sm font-medium mb-2">Mean Time To Recovery</div>
              <div className="text-3xl font-bold text-white">
                {metrics.length > 0 ? metrics[metrics.length-1]?.mttr || 'N/A' : 'No Data'}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderKnowledgeTab = () => (
    <div className="flex-1 p-8 overflow-y-auto flex gap-8">
      <div className="flex-1">
        <h1 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
          <Inbox className="text-blue-500" /> Pending Workflows
        </h1>
        <div className="space-y-3">
          {pendingTasks.length === 0 ? <p className="text-slate-500 text-sm">No pending tasks in memory.</p> : pendingTasks.map(f => (
            <div key={f} className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between hover:border-slate-700 transition-colors">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-slate-400" />
                <span className="text-slate-200">{f}</span>
              </div>
              <button 
                onClick={() => { setTaskInput(f); setCurrentTab('workflow'); }}
                className="text-xs bg-blue-600/10 text-blue-400 px-3 py-1.5 rounded-full font-medium hover:bg-blue-600/20 transition-colors cursor-pointer"
              >
                Resume
              </button>
            </div>
          ))}
        </div>
      </div>
      
      <div className="flex-1">
        <h1 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
          <Brain className="text-emerald-500" /> Knowledge Base
        </h1>
        <div className="space-y-3">
          {knowledgeFiles.length === 0 ? <p className="text-slate-500 text-sm">No knowledge files indexed.</p> : knowledgeFiles.map(f => (
            <div key={f} className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex items-center gap-3">
              <Database className="w-5 h-5 text-emerald-600/50" />
              <span className="text-slate-300">{f}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderConfigTab = () => (
    <div className="flex-1 flex flex-col">
      <div className="h-16 border-b border-slate-800 flex items-center justify-between px-8 bg-slate-900/80 backdrop-blur-md">
        <h1 className="font-semibold text-lg text-white">config.yaml</h1>
        <button 
          onClick={saveSettings}
          disabled={isSaving}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all"
        >
          <Save className="w-4 h-4" /> {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
      <div className="flex-1 p-6 bg-[#0d1117]">
        <textarea
          className="w-full h-full bg-transparent text-slate-300 font-mono text-sm focus:outline-none resize-none leading-loose"
          value={configContent}
          onChange={(e) => setConfigContent(e.target.value)}
          spellCheck={false}
        />
      </div>
    </div>
  );

  return (
    <div className="h-screen w-full flex bg-slate-900 text-slate-100 font-sans overflow-hidden selection:bg-blue-500/30">
      {renderSidebar()}
      <div className="flex-1 flex flex-col relative bg-slate-900">
        {currentTab === 'workflow' && renderWorkflowTab()}
        {currentTab === 'metrics' && renderMetricsTab()}
        {currentTab === 'knowledge' && renderKnowledgeTab()}
        {currentTab === 'config' && renderConfigTab()}
      </div>
    </div>
  );
}

export default App;
