import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json(); // message is { text, fileUrl, fileType }
    const content: any[] = [{ type: 'text', text: message.text }];

    if (message.fileUrl && message.fileType?.startsWith('image/')) {
        content.push({
            type: 'image_url',
            image_url: { url: message.fileUrl },
        });
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: content }],
    });

    const response = completion.choices[0].message.content;

    return NextResponse.json({ response });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch response from OpenAI' }, { status: 500 });
  }
}
