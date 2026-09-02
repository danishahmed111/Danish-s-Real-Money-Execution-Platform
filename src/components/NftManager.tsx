import React, { useState } from "react";
import { usePortfolio } from "../store/portfolioStore";
import { 
  Plus, Import, Image as ImageIcon, Trash2, ExternalLink, 
  Tag, Info, Shapes, Wallet, AlertCircle, Palette, ArrowUpRight,
  Send, Loader2, CheckCircle2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { NftAsset } from "../types";

export default function NftManager() {
  const { nfts, createNft, importNft, deleteNft, transferNft, isSignedIn } = usePortfolio();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedNftForTransfer, setSelectedNftForTransfer] = useState<NftAsset | null>(null);
  const [transferAddress, setTransferAddress] = useState("");
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferSuccess, setTransferSuccess] = useState(false);
  
  // Form states
  const [name, setName] = useState("");
  const [collection, setCollection] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [description, setDescription] = useState("");

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createNft(name, collection, imageUrl, description);
    resetForm();
    setShowCreateModal(false);
  };

  const handleImport = (e: React.FormEvent) => {
    e.preventDefault();
    importNft(name, collection, imageUrl, description);
    resetForm();
    setShowImportModal(false);
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNftForTransfer) return;
    
    setIsTransferring(true);
    try {
      await transferNft(selectedNftForTransfer.nftId, transferAddress);
      setTransferSuccess(true);
      setTimeout(() => {
        setTransferSuccess(false);
        setSelectedNftForTransfer(null);
        setTransferAddress("");
        setIsTransferring(false);
      }, 2000);
    } catch (err) {
      console.error("Transfer failed", err);
      setIsTransferring(false);
    }
  };

  const resetForm = () => {
    setName("");
    setCollection("");
    setImageUrl("");
    setDescription("");
  };

  const getExplorerUrl = (nftId: string) => {
    return `https://solscan.io/token/${nftId}`; // Simulated link
  };

  if (!isSignedIn) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-zinc-900/50 border border-zinc-800 rounded-2xl">
        <div className="bg-zinc-800 p-4 rounded-full mb-4">
          <Wallet className="h-8 w-8 text-zinc-500" />
        </div>
        <h2 className="text-xl font-bold text-zinc-100">Sign in to manage NFTs</h2>
        <p className="text-zinc-400 text-sm mt-2 max-w-sm">
          Connect your account to start minting, importing, and organizing your digital collectibles.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" id="nft_manager_root">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
        <div>
          <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <Palette className="h-5 w-5 text-emerald-400" />
            NFT Gallery
          </h2>
          <p className="text-zinc-500 text-sm mt-1">Manage, mint, and showcase your digital collectibles.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-4 py-2 rounded-xl border border-zinc-700 transition-colors text-sm font-medium"
          >
            <Import className="h-4 w-4" /> Import NFT
          </button>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 px-4 py-2 rounded-xl transition-colors text-sm font-bold shadow-lg shadow-emerald-500/10"
          >
            <Plus className="h-4 w-4" /> Mint NFT
          </button>
        </div>
      </div>

      {/* NFT Grid */}
      {nfts.length === 0 ? (
        <div className="p-12 text-center bg-zinc-900/30 border border-zinc-800 border-dashed rounded-2xl">
          <div className="bg-zinc-800/50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ImageIcon className="h-8 w-8 text-zinc-600" />
          </div>
          <p className="text-zinc-400 font-medium">No NFTs in your gallery yet</p>
          <p className="text-zinc-600 text-sm mt-1 mb-6">Start by minting your first NFT or importing from an address.</p>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="text-emerald-400 hover:text-emerald-300 text-sm font-bold uppercase tracking-wider"
          >
            Mint My First NFT
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {nfts.map((nft) => (
            <motion.div 
              layout
              key={nft.nftId}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden group hover:border-zinc-700 transition-colors flex flex-col"
            >
              <div className="aspect-square relative overflow-hidden bg-zinc-950">
                <img 
                  src={nft.imageUrl || "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=400&h=400&fit=crop"} 
                  alt={nft.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 left-3 bg-zinc-900/80 backdrop-blur-md px-2 py-0.5 rounded-full border border-zinc-700/50 flex items-center gap-1.5">
                  <Shapes className="h-3 w-3 text-emerald-400" />
                  <span className="text-[10px] font-mono text-zinc-300 uppercase tracking-tight">{nft.collection}</span>
                </div>
                <div className="absolute inset-0 bg-zinc-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                   <button 
                     onClick={() => setSelectedNftForTransfer(nft)}
                     className="bg-zinc-900/90 p-3 rounded-full hover:bg-emerald-500 hover:text-zinc-950 transition-all transform translate-y-4 group-hover:translate-y-0 duration-300"
                   >
                     <Send className="h-5 w-5" />
                   </button>
                   <a 
                     href={getExplorerUrl(nft.nftId)}
                     target="_blank"
                     rel="noopener noreferrer"
                     className="bg-zinc-900/90 p-3 rounded-full hover:bg-zinc-100 hover:text-zinc-950 transition-all transform translate-y-4 group-hover:translate-y-0 duration-300 delay-75"
                   >
                     <ArrowUpRight className="h-5 w-5" />
                   </a>
                </div>
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-zinc-100 truncate flex-1">{nft.name}</h3>
                  <button 
                    onClick={() => deleteNft(nft.nftId)}
                    className="text-zinc-600 hover:text-rose-400 p-1 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-zinc-500 text-xs line-clamp-2 mb-4 h-8">{nft.description}</p>
                
                <div className="mt-auto pt-3 border-t border-zinc-800 flex items-center justify-between">
                   <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center">
                         <Tag className="h-2.5 w-2.5 text-zinc-500" />
                      </div>
                      <span className="text-[10px] text-zinc-400 font-medium">#{nft.nftId.slice(-4).toUpperCase()}</span>
                   </div>
                   <button 
                     onClick={() => window.open(getExplorerUrl(nft.nftId), '_blank')}
                     className="text-zinc-400 hover:text-emerald-400 transition-colors"
                   >
                      <ExternalLink className="h-3.5 w-3.5" />
                   </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {(showCreateModal || showImportModal || selectedNftForTransfer) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setShowCreateModal(false); setShowImportModal(false); setSelectedNftForTransfer(null); }}
              className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-zinc-900 border border-zinc-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
            >
              {selectedNftForTransfer ? (
                /* Transfer Modal Content */
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="bg-emerald-500/10 p-2.5 rounded-xl text-emerald-400 border border-emerald-500/20">
                      <Send className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-zinc-100">Transfer NFT</h3>
                      <p className="text-zinc-500 text-xs">Send your collectible to another wallet.</p>
                    </div>
                  </div>

                  {transferSuccess ? (
                    <div className="py-8 text-center space-y-4">
                      <div className="flex justify-center">
                        <CheckCircle2 className="h-12 w-12 text-emerald-400 animate-bounce" />
                      </div>
                      <p className="text-zinc-200 font-bold">Transfer Successful!</p>
                      <p className="text-zinc-500 text-xs">The NFT has been sent to {transferAddress.slice(0, 6)}...{transferAddress.slice(-4)}</p>
                    </div>
                  ) : (
                    <form onSubmit={handleTransfer} className="space-y-6">
                      <div className="flex items-center gap-4 bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                        <img 
                          src={selectedNftForTransfer.imageUrl} 
                          className="w-12 h-12 rounded-lg object-cover" 
                          alt={selectedNftForTransfer.name} 
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-zinc-100 truncate text-sm">{selectedNftForTransfer.name}</p>
                          <p className="text-[10px] text-zinc-500 font-mono uppercase truncate">{selectedNftForTransfer.collection}</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-mono uppercase text-zinc-500 tracking-wider">Recipient Address</label>
                        <input 
                          required
                          disabled={isTransferring}
                          type="text"
                          value={transferAddress}
                          onChange={(e) => setTransferAddress(e.target.value)}
                          placeholder="Enter Solana / EVM wallet address"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-200 text-sm focus:outline-none focus:border-emerald-500/50 transition-colors"
                        />
                        <div className="flex items-start gap-2 text-zinc-500 text-[10px] mt-1">
                          <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                          <p>Ensure the recipient address is correct. This action cannot be undone once confirmed on the blockchain.</p>
                        </div>
                      </div>

                      <div className="flex gap-3 pt-2">
                        <button 
                          type="button"
                          disabled={isTransferring}
                          onClick={() => setSelectedNftForTransfer(null)}
                          className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-3 rounded-xl font-bold transition-colors disabled:opacity-50"
                        >
                          Cancel
                        </button>
                        <button 
                          type="submit"
                          disabled={isTransferring || !transferAddress}
                          className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 py-3 rounded-xl font-black transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {isTransferring ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            "Send NFT"
                          )}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              ) : (
                /* Create/Import Modal Content */
                <>
                  <div className="p-6 border-b border-zinc-800">
                    <h3 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
                      {showCreateModal ? <Plus className="h-5 w-5 text-emerald-400" /> : <Import className="h-5 w-5 text-emerald-400" />}
                      {showCreateModal ? "Mint New NFT" : "Import NFT"}
                    </h3>
                    <p className="text-zinc-500 text-sm mt-1">
                      {showCreateModal ? "Create a unique digital asset on the blockchain." : "Add an existing NFT to your collection by details."}
                    </p>
                  </div>

                  <form onSubmit={showCreateModal ? handleCreate : handleImport} className="p-6 space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-mono uppercase text-zinc-500 tracking-wider">Asset Name</label>
                      <input 
                        required
                        type="text" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Cyber Punk #12"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-200 focus:outline-none focus:border-emerald-500/50 transition-colors"
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-xs font-mono uppercase text-zinc-500 tracking-wider">Collection / Artist</label>
                      <input 
                        required
                        type="text" 
                        value={collection}
                        onChange={(e) => setCollection(e.target.value)}
                        placeholder="e.g. Genesis Collection"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-200 focus:outline-none focus:border-emerald-500/50 transition-colors"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-mono uppercase text-zinc-500 tracking-wider">Image URL</label>
                      <div className="relative">
                        <ImageIcon className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                        <input 
                          required
                          type="url" 
                          value={imageUrl}
                          onChange={(e) => setImageUrl(e.target.value)}
                          placeholder="https://..."
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-zinc-200 focus:outline-none focus:border-emerald-500/50 transition-colors"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-mono uppercase text-zinc-500 tracking-wider">Description</label>
                      <textarea 
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={3}
                        placeholder="Describe the uniqueness of this asset..."
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-200 focus:outline-none focus:border-emerald-500/50 transition-colors resize-none"
                      />
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button 
                        type="button"
                        onClick={() => { setShowCreateModal(false); setShowImportModal(false); }}
                        className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-3 rounded-xl font-bold transition-colors"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit"
                        className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 py-3 rounded-xl font-black transition-colors shadow-lg shadow-emerald-500/20"
                      >
                        {showCreateModal ? "Confirm Mint" : "Confirm Import"}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
