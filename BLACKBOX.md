# Millai-Studio

## Project Overview
Millai-Studio is an AI companion application featuring an interactive chat interface where the AI role-plays as "Milla Rayne," a devoted spouse and life partner. The app provides a rich, immersive experience with various features including live voice sessions, code sandbox, creative studio, neural galaxy visualization, and integrations with Google Workspace and YouTube. It uses Google's Gemini AI for conversational responses and TensorFlow for computer vision capabilities.

## Technologies Used
- **Frontend**: React 18 with TypeScript, Vite as build tool
- **Styling**: Tailwind CSS for responsive UI design
- **State Management**: Zustand for global state
- **AI Integration**: Google Generative AI (Gemini models) for chat and multimodal interactions
- **Computer Vision**: TensorFlow.js with COCO-SSD for object detection
- **Data Visualization**: Chart.js with React-Chartjs-2
- **Database**: Dexie for IndexedDB storage with Dexie-React-Hooks
- **Code Editing**: React-Simple-Code-Editor with Prism.js syntax highlighting
- **Markdown Rendering**: React-Markdown
- **Backend for Frontend (BFF)**: Express.js server with TypeScript, acting as a proxy to Gemini API
- **Authentication**: Google OAuth 2.0 integration

## Architecture
The application consists of:
- **Main Frontend App**: Single-page React application with multiple feature panels
- **BFF Server**: Express server running on port 3001, handling chat API requests to Gemini
- **Component Library**: Modular React components for various features (Sandbox, LiveSession, NeuralGalaxy, etc.)
- **State Stores**: Zustand stores for chat, UI, and sandbox state management
- **Services**: Google integration service for Workspace connectivity

## Building and Running

### Prerequisites
- Node.js (version compatible with the dependencies)
- Gemini API key from Google AI Studio

### Frontend Setup
1. Install dependencies: `npm install`
2. Set the `GEMINI_API_KEY` in `.env.local` file (create if it doesn't exist)
3. Optionally set `GOOGLE_CLIENT_ID` for Google Workspace integration
4. Run the development server: `npm run dev`
5. Build for production: `npm run build`
6. Preview production build: `npm run preview`

### Backend (BFF) Setup
1. Navigate to `bff/` directory: `cd bff`
2. Install dependencies: `npm install`
3. Set `GEMINI_API_KEY` environment variable
4. Run the server: `npm start` (starts on port 3001)

### Environment Variables
- `GEMINI_API_KEY`: Required for AI chat functionality
- `GOOGLE_CLIENT_ID`: Optional, for Google OAuth integration
- `API_KEY`: Alternative API key configuration (used in vite.config.ts)

## Development Conventions
- **TypeScript**: Strict mode enabled with ES2020 target
- **Component Structure**: Functional components with hooks, using React 18 features
- **Styling**: Utility-first approach with Tailwind CSS, custom color scheme with "milla" brand colors
- **State Management**: Centralized with Zustand stores (chatStore, uiStore, sandboxStore)
- **File Attachments**: Base64 encoded for images, audio, video, and documents
- **Code Quality**: Prettier for formatting, no unused variables/locals allowed
- **Imports**: ES modules with TypeScript path resolution

## Key Features
- **Chat Interface**: Multimodal conversations with text, images, audio, and documents
- **Live Sessions**: Voice and video interactions with configurable settings
- **Code Sandbox**: Integrated code editor with execution capabilities
- **Creative Studio**: Content creation tools
- **Neural Galaxy**: Visual representation of conversation data
- **Database Connector**: Connect to various database types
- **Backup Manager**: Data backup and restore functionality
- **Morning Sync**: Daily routine synchronization
- **Podcast Player**: Audio content playback
- **YouTube Integration**: Video playback within the app
- **Offline Model Runner**: Local AI model execution

## Testing
- No specific test framework configured in package.json
- Manual testing recommended for UI interactions and API integrations
- Browser testing required for frontend features
- API endpoint testing for BFF server functionality

## Deployment
- Frontend: Static build deployable to any web server
- BFF: Requires Node.js server environment
- Environment variables must be configured in deployment environment
- CORS enabled for cross-origin requests in development