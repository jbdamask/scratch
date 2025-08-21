import { Anthropic } from '@anthropic-ai/sdk';
import { createDiagram, type DiagramType } from './diagrams';

export interface ProblemSolvingContext {
  problemStatement?: string;
  industry?: string;
  timeframe?: string;
  stakeholders?: string[];
  constraints?: string[];
  currentPhase: 'problem-definition' | 'structuring' | 'analysis' | 'synthesis';
  suggestedDiagramType?: DiagramType;
  conversationHistory: { role: 'user' | 'assistant'; content: string }[];
}

export class McKinseyBot {
  private anthropic: Anthropic;
  private context: ProblemSolvingContext;

  constructor(apiKey: string) {
    this.anthropic = new Anthropic({
      apiKey,
      dangerouslyAllowBrowser: true // Note: In production, use a backend proxy
    });
    
    this.context = {
      currentPhase: 'problem-definition',
      conversationHistory: []
    };
  }

  async chat(userMessage: string): Promise<{
    response: string;
    suggestedDiagramType?: DiagramType;
    mermaidCode?: string;
    followUpQuestions?: string[];
    phaseTransition?: boolean;
  }> {
    // Add user message to history
    this.context.conversationHistory.push({
      role: 'user',
      content: userMessage
    });

    const systemPrompt = this.buildSystemPrompt();
    const conversationContext = this.buildConversationContext();

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1000,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: conversationContext + '\n\nUser: ' + userMessage
          }
        ]
      });

      const assistantResponse = response.content[0].type === 'text' 
        ? response.content[0].text 
        : '';

      // Add assistant response to history
      this.context.conversationHistory.push({
        role: 'assistant',
        content: assistantResponse
      });

      // Parse the response for structured elements
      const parsed = this.parseResponse(assistantResponse);
      
      // Update context based on response
      this.updateContext(parsed);

      return parsed;
      
    } catch (error) {
      console.error('Error calling Claude API:', error);
      throw new Error('Failed to get response from AI assistant');
    }
  }

  private buildSystemPrompt(): string {
    return `You are an expert McKinsey Partner with 20 years of experience in structured problem-solving, following the principles from "Bulletproof Problem Solving" by Charles Conn and Robert McLean.

Your role is to guide users through rigorous problem-solving using structured thinking frameworks. You should:

1. **Ask ONE focused question at a time** to deeply understand the problem
2. **Challenge vague or ambiguous responses** with follow-up questions
3. **Guide users through the problem-solving phases**:
   - Problem Definition: What exactly is the problem? For whom? Why does it matter?
   - Problem Structuring: Break down the problem using frameworks (issue trees, hypotheses)
   - Analysis: What data/evidence do we need? How will we gather it?
   - Synthesis: What are the insights and recommendations?

4. **Recommend appropriate diagrams** based on the problem type:
   - Issue Trees/Logic Trees: For breaking down complex problems
   - Decision Trees: For decisions with uncertainty and multiple outcomes  
   - 2x2 Matrices: For prioritization and comparison
   - Hypothesis Trees: For testing assumptions and building evidence

5. **Be rigorous about MECE principles** (Mutually Exclusive, Collectively Exhaustive)
6. **Push for specificity** - reject generic answers and ask for concrete examples
7. **Maintain a consultative, professional tone** while being direct about weak thinking
8. **Proactively suggest diagrams** - When you have enough information, immediately suggest and generate appropriate visual frameworks

**IMPORTANT DIAGRAM INSTRUCTIONS:**
- When suggesting a diagram, ALWAYS include "DIAGRAM_SUGGESTION: [type]" where type is: issue-tree, decision-tree, 2x2-matrix, hypothesis-tree
- IMMEDIATELY follow with the actual Mermaid code in a mermaid code block (using triple backticks)
- Be proactive - suggest diagrams early and often when they would help structure thinking
- Update diagrams as the conversation evolves and new information emerges

Current phase: ${this.context.currentPhase}
${this.context.problemStatement ? `Problem statement: ${this.context.problemStatement}` : ''}`;
  }

  private buildConversationContext(): string {
    let context = `Conversation Context:\n`;
    context += `Current Phase: ${this.context.currentPhase}\n`;
    
    if (this.context.problemStatement) {
      context += `Problem: ${this.context.problemStatement}\n`;
    }
    if (this.context.industry) {
      context += `Industry: ${this.context.industry}\n`;
    }
    if (this.context.stakeholders?.length) {
      context += `Stakeholders: ${this.context.stakeholders.join(', ')}\n`;
    }
    
    context += `\nRecent conversation:\n`;
    const recentHistory = this.context.conversationHistory.slice(-6); // Last 3 exchanges
    recentHistory.forEach(msg => {
      context += `${msg.role}: ${msg.content}\n`;
    });
    
    return context;
  }

  private parseResponse(response: string): {
    response: string;
    suggestedDiagramType?: DiagramType;
    mermaidCode?: string;
    followUpQuestions?: string[];
    phaseTransition?: boolean;
  } {
    let cleanResponse = response;
    let suggestedDiagramType: DiagramType | undefined;
    let followUpQuestions: string[] = [];
    let phaseTransition = false;

    // Extract diagram suggestion
    const diagramMatch = response.match(/DIAGRAM_SUGGESTION:\s*(issue-tree|decision-tree|2x2-matrix|hypothesis-tree)/i);
    if (diagramMatch) {
      suggestedDiagramType = diagramMatch[1] as DiagramType;
      cleanResponse = cleanResponse.replace(diagramMatch[0], '').trim();
    }

    // If no explicit diagram suggestion, but response mentions diagram types, infer the suggestion
    if (!suggestedDiagramType) {
      if (response.toLowerCase().includes('issue tree') || response.toLowerCase().includes('logic tree')) {
        suggestedDiagramType = 'issue-tree';
      } else if (response.toLowerCase().includes('decision tree')) {
        suggestedDiagramType = 'decision-tree';
      } else if (response.toLowerCase().includes('2x2 matrix') || response.toLowerCase().includes('priorit')) {
        suggestedDiagramType = '2x2-matrix';
      } else if (response.toLowerCase().includes('hypothesis') || response.toLowerCase().includes('test')) {
        suggestedDiagramType = 'hypothesis-tree';
      }
    }

    // Extract Mermaid code blocks
    const mermaidMatches = response.match(/```mermaid\n([\s\S]*?)\n```/g);
    let extractedMermaidCode: string | undefined;
    if (mermaidMatches && mermaidMatches.length > 0) {
      // Get the last (most recent) mermaid block
      const lastMatch = mermaidMatches[mermaidMatches.length - 1];
      extractedMermaidCode = lastMatch.replace(/```mermaid\n/, '').replace(/\n```$/, '');
      
      // Remove mermaid blocks from clean response to avoid duplication
      mermaidMatches.forEach(match => {
        cleanResponse = cleanResponse.replace(match, '[Diagram generated in Mermaid panel]');
      });
    }

    // Extract follow-up questions (lines starting with "- " or numbered)
    const questionMatches = response.match(/(?:^|\n)(?:\d+\.|[-*])\s*([^?\n]*\?)/gm);
    if (questionMatches) {
      followUpQuestions = questionMatches.map((q: string) => 
        q.replace(/^(?:\n)?(?:\d+\.|[-*])\s*/, '').trim()
      );
    }

    // Check for phase transitions
    if (response.toLowerCase().includes('move to') || 
        response.toLowerCase().includes('transition to') ||
        response.toLowerCase().includes('next phase')) {
      phaseTransition = true;
    }

    // Use extracted Mermaid code if available, otherwise generate sample
    let mermaidCode: string | undefined;
    if (extractedMermaidCode) {
      mermaidCode = extractedMermaidCode;
    } else if (suggestedDiagramType) {
      mermaidCode = this.generateSampleDiagram(suggestedDiagramType);
    }

    return {
      response: cleanResponse,
      suggestedDiagramType,
      mermaidCode,
      followUpQuestions,
      phaseTransition
    };
  }

  private generateSampleDiagram(type: DiagramType): string {
    try {
      const diagram = createDiagram(type, { title: this.context.problemStatement });

      switch (type) {
        case 'issue-tree':
          if (this.context.problemStatement) {
            (diagram as any).buildFromProblemStatement(
              this.context.problemStatement,
              ['Sub-issue 1', 'Sub-issue 2', 'Sub-issue 3']
            );
          }
          break;

        case '2x2-matrix':
          (diagram as any).setXAxis('Impact', 'Low Impact', 'High Impact');
          (diagram as any).setYAxis('Effort', 'Low Effort', 'High Effort');
          (diagram as any).addItem('item1', 'Quick Win', 0.8, 0.2);
          (diagram as any).addItem('item2', 'Major Project', 0.9, 0.9);
          break;

        case 'decision-tree':
          (diagram as any).addDecisionNode('root', 'Decision Point');
          (diagram as any).addChanceNode('option1', 'Option A', 'root', 0.6);
          (diagram as any).addChanceNode('option2', 'Option B', 'root', 0.4);
          break;

        case 'hypothesis-tree':
          (diagram as any).addPrimaryHypothesis('h1', 'Primary Hypothesis');
          (diagram as any).addSupportingHypothesis('h1a', 'Supporting Hypothesis A', 'h1');
          break;
      }

      return diagram.generateMermaidCode();
    } catch (error) {
      console.error('Error generating sample diagram:', error);
      return 'graph TD\n    A[Diagram will be generated here]';
    }
  }

  private updateContext(parsed: any): void {
    // Update problem statement if identified
    const response = parsed.response.toLowerCase();
    if (response.includes('problem is') || response.includes('issue is')) {
      // Simple extraction - can be made more sophisticated
      const sentences = parsed.response.split('.');
      const problemSentence = sentences.find((s: string) => 
        s.toLowerCase().includes('problem is') || 
        s.toLowerCase().includes('issue is')
      );
      if (problemSentence && !this.context.problemStatement) {
        this.context.problemStatement = problemSentence.trim();
      }
    }

    // Update phase based on conversation progress
    if (parsed.phaseTransition) {
      const phases: (typeof this.context.currentPhase)[] = [
        'problem-definition', 'structuring', 'analysis', 'synthesis'
      ];
      const currentIndex = phases.indexOf(this.context.currentPhase);
      if (currentIndex < phases.length - 1) {
        this.context.currentPhase = phases[currentIndex + 1];
      }
    }

    // Store suggested diagram type
    if (parsed.suggestedDiagramType) {
      this.context.suggestedDiagramType = parsed.suggestedDiagramType;
    }
  }

  getContext(): ProblemSolvingContext {
    return { ...this.context };
  }

  resetContext(): void {
    this.context = {
      currentPhase: 'problem-definition',
      conversationHistory: []
    };
  }

  loadConversationHistory(messages: Array<{ role: 'user' | 'assistant'; content: string }>): void {
    // Load existing conversation history
    this.context.conversationHistory = messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
    
    // Analyze conversation to determine current phase and context
    this.analyzeConversationContext();
  }

  private analyzeConversationContext(): void {
    const conversation = this.context.conversationHistory;
    if (conversation.length === 0) return;
    
    // Extract problem statement from conversation
    for (const message of conversation) {
      if (message.role === 'user' && !this.context.problemStatement) {
        // Look for the first substantial user message as potential problem statement
        if (message.content.length > 50) {
          this.context.problemStatement = message.content;
          break;
        }
      }
    }
    
    // Determine current phase based on conversation content
    const fullConversation = conversation.map(m => m.content).join(' ').toLowerCase();
    
    if (fullConversation.includes('recommendation') || fullConversation.includes('solution')) {
      this.context.currentPhase = 'synthesis';
    } else if (fullConversation.includes('analysis') || fullConversation.includes('data') || fullConversation.includes('evidence')) {
      this.context.currentPhase = 'analysis';
    } else if (fullConversation.includes('structure') || fullConversation.includes('tree') || fullConversation.includes('matrix')) {
      this.context.currentPhase = 'structuring';
    } else {
      this.context.currentPhase = 'problem-definition';
    }
  }

  // Generate initial conversation starter
  getInitialMessage(): string {
    return `Welcome! I'm your McKinsey-trained problem-solving partner. I'll guide you through a structured approach to tackle your challenge using proven frameworks.

Let's start with the fundamentals: **What specific problem or decision are you trying to solve?**

Please be as concrete as possible - avoid general statements like "improve performance" and instead describe the specific situation, stakeholders involved, and why this matters now.

Once you share your problem, I'll help you structure it visually using appropriate diagrams like issue trees, decision frameworks, or prioritization matrices.`;
  }
}