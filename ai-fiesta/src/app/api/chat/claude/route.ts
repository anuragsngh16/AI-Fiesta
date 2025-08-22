import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();
    const content: any[] = [];
    if (message.text) {
        content.push({ type: 'text', text: message.text });
    }

    if (message.fileUrl && message.fileType?.startsWith('image/')) {
        const imageResponse = await fetch(message.fileUrl);
        const imageBuffer = await imageResponse.arrayBuffer();
        const imageBase64 = Buffer.from(imageBuffer).toString('base64');

        content.push({
            type: 'image',
            source: {
                type: 'base64',
                media_type: message.fileType,
                data: imageBase64,
            },
        });
    }

    if (content.length === 0) {
        return NextResponse.json({ error: 'No content to process' }, { status: 400 });
    }

    const completion = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1024,
      messages: [{ role: 'user', content: content }],
    });

    const response = completion.content[0].text;

    return NextResponse.json({ response });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch response from Anthropic' }, { status: 500 });
  }
}
