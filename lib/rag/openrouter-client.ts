import { OpenAIStream } from 'ai';
import { ChatCompletionMessageParam } from 'openai/resources/chat';

// Function to extract text from various response formats
export function extractTextFromResponse(data: any): string | null {
  console.log('Extracting text from response');
  
  try {
    // Log the response structure for debugging
    console.log('Response structure:', JSON.stringify(data, null, 2).substring(0, 500) + '...');
    
    // Check for standard OpenRouter format
    if (data.choices && data.choices[0] && data.choices[0].text) {
      console.log('Found text in standard OpenRouter format');
      return data.choices[0].text;
    }
    
    // Check for Anthropic/Claude format
    if (data.content) {
      console.log('Found text in Anthropic/Claude format');
      return data.content;
    }
    
    // Check for Gemini format
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      console.log('Found text in Gemini format');
      return data.candidates[0].content;
    }
    
    // Check for direct response text formats
    if (data.text) {
      console.log('Found text in direct text format');
      return data.text;
    }
    
    if (data.response) {
      console.log('Found text in response format');
      return data.response;
    }
    
    if (data.output) {
      console.log('Found text in output format');
      return data.output;
    }
    
    if (data.generated_text) {
      console.log('Found text in generated_text format');
      return data.generated_text;
    }
    
    // Fallback: search for any string property in the response
    console.log('No standard format found, searching for any string property');
    const findStringProperty = (obj: any): string | null => {
      if (!obj || typeof obj !== 'object') return null;
      
      for (const key in obj) {
        if (typeof obj[key] === 'string' && obj[key].length > 10) {
          console.log(`Found string property in key: ${key}`);
          return obj[key];
        }
        if (typeof obj[key] === 'object') {
          const result = findStringProperty(obj[key]);
          if (result) return result;
        }
      }
      return null;
    };
    
    const text = findStringProperty(data);
    if (text) {
      console.log('Found text in non-standard format');
      return text;
    }
    
    console.error('Failed to extract text from response');
    return null;
  } catch (error) {
    console.error('Error extracting text from response:', error);
    return null;
  }
}

// Create a chat completion with OpenRouter
export async function createOpenRouterChatCompletion(
  messages: ChatCompletionMessageParam[],
  model = 'anthropic/claude-3-opus',
  temperature = 0.7,
  max_tokens = 1500
) {
  try {
    console.log(`Creating OpenRouter chat completion with model: ${model}`);
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://mustax.ai',
        'X-Title': 'MusTax AI Chatbot'
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens,
        stream: true,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenRouter API error (${response.status}):`, errorText);
      throw new Error(`OpenRouter API error: ${response.status} ${errorText}`);
    }
    
    // Create a stream from the response
    const stream = OpenAIStream(response);
    return stream;
  } catch (error) {
    console.error('Error creating OpenRouter chat completion:', error);
    throw error;
  }
}

// Create a chat completion with OpenRouter without streaming
export async function createOpenRouterChatCompletionNonStreaming(
  messages: ChatCompletionMessageParam[],
  model = 'anthropic/claude-3-opus',
  temperature = 0.7,
  max_tokens = 1500
) {
  try {
    console.log(`Creating non-streaming OpenRouter chat completion with model: ${model}`);
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://mustax.ai',
        'X-Title': 'MusTax AI Chatbot'
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens,
        stream: false,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenRouter API error (${response.status}):`, errorText);
      throw new Error(`OpenRouter API error: ${response.status} ${errorText}`);
    }
    
    const data = await response.json();
    
    // Extract text from the response
    if (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
      return data.choices[0].message.content;
    }
    
    // Fallback to more generic text extraction
    const extractedText = extractTextFromResponse(data);
    if (extractedText) {
      return extractedText;
    }
    
    console.error('Failed to extract text from OpenRouter response:', data);
    throw new Error('Failed to extract text from OpenRouter response');
  } catch (error) {
    console.error('Error creating non-streaming OpenRouter chat completion:', error);
    throw error;
  }
}

// Function to send a vision request to OpenRouter
export async function sendVisionRequest(
  base64Image: string,
  prompt: string,
  model = 'anthropic/claude-3-opus-vision'
) {
  try {
    console.log(`Sending vision request to OpenRouter with model: ${model}`);
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://mustax.ai',
        'X-Title': 'MusTax AI Chatbot'
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`
                }
              }
            ]
          }
        ],
        max_tokens: 4000,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenRouter Vision API error (${response.status}):`, errorText);
      throw new Error(`OpenRouter Vision API error: ${response.status} ${errorText}`);
    }
    
    const data = await response.json();
    console.log('Vision API response received');
    
    // Extract text from the response
    const extractedText = extractTextFromResponse(data);
    if (extractedText) {
      return extractedText;
    }
    
    console.error('Failed to extract text from Vision API response:', data);
    throw new Error('Failed to extract text from Vision API response');
  } catch (error) {
    console.error('Error sending vision request:', error);
    throw error;
  }
}