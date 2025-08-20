# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial project setup with React + TypeScript + Vite
- On-device embeddings via Transformers.js (WebGPU first, WASM fallback)
- Chunking in a Web Worker with vectors stored in IndexedDB (Dexie)
- Streaming chat UX with abort/undo and retry functionality
- Support for multiple LLM providers (OpenAI, Anthropic, Ollama local)
- Document ingestion for .md/.mdx, .json, and .txt files
- Drop-in sidebar component for mounting on any docs site
- Accessibility and performance optimizations
- Offline-friendly design

### Technical Features

- Browser-native RAG implementation
- Cosine similarity + MMR reranking for vector search
- WebGPU acceleration with WASM fallback
- IndexedDB storage using Dexie
- Tailwind CSS for styling
- Vitest and Playwright testing setup
- GitHub Actions CI pipeline

## [1.0.0] - RAG+LLM

### Initial Release

- Complete RAG chat application
- Browser-native embeddings and vector storage
- Multi-provider LLM support
- Document processing and indexing
- Modern React-based UI with TypeScript
- Comprehensive documentation and setup guides

---

## Version History

- **1.0.0** - Initial release with full RAG functionality
- **Unreleased** - Development and feature additions

## Contributing

To add entries to this changelog, please follow the [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format and submit a pull request.
