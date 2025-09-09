# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Main App (React Native with Expo)
- `npm install` - Install dependencies
- `npm run start` - Start Expo dev server
- `npm run start:go` - Start with tunnel mode for physical devices
- `npm run start:dev` - Start with dev client and tunnel
- `npm run android` - Run on Android
- `npm run ios` - Run on iOS
- `npm run web` - Run on web
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Run ESLint with auto-fix
- `npm run format` - Format code with Prettier
- `npm run typecheck` - Run TypeScript type checking
- `npm run test` - Run Jest tests
- `npm run test:watch` - Run Jest in watch mode

### Firebase Functions (in /functions directory)
- `npm --prefix functions run build` - Build functions
- `npm --prefix functions run test` - Test functions
- `firebase emulators:start --project demo-homecontrol --only functions,firestore,auth` - Start emulators
- `npm run deploy` - Deploy all Firebase resources
- `npm run deploy:functions` - Deploy only functions
- `npm run deploy:rules` - Deploy only Firestore/Storage rules

### Asset Generation
- `npm run gen:assets` - Generate app assets

## Architecture Overview

### Technology Stack
- **Frontend**: React Native with Expo SDK 53
- **Navigation**: React Navigation 7 with bottom tabs and stack navigation
- **Backend**: Firebase (Firestore, Auth, Functions, Storage)
- **State Management**: TanStack React Query for server state, React Context for app state
- **Internationalization**: react-i18next
- **Styling**: Custom design system with theme provider
- **Notifications**: Expo Notifications with Firebase Cloud Messaging
- **Testing**: Jest with React Native Testing Library

### Project Structure

```
src/
├── components/          # Reusable UI components (Button, Input, Card, etc.)
├── screens/            # Screen components for navigation
├── services/           # Business logic and API calls
├── firebase/           # Firebase configuration and providers
│   └── providers/      # React Context providers (Query, Household, Navigation)
├── design/             # Design system (tokens, theme)
├── models/             # TypeScript type definitions
├── locales/            # Translation files (en.json, no.json)
└── utils/              # Utility functions

functions/              # Firebase Cloud Functions
├── src/                # TypeScript source
└── __tests__/          # Function tests
```

### Key Architectural Patterns

#### Provider Architecture
The app uses a nested provider structure:
- `SafeAreaProvider` → `ThemeProvider` → `QueryProvider` → `HouseholdProvider` → `ToastProvider` → `NavigationProvider`
- Each provider manages specific application concerns (theming, data fetching, household context, etc.)

#### Services Layer
Business logic is organized in `/src/services/` with modules for:
- `tasks.ts` - Task management
- `households.ts` - Household operations
- `users.ts` - User management
- `push.ts` - Push notifications
- `outbox.ts` - Offline queue management
- `widgets.ts` - Home screen widgets

#### Firebase Integration
- **Authentication**: Firebase Auth with household-based access control
- **Database**: Firestore with real-time subscriptions via React Query
- **Storage**: Firebase Storage for file uploads
- **Functions**: TypeScript Cloud Functions for server-side logic

#### Offline Support
- Outbox pattern for queuing actions when offline
- Automatic retry and network detection
- Real-time sync when connectivity is restored

#### Design System
- Centralized theme in `/src/design/theme.ts`
- Design tokens in `/src/design/tokens.ts`
- Reusable components follow consistent styling patterns

#### Internationalization
- i18next configuration in `/src/i18n.ts`
- Translation files in `/src/locales/`
- RTL support and locale detection

### Development Setup Requirements
1. Copy `.env.example` to `.env` and configure Firebase project variables
2. Ensure Firebase project is set up with Firestore, Auth, Functions, and Storage
3. For physical device testing, use tunnel mode (`npm run start:go`)
4. Firebase emulators can be used for local development

### Testing Strategy
- Unit tests with Jest
- Component testing with React Native Testing Library
- Firebase Functions have dedicated test suite in `functions/src/__tests__/`
- Smoke tests for critical flows

### Firebase Configuration
- Rules defined in `firestore.rules` and `storage.rules`
- Indexes in `firestore.indexes.json`
- Functions deployment configuration in `firebase.json`