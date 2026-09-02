/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Token {
  id: string; // e.g. "bitcoin", "ethereum"
  name: string;
  symbol: string;
  price: number;
  change24h: number; // percentage
  marketCap: number;
  volume24h: number;
  sparkline: number[]; // Sparkline data for small charts
  logo: string;
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  routingNumber: string;
}

export interface UserProfile {
  userId: string;
  displayName: string;
  email: string;
  photoURL?: string;
  createdAt: string;
  phone?: string;
  bankAccounts?: BankAccount[];
}

export interface PrivateSecuritySettings {
  userId: string;
  email: string;
  twoFactorEnabled: boolean;
  twoFactorSecret: string; // Base32 TOTP secret
  backupCodes: string[];
  kycStatus: "Pending" | "Approved" | "Rejected";
}

export interface LinkedWallet {
  walletId: string;
  address: string;
  network: "Ethereum" | "BSC" | "Polygon" | "Solana" | "Bitcoin";
  label: string;
  createdAt: string;
  // Dynamic fields parsed or queried live
  balance?: number; // In native asset
  usdValue?: number;
  assets?: {
    symbol: string;
    name: string;
    amount: number;
    valueUsd: number;
    price: number;
  }[];
  privateKey?: string;
}

export interface TrackedAsset {
  assetId: string;
  symbol: string;
  name: string;
  amount: number;
  buyPrice: number; // average price user bought it at
  updatedAt: string;
}

export interface TransactionRecord {
  transactionId: string;
  type: "BUY" | "SELL" | "SWAP" | "TRANSFER";
  fromAsset: string;
  toAsset: string;
  fromAmount: number;
  toAmount: number;
  usdValue: number;
  fee: number;
  timestamp: string;
}

export interface NftAsset {
  nftId: string;
  name: string;
  collection: string;
  imageUrl: string;
  description: string;
  owner: string;
  createdAt: string;
  attributes: { trait_type: string; value: string | number }[];
}

export interface LimitOrder {
  id: string;
  type: "BUY" | "SELL";
  assetSymbol: string;
  targetPrice: number;
  amount: number;
  totalUsd: number;
  status: "PENDING" | "EXECUTED" | "CANCELLED";
  createdAt: string;
  walletId?: string;
}

export interface ActivityLog {
  id: string;
  type: 'LOGIN_ATTEMPT' | 'TRANSFER' | 'SECURITY_CHANGE';
  details: string;
  timestamp: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
}

export interface PortfolioStats {
  totalBalanceUsd: number;
  change24hUsd: number;
  change24hPercent: number;
  assetDistribution: {
    name: string;
    value: number; // USD value
    percentage: number;
    color: string;
  }[];
}

export interface MarketHistoryPoint {
  time: string;
  price: number;
}
