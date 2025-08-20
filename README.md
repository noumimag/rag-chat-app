# Browser-Native RAG Sidebar

[![CI](https://img.shields.io/github/actions/workflow/status/noumimag/rag-chat-app/ci.yml?label=CI)](https://github.com/noumimag/rag-chat-app/actions)
![TypeScript](https://img.shields.io/badge/TypeScript-Ready-informational)
![Vite](https://img.shields.io/badge/Vite-+React-informational)
![License](https://img.shields.io/badge/License-MIT-green)

A **Retrieval-Augmented Generation** Chat that runs entirely in the browser for search, citations, and doc/code Q&A.
It ingests docs (Markdown, MDX, JSON, or pasted text), computes embeddings **on-device** (WebGPU if available,
WASM fallback), stores vectors in **IndexedDB**, and streams answers from your LLM provider or a **local LLM** (Ollama).

> Portfolio: https://www.noumankhalid.com

---

## ✨ Features
- On-device embeddings via Transformers.js (WebGPU first, WASM fallback)
- Chunking in a Web Worker; vectors in IndexedDB (Dexie)
- Streaming chat UX with abort/undo, retries
- A11y + performance optimizations; offline-friendly
- Drop-in **sidebar** you can mount on any docs site

## 🧱 Tech Stack
- React + TypeScript + Vite
- Tailwind CSS
- Dexie (IndexedDB), cosine similarity + MMR reranking
- Optional providers: OpenAI / Anthropic / **Ollama (local)**
- Tests: Vitest / Playwright (optional)
- CI: GitHub Actions

## 🔎 Architecture
```mermaid
flowchart LR
  U[User] --> UI[RAG Sidebar (React)]
  subgraph Browser
    UI --> W[Web Worker: chunk + embed]
    W --> IDB[(IndexedDB: vectors + chunks)]
    UI --> LLM[(LLM Provider / Local Ollama)]
  end
  IDB --> UI
```

## 🚀 Quick Start

**Prereqs:** Node 18+, Chrome/Edge 113+ (WebGPU), otherwise WASM fallback.

```bash
npm install
npm run dev
# open http://localhost:5173
```

**Optional:** use a local LLM (Ollama)
```bash
# macOS
brew install ollama
# linux
curl -fsSL https://ollama.ai/install.sh | sh

ollama pull mistral:7b
ollama serve
```

The app defaults to `http://localhost:11434`.

To use OpenAI/Anthropic, set provider + API key in the app UI (stored locally, not committed).

## 📚 Supported Inputs
.md/.mdx, .json, .txt, or pasted text/code

## 🧪 Evaluation (optional)
```bash
node scripts/eval.js --questions ./data/samples/questions.json --k 5
```

## 🖼️ Screenshots
Add to `/public` and reference below:
- `screenshot-chat.png` (chat & citations)
- `screenshot-upload.png` (upload & indexing)
- `screenshot-documents.png` (documents information)

## 🛡️ Security & Privacy
- Embeddings computed in-browser, vectors in IndexedDB
- Do not commit API keys; use local storage or runtime .env
- If you proxy requests, restrict CORS to your domain

## 🗺️ Roadmap
- Provider switcher UI
- Passage highlights in PDF/MD preview
- Evals dashboard
- Export/import vector DB

## 🤝 Contributing
See [CONTRIBUTING.md](./CONTRIBUTING.md).

## 📄 License
MIT 