
const BFF_URL = 'http://localhost:3001';

const sendMessageStream = async function* (
  message: string,
  history: any[]
) {
  try {
    const response = await fetch(`${BFF_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        history,
        message,
      }),
    });

    if (!response.body) {
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      const chunk = decoder.decode(value, { stream: true });
      yield { text: chunk };
    }
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

export const geminiService = {
  sendMessageStream,
};
