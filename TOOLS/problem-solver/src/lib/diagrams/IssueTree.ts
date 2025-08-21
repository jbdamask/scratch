import { BaseDiagram, type DiagramNode, type DiagramConfig } from './BaseDiagram';

export interface IssueTreeNode extends DiagramNode {
  level: number;
  isRoot?: boolean;
  isMECE?: boolean; // Mutually Exclusive, Collectively Exhaustive
}

export class IssueTree extends BaseDiagram {
  constructor(config: DiagramConfig = {}) {
    super(config);
  }

  getType(): string {
    return 'Issue Tree';
  }

  addIssue(
    id: string,
    label: string,
    parentId?: string,
    level: number = 0,
    isMECE: boolean = true
  ): void {
    const node: IssueTreeNode = {
      id,
      label,
      parent: parentId,
      level,
      isRoot: !parentId,
      isMECE,
      children: []
    };

    // Add to parent's children if parent exists
    if (parentId) {
      const parent = this.nodes.get(parentId) as IssueTreeNode;
      if (parent) {
        if (!parent.children) parent.children = [];
        parent.children.push(id);
        node.level = parent.level + 1;
      }
    }

    this.addNode(node);
  }

  generateMermaidCode(): string {
    const nodes = Array.from(this.nodes.values()) as IssueTreeNode[];
    if (nodes.length === 0) return '';

    const rootNodes = nodes.filter(n => n.isRoot);
    if (rootNodes.length === 0) return '';

    let mermaid = `graph ${this.config.direction || 'TB'}\n`;
    
    // Add title if configured
    if (this.config.title) {
      mermaid += `    title["${this.config.title}"]\n`;
    }

    // Style definitions
    mermaid += `    classDef rootNode fill:#e1f5fe,stroke:#01579b,stroke-width:3px\n`;
    mermaid += `    classDef level1 fill:#f3e5f5,stroke:#4a148c,stroke-width:2px\n`;
    mermaid += `    classDef level2 fill:#e8f5e8,stroke:#1b5e20,stroke-width:2px\n`;
    mermaid += `    classDef level3 fill:#fff3e0,stroke:#e65100,stroke-width:2px\n`;

    // Add nodes
    nodes.forEach(node => {
      const nodeId = this.formatNodeId(node.id);
      const label = this.sanitizeLabel(node.label);
      
      if (node.isRoot) {
        mermaid += `    ${nodeId}["${label}"]:::rootNode\n`;
      } else {
        const levelClass = `level${Math.min(node.level, 3)}`;
        mermaid += `    ${nodeId}["${label}"]:::${levelClass}\n`;
      }
    });

    // Add connections
    nodes.forEach(node => {
      if (node.children && node.children.length > 0) {
        node.children.forEach(childId => {
          const parentId = this.formatNodeId(node.id);
          const childNodeId = this.formatNodeId(childId);
          mermaid += `    ${parentId} --> ${childNodeId}\n`;
        });
      }
    });

    return mermaid;
  }

  // Helper method to build a complete issue tree from a problem statement
  buildFromProblemStatement(
    problemStatement: string,
    subIssues: string[] = []
  ): void {
    this.clear();
    
    // Add root problem
    this.addIssue('root', problemStatement, undefined, 0);

    // Add sub-issues
    subIssues.forEach((issue, index) => {
      this.addIssue(`sub_${index}`, issue, 'root', 1);
    });
  }

  // Validate MECE principle
  validateMECE(): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];
    const nodes = Array.from(this.nodes.values()) as IssueTreeNode[];

    // Check each parent node
    const parentNodes = nodes.filter(n => n.children && n.children.length > 0);
    
    parentNodes.forEach(parent => {
      if (parent.children && parent.children.length > 1) {
        // Check for potential overlaps (basic text similarity check)
        const childLabels = parent.children
          .map(id => this.nodes.get(id)?.label || '')
          .filter(label => label.length > 0);

        // Simple overlap detection - can be enhanced
        for (let i = 0; i < childLabels.length; i++) {
          for (let j = i + 1; j < childLabels.length; j++) {
            const similarity = this.calculateSimilarity(childLabels[i], childLabels[j]);
            if (similarity > 0.7) {
              issues.push(`Potential overlap between "${childLabels[i]}" and "${childLabels[j]}"`);
            }
          }
        }
      }
    });

    return {
      isValid: issues.length === 0,
      issues
    };
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const words1 = str1.toLowerCase().split(/\s+/);
    const words2 = str2.toLowerCase().split(/\s+/);
    const intersection = words1.filter(word => words2.includes(word));
    const union = [...new Set([...words1, ...words2])];
    
    return intersection.length / union.length;
  }
}