# Chat With YouTube Chrome Extension

This project lets you chat with a YouTube video's transcript using a FastAPI backend and a Chrome extension sidebar UI.

## Project Structure

```text
chatWithYoutube-chrome-extension/
├── backend/
│   ├── main.py
│   ├── .env
│   └── requirements.txt
├── extension/
│   ├── manifest.json
│   ├── content.js
│   ├── sidebar.html
│   ├── sidebar.js
│   └── sidebar.css
└── README.md
```

## Prerequisites

- Python 3.10+
- Google Gemini API key
- Google Chrome

## Backend Setup

1. Move to the backend folder:

```bash
cd backend
```

2. Create and activate virtual environment (if not already created):

```bash
cd ..
python3 -m venv .venv
source .venv/bin/activate
cd backend
```

3. Install dependencies:

```bash
python -m pip install -r requirements.txt
```

4. Add environment variables in backend/.env:

```env
GOOGLE_API_KEY=your_api_key_here
```

5. Start FastAPI server:

```bash
python -m uvicorn main:app --reload --port 8000
```

Server will run at: http://127.0.0.1:8000

## Chrome Extension Setup

1. Open Chrome and go to:

chrome://extensions/

2. Enable Developer mode (top-right).
3. Click Load unpacked.
4. Select the extension folder from this project.

## Notes

- Use python -m uvicorn instead of plain uvicorn to ensure the correct virtual environment is used.
- Keep backend/.env private and never commit secrets.
