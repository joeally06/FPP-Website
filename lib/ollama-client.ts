// Ollama LLM Client for Santa Letter Responses

interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OllamaRequest {
  model: string;
  messages: OllamaMessage[];
  stream?: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    max_tokens?: number;
  };
}

interface OllamaResponse {
  message: {
    role: string;
    content: string;
  };
  done: boolean;
}

/**
 * Generate a personalized Santa response using Ollama
 */
export async function generateSantaReply(
  childName: string,
  childAge: number | null,
  letterContent: string,
  ollamaUrl: string = 'http://localhost:11434'
): Promise<string> {
  try {
    console.log('🎅 Generating Santa reply for:', childName);
    console.log('📍 Ollama URL:', ollamaUrl);
    
    const systemPrompt = `You are Santa Claus writing from the North Pole. You are warm, jolly, magical, and kind. You write personalized letters to children that feel genuine and special. Keep your responses appropriate for children and families. Always sign your letters as "Santa Claus" with a mention of the North Pole.`;

    const userPrompt = `
A child named ${childName}${childAge ? `, who is ${childAge} years old,` : ''} has written you a letter. Here is what they wrote:

"${letterContent}"

Please write a warm, personalized response from Santa that:
1. Thanks them by name for writing
2. Comments on specific things they mentioned in their letter
3. Shows excitement about Christmas and their wishes
4. Encourages kindness and good behavior
5. Mentions the elves, reindeer, or Mrs. Claus naturally
6. Keeps the magic alive with wonder and joy
7. Is age-appropriate and heartwarming
8. Signs off as "Santa Claus" from the "North Pole"

Write the letter now:
`;

    const messages: OllamaMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    const request: OllamaRequest = {
      model: 'deepseek-r1:latest', // Using your available model - great for creative tasks!
      messages,
      stream: false,
      options: {
        temperature: 0.8, // Creative but not too random
        top_p: 0.9,
      }
    };

    console.log('📤 Sending request to Ollama...');
    const response = await fetch(`${ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    console.log('📥 Ollama response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Ollama error response:', errorText);
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as OllamaResponse;
    console.log('✅ Reply generated successfully');
    
    return data.message.content.trim();
  } catch (error) {
    console.error('❌ Error generating Santa reply:', error);
    
    // Fallback generic response if LLM fails
    return `Dear ${childName},

Thank you so much for your wonderful letter! It warmed my heart to read it here at the North Pole.

The elves and I are working hard in the workshop preparing for Christmas Eve. Rudolph and the other reindeer are training for our big journey around the world!

Keep being kind and good, and remember that the spirit of Christmas is about love, joy, and sharing with others.

I'll be checking my list twice, so keep up the great work!

With love and Christmas magic,
Santa Claus
North Pole`;
  }
}

/**
 * Test Ollama connection
 */
export async function testOllamaConnection(ollamaUrl: string = 'http://localhost:11434'): Promise<boolean> {
  try {
    const response = await fetch(`${ollamaUrl}/api/tags`, {
      method: 'GET',
    });
    return response.ok;
  } catch (error) {
    console.error('Ollama connection test failed:', error);
    return false;
  }
}
