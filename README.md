# Momentum

An AI task and notes manager for executives that helps them manage their workload with ease and provides an interactive AI assistant to perform actions and answer questions related to their data.

## Features

- **CRUD Tasks:** Create, read, update, and delete tasks.
- **AI-Powered Task Enhancement:** Clean up and refine task text using AI.
- **CRUD Notes:** Create, read, update, and delete notes.
- **AI-Powered Note Enhancement:** Clean up and summarize notes using AI.
- **Interactive AI Chat Agent:** A conversational agent that can:
  - Take actions on tasks and pages (e.g., create, update, or delete items).
  - Search for information within the app data.
  - Answer questions about tasks, notes, and other stored data.
  - Provide recommendations or insights based on user input.
- **Task Prioritization and Organization:** Ability to sort and filter tasks by due date, priority, or project.
- **Seamless Cross-Device Experience:** Sync across desktop, tablet, and mobile devices.
- **Google Calendar Integration:** Sync tasks with Google Calendar.

## Google Calendar Integration

Momentum now includes Google Calendar integration, allowing you to:

- Connect your Google Calendar account
- Create calendar events from tasks
- Set event duration and reminders
- View and manage your schedule directly from Momentum

To set up the integration:

1. Go to the Settings page
2. Navigate to the Integrations tab
3. Click "Connect Calendar" and follow the prompts
4. Once connected, you can enable calendar integration when creating or editing tasks

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for local development)
- PostgreSQL (handled by Docker)
- OpenAI API key (optional, for OpenAI models)
- Ollama (optional, for open source models)
- Google Cloud Platform account (for Calendar API)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/momentum.git
   cd momentum
   ```

2. Configure environment variables:
   - Copy `.env.example` to `.env.docker` for Docker deployment
   - Update the necessary API keys and configuration values

3. Start the application with Docker:
   ```bash
   docker-compose up -d
   ```

4. Access the application at http://localhost:3002

## AI Model Options

Momentum supports two AI model providers:

### 1. OpenAI (Paid)

To use OpenAI models:
1. Create an account at https://platform.openai.com/
2. Generate an API key
3. Add your API key to the `.env.docker` file:
   ```
   OPENAI_API_KEY=your_api_key_here
   ```

### 2. Ollama (Open Source, Free)

To use open source models with Ollama:

1. Install Ollama on your host machine:
   - Mac/Linux: `curl -fsSL https://ollama.com/install.sh | sh`
   - Windows: Download from https://ollama.com/download

2. Start Ollama:
   ```bash
   ollama serve
   ```

3. Pull the LLaMA3 model (or another model of your choice):
   ```bash
   ollama pull llama3
   ```

4. Configure Momentum to use Ollama:
   - In the `.env.docker` file, ensure these settings are correct:
     ```
     OLLAMA_API_URL=http://host.docker.internal:11434
     OLLAMA_MODEL=llama3
     DEFAULT_AI_PROVIDER=OPENAI  # Change to OLLAMA to use it by default
     ```

5. In the Momentum app, you can switch between models using the settings icon in the chat interface.

## Development

For local development:

1. Install dependencies:
   ```bash
   npm install
   ```

2. Generate Prisma client:
   ```bash
   npx prisma generate
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

## License

[MIT License](LICENSE)

## Environment Variables

Create a `.env.local` file with the following variables:
