import { BaseDiagram, type DiagramNode, type DiagramConfig } from './BaseDiagram';

export interface DecisionTreeNode extends DiagramNode {
  nodeType: 'decision' | 'chance' | 'outcome';
  probability?: number;
  value?: number;
  expectedValue?: number;
}

export class DecisionTree extends BaseDiagram {
  constructor(config: DiagramConfig = {}) {
    super(config);
  }

  getType(): string {
    return 'Decision Tree';
  }

  addDecisionNode(
    id: string,
    label: string,
    parentId?: string,
    probability?: number
  ): void {
    const node: DecisionTreeNode = {
      id,
      label,
      parent: parentId,
      nodeType: 'decision',
      probability,
      children: []
    };

    if (parentId) {
      const parent = this.nodes.get(parentId) as DecisionTreeNode;
      if (parent) {
        if (!parent.children) parent.children = [];
        parent.children.push(id);
      }
    }

    this.addNode(node);
  }

  addChanceNode(
    id: string,
    label: string,
    parentId: string,
    probability: number
  ): void {
    const node: DecisionTreeNode = {
      id,
      label,
      parent: parentId,
      nodeType: 'chance',
      probability,
      children: []
    };

    const parent = this.nodes.get(parentId) as DecisionTreeNode;
    if (parent) {
      if (!parent.children) parent.children = [];
      parent.children.push(id);
    }

    this.addNode(node);
  }

  addOutcomeNode(
    id: string,
    label: string,
    parentId: string,
    value: number,
    probability?: number
  ): void {
    const node: DecisionTreeNode = {
      id,
      label,
      parent: parentId,
      nodeType: 'outcome',
      value,
      probability,
      children: []
    };

    const parent = this.nodes.get(parentId) as DecisionTreeNode;
    if (parent) {
      if (!parent.children) parent.children = [];
      parent.children.push(id);
    }

    this.addNode(node);
  }

  calculateExpectedValues(): void {
    const nodes = Array.from(this.nodes.values()) as DecisionTreeNode[];
    
    // Calculate from leaf nodes up
    const processedNodes = new Set<string>();
    
    const calculateNode = (nodeId: string): number => {
      if (processedNodes.has(nodeId)) {
        const node = this.nodes.get(nodeId) as DecisionTreeNode;
        return node.expectedValue || 0;
      }

      const node = this.nodes.get(nodeId) as DecisionTreeNode;
      if (!node) return 0;

      if (node.nodeType === 'outcome') {
        node.expectedValue = node.value || 0;
      } else if (node.children && node.children.length > 0) {
        if (node.nodeType === 'decision') {
          // For decision nodes, take the maximum expected value
          node.expectedValue = Math.max(
            ...node.children.map(childId => calculateNode(childId))
          );
        } else if (node.nodeType === 'chance') {
          // For chance nodes, calculate weighted average
          let totalExpectedValue = 0;
          node.children.forEach(childId => {
            const child = this.nodes.get(childId) as DecisionTreeNode;
            const childEV = calculateNode(childId);
            const prob = child.probability || (1 / node.children!.length);
            totalExpectedValue += childEV * prob;
          });
          node.expectedValue = totalExpectedValue;
        }
      } else {
        node.expectedValue = node.value || 0;
      }

      processedNodes.add(nodeId);
      return node.expectedValue || 0;
    };

    // Calculate for all root nodes
    nodes.filter(n => !n.parent).forEach(root => {
      calculateNode(root.id);
    });
  }

  generateMermaidCode(): string {
    const nodes = Array.from(this.nodes.values()) as DecisionTreeNode[];
    if (nodes.length === 0) return '';

    // Calculate expected values first
    this.calculateExpectedValues();

    let mermaid = `graph ${this.config.direction || 'LR'}\n`;

    // Style definitions
    mermaid += `    classDef decision fill:#e3f2fd,stroke:#1976d2,stroke-width:2px\n`;
    mermaid += `    classDef chance fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px\n`;
    mermaid += `    classDef outcome fill:#e8f5e8,stroke:#388e3c,stroke-width:2px\n`;

    // Add nodes
    nodes.forEach(node => {
      const nodeId = this.formatNodeId(node.id);
      let label = this.sanitizeLabel(node.label);
      
      // Add probability and/or expected value to label
      if (node.probability !== undefined) {
        label += `\\n(${(node.probability * 100).toFixed(1)}%)`;
      }
      if (node.expectedValue !== undefined) {
        label += `\\nEV: ${node.expectedValue.toFixed(2)}`;
      }
      if (node.value !== undefined) {
        label += `\\nValue: ${node.value}`;
      }

      // Use different shapes for different node types
      if (node.nodeType === 'decision') {
        mermaid += `    ${nodeId}[${label}]:::decision\n`;
      } else if (node.nodeType === 'chance') {
        mermaid += `    ${nodeId}{${label}}:::chance\n`;
      } else {
        mermaid += `    ${nodeId}((${label})):::outcome\n`;
      }
    });

    // Add connections with probability labels
    nodes.forEach(node => {
      if (node.children && node.children.length > 0) {
        node.children.forEach(childId => {
          const child = this.nodes.get(childId) as DecisionTreeNode;
          const parentId = this.formatNodeId(node.id);
          const childNodeId = this.formatNodeId(childId);
          
          if (child.probability !== undefined) {
            const probLabel = `${(child.probability * 100).toFixed(1)}%`;
            mermaid += `    ${parentId} -->|${probLabel}| ${childNodeId}\n`;
          } else {
            mermaid += `    ${parentId} --> ${childNodeId}\n`;
          }
        });
      }
    });

    return mermaid;
  }

  // Helper method to validate probabilities sum to 1 for chance nodes
  validateProbabilities(): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];
    const nodes = Array.from(this.nodes.values()) as DecisionTreeNode[];

    const chanceNodes = nodes.filter(n => n.nodeType === 'chance' && n.children && n.children.length > 0);

    chanceNodes.forEach(node => {
      if (node.children) {
        const totalProbability = node.children.reduce((sum, childId) => {
          const child = this.nodes.get(childId) as DecisionTreeNode;
          return sum + (child.probability || 0);
        }, 0);

        if (Math.abs(totalProbability - 1) > 0.01) {
          issues.push(`Node "${node.label}" has children with probabilities summing to ${totalProbability.toFixed(2)}, should be 1.0`);
        }
      }
    });

    return {
      isValid: issues.length === 0,
      issues
    };
  }
}