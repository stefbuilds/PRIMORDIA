# Global Pulse - MVP Setup

## Prerequisites
- Python 3.11+
- Node.js 18+
- npm or pnpm

## Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv .venv

# Activate (Windows)
.venv\Scripts\activate

# Activate (Mac/Linux)
# source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run server
uvicorn main:app --reload
```

Backend runs at: http://localhost:8000
API docs at: http://localhost:8000/docs

## Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Copy env file and add your Mapbox token
copy .env.local.example .env.local
# Edit .env.local with your Mapbox token

# Run dev server
npm run dev
```

Frontend runs at: http://localhost:3000

## Quick Verify

1. Backend health: `curl http://localhost:8000/health`
2. Regions endpoint: `curl http://localhost:8000/regions`
3. Signals endpoint: `curl "http://localhost:8000/signals?region_id=shanghai"`
4. Open http://localhost:3000/signals in browser

## Mapbox Token

Get a free token at https://account.mapbox.com/

The app will work without a token (map shows limited functionality with watermark), but for full map features add your token to `frontend/.env.local`:

```
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_actual_token_here
```

## Repo Structure

```
├── backend/
│   ├── main.py              # FastAPI app + endpoints
│   ├── requirements.txt
│   └── data/
│       └── mock_data.py     # Mock regions & signals
├── frontend/
│   ├── src/
│   │   ├── app/             # Next.js app router pages
│   │   ├── components/      # React components
│   │   ├── lib/             # API client
│   │   └── types/           # TypeScript types
│   └── ...
└── RUN.md
```

## Future Integration Points

- `backend/data/` → Replace with real API clients:
  - Google Earth Engine for satellite data
  - Vertex AI for CV model inference
  - NewsAPI for sentiment analysis
- `backend/main.py` → Add auth, caching, rate limiting
- `frontend/src/lib/api.ts` → Add WebSocket for real-time updates
