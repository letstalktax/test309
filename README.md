# MusTax AI Chatbot

An AI-powered chatbot for UAE Corporate Tax information with document processing and RAG (Retrieval-Augmented Generation) capabilities.

## Features

- **Document Processing**: Upload and process various document types (PDF, DOCX, TXT)
- **Vision API**: Extract text from images and documents using advanced vision models
- **RAG System**: Retrieve relevant information from your documents to enhance AI responses
- **Multiple AI Models**: Support for OpenAI and Anthropic models via OpenRouter
- **Authentication**: Secure user authentication with NextAuth
- **Responsive UI**: Modern, responsive interface built with Next.js and Tailwind CSS

## Technical Architecture

### Frontend
- Next.js 14 with App Router
- React Server Components
- Tailwind CSS for styling
- Shadcn UI components

### Backend
- Next.js API routes
- Pinecone for vector database
- OpenAI for embeddings and chat completions
- OpenRouter for access to multiple AI models
- NextAuth for authentication

### Document Processing
- Vision API for document text extraction
- Robust JSON processing for structured data
- Section detection for better context retrieval
- Fallback mechanisms for handling various response formats

## Getting Started

### Prerequisites
- Node.js 18+
- pnpm (recommended) or npm
- OpenAI API key
- Pinecone API key
- OpenRouter API key (optional, for additional models)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/letstalktax/test309.git
cd test309
```

2. Install dependencies:
```bash
pnpm install
```

3. Create a `.env.local` file based on `.env.example`:
```bash
cp .env.example .env.local
```

4. Fill in your API keys and configuration in `.env.local`:
```
# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret

# OpenAI
OPENAI_API_KEY=your-openai-api-key

# Pinecone
PINECONE_API_KEY=your-pinecone-api-key
PINECONE_INDEX_NAME=your-pinecone-index-name
PINECONE_HOST_URL=your-pinecone-host-url

# OpenRouter (optional)
OPENROUTER_API_KEY=your-openrouter-api-key
```

5. Start the development server:
```bash
pnpm dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Authentication
1. Sign up or log in to access the chatbot.
2. Use the provided demo credentials or create your own account.

### Document Upload
1. Navigate to the Documents section.
2. Upload your documents (PDF, DOCX, TXT).
3. The system will process and index your documents automatically.

### Chatting with the AI
1. Go to the Chat section.
2. Ask questions related to UAE Corporate Tax or your uploaded documents.
3. The AI will retrieve relevant information and provide accurate responses.

## Document Processing Pipeline

1. **Upload**: User uploads a document through the UI
2. **Text Extraction**: Vision API extracts text from the document
3. **JSON Processing**: Text is converted to structured JSON with sections
4. **Chunking**: Text is split into semantic chunks for embedding
5. **Embedding**: OpenAI generates embeddings for each chunk
6. **Storage**: Embeddings are stored in Pinecone with metadata
7. **Retrieval**: When a user asks a question, relevant chunks are retrieved
8. **Response Generation**: AI generates a response using the retrieved context

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- OpenAI for providing the embedding and completion models
- Pinecone for vector database services
- OpenRouter for access to multiple AI models
- Next.js team for the amazing framework