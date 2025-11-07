# Feature Suggestions & Enhancement Ideas

**Last Updated:** 2025-11-06
**Status:** Planning Document

This document contains suggested new features and enhancements for the Siege Clan Tracker. Each feature includes a description, implementation plan, estimated effort, and priority rating. Use this to poll clan members and plan future development.

---

## 🎯 High-Impact Features

### 1. Discord Bot Integration
**Priority:** ⭐⭐⭐⭐⭐ (Highest requested feature)
**Effort:** High (2-3 weeks)
**Value:** Very High

#### Description
Create a Discord bot that provides clan information and stats directly in Discord channels.

#### Features
- **!stats [username]** - Show player stats (XP, EHB, rank)
- **!leaderboard [skill/boss]** - Show top 10 for any metric
- **!rank** - Show your current rank and progress to next rank
- **!goals** - View your personal goals progress
- **!events** - List active clan events
- **!race create** - Create a new race
- **!compare [user1] [user2]** - Compare two players

#### Benefits
- Members can check stats without leaving Discord
- Increases engagement with the tracker
- More convenient than web interface for quick lookups
- Could send notifications for achievements/milestones

#### Implementation Plan

**Tech Stack:**
- discord.js or discord.py
- Hosted on Heroku/Railway/fly.io or Netlify Functions
- Use existing edge functions as API endpoints

**Steps:**
1. Set up Discord bot application in Discord Developer Portal
2. Create bot command handlers
3. Connect to existing Supabase edge functions for data
4. Implement slash commands (modern Discord standard)
5. Add permission system (admin commands vs user commands)
6. Deploy to hosting platform
7. Add bot to Siege Discord server

**API Endpoints Needed:**
- All existing endpoints already work
- May need new endpoint: `/api/player-lookup` for flexible player search

**Estimated Time:**
- Week 1: Bot setup, basic commands (!stats, !rank, !leaderboard)
- Week 2: Advanced commands (!goals, !events, !race)
- Week 3: Polish, error handling, admin commands, testing

#### Poll Question for Members
> "Would you use a Discord bot to check your stats, create races, and view leaderboards without leaving Discord?"

---

### 2. Mobile App (Progressive Web App)
**Priority:** ⭐⭐⭐⭐ (High demand)
**Effort:** Medium (1-2 weeks)
**Value:** High

#### Description
Convert the existing web app into a Progressive Web App (PWA) that can be installed on mobile devices and work offline.

#### Features
- **Install to Home Screen** - Works like a native app
- **Offline Support** - View cached data without internet
- **Push Notifications** - Anniversary alerts, race updates
- **Mobile-Optimized UI** - Better touch targets, mobile navigation
- **Share Feature** - Share your stats to social media

#### Benefits
- Better mobile experience
- No app store approval needed
- Uses existing codebase
- Works on iOS and Android
- Offline access to data

#### Implementation Plan

**Tech Stack:**
- Service Workers for offline caching
- Web App Manifest for installation
- Push API for notifications
- Current React app (minimal changes)

**Steps:**
1. Create `manifest.json` for app metadata
2. Implement service worker for caching
3. Add offline fallback page
4. Configure push notification service
5. Optimize mobile CSS (responsive design already exists)
6. Add "Install App" prompt
7. Test on iOS Safari and Android Chrome

**Files to Create/Modify:**
- `public/manifest.json` - App metadata
- `public/sw.js` - Service worker
- `src/utils/pwa.js` - PWA utilities
- Update `index.html` with manifest link

**Estimated Time:**
- Week 1: Service worker, manifest, offline support
- Week 2: Push notifications, mobile optimizations, testing

#### Poll Question for Members
> "Would you install a Siege Clan Tracker app on your phone for easier access and notifications?"

---

### 3. Clan Competitions System
**Priority:** ⭐⭐⭐⭐ (Highly engaging)
**Effort:** High (2-3 weeks)
**Value:** Very High

#### Description
Enhanced competition system beyond the basic "races" feature, with team competitions, multi-metric challenges, and prizes.

#### Features
- **Team Competitions** - Split clan into teams, compete together
- **Multi-Metric Challenges** - "Gain 10M XP + defeat 100 bosses"
- **Seasonal Competitions** - Month-long challenges with leaderboards
- **Prize Tracking** - Track GP prizes for winners
- **Competition Templates** - Reuse popular competition formats
- **Bracket Tournaments** - 1v1 elimination brackets

#### Competition Types
1. **XP Race** - Total XP gained (already exists)
2. **Boss Challenge** - Most KC on specific boss
3. **Skill Grind** - Most levels gained in a skill
4. **All-Around** - Points for multiple metrics
5. **Team Battle** - Teams compete for combined totals
6. **Bingo Card** - Complete tasks on a bingo board

#### Benefits
- Increases clan engagement
- Creates friendly competition
- Encourages active play
- Builds community
- Gives purpose to grinding

#### Implementation Plan

**Database Schema:**
```sql
-- New tables
CREATE TABLE competitions (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'solo', 'team', 'bracket', 'bingo'
  metrics JSONB, -- [{ metric: 'cooking', weight: 1 }]
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  prize_gp INTEGER,
  rules TEXT,
  status TEXT DEFAULT 'active'
);

CREATE TABLE competition_teams (
  id SERIAL PRIMARY KEY,
  competition_id INTEGER REFERENCES competitions(id),
  name TEXT,
  color TEXT
);

CREATE TABLE competition_participants (
  competition_id INTEGER REFERENCES competitions(id),
  player_id INTEGER,
  team_id INTEGER REFERENCES competition_teams(id),
  start_snapshot JSONB,
  current_progress JSONB,
  points INTEGER DEFAULT 0
);

CREATE TABLE bingo_cards (
  id SERIAL PRIMARY KEY,
  competition_id INTEGER REFERENCES competitions(id),
  tasks JSONB -- Array of tasks
);
```

**New Components:**
- `CompetitionsList.jsx` - Browse all competitions
- `CompetitionDetail.jsx` - View specific competition
- `CreateCompetition.jsx` - Admin creates new competition
- `TeamManager.jsx` - Admin assigns teams
- `BingoBoard.jsx` - Interactive bingo card
- `BracketView.jsx` - Tournament bracket display

**New Pages:**
- `/competitions` - List all competitions
- `/competitions/:id` - Competition details
- `/competitions/create` - Create new (admin)

**Estimated Time:**
- Week 1: Database schema, basic competition CRUD
- Week 2: Team competitions, multi-metric scoring
- Week 3: Bingo cards, bracket tournaments
- Week 4: Polish, testing, leaderboards

#### Poll Question for Members
> "Would you participate in monthly clan competitions with different formats (teams, bingo, brackets)?"

---

### 4. Achievement System & Badges
**Priority:** ⭐⭐⭐⭐ (Fun & engaging)
**Effort:** Medium (1-2 weeks)
**Value:** High

#### Description
Personal achievement system with unlockable badges displayed on profiles.

#### Achievement Categories
1. **Milestone Achievements**
   - "First 99" - Get your first 99 skill
   - "Maxed Account" - Reach 2277 total level
   - "Quest Cape" - Complete all quests
   - "Billionaire" - Reach 1B total XP

2. **Boss Achievements**
   - "Giant Slayer" - 100 KC on any boss
   - "Champion" - 1000 KC on any boss
   - "Boss Master" - 100 KC on 10 different bosses
   - "Hardcore" - Solo boss achievements

3. **Clan Achievements**
   - "Loyal Member" - 1 year in clan
   - "Veteran" - 2 years in clan
   - "Ancient" - 3+ years in clan
   - "Helper" - Most helpful member (voted)
   - "Race Winner" - Win 5 races

4. **Social Achievements**
   - "Commentator" - Leave 50 comments
   - "Supporter" - Vote in 10 polls
   - "Team Player" - Complete 5 team events

5. **Rare Achievements**
   - "Pet Hunter" - Get 5 pets
   - "Collection Log Master" - 500+ unique items
   - "Speed Demon" - Complete speed tasks

#### Features
- **Badge Display** - Show top 3 badges on profile
- **Achievement Progress** - Track progress to each achievement
- **Rarity Levels** - Common, Rare, Epic, Legendary
- **Points System** - Earn achievement points
- **Global Achievement Leaderboard** - Most achievement points
- **Notifications** - Celebrate when unlocked

#### Benefits
- Adds gamification
- Long-term goals beyond stats
- Showcases accomplishments
- Encourages diverse gameplay
- Fun to collect

#### Implementation Plan

**Database Schema:**
```sql
CREATE TABLE achievements (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  rarity TEXT, -- 'common', 'rare', 'epic', 'legendary'
  icon_url TEXT,
  points INTEGER DEFAULT 10,
  criteria JSONB -- Conditions to unlock
);

CREATE TABLE player_achievements (
  player_id INTEGER,
  achievement_id INTEGER REFERENCES achievements(id),
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  progress JSONB, -- Progress toward achievement
  PRIMARY KEY (player_id, achievement_id)
);
```

**New Components:**
- `AchievementCard.jsx` - Display single achievement
- `AchievementList.jsx` - Browse all achievements
- `AchievementProgress.jsx` - Progress bars
- `BadgeDisplay.jsx` - Showcase badges on profile
- `AchievementNotification.jsx` - Unlock celebration

**Achievement Check Script:**
- `scripts/check-achievements.cjs` - Run daily
- Checks all players against achievement criteria
- Unlocks earned achievements
- Sends Discord notifications

**Estimated Time:**
- Week 1: Database, achievement definitions, basic unlock system
- Week 2: UI components, progress tracking, notifications

#### Poll Question for Members
> "Would you like an achievement/badge system to showcase your accomplishments on your profile?"

---

### 5. Skill Calculator & Planning Tools
**Priority:** ⭐⭐⭐ (Useful utility)
**Effort:** Medium (1-2 weeks)
**Value:** Medium-High

#### Description
Built-in calculators and planning tools for OSRS activities.

#### Tools to Include
1. **XP Calculator**
   - Calculate XP needed for level goals
   - Estimate time based on XP/hour rates
   - Show different training methods

2. **Combat Calculator**
   - Max hit calculator
   - DPS calculator
   - Optimal gear suggestions

3. **Quest Helper**
   - Quest requirements checker
   - Recommended quest order
   - Skill requirements visualization

4. **Clue Tracker**
   - Track clue scrolls completed
   - Loot tracker
   - Unique items log

5. **Bossing Tracker**
   - Track boss KC and drops
   - GP/hour calculator
   - Personal drop log

#### Benefits
- Keeps members on the site longer
- Useful utility tools
- All-in-one clan platform
- Reduces need for external tools

#### Implementation Plan

**New Pages:**
- `/tools` - Calculator hub
- `/tools/xp-calc` - XP calculator
- `/tools/combat-calc` - Combat calculator
- `/tools/quest-helper` - Quest planning
- `/tools/clue-tracker` - Clue tracking
- `/tools/boss-tracker` - Boss tracking

**Data Sources:**
- OSRS Wiki API for item data
- Static data files for formulas
- User-submitted data for drop tracking

**Estimated Time:**
- Week 1: XP calculator, combat calculator
- Week 2: Quest helper, clue tracker, boss tracker

#### Poll Question for Members
> "Would you use built-in calculators and planning tools (XP calc, combat calc, quest helper)?"

---

## 💡 Medium-Impact Features

### 6. Social Features & Comments
**Priority:** ⭐⭐⭐ (Community building)
**Effort:** Medium (1 week)
**Value:** Medium

#### Description
Add social features like comments, likes, and member interactions.

#### Features
- **Achievement Comments** - Comment on accomplishments
- **Race Trash Talk** - Banter on race pages
- **Event Comments** - Discuss events
- **Member Profiles Comments** - Leave messages on profiles
- **Like/React System** - React to content
- **Activity Feed** - See what clan members are doing

#### Implementation
```sql
CREATE TABLE comments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  entity_type TEXT, -- 'achievement', 'race', 'event', 'profile'
  entity_id INTEGER,
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE reactions (
  user_id INTEGER,
  entity_type TEXT,
  entity_id INTEGER,
  reaction TEXT, -- 'like', 'love', 'fire', 'laugh'
  PRIMARY KEY (user_id, entity_type, entity_id)
);
```

---

### 7. Hiscores Integration
**Priority:** ⭐⭐⭐ (Useful context)
**Effort:** Low (2-3 days)
**Value:** Medium

#### Description
Show official OSRS hiscores rank alongside WOM stats.

#### Features
- Display official rank for skills/bosses
- Compare WOM rank vs OSRS rank
- Link to official hiscores page
- Historical rank tracking

#### Implementation
- Use OSRS hiscores API
- Cache results for 24 hours
- Display next to existing stats

---

### 8. Drop Log & Loot Tracker
**Priority:** ⭐⭐⭐ (Fun tracking)
**Effort:** Medium (1-2 weeks)
**Value:** Medium

#### Description
Manual drop log where members can log rare drops and loot.

#### Features
- Log drops with screenshot proof
- Calculate total GP from drops
- Leaderboard of luckiest members
- Clan-wide drop feed
- Collection log integration

#### Implementation
```sql
CREATE TABLE drops (
  id SERIAL PRIMARY KEY,
  player_id INTEGER,
  item_name TEXT,
  quantity INTEGER,
  value_gp BIGINT,
  source TEXT, -- Boss name
  screenshot_url TEXT,
  logged_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 9. Clan Calendar
**Priority:** ⭐⭐⭐ (Organization)
**Effort:** Medium (1 week)
**Value:** Medium-High

#### Description
Shared calendar for clan events, raids, and activities.

#### Features
- Schedule clan events
- RSVP system
- Recurring events (weekly raids)
- Discord integration
- Google Calendar export
- Time zone support

#### Implementation
- Use existing events table, enhance it
- Add RSVP table
- Create calendar UI component
- Integrate with Discord webhooks

---

### 10. Personal Stats Dashboard
**Priority:** ⭐⭐⭐ (Personalization)
**Effort:** Low (3-5 days)
**Value:** Medium

#### Description
Personalized dashboard showing YOUR stats, goals, and progress.

#### Features
- Quick stats overview
- Goal progress at a glance
- Recent achievements
- Upcoming anniversaries
- Your rank in clan
- Recent activity

#### Implementation
- New page: `/dashboard`
- Aggregate data from existing sources
- Customizable widgets
- Save layout preferences

---

## 🎨 Quality of Life Improvements

### 11. Advanced Search & Filters
**Priority:** ⭐⭐ (Nice to have)
**Effort:** Low (2-3 days)
**Value:** Low-Medium

#### Features
- Filter members by rank type (skiller/fighter)
- Filter by EHB range
- Filter by join date
- Sort by any column
- Save filter presets

---

### 12. Export Data Features
**Priority:** ⭐⭐ (Utility)
**Effort:** Low (1-2 days)
**Value:** Low-Medium

#### Features
- Export member list to CSV
- Export leaderboard to spreadsheet
- Export your stats to PDF
- Generate stat cards for Discord

---

### 13. Dark Mode Toggle
**Priority:** ⭐⭐ (Aesthetic)
**Effort:** Low (1-2 days)
**Value:** Low

#### Features
- Light/dark mode toggle
- System preference detection
- Save preference
- Smooth transition

#### Implementation
- Already using dark theme
- Add light theme CSS
- Add toggle in navbar
- Use `prefers-color-scheme` media query

---

### 14. Member Comparison Tool
**Priority:** ⭐⭐ (Interesting)
**Effort:** Low (2-3 days)
**Value:** Low-Medium

#### Features
- Select 2+ members
- Compare all stats side-by-side
- Visual graphs
- Strengths/weaknesses analysis

---

### 15. Historical Data & Trends
**Priority:** ⭐⭐⭐ (Insightful)
**Effort:** High (2 weeks)
**Value:** Medium

#### Features
- Track stats over time
- View XP gain charts
- Boss KC progression graphs
- Predict time to goals
- Compare to past self

#### Implementation
- Requires storing historical snapshots
- New table: `stat_snapshots`
- Chart.js or Recharts for visualizations
- Daily snapshot job

---

## 🔮 Advanced/Future Features

### 16. Machine Learning Predictions
**Priority:** ⭐ (Cool but complex)
**Effort:** Very High (1+ month)
**Value:** Low (Cool factor)

#### Features
- Predict when you'll reach goals
- Suggest optimal training methods
- Identify unusual activity patterns
- Recommend next goals

---

### 17. Clan Wiki
**Priority:** ⭐⭐ (Documentation)
**Effort:** Medium (1 week)
**Value:** Medium

#### Features
- Clan guides and tutorials
- Boss strategies
- Money making guides
- Member-contributed content
- Search functionality

---

### 18. Streaming Integration
**Priority:** ⭐ (Niche use case)
**Effort:** Medium (1 week)
**Value:** Low

#### Features
- Detect when members are streaming
- Show "LIVE" badge on profile
- Embed streams on site
- Stream schedule

---

### 19. Merchandise Store
**Priority:** ⭐ (Fun idea)
**Effort:** High (requires external service)
**Value:** Low (novelty)

#### Features
- Clan logo apparel
- Custom member stat cards
- Integration with print-on-demand
- Proceeds to clan funds

---

### 20. AI Chatbot Helper
**Priority:** ⭐ (Experimental)
**Effort:** Very High
**Value:** Low-Medium

#### Features
- Answer questions about the clan
- Help find information
- Suggest goals based on stats
- Provide OSRS tips

---

## 📊 Implementation Priority Matrix

### Highest ROI (Do First)
1. Discord Bot Integration (#1)
2. Clan Competitions System (#3)
3. Achievement System (#4)
4. Progressive Web App (#2)

### High Value (Do Next)
5. Skill Calculator Tools (#5)
6. Social Features (#6)
7. Clan Calendar (#9)
8. Drop Log Tracker (#8)

### Quick Wins (Fill gaps)
9. Hiscores Integration (#7)
10. Personal Dashboard (#10)
11. Dark Mode Toggle (#13)
12. Export Features (#12)

### Long-term Projects
13. Historical Trends (#15)
14. Clan Wiki (#17)
15. Machine Learning (#16)

---

## 🎯 Member Poll Template

**Subject:** "Vote on New Features for Siege Clan Tracker!"

**Instructions:** Rate each feature from 1-5:
- 1 = Not interested
- 2 = Might use occasionally
- 3 = Sounds useful
- 4 = Would definitely use
- 5 = Really want this!

**Features to Rate:**
1. Discord Bot (stats, leaderboards, goals in Discord)
2. Mobile App (install on phone, works offline)
3. Clan Competitions (team battles, bingo, brackets)
4. Achievement Badges (unlock badges for accomplishments)
5. Built-in Calculators (XP calc, combat calc, quest helper)
6. Comments & Social (comment on achievements, like content)
7. Drop Log Tracker (log rare drops, clan loot feed)
8. Clan Calendar (schedule events, RSVP system)
9. Historical Stats Charts (view your progress over time)
10. Dark/Light Mode Toggle

**Open Question:**
"What other features would you like to see?"

---

## 📝 Notes

- Feature complexity estimates are approximate
- Poll results should guide implementation order
- Some features may require infrastructure upgrades
- Consider maintenance burden when choosing features
- Start with features that benefit the most members

**Last Updated:** 2025-11-06
**Next Review:** After member poll results
