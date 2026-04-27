# Coin Voyage (formerly Crypto Market Dashboard)
Live Demo: https://coinvoyage.vercel.app

A high-performance cryptocurrency dashboard built with React, Tailwind CSS, and the CoinGecko API, focusing on real-time data handling, clean architecture, and responsive UI.

## Features & Implementation

This project delivers a premium interface with a rich set of features:

- **Live Market Data:** Fetches the top cryptocurrencies via the CoinGecko API with robust error handling.
- **Global Market Overview:** Real-time metrics for Total Market Cap, 24H Volume, BTC Dominance, and Active Coins.
- **Client-Side Pagination & Sorting:** A highly optimized table that supports multi-directional sorting (Rank, Price, Market Cap, etc.) and page navigation without re-rendering delays.
- **Lightning Fast Search:** Real-time filtering powered by `useMemo` to ensure lag-free keystrokes.
- **Auto-Polling & Countdown Timer:** Data refreshes automatically every 60 seconds, visualized by a sleek, real-time countdown timer.
- **Deep Insights Modal:** A glassmorphism-styled drawer that provides advanced metrics when clicking on any asset.
- **7-Day Sparkline Visualization:** Integrated `Recharts` for dynamic 7-day sparkline charts for visual trend analysis.
- **State Persistence:** User's preferred theme (Dark/Light) is saved to `localStorage` and respected across sessions.
- **Responsive Design:** Completely fluid grid and table layouts ensuring pixel-perfect display across Desktop, Tablet, and Mobile.

## Technical Decisions & Architecture

### 1. Component Modularity & Clean Folder Structures
The application is structured for scalability:
- **`src/components/`**: UI logic is decoupled into highly reusable blocks (`Header`, `SearchBar`, `CoinTable`, `GlobalStats`, `SkeletonLoader`, `Modal`, etc.).
- **`src/utils/`**: Pure logic and formatting functions are isolated from the UI, ensuring high testability.
- **`App.jsx`**: Acts purely as the orchestration layer, handling asynchronous state management, sorting algorithms, and passing data down to pure UI components.

### 2. API Resilience & Error Handling
- **Graceful Degradation:** The UI uses extensive Optional Chaining (`?.`) and Nullish Coalescing (`??`) to guarantee the app will never crash if the API payload changes or drops fields.
- **Error Boundaries:** If global stats or coin lists fail to fetch, independent visual fallbacks are provided to allow the rest of the application to render gracefully.

### 3. UI/UX Intuition
- **Skeleton Loaders:** The initial load triggers a full-page Skeleton Loader that identically mimics the structure of the dashboard to maintain structural continuity and reduce cognitive load.
- **Aesthetic Edge:** Implemented a very deep, rich dark mode (`#0B0E14` and `#131722`) rather than standard grays to give a premium, "terminal-like" financial feel.
- **Micro-interactions:** Interactive hover states on table rows, color-coded performance badges for 24-hour price changes, smooth transitions on theme toggles, and modal entrance animations.
- **Responsive Tables:** Ensured financial data uses `whitespace-nowrap` so it is never awkwardly broken into multiple lines on mobile devices.

## Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- npm or yarn

### Installation
1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

## Built With
- **React** (Vite)
- **Tailwind CSS** (Styling & Dark Mode)
- **Lucide React** (Icons)
- **Recharts** (Data Visualization)
- **CoinGecko API** (Data Source)
