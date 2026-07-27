import { useState, useEffect } from 'react';
import { 
  Box, Settings, 
  Activity, Brain, Inbox,
  Database, FileText, Save, RefreshCw, Clock
} from 'lucide-react';

function App() {
  const [currentTab, setCurrentTab] = useState('metrics');
  const [isRefreshing, setIsRefreshing] = useState(false);
  
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
    setIsRefreshing(true);
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
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleSyncIntegrations = async () => {
    if ((window as any).devosAPI) {
      await (window as any).devosAPI.syncIntegrations(true, 'claude');
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

  const renderSidebar = () => (
    <div className="w-16 bg-slate-950 border-r border-slate-800 flex flex-col items-center py-6 gap-6 z-20">
      <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/50 mb-4 cursor-pointer hover:bg-blue-500 transition-colors" title="DevOS Control Plane">
        <Box className="w-6 h-6 text-white" />
      </div>
      
      <button onClick={() => setCurrentTab('metrics')} title="DORA Metrics Dashboard" className={`p-3 rounded-xl transition-all ${currentTab === 'metrics' ? 'bg-slate-800 text-purple-400' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}`}>
        <Activity className="w-5 h-5" />
      </button>
      <button onClick={() => setCurrentTab('knowledge')} title="Brain & Knowledge" className={`p-3 rounded-xl transition-all ${currentTab === 'knowledge' ? 'bg-slate-800 text-emerald-400' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}`}>
        <Brain className="w-5 h-5" />
      </button>
      <button onClick={() => setCurrentTab('config')} title="Settings (config.yaml)" className={`p-3 rounded-xl transition-all mt-auto ${currentTab === 'config' ? 'bg-slate-800 text-slate-200' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}`}>
        <Settings className="w-5 h-5" />
      </button>

      <button 
        onClick={fetchData} 
        disabled={isRefreshing}
        title="Refresh Data from Filesystem"
        className={`p-3 rounded-xl transition-all ${isRefreshing ? 'text-blue-500 animate-spin' : 'text-slate-500 hover:text-blue-400 hover:bg-slate-800/50'}`}
      >
        <RefreshCw className="w-5 h-5" />
      </button>
    </div>
  );

  const renderMetricsTab = () => {
    let lastSyncStr = "Never";
    if (lastSync) {
      const d = new Date(lastSync);
      lastSyncStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    return (
      <div className="flex-1 p-8 overflow-y-auto flex flex-col gap-8 bg-slate-900">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Activity className="text-purple-500" /> Observatory Dashboard
          </h1>
          <p className="text-slate-400 text-sm">Read-only view into the DevOS filesystem.</p>
        </div>

        {/* Integrations Crawler Panel */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-xl flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${crawlerStatus === 'syncing' ? 'bg-blue-500/20 text-blue-400 animate-pulse' : 'bg-slate-800 text-slate-400'}`}>
              <RefreshCw className={`w-5 h-5 ${crawlerStatus === 'syncing' ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <h2 className="text-white font-semibold">Integrations Sync</h2>
              <div className="text-sm text-slate-400 flex items-center gap-2">
                <Clock className="w-3 h-3" /> Last background sync: {lastSyncStr}
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
              className="bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 disabled:text-slate-600 text-slate-200 px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 border border-slate-700 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${crawlerStatus === 'syncing' ? 'animate-spin text-blue-500' : ''}`} />
              {crawlerStatus === 'syncing' ? 'Syncing...' : 'Sync Now'}
            </button>
          </div>
        </div>

        {/* DORA Metrics Grid */}
        <div>
          <h2 className="text-xl font-bold text-slate-200 mb-6 flex items-center gap-3">
            DORA Metrics
          </h2>
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
    <div className="flex-1 p-8 overflow-y-auto flex gap-8 bg-slate-900">
      <div className="flex-1">
        <h1 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
          <Inbox className="text-blue-500" /> Pending Workflows
        </h1>
        <p className="text-slate-400 text-sm mb-6">Active state artifacts stored in `.devos/memory/state/`.</p>
        <div className="space-y-3">
          {pendingTasks.length === 0 ? <p className="text-slate-500 text-sm italic">No pending tasks in memory.</p> : pendingTasks.map(f => (
            <div key={f} className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between hover:border-slate-700 transition-colors">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-slate-400" />
                <span className="text-slate-200">{f}</span>
              </div>
              <span className="text-xs bg-slate-800 text-slate-400 px-3 py-1 rounded-full border border-slate-700">
                Phase: Draft
              </span>
            </div>
          ))}
        </div>
      </div>
      
      <div className="flex-1">
        <h1 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
          <Brain className="text-emerald-500" /> Knowledge Base
        </h1>
        <p className="text-slate-400 text-sm mb-6">Context automatically fetched from `.devos/memory/brain_kb/`.</p>
        <div className="space-y-3">
          {knowledgeFiles.length === 0 ? <p className="text-slate-500 text-sm italic">No knowledge files indexed.</p> : knowledgeFiles.map(f => (
            <div key={f} className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Database className="w-5 h-5 text-emerald-600/50" />
                <span className="text-slate-300">{f}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderConfigTab = () => (
    <div className="flex-1 flex flex-col bg-slate-900">
      <div className="h-16 border-b border-slate-800 flex items-center justify-between px-8 bg-slate-950">
        <div>
          <h1 className="font-semibold text-lg text-white">Configuration</h1>
          <p className="text-slate-500 text-xs">Editing `.devos/config.yaml`</p>
        </div>
        <button 
          onClick={saveSettings}
          disabled={isSaving}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all border border-slate-700 cursor-pointer"
        >
          <Save className="w-4 h-4" /> {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
      <div className="flex-1 p-6 bg-[#0d1117] overflow-y-auto">
        <textarea
          className="w-full h-full min-h-[500px] bg-transparent text-slate-300 font-mono text-sm focus:outline-none resize-none leading-relaxed"
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
        {currentTab === 'metrics' && renderMetricsTab()}
        {currentTab === 'knowledge' && renderKnowledgeTab()}
        {currentTab === 'config' && renderConfigTab()}
      </div>
    </div>
  );
}

export default App;
