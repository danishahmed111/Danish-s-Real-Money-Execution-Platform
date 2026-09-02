import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface Wallet {
  id: string;
  name: string;
  type: 'BTC' | 'ETH' | 'BSC' | 'SOL' | 'MATIC' | 'TRX';
  address: string;
  balance: number;
}

interface WalletContextType {
  wallets: Wallet[];
  addWallet: (wallet: Wallet) => void;
  removeWallet: (id: string) => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [wallets, setWallets] = useState<Wallet[]>([]);

  const addWallet = (wallet: Wallet) => setWallets(prev => [...prev, wallet]);
  const removeWallet = (id: string) => setWallets(prev => prev.filter(w => w.id !== id));

  return (
    <WalletContext.Provider value={{ wallets, addWallet, removeWallet }}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallets = () => {
  const context = useContext(WalletContext);
  if (!context) throw new Error('useWallets must be used within a WalletProvider');
  return context;
};
