import { BaseDiagram, type DiagramNode, type DiagramConfig } from './BaseDiagram';

export interface HypothesisNode extends DiagramNode {
  hypothesisType: 'primary' | 'supporting' | 'evidence';
  status: 'unproven' | 'proven' | 'disproven' | 'partially-proven';
  confidence?: number; // 0-1 scale
  priority?: 'high' | 'medium' | 'low';
  source?: string;
  testMethod?: string;
}

export class HypothesisTree extends BaseDiagram {
  constructor(config: DiagramConfig = {}) {
    super(config);
  }

  getType(): string {
    return 'Hypothesis Tree';
  }

  addPrimaryHypothesis(
    id: string,
    label: string,
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): void {
    const node: HypothesisNode = {
      id,
      label,
      hypothesisType: 'primary',
      status: 'unproven',
      priority,
      children: []
    };

    this.addNode(node);
  }

  addSupportingHypothesis(
    id: string,
    label: string,
    parentId: string,
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): void {
    const node: HypothesisNode = {
      id,
      label,
      parent: parentId,
      hypothesisType: 'supporting',
      status: 'unproven',
      priority,
      children: []
    };

    const parent = this.nodes.get(parentId) as HypothesisNode;
    if (parent) {
      if (!parent.children) parent.children = [];
      parent.children.push(id);
    }

    this.addNode(node);
  }

  addEvidence(
    id: string,
    label: string,
    parentId: string,
    status: 'proven' | 'disproven' | 'partially-proven',
    confidence: number = 1.0,
    source?: string,
    testMethod?: string
  ): void {
    const node: HypothesisNode = {
      id,
      label,
      parent: parentId,
      hypothesisType: 'evidence',
      status,
      confidence: Math.max(0, Math.min(1, confidence)),
      source,
      testMethod,
      children: []
    };

    const parent = this.nodes.get(parentId) as HypothesisNode;
    if (parent) {
      if (!parent.children) parent.children = [];
      parent.children.push(id);
    }

    this.addNode(node);
    this.updateHypothesisStatus(parentId);
  }

  updateHypothesisStatus(hypothesisId: string): void {
    const hypothesis = this.nodes.get(hypothesisId) as HypothesisNode;
    if (!hypothesis || hypothesis.hypothesisType === 'evidence') return;

    if (!hypothesis.children || hypothesis.children.length === 0) {
      hypothesis.status = 'unproven';
      return;
    }

    const evidenceNodes = hypothesis.children
      .map(childId => this.nodes.get(childId) as HypothesisNode)
      .filter(child => child && child.hypothesisType === 'evidence');

    if (evidenceNodes.length === 0) {
      hypothesis.status = 'unproven';
      return;
    }

    const provenCount = evidenceNodes.filter(e => e.status === 'proven').length;
    const disprovenCount = evidenceNodes.filter(e => e.status === 'disproven').length;
    const totalCount = evidenceNodes.length;

    if (provenCount === totalCount) {
      hypothesis.status = 'proven';
    } else if (disprovenCount === totalCount) {
      hypothesis.status = 'disproven';
    } else if (provenCount > 0) {
      hypothesis.status = 'partially-proven';
    } else {
      hypothesis.status = 'unproven';
    }

    // Calculate confidence as weighted average
    const totalConfidence = evidenceNodes.reduce((sum, evidence) => {
      const weight = evidence.status === 'proven' ? 1 : 
                    evidence.status === 'partially-proven' ? 0.5 : 0;
      return sum + (evidence.confidence || 0) * weight;
    }, 0);

    const maxPossibleConfidence = evidenceNodes.filter(e => 
      e.status === 'proven' || e.status === 'partially-proven'
    ).length;

    hypothesis.confidence = maxPossibleConfidence > 0 ? 
      totalConfidence / maxPossibleConfidence : 0;

    // Update parent hypothesis if exists
    if (hypothesis.parent) {
      this.updateHypothesisStatus(hypothesis.parent);
    }
  }

  generateMermaidCode(): string {
    const nodes = Array.from(this.nodes.values()) as HypothesisNode[];
    if (nodes.length === 0) return '';

    let mermaid = `graph ${this.config.direction || 'TB'}\n`;

    // Add title if configured
    if (this.config.title) {
      mermaid += `    title["${this.config.title}"]\n`;
    }

    // Style definitions
    mermaid += `    classDef primary fill:#e3f2fd,stroke:#1565c0,stroke-width:3px\n`;
    mermaid += `    classDef supporting fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px\n`;
    mermaid += `    classDef evidenceProven fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px\n`;
    mermaid += `    classDef evidenceDisproven fill:#ffebee,stroke:#c62828,stroke-width:2px\n`;
    mermaid += `    classDef evidencePartial fill:#fff3e0,stroke:#f57c00,stroke-width:2px\n`;
    mermaid += `    classDef unproven fill:#f5f5f5,stroke:#757575,stroke-width:2px,stroke-dasharray: 5 5\n`;

    // Add nodes
    nodes.forEach(node => {
      const nodeId = this.formatNodeId(node.id);
      let label = this.sanitizeLabel(node.label);
      
      // Add status and confidence to label
      if (node.confidence !== undefined) {
        label += `\\n(${(node.confidence * 100).toFixed(0)}% confidence)`;
      }
      
      if (node.priority) {
        label += `\\n[${node.priority} priority]`;
      }

      if (node.source) {
        label += `\\nSource: ${node.source}`;
      }

      // Choose shape based on type
      if (node.hypothesisType === 'primary') {
        mermaid += `    ${nodeId}["${label}"]:::primary\n`;
      } else if (node.hypothesisType === 'supporting') {
        mermaid += `    ${nodeId}["${label}"]:::supporting\n`;
      } else { // evidence
        if (node.status === 'proven') {
          mermaid += `    ${nodeId}(["${label}"]):::evidenceProven\n`;
        } else if (node.status === 'disproven') {
          mermaid += `    ${nodeId}(["${label}"]):::evidenceDisproven\n`;
        } else if (node.status === 'partially-proven') {
          mermaid += `    ${nodeId}(["${label}"]):::evidencePartial\n`;
        } else {
          mermaid += `    ${nodeId}(["${label}"]):::unproven\n`;
        }
      }

      // Apply unproven style to hypotheses that are unproven
      if ((node.hypothesisType === 'primary' || node.hypothesisType === 'supporting') && 
          node.status === 'unproven') {
        mermaid += `    ${nodeId}:::unproven\n`;
      }
    });

    // Add connections
    nodes.forEach(node => {
      if (node.children && node.children.length > 0) {
        node.children.forEach(childId => {
          const child = this.nodes.get(childId) as HypothesisNode;
          const parentId = this.formatNodeId(node.id);
          const childNodeId = this.formatNodeId(childId);
          
          // Use different arrow types for different relationships
          if (child.hypothesisType === 'evidence') {
            mermaid += `    ${parentId} -.-> ${childNodeId}\n`; // Dotted for evidence
          } else {
            mermaid += `    ${parentId} --> ${childNodeId}\n`; // Solid for supporting hypotheses
          }
        });
      }
    });

    return mermaid;
  }

  // Analysis methods
  getHypothesisStrength(): Record<string, number> {
    const nodes = Array.from(this.nodes.values()) as HypothesisNode[];
    const result: Record<string, number> = {};

    nodes
      .filter(n => n.hypothesisType !== 'evidence')
      .forEach(hypothesis => {
        result[hypothesis.label] = hypothesis.confidence || 0;
      });

    return result;
  }

  getTestingGaps(): HypothesisNode[] {
    const nodes = Array.from(this.nodes.values()) as HypothesisNode[];
    
    return nodes.filter(node => 
      (node.hypothesisType === 'primary' || node.hypothesisType === 'supporting') &&
      node.status === 'unproven' &&
      (!node.children || node.children.length === 0)
    );
  }

  getPriorityActions(): { hypothesis: string; action: string; priority: string }[] {
    const gaps = this.getTestingGaps();
    
    return gaps.map(gap => ({
      hypothesis: gap.label,
      action: `Develop test for: ${gap.label}`,
      priority: gap.priority || 'medium'
    })).sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority as keyof typeof priorityOrder] - 
             priorityOrder[a.priority as keyof typeof priorityOrder];
    });
  }

  // Common hypothesis tree templates
  static createBusinessCaseTree(config: DiagramConfig = {}): HypothesisTree {
    const tree = new HypothesisTree(config);
    
    tree.addPrimaryHypothesis('market_demand', 'There is sufficient market demand for our solution', 'high');
    tree.addPrimaryHypothesis('competitive_advantage', 'We can achieve sustainable competitive advantage', 'high');
    tree.addPrimaryHypothesis('financial_viability', 'The business model is financially viable', 'high');
    
    return tree;
  }

  static createProblemDiagnosisTree(problemStatement: string, config: DiagramConfig = {}): HypothesisTree {
    const tree = new HypothesisTree(config);
    
    tree.addPrimaryHypothesis('root_cause', `Root cause hypothesis for: ${problemStatement}`, 'high');
    
    return tree;
  }
}