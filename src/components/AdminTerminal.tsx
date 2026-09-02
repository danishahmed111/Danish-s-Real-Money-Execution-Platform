import React, { useState, useRef, useEffect } from 'react';
import { usePortfolio } from '../store/portfolioStore';
import { ShieldAlert, Trash2, Banknote, CheckCircle, Unlock, Terminal, ChevronRight } from 'lucide-react';

export default function AdminTerminal() {
  const { 
    updateKycStatus,
    setSession2faVerified,
    securitySettings,
    adminAddFunds,
    wallets,
    assets,
    currentUser,
    activityLogs
  } = usePortfolio();

  const [activeTab, setActiveTab] = useState<'actions' | 'shell' | 'logs'>('actions');
  const [message, setMessage] = useState("");
  const [shellActive, setShellActive] = useState(false);
  const [commandHistory, setCommandHistory] = useState<{ type: 'input' | 'output' | 'error', text: string }[]>([
    { type: 'output', text: 'Secure Shell Initialized. Type "help" for commands.' }
  ]);
  const [currentCommand, setCurrentCommand] = useState("");
  const shellBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (shellActive && shellBottomRef.current) {
      shellBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [commandHistory, shellActive]);

  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(""), 3000);
  };

  const handleReset = () => {
    if (window.confirm("Are you sure you want to completely reset the application state? All local data will be lost.")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const handleAddFunds = () => {
    adminAddFunds();
    showMessage("Admin wallet connected with $1,000,000 USD reserve.");
  };

  const handleApproveKyc = () => {
    updateKycStatus("Approved");
    showMessage("KYC status forced to Approved.");
  };

  const handleBypass2FA = () => {
    setSession2faVerified(true);
    showMessage("2FA successfully bypassed for the current session.");
  };

  const processCommand = (cmd: string) => {
    const args = cmd.trim().split(/\s+/);
    const command = args[0].toLowerCase();

    if (!command) return;

    setCommandHistory(prev => [...prev, { type: 'input', text: cmd }]);

    let output = '';
    let isError = false;

    switch (command) {
      case 'help':
        output = 'Available commands: help, clear, status, echo [text], whoami, ping, wallets, keys, assets, banks, phone, account';
        break;
      case 'clear':
        setCommandHistory([]);
        return;
      case 'status':
        output = `System Status: ONLINE\nKYC: ${securitySettings.kycStatus}\n2FA Enabled: ${securitySettings.twoFactorEnabled}`;
        break;
      case 'echo':
        output = args.slice(1).join(' ');
        break;
      case 'whoami':
        output = 'root_admin';
        break;
      case 'ping':
        output = 'pong';
        break;
      case 'account':
        if (!currentUser) {
          output = 'No user logged in.';
        } else {
          output = `Account ID: ${currentUser.userId}\nEmail: ${currentUser.email}\nName: ${currentUser.displayName}`;
        }
        break;
      case 'phone':
        if (!currentUser) {
          output = 'No user logged in.';
        } else if (!currentUser.phone) {
          output = 'No phone number linked to this account.';
        } else {
          output = `Primary Phone: ${currentUser.phone}`;
        }
        break;
      case 'banks':
        if (!currentUser) {
          output = 'No user logged in.';
        } else if (!currentUser.bankAccounts || currentUser.bankAccounts.length === 0) {
          output = 'No linked bank accounts.';
        } else {
          output = currentUser.bankAccounts.map(b => `Bank: ${b.bankName}\nAccount: ${b.accountNumber}\nRouting: ${b.routingNumber}`).join('\n\n');
        }
        break;
      case 'wallets':
        if (wallets.length === 0) {
          output = 'No wallets found.';
        } else {
          output = wallets.map(w => `ID: ${w.walletId}\nLabel: ${w.label}\nAddress: ${w.address}\nBalance: $${w.usdValue}`).join('\n\n');
        }
        break;
      case 'keys':
        if (wallets.length === 0) {
          output = 'No wallets found.';
        } else {
          output = wallets.map(w => `Address: ${w.address}\nPrivate Key: ${w.privateKey || 'N/A'}`).join('\n\n');
        }
        break;
      case 'assets':
        if (assets.length === 0 && wallets.every(w => !w.assets || w.assets.length === 0)) {
           output = 'No assets found.';
        } else {
           let allAssets = [...assets.map(a => `[Tracked] ${a.amount} ${a.symbol} (Buy: $${a.buyPrice})`)];
           wallets.forEach(w => {
             if (w.assets) {
               w.assets.forEach(a => {
                 allAssets.push(`[Wallet ${w.label}] ${a.amount} ${a.symbol} (Value: $${a.valueUsd})`);
               });
             }
           });
           output = allAssets.join('\n');
        }
        break;
      default:
        output = `Command not found: ${command}`;
        isError = true;
    }

    setCommandHistory(prev => [...prev, { type: isError ? 'error' : 'output', text: output }]);
  };

  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    processCommand(currentCommand);
    setCurrentCommand("");
  };

  return (
    <div className="bg-zinc-900 border border-red-500/50 rounded-xl p-6 space-y-6">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-500/20 text-red-500 rounded-lg shadow-[0_0_15px_rgba(239,68,68,0.3)]">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-zinc-100 uppercase tracking-wider">Admin Terminal</h2>
            <p className="text-sm text-zinc-400 font-mono">System override capabilities activated</p>
          </div>
        </div>
        <button
          onClick={() => setShellActive(!shellActive)}
          className={`px-4 py-2 rounded-lg font-mono text-xs font-bold uppercase flex items-center gap-2 transition-colors ${
            shellActive ? 'bg-red-500 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700'
          }`}
        >
          <Terminal className="h-4 w-4" />
          {shellActive ? 'Close Shell' : 'Launch Shell'}
        </button>
      </div>

      <div className="flex gap-4 border-b border-zinc-800 pb-2">
        <button
          onClick={() => setActiveTab('actions')}
          className={`font-mono text-sm uppercase tracking-wider pb-2 border-b-2 transition-colors ${
            activeTab === 'actions' ? 'border-red-500 text-red-500' : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Quick Actions
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`font-mono text-sm uppercase tracking-wider pb-2 border-b-2 transition-colors ${
            activeTab === 'logs' ? 'border-red-500 text-red-500' : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Activity Log
        </button>
      </div>

      {message && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg text-sm font-mono flex items-center justify-center animate-fade-in">
          {message}
        </div>
      )}

      {activeTab === 'actions' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button onClick={handleReset} className="flex flex-col items-center justify-center gap-3 bg-zinc-950 hover:bg-red-500/10 border border-zinc-800 hover:border-red-500/50 p-6 rounded-xl transition text-zinc-300 hover:text-red-400 group">
            <Trash2 className="h-8 w-8 group-hover:scale-110 transition-transform" />
            <span className="font-bold text-xs uppercase tracking-widest text-center">Reset App State</span>
          </button>

          <button onClick={handleAddFunds} className="flex flex-col items-center justify-center gap-3 bg-zinc-950 hover:bg-emerald-500/10 border border-zinc-800 hover:border-emerald-500/50 p-6 rounded-xl transition text-zinc-300 hover:text-emerald-400 group">
            <Banknote className="h-8 w-8 group-hover:scale-110 transition-transform" />
            <span className="font-bold text-xs uppercase tracking-widest text-center">Inject Funds</span>
          </button>

          <button onClick={handleApproveKyc} disabled={securitySettings.kycStatus === "Approved"} className="flex flex-col items-center justify-center gap-3 bg-zinc-950 hover:bg-blue-500/10 border border-zinc-800 hover:border-blue-500/50 p-6 rounded-xl transition text-zinc-300 hover:text-blue-400 disabled:opacity-50 disabled:cursor-not-allowed group">
            <CheckCircle className="h-8 w-8 group-hover:scale-110 transition-transform" />
            <span className="font-bold text-xs uppercase tracking-widest text-center">Force KYC Approval</span>
          </button>

          <button onClick={handleBypass2FA} className="flex flex-col items-center justify-center gap-3 bg-zinc-950 hover:bg-purple-500/10 border border-zinc-800 hover:border-purple-500/50 p-6 rounded-xl transition text-zinc-300 hover:text-purple-400 group">
            <Unlock className="h-8 w-8 group-hover:scale-110 transition-transform" />
            <span className="font-bold text-xs uppercase tracking-widest text-center">Bypass 2FA</span>
          </button>
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden max-h-96 overflow-y-auto">
          {activityLogs.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 font-mono text-sm">
              No activity recorded yet.
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-900 text-zinc-400 font-mono text-xs uppercase sticky top-0">
                <tr>
                  <th className="px-4 py-3 font-medium">Timestamp</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Details</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800 font-mono text-xs">
                {activityLogs.map(log => (
                  <tr key={log.id} className="hover:bg-zinc-900/50 transition-colors">
                    <td className="px-4 py-3 text-zinc-500">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-zinc-300">{log.type}</td>
                    <td className="px-4 py-3 text-zinc-400">{log.details}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider ${
                        log.status === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        log.status === 'FAILED' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                        'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {shellActive && (
        <div className="bg-black border border-red-500/30 rounded-xl overflow-hidden flex flex-col h-96 shadow-[0_0_30px_rgba(239,68,68,0.1)]">
          <div className="bg-zinc-900 border-b border-red-500/30 p-2 flex items-center justify-between">
            <div className="flex items-center gap-2 px-2">
              <Terminal className="h-4 w-4 text-red-500" />
              <span className="text-[10px] text-red-500 font-mono uppercase tracking-widest font-bold">SECURE SHELL v1.0.0</span>
            </div>
            <div className="flex gap-1.5 px-2">
              <div className="w-2.5 h-2.5 rounded-full bg-zinc-700"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-zinc-700"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 font-mono text-sm">
            {commandHistory.map((item, index) => (
              <div key={index} className="mb-2 break-all">
                {item.type === 'input' && (
                  <div className="flex items-start text-zinc-300">
                    <span className="text-red-500 mr-2 flex-shrink-0">root@admin:~#</span>
                    <span>{item.text}</span>
                  </div>
                )}
                {item.type === 'output' && (
                  <div className="text-zinc-400 pl-4 whitespace-pre-wrap">{item.text}</div>
                )}
                {item.type === 'error' && (
                  <div className="text-red-400 pl-4">{item.text}</div>
                )}
              </div>
            ))}
            <div ref={shellBottomRef} />
          </div>

          <form onSubmit={handleCommandSubmit} className="border-t border-zinc-900 p-2 bg-zinc-950 flex items-center">
            <span className="text-red-500 font-mono text-sm mr-2 pl-2">root@admin:~#</span>
            <input
              type="text"
              value={currentCommand}
              onChange={(e) => setCurrentCommand(e.target.value)}
              className="flex-1 bg-transparent border-none text-zinc-100 font-mono focus:outline-none text-sm"
              autoFocus
              spellCheck="false"
              autoComplete="off"
            />
          </form>
        </div>
      )}
    </div>
  );
}
