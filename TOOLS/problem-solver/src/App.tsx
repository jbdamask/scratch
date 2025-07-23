import { useState, useEffect } from 'react';
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels';
import { ChatPanel, type ChatMessage } from './components/ChatPanel';
import { MermaidEditor } from './components/MermaidEditor';
import { DiagramViewer } from './components/DiagramViewer';
import { McKinseyBot } from './lib/mckinsey-bot';
import { chatDb } from './lib/database';

function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [mermaidCode, setMermaidCode] = useState('');
  const [renderedCode, setRenderedCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [bot, setBot] = useState<McKinseyBot | null>(null);

  // Initialize the app
  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    // Get API key from environment
    const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      console.error('VITE_ANTHROPIC_API_KEY not found. Please add it to your .env file.');
      // Add a helpful message to the user
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Welcome to the McKinsey Problem Solver! 

⚠️ **Setup Required**: Please create a .env file in the root directory with your Anthropic API key:

\`\`\`
VITE_ANTHROPIC_API_KEY=your_api_key_here
\`\`\`

Once you've added your API key, refresh the page to start solving problems with AI-powered structured thinking.`,
        timestamp: new Date()
      };
      setMessages([errorMessage]);
      return;
    }

    try {
      // Initialize bot
      const newBot = new McKinseyBot(apiKey);
      setBot(newBot);

      // Create or load session
      const newSessionId = chatDb.createSession('Problem Solving Session');
      setSessionId(newSessionId);

      // Add welcome message
      const welcomeMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: newBot.getInitialMessage(),
        timestamp: new Date()
      };

      setMessages([welcomeMessage]);
      
      // Save to database
      chatDb.addMessage(newSessionId, 'assistant', welcomeMessage.content);

    } catch (error) {
      console.error('Failed to initialize app:', error);
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Sorry, there was an error initializing the assistant. Please check your API key and refresh the page.',
        timestamp: new Date()
      };
      setMessages([errorMessage]);
    }
  };

  const handleSendMessage = async (userMessage: string) => {
    if (!bot || !sessionId) return;

    // Add user message
    const userChatMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userChatMessage]);
    setIsLoading(true);

    // Save user message to database
    chatDb.addMessage(sessionId, 'user', userMessage);

    try {
      // Get response from bot
      const response = await bot.chat(userMessage);

      // Create assistant message
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response.response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Save assistant response to database
      chatDb.addMessage(
        sessionId, 
        'assistant', 
        response.response,
        response.suggestedDiagramType,
        response.mermaidCode
      );

      // Update mermaid code if provided
      if (response.mermaidCode) {
        setMermaidCode(response.mermaidCode);
        setRenderedCode(response.mermaidCode);
      }

    } catch (error) {
      console.error('Error getting bot response:', error);
      
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please check your internet connection and API key, then try again.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeChange = (code: string) => {
    setMermaidCode(code);
  };

  const handleRender = (code: string) => {
    setRenderedCode(code);
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-background">
      <PanelGroup direction="horizontal">
        {/* Chat Panel */}
        <Panel defaultSize={30} minSize={25}>
          <ChatPanel
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            className="h-full border-r"
          />
        </Panel>

        <PanelResizeHandle className="w-2 hover:bg-primary/20 transition-colors bg-border" />

        {/* Mermaid Editor Panel */}
        <Panel defaultSize={35} minSize={25}>
          <MermaidEditor
            code={mermaidCode}
            onCodeChange={handleCodeChange}
            onRender={handleRender}
            className="h-full border-r"
          />
        </Panel>

        <PanelResizeHandle className="w-2 hover:bg-primary/20 transition-colors bg-border" />

        {/* Diagram Viewer Panel */}
        <Panel defaultSize={35} minSize={25}>
          <DiagramViewer
            mermaidCode={renderedCode}
            className="h-full"
          />
        </Panel>
      </PanelGroup>
    </div>
  );
}

export default App;
