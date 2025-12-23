import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { Lucid, Blockfrost } from "lucid-cardano";

interface LucidContextType {
  lucid: Lucid | null;
  address: string | null;
  isConnected: boolean;
  connectWallet: (wallet?: string) => Promise<void>;
  disconnectWallet: () => void;
  loading: boolean;
}

const LucidContext = createContext<LucidContextType | undefined>(undefined);

export const useLucid = () => {
  const context = useContext(LucidContext);
  if (!context) {
    throw new Error('useLucid must be used within a LucidProvider');
  }
  return context;
};

interface LucidProviderProps {
  children: ReactNode;
}

export const LucidProvider: React.FC<LucidProviderProps> = ({ children }) => {
  const [lucid, setLucid] = useState<Lucid | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  // Check for existing connection on mount
  useEffect(() => {
    const checkExistingConnection = async () => {
      const savedAddress = localStorage.getItem('walletAddress');
      if (savedAddress && window.cardano?.lace) {
        try {
          setLoading(true);
          await connectWallet('lace');
        } catch (error) {
          console.log('No existing wallet connection');
          localStorage.removeItem('walletAddress');
        } finally {
          setLoading(false);
        }
      }
    };

    checkExistingConnection();
  }, []);

  const connectWallet = async (wallet: string = 'lace') => {
    if (!window.cardano || !window.cardano[wallet]) {
      alert(`${wallet} wallet not found`);
      return;
    }

    try {
      setLoading(true);
      const api = await window.cardano[wallet].enable();

      // Import Lucid dynamically to avoid issues with ES modules
      // const { default: Lucid, Blockfrost } = await import(
      //   "https://unpkg.com/lucid-cardano@0.10.11/web/mod.js"
      // );

      const lucidInstance = await Lucid.new(
        new Blockfrost(
          "https://cardano-preprod.blockfrost.io/api/v0",
          import.meta.env.VITE_BLOCKFROST_API
        ),
        "Preprod"
      );

      lucidInstance.selectWallet(api);
      const walletAddress = await lucidInstance.wallet.address();

      setLucid(lucidInstance);
      setAddress(walletAddress);
      setIsConnected(true);

      // Save to localStorage for persistence
      localStorage.setItem('walletAddress', walletAddress);

      console.log('✅ Wallet connected:', walletAddress);
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      alert('Failed to connect wallet. Please try again.');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const disconnectWallet = () => {
    setLucid(null);
    setAddress(null);
    setIsConnected(false);
    localStorage.removeItem('walletAddress');
    console.log('Wallet disconnected');
  };

  return (
    <LucidContext.Provider value={{
      lucid,
      address,
      isConnected,
      connectWallet,
      disconnectWallet,
      loading
    }}>
      {children}
    </LucidContext.Provider>
  );
};