# Lofty AI Copilot — Project Overview

> GlobalHack 2026 hackathon prototype  
> A real estate agent productivity platform powered by AI, built on top of the Lofty CRM concept.

---

## What It Does

Lofty AI Copilot gives real estate agents a single intelligent dashboard that:
- **Prioritizes their day** — AI scoring engine ranks every lead and surfaces the highest-impact actions first
- **Drafts outreach** — AI generates personalized call talking points and message drafts per lead
- **Speaks to them** — Text-to-speech daily briefings via ElevenLabs or Web Speech API
- **Navigates for them** — A conversational AI assistant that understands natural language and routes the agent to exactly the right screen

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS 4 |
| UI Components | shadcn/ui (Button, Badge, Card, Avatar, Sheet, Tooltip) |
| Icons | Lucide React |
| AI / LLM | Anthropic Claude (claude-haiku-4-5 via API) |
| Text-to-Speech | ElevenLabs API (fallback: Web Speech API) |
| Speech-to-Text | Web Speech API (browser native) |
| Data | Mock data only (no database) |
| Deployment | Vercel-ready |

---

## Project Structure

```
GlobalHack2026/
├── app/
│   ├── layout.tsx                  # Root layout, wraps AssistantProvider
│   ├── page.tsx                    # Redirect → /dashboard
│   ├── dashboard/
│   │   ├── layout.tsx              # Dashboard shell (AppShell)
│   │   ├── page.tsx                # Main overview dashboard
│   │   └── briefing/
│   │       └── page.tsx            # Full AI daily briefing page
│   ├── people/
│   │   └── page.tsx                # Leads / contacts CRM page
│   ├── transactions/
│   │   └── page.tsx                # Active transactions tracker
│   ├── calendar/
│   │   └── page.tsx                # Appointments calendar
│   └── api/
│       ├── assistant/route.ts      # AI assistant chat endpoint
│       └── tts/route.ts            # Text-to-speech proxy endpoint
│
├── components/
│   ├── assistant/
│   │   └── AssistantWidget.tsx     # Floating robot, sidebar panel, context provider
│   ├── dashboard/
│   │   ├── ActionCard.tsx          # Recommended action card with urgency badge
│   │   ├── ActionExecutionDialog.tsx  # Action execution modal (talking points, draft)
│   │   └── BriefingCard.tsx        # Daily briefing hero card with typing animation
│   ├── layout/
│   │   ├── AppShell.tsx            # Main 3-column shell (nav + sidebar + content)
│   │   ├── GlobalNav.tsx           # Left icon navigation bar
│   │   ├── Sidebar.tsx             # Left sidebar (nav links or AI panel)
│   │   ├── TopHeader.tsx           # Top bar with greeting and AI pill
│   │   └── DetailPanel.tsx         # Right slide-in detail panel
│   ├── voice/
│   │   └── VoiceOrb.tsx            # (Legacy) standalone mic orb component
│   └── ui/                         # shadcn/ui primitives
│
├── lib/
│   ├── mock-data.ts                # All mock leads, properties, transactions, appointments
│   ├── scoring.ts                  # AI lead scoring engine
│   ├── voice-scripts.ts            # Daily briefing voice script generator
│   ├── ai/
│   │   └── assistant.ts            # Claude API integration for assistant
│   └── utils.ts                    # Utility helpers (cn, etc.)
│
├── hooks/
│   └── useVoice.ts                 # Voice playback hook (ElevenLabs + Web Speech)
│
└── types/
    ├── action.ts                   # RecommendedAction type
    ├── assistant.ts                # AssistantChatMessage, AssistantDecision, AssistantStatus
    ├── event.ts                    # Calendar event types
    ├── lead.ts                     # Lead type
    └── property.ts                 # Property / listing type
```

---

## Pages

### `/dashboard` — Overview
The agent's home screen. Contains:
- **BriefingCard** — Animated "Good morning" greeting with typing effect, dynamic briefing sentence, stat chips (Hot Leads, Tx Deadlines, Listings Ready), and "Hear Briefing" TTS button
- **Stat Strip** — 4 KPI tiles (Active Leads, Hot Leads, Open Transactions, Listings Sent) with delta badges vs. yesterday
- **Today's Opportunities** — AI-ranked recommended action cards. Each card shows urgency badge, lead name, action type, and opens an execution dialog on click
- **Appointments** — Today's appointments only, pulled from `mockAppointments` and filtered by today's date. Shows lead name, address, time, and appointment type
- **Keep in Touch** — Contact suggestions for leads that haven't been touched recently, spanning columns 2–3
- **Transactions** — Active transactions with deadline countdown (days remaining)

### `/dashboard/briefing` — Full Briefing
Expanded daily AI briefing page. Shows full voice script, allows hearing the complete briefing via TTS.

### `/people` — Leads
Full lead list with search, filter by status, urgency badges. Each lead card has:
- Score badge (AI-calculated 0–100)
- Last contact date
- Hover quick-actions: Call / Text / Email buttons that appear on hover

### `/transactions` — Transactions
Active deals with progress indicators, deadlines, and status tracking.

### `/calendar` — Calendar
Appointment calendar view.

---

## Data Models (`lib/mock-data.ts`)

### Lead
```ts
{
  id: string
  name: string
  email: string
  phone: string
  status: 'hot' | 'warm' | 'cold' | 'nurture'
  lastContact: string          // ISO date
  propertyInterest: string
  budget: number
  notes: string
  score?: number               // AI-calculated 0–100
}
```

### Property
```ts
{
  id: string
  address: string
  price: number
  bedrooms: number
  bathrooms: number
  sqft: number
  status: 'active' | 'pending' | 'sold'
  matchScore?: number
}
```

### Transaction
```ts
{
  id: string
  leadId: string
  propertyId: string
  stage: string
  closeDate: string
  value: number
}
```

### Appointment
```ts
{
  id: string
  leadId: string
  address: string
  time: string
  date: string                 // ISO date 'YYYY-MM-DD'
  type: 'showing' | 'listing_appointment' | 'consultation' | 'open_house'
}
```

### RecommendedAction
```ts
{
  id: string
  type: 'call' | 'text' | 'email' | 'send_listing' | 'review_transaction' | 'schedule'
  urgency: 'critical' | 'high' | 'medium' | 'low'
  leadId: string
  title: string
  subtitle: string
  reasoning: string
  talkingPoints?: string[]
  draftMessage?: string
  propertyId?: string
}
```

---

## AI Scoring Engine (`lib/scoring.ts`)

Scores each lead 0–100 based on weighted signals:

| Signal | Weight |
|--------|--------|
| Recency of last contact | 30% |
| Lead status (hot/warm/cold) | 25% |
| Budget range | 20% |
| Engagement activity | 15% |
| Days since first contact | 10% |

Actions are then ranked by urgency (critical → high → medium → low) and action type priority.

---

## AI Assistant (`app/api/assistant/route.ts`)

POST endpoint that accepts:
- `message` — user's natural language request
- `currentPath` — current page URL
- `recentExecutedActionIds` — recently completed actions

Returns `AssistantDecision`:
```ts
{
  voiceResponse: string          // spoken/shown response
  targetRoute?: string           // where to navigate
  targetId?: string              // element to highlight
  highlight?: boolean
  clarificationQuestion?: string
}
```

Claude (haiku) interprets intent and maps to one of the app's routes: dashboard, people, transactions, calendar, or briefing.

---

## Voice System (`hooks/useVoice.ts`, `app/api/tts/route.ts`)

- **Primary**: ElevenLabs API via `/api/tts` proxy — streams audio, plays via `<audio>` element
- **Fallback**: Browser Web Speech API (`speechSynthesis`)
- **State**: `idle` | `loading` | `playing` | `error`
- Used in: BriefingCard "Hear Briefing" button, AssistantWidget after navigation

---

## AI Assistant Widget (`components/assistant/AssistantWidget.tsx`)

Three parts:
1. **AssistantProvider** — Context provider wrapping the whole app. Manages chat state, voice, speech recognition, navigation
2. **AssistantWidget** — Floating robot image (robo1.png) fixed bottom-right. Hover shows "Ask Lofty AI ✨" tooltip. Click opens sidebar panel
3. **AssistantSidebarPanel** — Chat interface inside the sidebar with message history, starter chips, mic input, and text input

Speech recognition uses browser-native `SpeechRecognition` / `webkitSpeechRecognition`.

---

## Key UX Features

| Feature | Location |
|---------|---------|
| Typing animation greeting | BriefingCard |
| Stat delta badges (↑/↓ vs yesterday) | Dashboard stat strip |
| Inline action buttons on hover | Dashboard task rows |
| AI draft message with copy button | ActionExecutionDialog |
| Deadline countdown (X days left) | Transactions widget |
| Hover quick-actions (Call/Text/Email) | People page lead cards |
| AI chat starter chips | AssistantSidebarPanel |
| Today-only appointment filter | Dashboard appointments widget |
| Floating robot with hover tooltip | AssistantWidget (bottom-right) |

---

## Environment Variables

```env
ANTHROPIC_API_KEY=          # Claude API key
ELEVENLABS_API_KEY=         # ElevenLabs TTS key
ELEVENLABS_VOICE_ID=        # ElevenLabs voice ID
```

---

## Planned / In Progress

- [ ] Onboarding tour — first-time highlight animation of key features
- [ ] Confetti celebration when an action is marked complete
- [ ] Dark mode toggle
- [ ] Calendar page linked to `mockAppointments` data
- [ ] Animated number counters on stat strip
- [ ] Revenue pipeline widget
