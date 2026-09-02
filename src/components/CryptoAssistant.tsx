import { useState } from "react";
import { Sparkles, Loader2, SendHorizontal } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function CryptoAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState<{ role: "user" | "ai", text: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!message.trim()) return;
    
    setLoading(true);
    const userMsg = message;
    setChat(prev => [...prev, { role: "user", text: userMsg }]);
    setMessage("");

    try {
      const response = await fetch("/api/gemini-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg }),
      });
      if (response.ok) {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await response.json();
          setChat(prev => [...prev, { role: "ai", text: data.response }]);
        } else {
          setChat(prev => [...prev, { role: "ai", text: "AI service temporarily unavailable (Loading proxy state)." }]);
        }
      } else {
        setChat(prev => [...prev, { role: "ai", text: "Error connecting to AI advisor." }]);
      }
    } catch (e) {
      setChat(prev => [...prev, { role: "ai", text: "Error connecting to AI advisor." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 p-4 rounded-full shadow-xl shadow-emerald-500/20 transition-all hover:scale-105"
      >
        <Sparkles className="h-6 w-6" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="absolute bottom-16 right-0 w-80 bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[400px]"
          >
            <div className="p-4 border-b border-zinc-800 bg-zinc-950/50 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-400" />
              <span className="text-xs font-black uppercase tracking-widest text-zinc-100">Danish's AI Trading Advisor</span>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {chat.length === 0 && (
                <div className="text-center py-10 opacity-50">
                  <p className="text-xs text-zinc-500 font-mono">How can I assist your crypto journey today?</p>
                </div>
              )}
              {chat.map((m, i) => (
                <div key={i} className={`text-xs ${m.role === "user" ? "text-right" : ""}`}>
                  <span className={`inline-block p-3 rounded-2xl ${m.role === "user" ? "bg-emerald-500/10 text-emerald-200" : "bg-zinc-800 text-zinc-200"}`}>
                    {m.text}
                  </span>
                </div>
              ))}
              {loading && <Loader2 className="h-4 w-4 animate-spin text-emerald-400 mx-auto" />}
            </div>

            <div className="p-3 border-t border-zinc-800 bg-zinc-950/50 flex gap-2">
              <input 
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Ask anything..."
                className="flex-1 bg-transparent text-zinc-200 text-xs placeholder:text-zinc-600 focus:outline-none"
                onKeyDown={e => e.key === "Enter" && sendMessage()}
              />
              <button 
                onClick={sendMessage}
                disabled={loading || !message.trim()}
                className="text-emerald-500 hover:text-emerald-400 disabled:opacity-50"
              >
                <SendHorizontal className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
