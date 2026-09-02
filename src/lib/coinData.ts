/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Token } from "../types";

// Static premium mock list used for instant load or fallback during api throttling
export const FALLBACK_TOKENS: Token[] = [
  {
    id: "bitcoin",
    name: "Bitcoin",
    symbol: "BTC",
    price: 94850.25,
    change24h: 3.42,
    marketCap: 1874291880345,
    volume24h: 38241029104,
    sparkline: [91300, 92100, 91800, 93000, 92400, 93800, 94850],
    logo: "https://assets.coingecko.com/coins/images/1/large/bitcoin.png"
  },
  {
    id: "ethereum",
    name: "Ethereum",
    symbol: "ETH",
    price: 3450.80,
    change24h: -1.15,
    marketCap: 414981029188,
    volume24h: 19412093845,
    sparkline: [3520, 3490, 3510, 3460, 3480, 3440, 3450.8],
    logo: "https://assets.coingecko.com/coins/images/279/large/ethereum.png"
  },
  {
    id: "solana",
    name: "Solana",
    symbol: "SOL",
    price: 184.65,
    change24h: 8.74,
    marketCap: 84310291804,
    volume24h: 4851203492,
    sparkline: [168, 172, 170, 175, 179, 181, 184.65],
    logo: "https://assets.coingecko.com/coins/images/4128/large/solana.png"
  },
  {
    id: "binancecoin",
    name: "BNB Coin",
    symbol: "BNB",
    price: 588.30,
    change24h: 0.85,
    marketCap: 89401290384,
    volume24h: 1204918239,
    sparkline: [582, 584, 581, 586, 589, 587, 588.3],
    logo: "https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png"
  },
  {
    id: "ripple",
    name: "Ripple",
    symbol: "XRP",
    price: 1.12,
    change24h: -2.35,
    marketCap: 61890381029,
    volume24h: 2195038419,
    sparkline: [1.16, 1.15, 1.13, 1.14, 1.11, 1.13, 1.12],
    logo: "https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png"
  },
  {
    id: "cardano",
    name: "Cardano",
    symbol: "ADA",
    price: 0.625,
    change24h: 1.45,
    marketCap: 21890382910,
    volume24h: 684291820,
    sparkline: [0.612, 0.618, 0.615, 0.622, 0.631, 0.621, 0.625],
    logo: "https://assets.coingecko.com/coins/images/975/large/cardano.png"
  },
  {
    id: "chainlink",
    name: "Chainlink",
    symbol: "LINK",
    price: 19.45,
    change24h: 4.55,
    marketCap: 11450291834,
    volume24h: 421094821,
    sparkline: [18.4, 18.2, 18.7, 18.9, 19.2, 19.1, 19.45],
    logo: "https://assets.coingecko.com/coins/images/877/large/chainlink-logo.png"
  },
  {
    id: "polkadot",
    name: "Polkadot",
    symbol: "DOT",
    price: 6.85,
    change24h: -0.42,
    marketCap: 9812039104,
    volume24h: 184591023,
    sparkline: [6.92, 6.88, 6.94, 6.81, 6.87, 6.83, 6.85],
    logo: "https://assets.coingecko.com/coins/images/12171/large/polkadot.png"
  },
  {
    id: "tether",
    name: "Tether",
    symbol: "USDT",
    price: 1.00,
    change24h: 0.01,
    marketCap: 112048192039,
    volume24h: 58491029340,
    sparkline: [1.001, 0.999, 1.00, 1.001, 1.00, 0.999, 1.00],
    logo: "https://assets.coingecko.com/coins/images/325/large/Tether.png"
  },
  {
    id: "dogecoin",
    name: "Dogecoin",
    symbol: "DOGE",
    price: 0.384,
    change24h: 12.85,
    marketCap: 56903841029,
    volume24h: 3108491024,
    sparkline: [0.332, 0.345, 0.352, 0.339, 0.368, 0.372, 0.384],
    logo: "https://assets.coingecko.com/coins/images/5/large/dogecoin.png"
  },
  {
    id: "gold",
    name: "Tokenized Gold",
    symbol: "XAU",
    price: 2450.10,
    change24h: 1.2,
    marketCap: 15400000000000,
    volume24h: 21000000000,
    sparkline: [2410, 2420, 2435, 2430, 2445, 2448, 2450.1],
    logo: "https://cryptologos.cc/logos/pax-gold-paxg-logo.png"
  },
  {
    id: "silver",
    name: "Tokenized Silver",
    symbol: "XAG",
    price: 29.85,
    change24h: -0.5,
    marketCap: 1400000000000,
    volume24h: 4500000000,
    sparkline: [30.1, 30.5, 29.8, 29.5, 29.7, 29.9, 29.85],
    logo: "https://cryptologos.cc/logos/kinesis-silver-kag-logo.png"
  },
  {
    id: "real-estate",
    name: "Real Estate Index",
    symbol: "REI",
    price: 1845.20,
    change24h: 0.8,
    marketCap: 45000000000,
    volume24h: 890000000,
    sparkline: [1820, 1825, 1835, 1830, 1840, 1842, 1845.2],
    logo: "https://cryptologos.cc/logos/propy-pro-logo.png"
  },
  {
    id: "tesla",
    name: "Tokenized Tesla",
    symbol: "TSLA",
    price: 245.50,
    change24h: 2.4,
    marketCap: 780000000000,
    volume24h: 12000000000,
    sparkline: [238, 240, 235, 242, 244, 243, 245.5],
    logo: "https://upload.wikimedia.org/wikipedia/commons/e/e8/Tesla_logo.png"
  }
];

export const NETWORK_DETAILS = {
  Ethereum: {
    symbol: "ETH",
    chainId: 1,
    rpcUrl: "https://ethereum.publicnode.com",
    nativeName: "Ether",
    color: "#627EEA",
    icon: "https://assets.coingecko.com/coins/images/279/large/ethereum.png"
  },
  BSC: {
    symbol: "BNB",
    chainId: 56,
    rpcUrl: "https://binance.llamarpc.com",
    nativeName: "BNB",
    color: "#F3BA2F",
    icon: "https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png"
  },
  Polygon: {
    symbol: "POL",
    chainId: 137,
    rpcUrl: "https://polygon-bor.publicnode.com",
    nativeName: "POL",
    color: "#8247E5",
    icon: "https://assets.coingecko.com/coins/images/4713/large/matic-token-icon.png"
  },
  Solana: {
    symbol: "SOL",
    chainId: 0, // non-EVM
    rpcUrl: "https://api.mainnet-beta.solana.com",
    nativeName: "SOL",
    color: "#14F195",
    icon: "https://assets.coingecko.com/coins/images/4128/large/solana.png"
  },
  Bitcoin: {
    symbol: "BTC",
    chainId: -1,
    rpcUrl: "",
    nativeName: "Bitcoin",
    color: "#F7931A",
    icon: "https://assets.coingecko.com/coins/images/1/large/bitcoin.png"
  }
};
