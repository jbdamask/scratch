import { Anthropic } from '@anthropic-ai/sdk';
import { chatDb, type Project, type ChatMessage, type DiagramCatalog } from './database';

export interface DocumentSummary {
  executiveSummary: string;
  overview: string;
  keyFindings: string[];
  considerations: string[];
  options: Array<{
    title: string;
    description: string;
    pros: string[];
    cons: string[];
  }>;
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    nextSteps: string[];
  }>;
}

export class DocumentExporter {
  private anthropic: Anthropic;

  constructor(apiKey: string) {
    this.anthropic = new Anthropic({
      apiKey,
      dangerouslyAllowBrowser: true
    });
  }

  async generateProjectSummary(projectId: string): Promise<DocumentSummary> {
    const project = chatDb.getProject(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    const sessions = chatDb.getSessionsByProject(projectId);
    const diagrams = chatDb.getDiagramsByProject(projectId);

    // Collect all conversations
    const allMessages: Array<{ session: string; messages: ChatMessage[] }> = [];
    for (const session of sessions) {
      const messages = chatDb.getMessages(session.id);
      if (messages.length > 0) {
        allMessages.push({ session: session.title, messages });
      }
    }

    // Create conversation context
    const conversationContext = this.buildConversationContext(project, allMessages, diagrams);

    const response = await this.anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      system: this.buildSummarySystemPrompt(),
      messages: [
        {
          role: 'user',
          content: conversationContext
        }
      ]
    });

    const summaryText = response.content[0].type === 'text' ? response.content[0].text : '';
    return this.parseSummaryResponse(summaryText);
  }

  private buildSummarySystemPrompt(): string {
    return `You are an expert management consultant tasked with creating a professional executive summary from project conversations. 

Your role is to analyze the conversations, diagrams, and insights to create a comprehensive business document with the following structure:

**EXECUTIVE_SUMMARY**: A 2-3 paragraph high-level overview for senior leadership
**OVERVIEW**: Detailed background and context (3-4 paragraphs)
**KEY_FINDINGS**: 4-6 bullet points of critical insights discovered
**CONSIDERATIONS**: 3-5 bullet points of important factors to consider
**OPTIONS**: 2-4 strategic options with pros/cons analysis
**RECOMMENDATIONS**: 2-4 prioritized recommendations with next steps

Format your response exactly as follows:
EXECUTIVE_SUMMARY:
[content]

OVERVIEW:
[content]

KEY_FINDINGS:
• [finding 1]
• [finding 2]
...

CONSIDERATIONS:
• [consideration 1]  
• [consideration 2]
...

OPTIONS:
**Option 1: [Title]**
Description: [description]
Pros: • [pro 1] • [pro 2]
Cons: • [con 1] • [con 2]

**Option 2: [Title]**
...

RECOMMENDATIONS:
**HIGH PRIORITY: [Title]**
Description: [description]
Next Steps: • [step 1] • [step 2]

**MEDIUM PRIORITY: [Title]**
...

Be professional, concise, and actionable. Focus on business value and strategic implications.`;
  }

  private buildConversationContext(
    project: Project,
    conversations: Array<{ session: string; messages: ChatMessage[] }>,
    diagrams: DiagramCatalog[]
  ): string {
    let context = `PROJECT: ${project.name}\n`;
    if (project.industry) context += `INDUSTRY: ${project.industry}\n`;
    if (project.description) context += `DESCRIPTION: ${project.description}\n`;
    
    context += `\n=== CONVERSATIONS ===\n`;
    
    conversations.forEach(({ session, messages }) => {
      context += `\n--- Session: ${session} ---\n`;
      messages.forEach(msg => {
        const role = msg.role === 'user' ? 'USER' : 'CONSULTANT';
        context += `${role}: ${msg.content}\n\n`;
      });
    });

    if (diagrams.length > 0) {
      context += `\n=== DIAGRAMS CREATED ===\n`;
      diagrams.forEach(diagram => {
        context += `- ${diagram.title} (${diagram.diagram_type})\n`;
        if (diagram.description) {
          context += `  Description: ${diagram.description}\n`;
        }
      });
    }

    return context;
  }

  private parseSummaryResponse(response: string): DocumentSummary {
    const sections = {
      executiveSummary: '',
      overview: '',
      keyFindings: [] as string[],
      considerations: [] as string[],
      options: [] as Array<{ title: string; description: string; pros: string[]; cons: string[] }>,
      recommendations: [] as Array<{ priority: 'high' | 'medium' | 'low'; title: string; description: string; nextSteps: string[] }>
    };

    // Extract Executive Summary
    const execMatch = response.match(/EXECUTIVE_SUMMARY:(.*?)(?=OVERVIEW:|$)/s);
    if (execMatch) {
      sections.executiveSummary = execMatch[1].trim();
    }

    // Extract Overview
    const overviewMatch = response.match(/OVERVIEW:(.*?)(?=KEY_FINDINGS:|$)/s);
    if (overviewMatch) {
      sections.overview = overviewMatch[1].trim();
    }

    // Extract Key Findings
    const findingsMatch = response.match(/KEY_FINDINGS:(.*?)(?=CONSIDERATIONS:|$)/s);
    if (findingsMatch) {
      const findings = findingsMatch[1].match(/•\s*(.+)/g);
      if (findings) {
        sections.keyFindings = findings.map(f => f.replace(/•\s*/, '').trim());
      }
    }

    // Extract Considerations
    const considerationsMatch = response.match(/CONSIDERATIONS:(.*?)(?=OPTIONS:|$)/s);
    if (considerationsMatch) {
      const considerations = considerationsMatch[1].match(/•\s*(.+)/g);
      if (considerations) {
        sections.considerations = considerations.map(c => c.replace(/•\s*/, '').trim());
      }
    }

    // Extract Options
    const optionsMatch = response.match(/OPTIONS:(.*?)(?=RECOMMENDATIONS:|$)/s);
    if (optionsMatch) {
      const optionBlocks = optionsMatch[1].match(/\*\*Option \d+:([^*]+)\*\*\s*Description:\s*([^P]*)\s*Pros:\s*([^C]*)\s*Cons:\s*([^*]*)/g);
      if (optionBlocks) {
        optionBlocks.forEach(block => {
          const match = block.match(/\*\*Option \d+:\s*([^*]+)\*\*\s*Description:\s*([^P]*)\s*Pros:\s*([^C]*)\s*Cons:\s*([^*]*)/s);
          if (match) {
            const title = match[1].trim();
            const description = match[2].trim();
            const prosText = match[3].trim();
            const consText = match[4].trim();
            
            const pros = prosText.match(/•\s*([^•]+)/g)?.map(p => p.replace(/•\s*/, '').trim()) || [];
            const cons = consText.match(/•\s*([^•]+)/g)?.map(c => c.replace(/•\s*/, '').trim()) || [];
            
            sections.options.push({ title, description, pros, cons });
          }
        });
      }
    }

    // Extract Recommendations
    const recsMatch = response.match(/RECOMMENDATIONS:(.*?)$/s);
    if (recsMatch) {
      const recBlocks = recsMatch[1].match(/\*\*(HIGH|MEDIUM|LOW) PRIORITY:\s*([^*]+)\*\*\s*Description:\s*([^N]*)\s*Next Steps:\s*([^*]*)/g);
      if (recBlocks) {
        recBlocks.forEach(block => {
          const match = block.match(/\*\*(HIGH|MEDIUM|LOW) PRIORITY:\s*([^*]+)\*\*\s*Description:\s*([^N]*)\s*Next Steps:\s*([^*]*)/s);
          if (match) {
            const priority = match[1].toLowerCase() as 'high' | 'medium' | 'low';
            const title = match[2].trim();
            const description = match[3].trim();
            const stepsText = match[4].trim();
            
            const nextSteps = stepsText.match(/•\s*([^•]+)/g)?.map(s => s.replace(/•\s*/, '').trim()) || [];
            
            sections.recommendations.push({ priority, title, description, nextSteps });
          }
        });
      }
    }

    return sections;
  }

  generateMarkdownReport(project: Project, summary: DocumentSummary, diagrams: DiagramCatalog[]): string {
    const date = new Date().toLocaleDateString();
    
    let markdown = `# ${project.name} - Executive Summary\n\n`;
    markdown += `**Date:** ${date}\n`;
    if (project.industry) markdown += `**Industry:** ${project.industry}\n`;
    markdown += `**Status:** ${project.status}\n\n`;

    if (project.description) {
      markdown += `**Project Description:** ${project.description}\n\n`;
    }

    markdown += `---\n\n`;

    // Executive Summary
    markdown += `## Executive Summary\n\n${summary.executiveSummary}\n\n`;

    // Overview
    markdown += `## Overview\n\n${summary.overview}\n\n`;

    // Key Findings
    if (summary.keyFindings.length > 0) {
      markdown += `## Key Findings\n\n`;
      summary.keyFindings.forEach(finding => {
        markdown += `- ${finding}\n`;
      });
      markdown += `\n`;
    }

    // Considerations
    if (summary.considerations.length > 0) {
      markdown += `## Key Considerations\n\n`;
      summary.considerations.forEach(consideration => {
        markdown += `- ${consideration}\n`;
      });
      markdown += `\n`;
    }

    // Options
    if (summary.options.length > 0) {
      markdown += `## Strategic Options\n\n`;
      summary.options.forEach((option, index) => {
        markdown += `### Option ${index + 1}: ${option.title}\n\n`;
        markdown += `${option.description}\n\n`;
        
        if (option.pros.length > 0) {
          markdown += `**Advantages:**\n`;
          option.pros.forEach(pro => markdown += `- ${pro}\n`);
          markdown += `\n`;
        }
        
        if (option.cons.length > 0) {
          markdown += `**Disadvantages:**\n`;
          option.cons.forEach(con => markdown += `- ${con}\n`);
          markdown += `\n`;
        }
      });
    }

    // Recommendations
    if (summary.recommendations.length > 0) {
      markdown += `## Recommendations\n\n`;
      
      const priorities = ['high', 'medium', 'low'] as const;
      priorities.forEach(priority => {
        const recs = summary.recommendations.filter(r => r.priority === priority);
        if (recs.length > 0) {
          markdown += `### ${priority.charAt(0).toUpperCase() + priority.slice(1)} Priority\n\n`;
          recs.forEach(rec => {
            markdown += `#### ${rec.title}\n\n`;
            markdown += `${rec.description}\n\n`;
            if (rec.nextSteps.length > 0) {
              markdown += `**Next Steps:**\n`;
              rec.nextSteps.forEach(step => markdown += `- ${step}\n`);
              markdown += `\n`;
            }
          });
        }
      });
    }

    // Diagrams Section
    if (diagrams.length > 0) {
      markdown += `## Supporting Diagrams\n\n`;
      diagrams.forEach((diagram, index) => {
        markdown += `### ${index + 1}. ${diagram.title}\n\n`;
        if (diagram.description) {
          markdown += `${diagram.description}\n\n`;
        }
        markdown += `**Type:** ${diagram.diagram_type}\n\n`;
        markdown += `\`\`\`mermaid\n${diagram.mermaid_code}\n\`\`\`\n\n`;
      });
    }

    // Footer
    markdown += `---\n\n`;
    markdown += `*This document was generated using McKinsey Problem Solver AI Assistant*\n`;
    markdown += `*Generated on: ${new Date().toLocaleString()}*`;

    return markdown;
  }

  downloadMarkdown(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}