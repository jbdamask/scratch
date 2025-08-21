export interface DiagramNode {
  id: string;
  label: string;
  parent?: string;
  children?: string[];
  metadata?: Record<string, any>;
}

export interface DiagramConfig {
  title?: string;
  theme?: 'light' | 'dark';
  direction?: 'TB' | 'BT' | 'LR' | 'RL';
}

export abstract class BaseDiagram {
  protected nodes: Map<string, DiagramNode> = new Map();
  protected config: DiagramConfig;

  constructor(config: DiagramConfig = {}) {
    this.config = {
      theme: 'light',
      direction: 'TB',
      ...config
    };
  }

  abstract getType(): string;
  abstract generateMermaidCode(): string;

  addNode(node: DiagramNode): void {
    this.nodes.set(node.id, node);
  }

  removeNode(nodeId: string): void {
    const node = this.nodes.get(nodeId);
    if (node) {
      // Remove from parent's children
      if (node.parent) {
        const parent = this.nodes.get(node.parent);
        if (parent && parent.children) {
          parent.children = parent.children.filter(id => id !== nodeId);
        }
      }

      // Remove children
      if (node.children) {
        node.children.forEach(childId => this.removeNode(childId));
      }

      this.nodes.delete(nodeId);
    }
  }

  updateNode(nodeId: string, updates: Partial<DiagramNode>): void {
    const node = this.nodes.get(nodeId);
    if (node) {
      Object.assign(node, updates);
    }
  }

  getNode(nodeId: string): DiagramNode | undefined {
    return this.nodes.get(nodeId);
  }

  getAllNodes(): DiagramNode[] {
    return Array.from(this.nodes.values());
  }

  clear(): void {
    this.nodes.clear();
  }

  updateConfig(config: Partial<DiagramConfig>): void {
    this.config = { ...this.config, ...config };
  }

  protected sanitizeLabel(label: string): string {
    return label.replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ').trim();
  }

  protected formatNodeId(id: string): string {
    return id.replace(/[^\w]/g, '_');
  }
}