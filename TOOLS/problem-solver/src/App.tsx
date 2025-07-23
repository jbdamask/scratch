import { useState, useEffect } from 'react';
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels';
import { ChatPanel, type ChatMessage } from './components/ChatPanel';
import { MermaidEditor } from './components/MermaidEditor';
import { DiagramViewer } from './components/DiagramViewer';
import { ProjectManager } from './components/ProjectManager';
import { McKinseyBot } from './lib/mckinsey-bot';
import { DocumentExporter } from './lib/document-export';
import { chatDb, type Project, type ChatSession } from './lib/database';

function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [mermaidCode, setMermaidCode] = useState('');
  const [renderedCode, setRenderedCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [bot, setBot] = useState<McKinseyBot | null>(null);
  const [documentExporter, setDocumentExporter] = useState<DocumentExporter | null>(null);

  // Initialize the app
  useEffect(() => {
    initializeApp();
  }, []);

  // Load bot context when both bot and currentSession are available
  useEffect(() => {
    if (bot && currentSession && messages.length > 0) {
      bot.loadConversationHistory(messages);
    }
  }, [bot, currentSession, messages]);

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
      // Initialize bot and document exporter
      const newBot = new McKinseyBot(apiKey);
      const newExporter = new DocumentExporter(apiKey);
      setBot(newBot);
      setDocumentExporter(newExporter);

      // Check for existing projects
      const projects = chatDb.getProjects();
      if (projects.length === 0) {
        // Create default project for first-time users
        const defaultProjectId = chatDb.createProject(
          'My First Project',
          'Getting started with structured problem solving'
        );
        const defaultProject = chatDb.getProject(defaultProjectId);
        if (defaultProject) {
          setCurrentProject(defaultProject);
          
          // Create initial session
          const sessionId = chatDb.createSession(defaultProjectId, 'Initial Analysis');
          const session = chatDb.getSession(sessionId);
          if (session) {
            setCurrentSession(session);
            
            // Add welcome message
            const welcomeMessage: ChatMessage = {
              id: crypto.randomUUID(),
              role: 'assistant',
              content: newBot.getInitialMessage(),
              timestamp: new Date()
            };

            setMessages([welcomeMessage]);
            chatDb.addMessage(sessionId, 'assistant', welcomeMessage.content);
          }
        }
      } else {
        // Load first project and its most recent session
        const firstProject = projects[0];
        setCurrentProject(firstProject);
        
        const sessions = chatDb.getSessionsByProject(firstProject.id);
        if (sessions.length > 0) {
          const recentSession = sessions[0];
          setCurrentSession(recentSession);
          loadSessionMessages(recentSession.id);
        }
      }

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

  const loadSessionMessages = (sessionId: string) => {
    const dbMessages = chatDb.getMessages(sessionId);
    const chatMessages: ChatMessage[] = dbMessages.map(msg => ({
      id: msg.id.toString(),
      role: msg.role,
      content: msg.content,
      timestamp: new Date(msg.timestamp)
    }));
    setMessages(chatMessages);
    
    // Load the most recent diagram from the session
    const messagesWithDiagrams = dbMessages.filter(msg => msg.mermaid_code);
    if (messagesWithDiagrams.length > 0) {
      const latestDiagram = messagesWithDiagrams[messagesWithDiagrams.length - 1];
      setMermaidCode(latestDiagram.mermaid_code!);
      setRenderedCode(latestDiagram.mermaid_code!);
    }
    
    // Load conversation context into bot if available
    if (bot && chatMessages.length > 0) {
      bot.loadConversationHistory(chatMessages);
    }
  };

  const handleProjectChange = (project: Project) => {
    setCurrentProject(project);
    // Clear current session and messages
    setCurrentSession(null);
    setMessages([]);
    // Clear diagrams when switching projects
    setMermaidCode('');
    setRenderedCode('');
    // Reset bot context
    if (bot) {
      bot.resetContext();
    }
  };

  const handleSessionChange = (session: ChatSession) => {
    setCurrentSession(session);
    loadSessionMessages(session.id);
  };

  const handleNewSession = () => {
    if (!currentProject || !bot) return;

    const sessionTitle = `Session ${new Date().toLocaleDateString()}`;
    const sessionId = chatDb.createSession(currentProject.id, sessionTitle);
    const newSession = chatDb.getSession(sessionId);
    
    if (newSession) {
      setCurrentSession(newSession);
      
      // Reset bot context for new session
      bot.resetContext();
      
      // Clear current diagrams
      setMermaidCode('');
      setRenderedCode('');
      
      // Add welcome message to new session
      const welcomeMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: bot.getInitialMessage(),
        timestamp: new Date()
      };

      setMessages([welcomeMessage]);
      chatDb.addMessage(sessionId, 'assistant', welcomeMessage.content);
    }
  };

  const handleExportDocument = async () => {
    if (!currentProject || !documentExporter) return;

    try {
      setIsLoading(true);
      const summary = await documentExporter.generateProjectSummary(currentProject.id);
      const diagrams = chatDb.getDiagramsByProject(currentProject.id);
      const markdownReport = documentExporter.generateMarkdownReport(currentProject, summary, diagrams);
      
      const filename = `${currentProject.name.replace(/[^a-zA-Z0-9]/g, '_')}_Report.md`;
      documentExporter.downloadMarkdown(markdownReport, filename);
    } catch (error) {
      console.error('Failed to export document:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (userMessage: string) => {
    if (!bot || !currentSession) return;

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
    chatDb.addMessage(currentSession.id, 'user', userMessage);

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
        currentSession.id, 
        'assistant', 
        response.response,
        response.suggestedDiagramType,
        response.mermaidCode
      );

      // Update mermaid code if provided
      if (response.mermaidCode) {
        setMermaidCode(response.mermaidCode);
        setRenderedCode(response.mermaidCode);
        
        // Add diagram to catalog if it's a new significant diagram
        if (response.suggestedDiagramType && currentProject) {
          const diagramTitle = `${response.suggestedDiagramType} - ${new Date().toLocaleDateString()}`;
          chatDb.addDiagramToCatalog(
            currentProject.id,
            currentSession.id,
            diagramTitle,
            response.suggestedDiagramType,
            response.mermaidCode,
            `Generated during conversation on ${new Date().toLocaleDateString()}`
          );
        }
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
    <div className="h-screen w-screen overflow-hidden bg-background flex flex-col">
      {/* Project Manager Header */}
      <ProjectManager
        currentProject={currentProject}
        currentSession={currentSession}
        onProjectChange={handleProjectChange}
        onSessionChange={handleSessionChange}
        onNewSession={handleNewSession}
        onExportDocument={handleExportDocument}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
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
    </div>
  );
}

export default App;
