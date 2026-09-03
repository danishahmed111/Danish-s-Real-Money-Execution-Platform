# Cryptoverse Exchange

A high-performance cryptocurrency exchange platform and multi-chain portfolio tracker. This application features live simulated crypto prices, a trading terminal, a portfolio dashboard, and multi-wallet support.

**Live App**: https://cryptocurrency-exchange-portfolio-tracker-1750966378.asia-southeast1.run.app

## Features

- **Portfolio Dashboard**: Visualize your asset distribution across different holdings, track live values, and monitor your overall balance using dynamic charts built with Recharts.
- **Market Board**: Track live(simulated) cryptocurrency prices, observing performance via sparkline charts for rapid analysis.
- **Exchange Terminal**: Execute fast buy, sell, and swap simulated trades directly from your different wallets or tracking accounts.  
- **Multi-Wallet Support**: Manage different wallet addresses easily. Link or simulate Ethereum, Solana, BSC, Polygon, and Bitcoin wallets in one place.
- **Security Center**: Configure robust security constraints such as Two-Factor Authentication (2FA) simulation and app-lock settings.
- **AI Insights**: Contextual AI-generated insights to help you analyze market trends intelligently.

## Tech Stack

- **Frontend**: React 19, TypeScript
- **Styling**: Tailwind CSS v4
- **Animations**: Framer Motion
- **Data Visualization**: Recharts
- **Backend**: Express (Node.js) acting as a service layer structure.
- **Build Tool**: Vite & esbuild

## Getting Started

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Run Development Server**
   ```bash
   npm run dev
   ```
   *The app will be available at `http://localhost:3000`*

3. **Build for Production**
   ```bash
   npm run build
   ```

4. **Start Production Server**
   ```bash
   npm run start
   ```

## Project Structure

```
├── public/                 # Static assets
├── src/                    # Source files
│   ├── components/         # React application components
│   │   ├── AiInsights.tsx
│   │   ├── ExchangeTerminal.tsx
│   │   ├── MarketBoard.tsx
│   │   ├── PortfolioDashboard.tsx
│   │   ├── SecurityCenter.tsx
│   │   └── WalletComponent.tsx
│   ├── lib/                # Utilities and mocked token data (if any)
│   ├── store/              # State management utilities
│   ├── App.tsx             # Main application component
│   ├── index.css           # Global Tailwind CSS entry
│   └── main.tsx            # React root mount
├── package.json            # Scripts & dependencies
├── server.ts               # Express Backend entry point
└── tailwind.config.js      # Tailwind customization
```

## Note

This application is built as a highly polished, responsive client-side interface with a lightweight server component to support advanced routing or backend bridging (such as Google Gemini). Local data storage and state management are optimized for performance and user experience.
