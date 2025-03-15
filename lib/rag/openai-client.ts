import OpenAI from 'openai';
import { OpenAIStream } from 'ai';
import { ChatCompletionMessageParam } from 'openai/resources/chat';
import { queryEmbeddings } from './pinecone-client';

// Initialize OpenAI client
let openaiClient: OpenAI | null = null;

export function getOpenAIClient() {
  if (!openaiClient) {
    try {
      openaiClient = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY!,
      });
      console.log('OpenAI client initialized');
    } catch (error) {
      console.error('Error initializing OpenAI client:', error);
      return null;
    }
  }
  return openaiClient;
}

// Generate embeddings for a text
export async function generateEmbedding(text: string): Promise<number[] | null> {
  const openai = getOpenAIClient();
  
  if (!openai) {
    console.error('OpenAI client not initialized');
    return null;
  }
  
  try {
    console.log(`Generating embedding for text (${text.length} chars)`);
    
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-large',
      input: text,
      encoding_format: 'float'
    });
    
    console.log('Embedding generated successfully');
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    return null;
  }
}

// Generate embeddings for multiple texts
export async function generateEmbeddings(texts: string[]): Promise<(number[] | null)[]> {
  const openai = getOpenAIClient();
  
  if (!openai) {
    console.error('OpenAI client not initialized');
    return texts.map(() => null);
  }
  
  try {
    console.log(`Generating embeddings for ${texts.length} texts`);
    
    // Process in batches of 20 to avoid rate limits
    const batchSize = 20;
    const results: (number[] | null)[] = [];
    
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i/batchSize) + 1} of ${Math.ceil(texts.length/batchSize)}`);
      
      try {
        const response = await openai.embeddings.create({
          model: 'text-embedding-3-large',
          input: batch,
          encoding_format: 'float'
        });
        
        // Add the embeddings to results
        response.data.forEach((item) => {
          results.push(item.embedding);
        });
      } catch (error) {
        console.error(`Error generating embeddings for batch ${Math.floor(i/batchSize) + 1}:`, error);
        // Add nulls for the failed batch
        batch.forEach(() => results.push(null));
      }
    }
    
    console.log(`Generated ${results.filter(Boolean).length} embeddings out of ${texts.length} texts`);
    return results;
  } catch (error) {
    console.error('Error generating embeddings:', error);
    return texts.map(() => null);
  }
}

// Get relevant context from Pinecone based on query
export async function getRelevantContext(query: string, indexName: string, topK = 5) {
  console.log(`Getting relevant context for query: "${query}"`);
  
  try {
    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);
    
    if (!queryEmbedding) {
      console.error('Failed to generate embedding for query');
      return [];
    }
    
    // Query Pinecone for relevant documents
    const results = await queryEmbeddings(indexName, queryEmbedding, topK);
    
    if (!results || results.length === 0) {
      console.log('No relevant context found');
      return [];
    }
    
    console.log(`Found ${results.length} relevant contexts`);
    return results;
  } catch (error) {
    console.error('Error getting relevant context:', error);
    return [];
  }
}

// Format context for inclusion in prompt
export function formatContextForPrompt(contexts: Array<{ text: string; score?: number; metadata?: any }>) {
  if (!contexts || contexts.length === 0) {
    return '';
  }
  
  return contexts
    .map((context, index) => {
      const source = context.metadata?.source || 'Document';
      const score = context.score ? ` (Relevance: ${(context.score * 100).toFixed(1)}%)` : '';
      return `[Context ${index + 1}]${score} ${source}:\n${context.text}\n`;
    })
    .join('\n');
}

// Create a chat completion with streaming
export async function createChatCompletion(
  messages: ChatCompletionMessageParam[],
  model = 'gpt-4-turbo',
  temperature = 0.7,
  max_tokens = 1500
) {
  const openai = getOpenAIClient();
  
  if (!openai) {
    throw new Error('OpenAI client not initialized');
  }
  
  try {
    console.log(`Creating chat completion with model: ${model}`);
    
    const response = await openai.chat.completions.create({
      model,
      messages,
      temperature,
      max_tokens,
      stream: true,
    });
    
    // Create a stream from the response
    const stream = OpenAIStream(response);
    return stream;
  } catch (error) {
    console.error('Error creating chat completion:', error);
    throw error;
  }
}

// Create a chat completion without streaming
export async function createChatCompletionNonStreaming(
  messages: ChatCompletionMessageParam[],
  model = 'gpt-4-turbo',
  temperature = 0.7,
  max_tokens = 1500
) {
  const openai = getOpenAIClient();
  
  if (!openai) {
    throw new Error('OpenAI client not initialized');
  }
  
  try {
    console.log(`Creating non-streaming chat completion with model: ${model}`);
    
    const response = await openai.chat.completions.create({
      model,
      messages,
      temperature,
      max_tokens,
      stream: false,
    });
    
    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error creating non-streaming chat completion:', error);
    throw error;
  }
}