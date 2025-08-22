"use client";

import { useState, useEffect, useRef } from 'react';
import { type PutBlobResult } from '@vercel/blob';

export default function Home() {
  const [messages, setMessages] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      const savedMessages = localStorage.getItem('chatHistory');
      if (savedMessages) {
        try {
          return JSON.parse(savedMessages);
        } catch (e) {
          console.error("Failed to parse chat history from local storage", e);
          return [];
        }
      }
    }
    return [];
  });
  const [input, setInput] = useState('');
  const [llms, setLlms] = useState([
    { name: 'ChatGPT-4', checked: true, api: '/api/chat' },
    { name: 'Claude', checked: true, api: '/api/chat/claude' },
    { name: 'DeepSeek', checked: false, api: '' },
    { name: 'Gemini', checked: false, api: '' },
  ]);
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('chatHistory', JSON.stringify(messages));
  }, [messages]);

  const handleLlmToggle = (index: number) => {
    const newLlms = [...llms];
    newLlms[index].checked = !newLlms[index].checked;
    setLlms(newLlms);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
        setFile(selectedFile);
    }
  };

  const handleFileButtonClick = () => {
      fileInputRef.current?.click();
  };

  const handleRemoveFile = () => {
      setFile(null);
  };

  const handleSend = async () => {
    if (input.trim() || file) {
        let fileUrl: string | undefined;
        let fileType: string | undefined;

        if (file) {
            try {
                const response = await fetch(
                    `/api/upload?filename=${file.name}`,
                    {
                      method: 'POST',
                      body: file,
                    },
                );

                if (!response.ok) {
                    throw new Error('Failed to upload file.');
                }

                const newBlob = (await response.json()) as PutBlobResult;
                fileUrl = newBlob.url;
                fileType = file.type;

            } catch (error) {
                console.error(error);
                alert('Failed to upload file.');
                return;
            }
        }

        const userMessage: any = { llm: 'User', text: input };
        if(fileUrl) {
            userMessage.file = { url: fileUrl, type: fileType };
        }

        setMessages(prevMessages => [...prevMessages, userMessage]);
        const messageToSend = {
            text: input,
            fileUrl: fileUrl,
            fileType: fileType,
        }

        setInput('');
        setFile(null);

        const selectedLlms = llms.filter(llm => llm.checked);

        selectedLlms.forEach(async (llm) => {
            if (!llm.api) return;

            try {
                const res = await fetch(llm.api, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: messageToSend }),
                });

                if (res.ok) {
                    const data = await res.json();
                    const llmMessage = { llm: llm.name, text: data.response };
                    setMessages(prevMessages => [...prevMessages, llmMessage]);
                } else {
                    const llmMessage = { llm: llm.name, text: 'Sorry, something went wrong.' };
                    setMessages(prevMessages => [...prevMessages, llmMessage]);
                }
            } catch (error) {
                console.error(`Failed to fetch from ${llm.name} API`, error);
                const llmMessage = { llm: llm.name, text: 'Sorry, something went wrong.' };
                setMessages(prevMessages => [...prevMessages, llmMessage]);
            }
        });
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSend();
    }
  };

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 p-4">
        <h1 className="text-2xl font-bold mb-4">AI Fiesta</h1>
        <nav>
          <ul>
            {llms.map((llm, index) => (
              <li key={index} className="mb-2">
                <a
                  href="#"
                  className="flex items-center p-2 rounded hover:bg-gray-700"
                  onClick={(e) => {
                    e.preventDefault();
                    handleLlmToggle(index);
                  }}
                >
                  <input
                    type="checkbox"
                    className="mr-2"
                    checked={llm.checked}
                    onChange={() => handleLlmToggle(index)}
                  />
                  <span>{llm.name}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <header className="bg-gray-800 p-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Chat</h2>
        </header>

        {/* Chat Messages */}
        <main className="flex-1 p-4 overflow-y-auto">
          <div className="flex flex-col gap-4">
            {messages.map((msg, index) => (
              <div key={index} className={`flex items-start gap-2.5 ${msg.llm === 'User' ? 'justify-end' : ''}`}>
                <div className={`flex flex-col w-full max-w-[320px] leading-1.5 p-4 border-gray-200 ${msg.llm === 'User' ? 'bg-blue-600' : 'bg-gray-700'} rounded-xl`}>
                  <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    <span className="text-sm font-semibold text-white">{msg.llm}</span>
                  </div>
                  {msg.text && <p className="text-sm font-normal py-2.5 text-white">{msg.text}</p>}
                  {msg.file && (
                    <div className="mt-2">
                        {msg.file.type?.startsWith('image/') && <img src={msg.file.url} alt="Uploaded content" className="rounded-lg" />}
                        {msg.file.type?.startsWith('video/') && <video src={msg.file.url} controls className="rounded-lg" />}
                        {msg.file.type?.startsWith('audio/') && <audio src={msg.file.url} controls />}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </main>

        {/* Chat Input */}
        <div className="bg-gray-800 p-4">
            {file && (
                <div className="p-2 bg-gray-700 flex items-center justify-between rounded mb-2">
                    {file.type.startsWith('image/') ? (
                        <img src={URL.createObjectURL(file)} alt="preview" className="h-16 w-16 object-cover rounded"/>
                    ) : (
                        <span>{file.name}</span>
                    )}
                    <button onClick={handleRemoveFile} className="text-red-500 hover:text-red-400">Remove</button>
                </div>
            )}
            <footer className="flex items-center">
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept="image/*,video/*,audio/*"
                />
                <button onClick={handleFileButtonClick} className="mr-2 p-2 bg-gray-600 rounded-full hover:bg-gray-700">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                </button>
                <input
                    type="text"
                    placeholder="Type your message..."
                    className="w-full p-2 rounded bg-gray-700 text-white"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                />
                <button
                    className="ml-2 px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
                    onClick={handleSend}
                >
                    Send
                </button>
            </footer>
        </div>
      </div>
    </div>
  );
}
