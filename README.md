# 🏰 Siege Clan Tracker

> A modern web application for tracking Old School RuneScape clan member statistics, events, and achievements.

[![Better Stack Badge](https://uptime.betterstack.com/status-badges/v3/monitor/28siu.svg)](https://uptime.betterstack.com/?utm_source=status_badge)
[![CI](https://github.com/atayl16/siege-clan-tracker/actions/workflows/ci.yml/badge.svg)](https://github.com/atayl16/siege-clan-tracker/actions/workflows/ci.yml)
[![Node Version](https://img.shields.io/badge/node-18%2B-brightgreen.svg)](https://nodejs.org)
[![React Version](https://img.shields.io/badge/react-18.3-blue.svg)](https://reactjs.org)
[![License](https://img.shields.io/badge/license-Private-red.svg)](LICENSE)
[![Website](https://img.shields.io/website?url=https%3A%2F%2Fsiege-clan.com)](https://siege-clan.com)
[![GitHub last commit](https://img.shields.io/github/last-commit/atayl16/siege-clan-tracker)](https://github.com/atayl16/siege-clan-tracker/commits)
[![GitHub issues](https://img.shields.io/github/issues/atayl16/siege-clan-tracker)](https://github.com/atayl16/siege-clan-tracker/issues)
[![GitHub pull requests](https://img.shields.io/github/issues-pr/atayl16/siege-clan-tracker)](https://github.com/atayl16/siege-clan-tracker/pulls)

## 📖 Overview

Siege Clan Tracker is a comprehensive clan management system for Old School RuneScape (OSRS). It provides real-time tracking of member statistics, boss kills, events, and achievements by integrating with the [WiseOldMan](https://wiseoldman.net) API.

**Website:** [https://siege-clan.com](https://siege-clan.com)

### Key Features

- **👥 Member Management** - Track all clan members with automatic WiseOldMan sync
- **📊 Statistics Dashboard** - Real-time stats, rankings, and leaderboards
- **🎯 Goals & Races** - Create and track personal goals and competitive races
- **📅 Events Tracking** - Monitor ongoing and past clan events
- **🏆 Achievements** - Track group achievements and milestones
- **🔔 Notifications** - Anniversary notifications and RuneWatch alerts
- **👑 Admin Tools** - Comprehensive admin panel for clan management
- **📱 Responsive Design** - Works seamlessly on desktop and mobile

## 🛠️ Technology Stack

### Frontend
- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **React Query** - Server state management
- **React Router** - Client-side routing
- **CSS Modules** - Scoped styling

### Backend
- **Supabase** - PostgreSQL database with RLS
- **Netlify Functions** - Serverless API endpoints (Node.js)
- **Netlify Edge Functions** - Edge-optimized endpoints (Deno)

### APIs & Services
- **WiseOldMan API** - OSRS player statistics
- **Discord Webhooks** - Notifications
- **RuneWatch API** - Player verification

### Development Tools
- **ESLint** - Code linting
- **GitHub Actions** - Automated sync jobs
- **Git** - Version control

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Supabase account (for database)
- Netlify account (for deployment)
- WiseOldMan API access

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/atayl16/siege-clan-tracker.git
cd siege-clan-tracker
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**

Create a `.env` file in the root directory:

```env
# Supabase (required)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

**Note:** Do not add admin secrets or API keys to `.env` - these are configured server-side in Netlify environment variables for security.

4. **Run development server**
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Running with Netlify Dev

For full functionality including serverless functions:

```bash
npm run netlify:dev
```

## 🏗️ Project Structure

```
siege-clan-tracker/
├── src/                      # React frontend
│   ├── components/           # Reusable React components
│   │   ├── admin/           # Admin-specific components
│   │   └── ui/              # UI library components
│   ├── context/             # React Context providers
│   │   ├── AuthContext.js   # Authentication state
│   │   └── DataContext.js   # Data aggregation
│   ├── hooks/               # Custom React hooks
│   ├── pages/               # Route components
│   ├── utils/               # Utility functions
│   │   └── adminApi.js      # Admin API client
│   └── supabaseClient.js    # Supabase initialization
├── netlify/
│   ├── functions/           # Serverless functions (Node.js)
│   │   ├── anniversaries.js # Anniversary notifications
│   │   ├── discord.js       # Discord webhook handler
│   │   └── runewatch-check.js # RuneWatch verification
│   └── edge-functions/      # Edge functions (Deno)
│       ├── admin-*.js       # Admin operations
│       ├── members.js       # Member data API
│       ├── events.js        # Events data API
│       └── _shared/         # Shared utilities
│           └── auth.js      # Authentication middleware
├── scripts/                 # Background sync jobs
│   └── sync-tasks/
│       ├── sync-wom.cjs     # WiseOldMan member sync
│       ├── wom-events.cjs   # Events sync
│       ├── anniversaries.cjs # Anniversary check
│       └── runewatch-check.cjs # RuneWatch scan
├── .github/workflows/       # GitHub Actions
│   ├── hourly-clan-sync.yml # Hourly data sync
│   ├── daily-clan-sync.yml  # Daily checks
│   └── manual-clan-sync.yml # Manual triggers
└── supabase/               # Database migrations
    └── migrations/
```

## 🔑 Key Concepts

### Authentication

- **Hardcoded Admin** - Master admin with emergency access
- **User Registration** - Self-service user accounts
- **Character Claims** - Link OSRS characters to accounts
- **Admin Tokens** - Server-side admin operation authentication

### Data Flow

1. **WiseOldMan Sync** - Hourly sync of member data via GitHub Actions
2. **Edge Functions** - Cached API responses for fast data access
3. **React Query** - Client-side caching and optimistic updates
4. **Supabase RLS** - Row-level security for data access control

### Admin Architecture

Admin operations use dedicated edge functions with JWT-based authentication:
- Updates, deletes, and visibility changes bypass RLS using service role
- JWT tokens authenticate admin requests (no secrets in client)
- Admin-specific RPC functions handle privileged database operations

### Caching Strategy

- **Edge Functions**: 5-15 minute cache with ETags
- **React Query**: Automatic background refetch
- **Netlify CDN**: Global edge caching
- **Cache Invalidation**: Purge on data updates

## 📚 Documentation

### Core Documentation
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - Contribution guidelines and development standards

### Additional Documentation
Comprehensive documentation is organized in the [`/docs`](docs/) directory:

**Planning & Roadmap:**
- **[Technical Debt](docs/planning/tech-debt.md)** - Code refactoring opportunities and cleanup tasks
- **[Feature Suggestions](docs/planning/feature-suggestions.md)** - Proposed new features with implementation plans
- **[Bugs & UX Issues](docs/planning/bugs-and-ux.md)** - Known bugs, reproduction steps, and fixes
- **[Current Tasks](docs/planning/tasks.md)** - Work-in-progress and stabilization checklist

**Setup Guides:**
- **[Local Development Setup](docs/setup/local-setup.md)** - Development environment configuration
- **[Staging Setup](docs/setup/staging-setup.md)** - Staging database and testing procedures

See the [docs directory](docs/) for the complete documentation index.

## 🔒 Environment Variables

### Frontend (.env)
```env
SUPABASE_URL               # Supabase project URL
SUPABASE_ANON_KEY          # Public anon key (read-only access)
```

### Backend (Netlify)
```env
SUPABASE_URL               # Supabase project URL
SUPABASE_SERVICE_ROLE_KEY  # Service role key (private)
WOM_API_KEY                # WiseOldMan API key
WOM_GROUP_ID               # Clan group ID
DISCORD_WEBHOOK_URL        # Discord webhook
DISCORD_ANNIVERSARY_WEBHOOK_URL # Anniversary channel
API_KEY                    # Edge function API key
ADMIN_SECRET               # Admin operations secret
ALLOWED_ORIGIN             # CORS allowed origin
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

## 🚀 Deployment

### Automatic Deployment

Pushes to `main` branch automatically deploy to production via Netlify.

### Manual Deployment

```bash
# Build for production
npm run build

# Preview build locally
npm run preview
```

### Environment Setup

1. **Netlify**: Configure environment variables in dashboard
2. **Supabase**: Set up database and RLS policies
3. **GitHub**: Add secrets for Actions workflows
4. **WiseOldMan**: Register your clan group

## 🔄 Background Jobs

Automated sync jobs run via GitHub Actions:

| Job | Frequency | Purpose |
|-----|-----------|---------|
| WOM Sync | Hourly | Sync member data from WiseOldMan |
| WOM Events | Hourly | Sync event data and calculate points |
| Anniversaries | Daily | Check and notify clan anniversaries |
| RuneWatch | Daily | Scan for flagged members |

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Test thoroughly
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## 📝 License

This project is private and not licensed for public use.

## 👤 Author

**Alisha Taylor** ([@atayl16](https://github.com/atayl16))

## 🙏 Acknowledgments

- [WiseOldMan](https://wiseoldman.net) - OSRS tracking API
- [Supabase](https://supabase.com) - Backend infrastructure
- [Netlify](https://netlify.com) - Hosting and edge functions
- Siege Clan members - Testing and feedback

## 📧 Support

For questions or issues:
- Open an issue on GitHub
- Contact clan leadership in Discord

---

Made with ❤️ for the Siege Clan
