# Siege Clan Tracker - Project Context

## Project Overview

**Siege Clan Tracker** is a web application for managing and tracking an Old School RuneScape (OSRS) clan. The application tracks player statistics, achievements, goals, and competitive events (races) using data from the Wise Old Man API integrated with a Supabase backend.

### Purpose
- Track clan member progress and statistics
- Manage player goals and achievements
- Run competitive races between clan members
- Generate and manage player claim codes
- Provide leaderboards and rankings
- Monitor member activity and rank progression

### Target Users
- Clan administrators (full access)
- Clan members (limited access to their own data)
- Public viewers (leaderboards and statistics)

## Technology Stack

### Frontend
- **Framework**: React 18.3.1
- **Language**: JavaScript with JSX (NOT TypeScript)
- **Build Tool**: Vite 5.1.4
- **Routing**: React Router 6.23.1
- **UI Library**: React Bootstrap 2.10.9 + Custom UI components
- **Icons**: React Icons 5.5.0 + Bootstrap Icons 1.11.3

### State Management
- **Server State**: React Query (@tanstack/react-query) + SWR (mixed usage)
- **Global State**: Context API (Auth, Data)
- **Local State**: React useState hooks
- **No Redux**

### Data & Backend
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth + Custom system
- **Edge Functions**: Netlify Functions (admin operations)
- **External API**: Wise Old Man API (OSRS player stats)
- **Data Tables**: TanStack Table 8.21.3

### Testing
- **Test Runner**: Vitest 3.2.4
- **Testing Library**: React Testing Library 16.3.0
- **Coverage**: Vitest coverage tools

### Development Tools
- **Package Manager**: npm
- **Dev Server**: Vite (fast refresh)
- **Error Tracking**: Sentry (@sentry/react)
- **Deployment**: Netlify

## Project Structure

```
siege-clan-tracker/
├── .claude/                      # Claude Code infrastructure
│   ├── skills/                   # React guidelines skill
│   ├── agents/                   # Specialized agents
│   ├── hooks/                    # Git hooks for automation
│   ├── settings.json             # Project configuration
│   └── PROJECT_CONTEXT.md        # This file
│
├── netlify/
│   └── functions/                # Netlify Edge Functions (admin ops)
│
├── public/                       # Static assets
│
├── scripts/
│   └── staging/                  # Database seeding scripts
│
├── src/
│   ├── assets/                   # Images, videos
│   │   ├── images/
│   │   └── videos/
│   │
│   ├── components/               # React components
│   │   ├── ui/                   # Reusable UI components
│   │   │   ├── Button.jsx
│   │   │   ├── Card.jsx
│   │   │   ├── Modal.jsx
│   │   │   ├── Tabs.jsx
│   │   │   └── ... (more)
│   │   ├── goals/                # Goal-related components
│   │   └── admin/                # Admin-specific components
│   │
│   ├── context/                  # React Context providers
│   │   ├── AuthContext.jsx       # Authentication & user state
│   │   └── DataContext.jsx       # Global data state
│   │
│   ├── hooks/                    # Custom React hooks
│   │   ├── useMembers.js         # Member data operations
│   │   ├── useClaimRequests.js   # Claim request management
│   │   ├── useRaces.js           # Race/competition data
│   │   ├── useUserGoals.js       # User goal tracking
│   │   └── ... (more)
│   │
│   ├── pages/                    # Page-level components
│   │   ├── ProfilePage.jsx       # User profile & characters
│   │   ├── LeaderboardPage.jsx   # Clan leaderboards
│   │   ├── MembersPage.jsx       # Member directory
│   │   └── ... (more)
│   │
│   ├── services/                 # Business logic services
│   │   ├── goalProgressService.js
│   │   └── ... (more)
│   │
│   ├── utils/                    # Utility functions
│   │   ├── supabaseClient.js     # Supabase client setup
│   │   ├── stringUtils.js        # String helpers
│   │   ├── rankUtils.js          # Rank calculation
│   │   └── ... (more)
│   │
│   ├── styles/                   # Global styles
│   │
│   ├── __tests__/                # Test files
│   │
│   ├── App.jsx                   # Root component
│   ├── main.jsx                  # Entry point
│   └── supabaseClient.js         # Supabase initialization
│
├── .gitignore
├── package.json
├── vite.config.js
└── README.md
```

## Key Features & Their Locations

### 1. Authentication & User Management
**Location**: [src/context/AuthContext.jsx](../src/context/AuthContext.jsx)

- User registration and login
- Admin authentication (hardcoded fallback)
- Player claim management
- Session handling with Supabase Auth

### 2. Member Management
**Location**: [src/hooks/useMembers.js](../src/hooks/useMembers.js), [src/components/MemberTable.jsx](../src/components/MemberTable.jsx)

- CRUD operations for clan members
- Member visibility toggling
- Rank progression tracking
- Integration with Wise Old Man data

### 3. Player Goals
**Location**: [src/components/goals/](../src/components/goals/), [src/services/goalProgressService.js](../src/services/goalProgressService.js)

- Goal creation and tracking
- Progress updates from WOM API
- Public goals board
- Per-player goal summaries

### 4. Competitions (Races)
**Location**: [src/hooks/useRaces.js](../src/hooks/useRaces.js), [src/components/RaceCard.jsx](../src/components/RaceCard.jsx)

- Create skill/boss competitions
- Track participant progress
- Leaderboards for active races
- Race completion and winner tracking

### 5. Leaderboards
**Location**: [src/components/Leaderboard.jsx](../src/components/Leaderboard.jsx)

- Siege Score leaderboard
- Event wins leaderboard
- Configurable display (compact/full)
- Real-time ranking

### 6. Claim System
**Location**: [src/components/ClaimPlayer.jsx](../src/components/ClaimPlayer.jsx), [src/hooks/useClaimRequests.js](../src/hooks/useClaimRequests.js)

- Generate unique claim codes
- Link users to in-game characters
- Approve/deny claim requests
- Code expiration system

## Data Flow

### 1. Player Data Flow
```
Wise Old Man API → Supabase DB (members table) → Custom Hooks → Components
                                                 ↓
                                            Merged with fresh WOM data
                                                 ↓
                                            Enhanced display
```

### 2. User Authentication Flow
```
Login Form → AuthContext → Supabase Auth → localStorage
                              ↓
                         Session Token
                              ↓
                    Admin Edge Functions (if admin)
```

### 3. Goal Tracking Flow
```
User Creates Goal → Supabase (user_goals) → Background Update Service
                                                     ↓
                                              WOM API (player stats)
                                                     ↓
                                              Update Progress → UI
```

### 4. Race Flow
```
Create Race → Supabase (races + race_participants)
                              ↓
                    Periodic WOM data fetch
                              ↓
                    Calculate standings
                              ↓
                    Update race card UI
```

## Common Workflows

### Development Workflow
```bash
# Start development server
npm start                 # Starts Vite dev server on http://localhost:5173

# Run tests
npm test                  # Run tests once
npm run test:watch        # Watch mode
npm run test:coverage     # Generate coverage report

# Build for production
npm run build             # Build to dist/
npm run preview           # Preview production build
```

### Database Workflows
```bash
# Staging environment
npm run staging:export    # Export production data
npm run staging:seed      # Seed staging database
npm run staging:refresh   # Complete refresh of staging

# Supabase
supabase link             # Link to Supabase project
supabase db push          # Push schema changes
```

### Deployment
- **Platform**: Netlify
- **Branch**: `main` for production
- **Build Command**: `npm run build`
- **Publish Directory**: `dist/`
- **Environment Variables**: Set in Netlify dashboard

## Important Domain Concepts

### Wise Old Man (WOM)
- Third-party service for tracking OSRS player statistics
- Provides API for player data, group management
- `wom_id`: Primary identifier for players
- Player snapshots: Historical stat records

### Siege Score
- Custom scoring system for clan members
- Based on XP gained + boss kills
- Different progression for "Skillers" vs "Fighters"
- Determines rank within clan

### Rank System
**Skillers**: Progress by XP gained
- Opal → Sapphire → Emerald → Ruby → Diamond → Dragonstone → Onyx → Zenyte

**Fighters**: Progress by EHB (Efficient Hours Bossed)
- Mentor → Prefect → Leader → Supervisor → Superior → Executive → Senator → Monarch → TzKal

**Admin Ranks**: Fixed hierarchy
- Owner → Deputy Owner → General → Captain → PvM Organizer

### Claim System
- Links application users to their in-game characters
- One character per claim code
- Codes expire after set time
- Prevents duplicate claims

### Ironman Types
- Different account types in OSRS
- Standard, Hardcore, Ultimate, Group, etc.
- Affects icon display and filtering

## Security Considerations

### Authentication Levels
1. **Public**: View leaderboards, public stats
2. **Logged In**: Manage own goals, claim characters
3. **Admin**: CRUD on all data, manage claims, edit members

### Data Protection
- Admin operations go through Netlify Edge Functions
- Edge functions validate Supabase session tokens
- Row Level Security (RLS) on Supabase tables
- Service role key kept server-side only

### Input Validation
- User input sanitized before DB operations
- Claim codes validated server-side
- Rate limiting on sensitive operations
- XSS prevention (React escapes by default)

## Development Guidelines

### When Adding Features
1. Check if similar functionality exists
2. Use existing UI components from `src/components/ui/`
3. Follow established patterns (see [react-guidelines](skills/react-guidelines/SKILL.md))
4. Add tests for new functionality
5. Update relevant documentation

### When Refactoring
1. Use the specialized agents in [.claude/agents/](.claude/agents/)
2. Maintain backward compatibility
3. Update tests to reflect changes
4. Document breaking changes

### When Debugging
1. Check React DevTools for component issues
2. Check Supabase logs for database errors
3. Check Netlify function logs for edge function issues
4. Check browser console for client-side errors
5. Use Sentry for production error tracking

## External Services

### Supabase
- **Database**: PostgreSQL with RLS
- **Auth**: User authentication
- **Storage**: File uploads (if needed)
- **Edge Functions**: None currently (using Netlify instead)

### Wise Old Man API
- **Base URL**: https://api.wiseoldman.net/v2
- **Documentation**: https://docs.wiseoldman.net
- **Rate Limits**: Be respectful, cache when possible
- **Group ID**: Stored in environment variables

### Netlify
- **Hosting**: Static site hosting
- **Functions**: Serverless functions for admin operations
- **Environment**: Preview deploys for PRs
- **Analytics**: Available in dashboard

## Getting Started

### Prerequisites
- Node.js 20+ (see [.github/workflows/](.github/workflows/) for CI version)
- npm (comes with Node.js)
- Supabase account and project
- Wise Old Man group ID

### Initial Setup
1. Clone repository
2. Run `npm install`
3. Copy `.env.example` to `.env`
4. Fill in Supabase credentials
5. Fill in WOM group ID
6. Run `npm start`

### First-Time Development
1. Read [react-guidelines](skills/react-guidelines/SKILL.md)
2. Explore existing components
3. Run tests to ensure everything works
4. Make a small change to understand workflow

## Troubleshooting

### Common Issues

**Build Fails**:
- Check Node.js version matches CI
- Clear `node_modules` and reinstall
- Check for syntax errors in new code

**Tests Fail**:
- Run `npm test` to see which tests fail
- Check if Supabase mocks are correct
- Verify component props match tests

**Auth Issues**:
- Check Supabase credentials in `.env`
- Verify session hasn't expired
- Check browser console for auth errors

**WOM Data Not Loading**:
- Verify group ID is correct
- Check WOM API status
- Check network tab for API responses

## Resources

### Internal Documentation
- [React Guidelines](skills/react-guidelines/SKILL.md) - Coding patterns and best practices
- [Component Patterns](skills/react-guidelines/resources/components-and-hooks.md) - Component structure
- [State Management](skills/react-guidelines/resources/state-management.md) - State patterns
- [Data Fetching](skills/react-guidelines/resources/data-fetching.md) - API patterns
- [Testing](skills/react-guidelines/resources/testing.md) - Test patterns

### External Documentation
- [React 18 Docs](https://react.dev/)
- [Vite Docs](https://vitejs.dev/)
- [Supabase Docs](https://supabase.com/docs)
- [React Query Docs](https://tanstack.com/query/latest)
- [Wise Old Man API Docs](https://docs.wiseoldman.net/)

---

**Last Updated**: 2025-11-13

This context provides a high-level understanding of the Siege Clan Tracker project. For detailed implementation patterns, see the [React Guidelines skill](skills/react-guidelines/SKILL.md).
