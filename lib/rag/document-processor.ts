import OpenAI from 'openai';
import { nanoid } from 'nanoid';
import fs from 'fs/promises';
import mammoth from 'mammoth';

// Function to split text into semantic chunks
export function splitTextIntoChunks(text: string, chunkSize = 1000, overlap = 200) {
  // Check if the text is JSON-structured
  try {
    const jsonData = JSON.parse(text);
    if (jsonData.type === 'full_content' || jsonData.sections) {
      // For JSON-structured data, return the entire object as one chunk
      return [text];
    }
  } catch (e) {
    // Not JSON, proceed with normal text chunking
  }
  
  // First, split by paragraphs to preserve semantic units
  const paragraphs = text.split(/\n\s*\n/);
  const chunks = [];
  let currentChunk = '';
  
  for (const paragraph of paragraphs) {
    // If adding this paragraph would exceed chunk size and we already have content,
    // save the current chunk and start a new one
    if (currentChunk.length + paragraph.length > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      // Start new chunk with overlap from the end of the previous chunk
      const overlapText = currentChunk.length > overlap 
        ? currentChunk.slice(-overlap) 
        : currentChunk;
      currentChunk = overlapText + '\n\n' + paragraph;
    } else {
      // Add paragraph to current chunk
      if (currentChunk.length > 0) {
        currentChunk += '\n\n';
      }
      currentChunk += paragraph;
    }
  }
  
  // Add the last chunk if it has content
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

// Function to generate embeddings for chunks
export async function generateEmbeddings(chunks: string[], metadata: Record<string, any> = {}) {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  
  const embeddingResults = await Promise.all(
    chunks.map(async (chunk, index) => {
      const embeddingResponse = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: chunk,
        encoding_format: "float",
        dimensions: 1536
      });
      
      return {
        id: nanoid(),
        text: chunk,
        embedding: embeddingResponse.data[0].embedding,
        metadata: {
          ...metadata,
          chunkIndex: index,
          chunkCount: chunks.length,
        }
      };
    })
  );
  
  return embeddingResults;
}

// Function to process different document types
export async function processDocument(file: File, metadata: Record<string, any> = {}) {
  let text = '';
  let structuredData = null;
  
  // Extract text based on file type
  const fileType = file.name.split('.').pop()?.toLowerCase();
  
  if (fileType === 'txt' || fileType === 'md') {
    text = await file.text();
  } else if (fileType === 'pdf') {
    // Use Llama 3.2 Vision via OpenRouter for PDF files
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch('/api/vision', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to process PDF: ${errorData.error || 'Unknown error'}`);
    }
    
    const data = await response.json();
    
    // Check if we have structured data from Llama Vision
    if (data.structuredData) {
      console.log('Using JSON-structured data from Llama 3.2 Vision');
      structuredData = data.structuredData;
      text = JSON.stringify(structuredData); // Use the structured data as text for embedding
    } else {
      // Fallback to using the preview text if structured data is not available
      text = data.preview || '';
    }
  } else if (fileType === 'docx') {
    // Similar approach for DOCX files
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch('/api/admin/parse-docx', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error('Failed to parse DOCX');
    }
    
    const data = await response.json();
    text = data.text;
  } else {
    throw new Error(`Unsupported file type: ${fileType}`);
  }
  
  // Process the text into chunks
  const chunks = splitTextIntoChunks(text);
  
  // Generate embeddings with metadata including structured data flag
  return generateEmbeddings(chunks, {
    ...metadata,
    fileType,
    fileName: file.name,
    fileSize: file.size,
    isJsonStructured: !!structuredData,
    structuredData: structuredData
  });
}