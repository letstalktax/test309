# MusTax AI Chatbot

An AI-powered chatbot for UAE Corporate Tax with document processing and RAG capabilities.

## Features

- Chat with AI about UAE Corporate Tax
- Upload and process documents (PDF, DOCX, text, markdown)
- Structured JSON processing of document content
- RAG (Retrieval Augmented Generation) for accurate responses
- Knowledge base management
- User authentication

## Document Processing with Llama Vision

The application uses advanced vision models to extract text from documents. The extracted text is processed into structured JSON format for better context retrieval.

## Structured JSON Processing

The system processes documents into structured JSON format:

1. **Section Identification**: Automatically identifies and separates document sections
2. **Structure Preservation**: Maintains the hierarchical structure of documents
3. **Context Retrieval**: Enables more precise context retrieval for AI responses
4. **Enhanced Responses**: Improves AI response quality with structured information

## Supported File Types

- PDF files
- DOCX documents
- Text files
- Markdown files

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```
4. Start the development server:
   ```bash
   pnpm run dev
   ```

## Configuration

You'll need to obtain an OpenRouter API key for the Vision API and add it to your `.env.local` file:

```
OPENROUTER_API_KEY=your_api_key_here
```

## Knowledge Base Management

The application includes a knowledge base management system for administrators to:

- Upload documents to the knowledge base
- View and manage existing documents
- Process documents for RAG

## Project Structure

- `/app` - Next.js application routes
- `/components` - React components
- `/lib` - Utility functions and libraries
- `/public` - Static assets
- `/docs` - Documentation

## API Routes

- `/api/chat` - Chat API endpoint
- `/api/vision` - Document processing endpoint
- `/api/files/upload` - File upload endpoint

## License

MIT