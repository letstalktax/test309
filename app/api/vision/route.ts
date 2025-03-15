import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { generateEmbeddings, splitTextIntoChunks } from '@/lib/rag/document-processor';
import { storeEmbeddings } from '@/lib/rag/pinecone-client';

export const maxDuration = 60;

// Function to convert extracted text to structured JSON
function convertToStructuredJSON(text: string) {
  try {
    // Check if the text is already JSON
    if (text.trim().startsWith('{') && text.trim().endsWith('}')) {
      try {
        const jsonData = JSON.parse(text);
        console.log('Text is already in JSON format, using as-is');
        return jsonData;
      } catch (e) {
        // Not valid JSON, proceed with conversion
        console.log('Text looks like JSON but is not valid, proceeding with conversion');
      }
    }
    
    // Create a structured JSON object with the extracted text
    const sections = splitTextIntoSections(text);
    
    return {
      content: text,
      metadata: {
        extractionMethod: 'vision-api',
        extractionDate: new Date().toISOString(),
        contentType: 'text/plain',
        sectionCount: sections.length
      },
      sections: sections
    };
  } catch (error) {
    console.error('Error converting to structured JSON:', error);
    // Fallback to a simple structure
    return {
      content: text,
      metadata: {
        extractionMethod: 'vision-api-fallback',
        extractionDate: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error)
      },
      sections: [{
        title: 'Content',
        content: text
      }]
    };
  }
}

// Function to split text into logical sections
function splitTextIntoSections(text: string) {
  try {
    // If text is too short, just return it as a single section
    if (text.length < 200) {
      return [{
        title: 'Content',
        content: text
      }];
    }
    
    // Split by potential section headers (lines ending with colon or all caps lines)
    const lines = text.split('\n');
    const sections = [];
    let currentSection = {
      title: 'Introduction',
      content: ''
    };
    
    // Common header patterns
    const headerPatterns = [
      // Section with colon - "Section 1:"
      /^.*:$/,
      // All caps line (minimum 5 chars, max 100)
      /^[A-Z][A-Z\s.,;'"\-]{4,99}$/,
      // Section/Article/Chapter pattern
      /^(Section|SECTION|Article|ARTICLE|Chapter|CHAPTER|PART|Part)\s+[0-9IVXLCDM]+/i,
      // Numbered section - "1. Introduction"
      /^[0-9]+\.\s+[A-Z]/,
      // Roman numeral section - "I. Introduction"
      /^[IVXLCDM]+\.\s+[A-Z]/,
      // Letter section - "A. Introduction"
      /^[A-Z]\.\s+[A-Z]/
    ];
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip empty lines
      if (!trimmedLine) {
        continue;
      }
      
      // Check if this line looks like a section header
      const isHeader = headerPatterns.some(pattern => pattern.test(trimmedLine));
      
      if (isHeader) {
        // Save the previous section if it has content
        if (currentSection.content.trim()) {
          sections.push({...currentSection});
        }
        
        // Start a new section
        currentSection = {
          title: trimmedLine.endsWith(':') ? trimmedLine.slice(0, -1) : trimmedLine,
          content: ''
        };
      } else {
        // Add to the current section
        if (currentSection.content) {
          currentSection.content += '\n';
        }
        currentSection.content += line;
      }
    }
    
    // Add the last section
    if (currentSection.content.trim()) {
      sections.push(currentSection);
    }
    
    // If no sections were found, create a single section
    if (sections.length === 0) {
      sections.push({
        title: 'Content',
        content: text
      });
    }
    
    return sections;
  } catch (error) {
    console.error('Error splitting text into sections:', error);
    // Fallback to a single section
    return [{
      title: 'Content',
      content: text
    }];
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    
    // Get file as array buffer
    const fileBuffer = await file.arrayBuffer();
    const base64File = Buffer.from(fileBuffer).toString('base64');
    
    // Determine content type
    const contentType = file.type;
    const dataUri = `data:${contentType};base64,${base64File}`;
    
    console.log(`Processing document with Vision API: ${file.name} (${file.size} bytes)`);
    
    // Call OpenRouter API with Claude 3 Vision
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'MusTax AI Document Processor'
      },
      body: JSON.stringify({
        model: 'google/gemini-pro-vision',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract all the text content from this document. Format it as plain text, preserving paragraphs and important structure. Identify section headers and important information. Ignore watermarks, headers, footers, and page numbers.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: dataUri
                }
              }
            ]
          }
        ],
        max_tokens: 2000
      })
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error('Error from OpenRouter:', errorData);
      
      // Check if this is a credit limit error
      if (errorData.includes('credits') || errorData.includes('402')) {
        return NextResponse.json({ 
          error: 'Not enough credits on OpenRouter account to process this document. Please add credits at https://openrouter.ai/settings/credits',
          details: errorData
        }, { status: 402 });
      }
      
      return NextResponse.json({ error: 'Failed to process document with Vision API' }, { status: 500 });
    }
    
    const data = await response.json();
    
    // Log the response structure to debug
    console.log('API Response structure:', Object.keys(data));
    
    // Extract text based on model response format
    let extractedText = '';
    
    try {
      // Handle OpenAI format
      if (data.choices && data.choices[0] && data.choices[0].message) {
        extractedText = data.choices[0].message.content;
        console.log('Using OpenAI response format');
      } 
      // Handle standard OpenRouter choices format
      else if (data.choices && data.choices[0]) {
        if (data.choices[0].message && data.choices[0].message.content) {
          extractedText = data.choices[0].message.content;
          console.log('Using OpenRouter standard format');
        } else if (data.choices[0].text) {
          extractedText = data.choices[0].text;
          console.log('Using text field from choices');
        } else if (typeof data.choices[0] === 'string') {
          extractedText = data.choices[0];
          console.log('Using direct string from choices');
        }
      }
      // Handle Anthropic/Claude format
      else if (data.content) {
        extractedText = data.content;
        console.log('Using Anthropic/Claude content format');
      }
      // Handle Gemini format
      else if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        const content = data.candidates[0].content;
        if (content.parts && content.parts[0] && content.parts[0].text) {
          extractedText = content.parts[0].text;
          console.log('Using Gemini content format');
        } else if (typeof content === 'string') {
          extractedText = content;
          console.log('Using Gemini direct content');
        }
      }
      // Direct response text formats
      else if (data.text || data.response || data.output || data.generated_text) {
        extractedText = data.text || data.response || data.output || data.generated_text;
        console.log('Using direct text/response/output field');
      }
      
      // If we still don't have text, try to find any string property that might contain text
      if (!extractedText && typeof data === 'object') {
        for (const key of Object.keys(data)) {
          if (typeof data[key] === 'string' && data[key].length > 100) {
            extractedText = data[key];
            console.log(`Using string property "${key}" as text`);
            break;
          }
        }
      }
      
      if (!extractedText) {
        console.error('No text content found in response:', JSON.stringify(data).substring(0, 300) + '...');
        return NextResponse.json({ 
          error: 'Could not extract text from vision model response',
          details: 'See server logs for details'
        }, { status: 500 });
      }
    } catch (error) {
      console.error('Error parsing vision API response:', error);
      console.error('Response data:', JSON.stringify(data).substring(0, 300) + '...');
      return NextResponse.json({ 
        error: 'Error parsing vision model response',
        details: error instanceof Error ? error.message : String(error)
      }, { status: 500 });
    }
    
    console.log(`Extracted ${extractedText.length} characters of text from document`);
    
    // Convert the extracted text to structured JSON
    const structuredData = convertToStructuredJSON(extractedText);
    console.log('Converted extracted text to structured JSON format');
    
    // Process each section as a separate chunk for better context retrieval
    const chunks = [];
    
    // Add the full content as a chunk
    chunks.push(JSON.stringify({
      type: 'full_content',
      content: structuredData.content,
      metadata: structuredData.metadata
    }));
    
    // Add each section as a separate chunk
    for (const section of structuredData.sections) {
      chunks.push(JSON.stringify({
        type: 'section',
        title: section.title,
        content: section.content,
        metadata: {
          ...structuredData.metadata,
          sectionTitle: section.title
        }
      }));
    }
    
    // Add the complete structured document as a chunk
    chunks.push(JSON.stringify(structuredData));
    
    console.log(`Created ${chunks.length} JSON chunks from the document`);
    
    // Generate embeddings for chunks
    const embeddingsWithText = await generateEmbeddings(chunks, {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      userId: session.user.id,
      processedWith: 'llama-3.2-vision-json'
    });
    
    console.log(`Generated ${embeddingsWithText.length} embeddings`);
    
    // Store embeddings in Pinecone
    if (embeddingsWithText.length > 0) {
      await storeEmbeddings(
        process.env.PINECONE_INDEX_NAME!,
        embeddingsWithText.map(item => ({
          ...item,
          metadata: {
            ...item.metadata,
            userId: session.user?.id,
            fileName: file.name,
            uploadedAt: new Date().toISOString(),
            isJsonStructured: true
          }
        }))
      );
      console.log('Stored embeddings in Pinecone');
    }
    
    return NextResponse.json({
      success: true,
      textLength: extractedText.length,
      chunks: chunks.length,
      embeddings: embeddingsWithText.length,
      preview: extractedText.substring(0, 200) + '...',
      structuredData: structuredData
    });
  } catch (error) {
    console.error('Error processing document with vision model:', error);
    return NextResponse.json({ 
      error: 'Failed to process document',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}