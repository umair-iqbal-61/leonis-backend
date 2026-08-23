import express from 'express'
import 'dotenv/config'

const router = express.Router()

router.post('/chat', async (req, res) => {
  const { messages, petContext } = req.body

  const systemPrompt = `You are PawPal AI, a friendly and knowledgeable pet care assistant.
    You have access to the following pet's data:

    ${petContext}

    Use this data to give personalized, specific advice. Be warm, concise, and practical.
    If asked about something outside pet care, politely redirect to pet-related topics.
    Always remind users to consult a vet for medical concerns.
  `

  try {
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-20b",
          max_tokens: 1024,
          temperature: 0.7,
          messages: [{ role: "system", content: systemPrompt }, ...messages],
        }),
      },
    );

    const data = await response.json();
    console.log("Groq response:", JSON.stringify(data));
    const replyText = data.choices?.[0]?.message?.content;

    if (!replyText)
      throw new Error(
        `Groq returned no text. Full response: ${JSON.stringify(data)}`,
      );

    res.json({ content: [{ text: replyText }] })
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: "Something went wrong!" })
  }
})

export default router