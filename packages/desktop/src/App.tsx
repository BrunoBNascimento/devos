import { useState, useEffect, useRef } from 'react';
import { 
  Box, Settings, Activity, Brain, 
  Terminal, ChevronUp, ChevronDown, CheckCircle, 
  GitPullRequest, MessageSquare, Clock, RefreshCw, AlertTriangle
} from 'lucide-react';

function App() {
  const [currentTab, setCurrentTab] = useState('daily');
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Data State
  const [configContent, setConfigContent] = useState('');
  const [metrics, setMetrics] = useState<any[]>([]);
  const [pendingTasks, setPendingTasks] = useState<any[]>([]);

  // Crawler State
  const [crawlerStatus, setCrawlerStatus] = useState('idle');
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [syncInterval, setSyncInterval] = useState('off');

  // Logs State
  const [logs, setLogs] = useState<string[]>([]);
  const [isLogsOpen, setIsLogsOpen] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

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
        if (state.status === 'idle' && state.lastSync) fetchData();
      });

      (window as any).devosAPI.onCrawlerStream((text: string) => {
        setLogs(prev => [...prev, text]);
      });
    }
  }, []);

  useEffect(() => {
    if (logsEndRef.current) logsEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [logs, isLogsOpen]);

  const fetchData = async () => {
    setIsRefreshing(true);
    if ((window as any).devosAPI) {
      const c = await (window as any).devosAPI.readConfig();
      if (c.success) setConfigContent(c.content);
      
      const m = await (window as any).devosAPI.readMetrics();
      if (m.success) {
        try { setMetrics(JSON.parse(m.content)); } catch(e) { setMetrics([]); }
      }
      
      const p = await (window as any).devosAPI.readPendingTasks();
      if (p.success) setPendingTasks(p.files);
    }
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleSyncIntegrations = async () => {
    if ((window as any).devosAPI) {
      setLogs([]);
      setIsLogsOpen(true);
      await (window as any).devosAPI.syncIntegrations(true, 'claude');
    }
  };

  const parseSection = (body: string, heading: string) => {
    if (!body) return [];
    const regex = new RegExp(`## ${heading}\\s*\\n((?:- .*\\n?)*)`);
    const match = body.match(regex);
    if (!match || !match[1]) return [];
    return match[1].split('\\n').filter(l => l.trim().startsWith('-')).map(l => l.replace(/^- /, '').trim());
  };

  const renderSidebar = () => (
    <div className="w-16 bg-slate-950 border-r border-slate-800 flex flex-col items-center py-6 gap-6 z-20">
      <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/50 mb-4">
        <Box className="w-6 h-6 text-white" />
      </div>
      
      <button onClick={() => setCurrentTab('daily')} title="Daily Priorities" className={`p-3 rounded-xl transition-all ${currentTab === 'daily' ? 'bg-slate-800 text-blue-400' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}`}>
        <Brain className="w-5 h-5" />
      </button>
      <button onClick={() => setCurrentTab('metrics')} title="DORA Metrics Dashboard" className={`p-3 rounded-xl transition-all ${currentTab === 'metrics' ? 'bg-slate-800 text-purple-400' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}`}>
        <Activity className="w-5 h-5" />
      </button>
      <button onClick={() => setCurrentTab('config')} title="Settings" className={`p-3 rounded-xl transition-all mt-auto ${currentTab === 'config' ? 'bg-slate-800 text-slate-200' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}`}>
        <Settings className="w-5 h-5" />
      </button>

      <button 
        onClick={fetchData} 
        disabled={isRefreshing}
        title="Refresh Data"
        className={`p-3 rounded-xl transition-all ${isRefreshing ? 'text-blue-500 animate-spin' : 'text-slate-500 hover:text-blue-400 hover:bg-slate-800/50'}`}
      >
        <RefreshCw className="w-5 h-5" />
      </button>
    </div>
  );

  const renderDailyTab = () => {
    const digest = pendingTasks.find(f => f.metadata?.type === 'digest' || f.filename === 'daily_digest.md');
    
    let myTasks: string[] = [];
    let myPRs: string[] = [];
    let actionRequired: string[] = [];
    let meetings: string[] = [];

    if (digest?.body) {
      myTasks = parseSection(digest.body, 'My Tasks');
      myPRs = parseSection(digest.body, 'My PRs');
      actionRequired = parseSection(digest.body, 'Action Required');
      meetings = parseSection(digest.body, 'Meeting Mentions & Transcripts');
    }

    return (
      <div className="flex-1 p-8 overflow-y-auto bg-slate-900 pb-40">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              Daily Tactical Digest
            </h1>
            <p className="text-slate-400 text-sm mt-2 flex items-center gap-2">
              <Clock className="w-4 h-4" /> 
              Last Fused: {digest?.metadata?.last_updated || 'Never'}
            </p>
          </div>
          <button
            onClick={handleSyncIntegrations}
            disabled={crawlerStatus === 'syncing'}
            className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white px-5 py-2.5 rounded-xl font-semibold transition-all flex items-center gap-2 shadow-lg shadow-blue-900/20"
          >
            <RefreshCw className={`w-4 h-4 ${crawlerStatus === 'syncing' ? 'animate-spin' : ''}`} />
            {crawlerStatus === 'syncing' ? 'Fusing Knowledge...' : 'Run /devos.daily'}
          </button>
        </div>

        {!digest ? (
          <div className="flex flex-col items-center justify-center p-20 border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/50">
            <Brain className="w-12 h-12 text-slate-700 mb-4" />
            <h2 className="text-xl font-semibold text-slate-300">No Daily Digest Found</h2>
            <p className="text-slate-500 mt-2 text-center max-w-md">Click the button above to trigger the background agent to fuse your Jira tasks, GitHub PRs, and Meeting transcripts into a tactical daily view.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-6">
            
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <h2 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2 border-b border-slate-800 pb-3">
                <CheckCircle className="w-5 h-5 text-emerald-500" /> My Priority Tasks
              </h2>
              <ul className="space-y-3">
                {myTasks.length === 0 ? <li className="text-slate-500 text-sm italic">No open tasks assigned to you.</li> : myTasks.map((t, i) => (
                  <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                    <span className="text-emerald-500 mt-0.5">•</span> 
                    <span dangerouslySetInnerHTML={{ __html: t.replace(/\\*\\*(.*?)\\*\\*/g, '<strong class="text-emerald-400">$1</strong>') }} />
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <h2 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2 border-b border-slate-800 pb-3">
                <AlertTriangle className="w-5 h-5 text-rose-500" /> Action Required (Reviews)
              </h2>
              <ul className="space-y-3">
                {actionRequired.length === 0 ? <li className="text-slate-500 text-sm italic">No PRs waiting for your review.</li> : actionRequired.map((t, i) => (
                  <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                    <span className="text-rose-500 mt-0.5">•</span> 
                    <span dangerouslySetInnerHTML={{ __html: t.replace(/\\*\\*(.*?)\\*\\*/g, '<strong class="text-rose-400">$1</strong>') }} />
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <h2 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2 border-b border-slate-800 pb-3">
                <GitPullRequest className="w-5 h-5 text-blue-500" /> My Open PRs
              </h2>
              <ul className="space-y-3">
                {myPRs.length === 0 ? <li className="text-slate-500 text-sm italic">No open PRs authored by you.</li> : myPRs.map((t, i) => (
                  <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">•</span> 
                    <span dangerouslySetInnerHTML={{ __html: t.replace(/\\*\\*(.*?)\\*\\*/g, '<strong class="text-blue-400">$1</strong>') }} />
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <h2 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2 border-b border-slate-800 pb-3">
                <MessageSquare className="w-5 h-5 text-amber-500" /> Transcripts & Mentions
              </h2>
              <ul className="space-y-3">
                {meetings.length === 0 ? <li className="text-slate-500 text-sm italic">No meeting notes or mentions found today.</li> : meetings.map((t, i) => (
                  <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                    <span className="text-amber-500 mt-0.5">•</span> 
                    <span dangerouslySetInnerHTML={{ __html: t.replace(/\\*\\*(.*?)\\*\\*/g, '<strong class="text-amber-400">$1</strong>') }} />
                  </li>
                ))}
              </ul>
            </div>

          </div>
        )}
      </div>
    );
  };

  const renderConfigTab = () => (
    <div className="flex-1 p-8 overflow-y-auto bg-slate-900">
      <h1 className="text-2xl font-bold text-white mb-6">Configuration</h1>
      <textarea
        className="w-full h-[600px] bg-slate-950 border border-slate-800 text-slate-300 font-mono text-sm p-6 rounded-xl focus:outline-none focus:border-slate-600 resize-none"
        value={configContent}
        onChange={(e) => setConfigContent(e.target.value)}
        spellCheck={false}
      />
    </div>
  );

  const renderMetricsTab = () => (
    <div className="flex-1 p-8 overflow-y-auto flex flex-col gap-8 bg-slate-900">
      <h1 className="text-2xl font-bold text-white">DORA Metrics</h1>
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6">
          <div className="text-slate-400 text-sm mb-2">Lead Time for Changes</div>
          <div className="text-3xl font-bold text-white">{metrics.length > 0 ? metrics[metrics.length-1]?.lead_time || 'N/A' : 'No Data'}</div>
        </div>
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6">
          <div className="text-slate-400 text-sm mb-2">Deployment Frequency</div>
          <div className="text-3xl font-bold text-white">{metrics.length > 0 ? metrics[metrics.length-1]?.deploy_frequency || 'N/A' : 'No Data'}</div>
        </div>
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6">
          <div className="text-slate-400 text-sm mb-2">Mean Time To Recovery</div>
          <div className="text-3xl font-bold text-white">{metrics.length > 0 ? metrics[metrics.length-1]?.mttr || 'N/A' : 'No Data'}</div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-screen w-full flex bg-slate-900 text-slate-100 font-sans overflow-hidden">
      {renderSidebar()}
      
      <div className="flex-1 flex flex-col relative">
        {currentTab === 'daily' && renderDailyTab()}
        {currentTab === 'metrics' && renderMetricsTab()}
        {currentTab === 'config' && renderConfigTab()}
      </div>

      {/* Terminal Logs Drawer */}
      <div className={`absolute bottom-0 left-16 right-0 bg-slate-950 border-t border-slate-800 transition-all duration-300 z-50 ${isLogsOpen ? 'h-72' : 'h-10'}`}>
        <div 
          className="h-10 flex items-center justify-between px-4 cursor-pointer bg-slate-900/50 hover:bg-slate-800/50"
          onClick={() => setIsLogsOpen(!isLogsOpen)}
        >
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Knowledge Fusion Logs</span>
            {crawlerStatus === 'syncing' && <span className="ml-2 w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>}
          </div>
          {isLogsOpen ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronUp className="w-4 h-4 text-slate-500" />}
        </div>
        
        {isLogsOpen && (
          <div className="h-[calc(100%-2.5rem)] overflow-y-auto p-4 font-mono text-xs text-slate-400 leading-relaxed custom-scrollbar">
            {logs.length === 0 ? (
              <span className="text-slate-600 italic">Run `/devos.daily` to see agent thoughts here...</span>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="whitespace-pre-wrap mb-1 break-words">{log}</div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>
        )}
      </div>

    </div>
  );
}

export default App;
