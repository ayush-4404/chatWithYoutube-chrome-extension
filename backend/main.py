from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from urllib.parse import parse_qs, urlparse
import json, os, tempfile

from dotenv import load_dotenv
from langchain_community.vectorstores import FAISS
from langchain_google_genai import GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI
from langchain_text_splitters import RecursiveCharacterTextSplitter
from youtube_transcript_api import YouTubeTranscriptApi, NoTranscriptFound, TranscriptsDisabled

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten in production
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory session store: { session_id: { retriever, history } }
sessions = {}

PROMPT_TEMPLATE = """
You are a helpful assistant.
Answer ONLY from the provided transcript context.
If the context is insufficient, just say you don't know.

Conversation history:
{history}

Transcript context:
{context}

Current user question: {question}
""".strip()

PREFERRED_LANGUAGES = ["hi", "hi-IN", "en"]


# ── Models ────────────────────────────────────────────────────────────────────

class LoadRequest(BaseModel):
    video_id: str

class ChatRequest(BaseModel):
    video_id: str
    question: str


# ── Helpers ───────────────────────────────────────────────────────────────────

def fetch_transcript(video_id: str) -> str:
    transcript_list = YouTubeTranscriptApi().fetch(
        video_id, languages=PREFERRED_LANGUAGES
    )
    return " ".join(chunk.text for chunk in transcript_list)


def build_retriever(transcript: str):
    splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    chunks = splitter.create_documents([transcript])
    embeddings = GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-001")
    vector_store = FAISS.from_documents(chunks, embeddings)
    return vector_store.as_retriever(search_type="similarity", search_kwargs={"k": 4})


def format_history(messages: list, max_turns: int = 8) -> str:
    if not messages:
        return "No previous conversation."
    recent = messages[-(max_turns * 2):]
    lines = []
    for m in recent:
        role = "User" if m["role"] == "user" else "Assistant"
        lines.append(f"{role}: {m['content'].strip()}")
    return "\n".join(lines)


# ── Routes ────────────────────────────────────────────────────────────────────

@app.post("/load")
def load_video(req: LoadRequest):
    try:
        transcript = fetch_transcript(req.video_id)
        retriever = build_retriever(transcript)
        sessions[req.video_id] = {"retriever": retriever, "history": []}
        return {"status": "ok", "message": "Video loaded successfully."}
    except (TranscriptsDisabled, NoTranscriptFound):
        return {"status": "error", "message": "No transcript found for this video."}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@app.post("/chat")
def chat(req: ChatRequest):
    session = sessions.get(req.video_id)
    if not session:
        return {"status": "error", "message": "Video not loaded. Call /load first."}

    retriever = session["retriever"]
    history   = session["history"]

    docs    = retriever.invoke(req.question)
    context = "\n\n".join(doc.page_content for doc in docs)
    prompt  = PROMPT_TEMPLATE.format(
        history=format_history(history),
        context=context,
        question=req.question,
    )

    llm    = ChatGoogleGenerativeAI(model="models/gemini-2.5-flash", temperature=0.2)
    result = llm.invoke(prompt)
    answer = result.content if hasattr(result, "content") else str(result)

    history.append({"role": "user",      "content": req.question})
    history.append({"role": "assistant", "content": answer})

    return {"status": "ok", "answer": answer}


@app.delete("/session/{video_id}")
def clear_session(video_id: str):
    sessions.pop(video_id, None)
    return {"status": "ok"}


@app.delete("/history/{video_id}")
def clear_history(video_id: str):
    if video_id in sessions:
        sessions[video_id]["history"] = []
    return {"status": "ok"}