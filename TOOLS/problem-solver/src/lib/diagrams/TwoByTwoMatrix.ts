import { BaseDiagram, type DiagramConfig } from './BaseDiagram';

export interface MatrixItem {
  id: string;
  label: string;
  x: number; // 0-1 scale for horizontal axis
  y: number; // 0-1 scale for vertical axis
  description?: string;
}

export interface MatrixAxis {
  label: string;
  lowLabel: string;
  highLabel: string;
}

export class TwoByTwoMatrix extends BaseDiagram {
  private items: Map<string, MatrixItem> = new Map();
  private xAxis: MatrixAxis = { label: 'X Axis', lowLabel: 'Low', highLabel: 'High' };
  private yAxis: MatrixAxis = { label: 'Y Axis', lowLabel: 'Low', highLabel: 'High' };

  constructor(config: DiagramConfig = {}) {
    super(config);
  }

  getType(): string {
    return '2x2 Matrix';
  }

  setXAxis(label: string, lowLabel: string, highLabel: string): void {
    this.xAxis = { label, lowLabel, highLabel };
  }

  setYAxis(label: string, lowLabel: string, highLabel: string): void {
    this.yAxis = { label, lowLabel, highLabel };
  }

  addItem(
    id: string,
    label: string,
    x: number,
    y: number,
    description?: string
  ): void {
    // Clamp values between 0 and 1
    x = Math.max(0, Math.min(1, x));
    y = Math.max(0, Math.min(1, y));

    const item: MatrixItem = {
      id,
      label,
      x,
      y,
      description
    };

    this.items.set(id, item);
  }

  removeItem(itemId: string): void {
    this.items.delete(itemId);
  }

  getItem(itemId: string): MatrixItem | undefined {
    return this.items.get(itemId);
  }

  getAllItems(): MatrixItem[] {
    return Array.from(this.items.values());
  }

  getQuadrantItems(quadrant: 1 | 2 | 3 | 4): MatrixItem[] {
    const items = Array.from(this.items.values());
    
    switch (quadrant) {
      case 1: // High X, High Y
        return items.filter(item => item.x >= 0.5 && item.y >= 0.5);
      case 2: // Low X, High Y
        return items.filter(item => item.x < 0.5 && item.y >= 0.5);
      case 3: // Low X, Low Y
        return items.filter(item => item.x < 0.5 && item.y < 0.5);
      case 4: // High X, Low Y
        return items.filter(item => item.x >= 0.5 && item.y < 0.5);
      default:
        return [];
    }
  }

  generateMermaidCode(): string {
    
    let mermaid = `graph TB\n`;
    
    // Add title if configured
    if (this.config.title) {
      mermaid += `    title["${this.config.title}"]\n`;
    }

    // Create quadrants
    mermaid += `    subgraph " "\n`;
    mermaid += `        subgraph Q2["${this.yAxis.highLabel} ${this.yAxis.label}<br/>${this.xAxis.lowLabel} ${this.xAxis.label}"]\n`;
    mermaid += `            direction TB\n`;
    
    const q2Items = this.getQuadrantItems(2);
    if (q2Items.length === 0) {
      mermaid += `            Q2_empty[" "]\n`;
    } else {
      q2Items.forEach(item => {
        const nodeId = this.formatNodeId(`Q2_${item.id}`);
        mermaid += `            ${nodeId}["${this.sanitizeLabel(item.label)}"]\n`;
      });
    }
    
    mermaid += `        end\n`;
    mermaid += `        subgraph Q1["${this.yAxis.highLabel} ${this.yAxis.label}<br/>${this.xAxis.highLabel} ${this.xAxis.label}"]\n`;
    mermaid += `            direction TB\n`;
    
    const q1Items = this.getQuadrantItems(1);
    if (q1Items.length === 0) {
      mermaid += `            Q1_empty[" "]\n`;
    } else {
      q1Items.forEach(item => {
        const nodeId = this.formatNodeId(`Q1_${item.id}`);
        mermaid += `            ${nodeId}["${this.sanitizeLabel(item.label)}"]\n`;
      });
    }
    
    mermaid += `        end\n`;
    mermaid += `    end\n`;
    
    mermaid += `    subgraph " "\n`;
    mermaid += `        subgraph Q3["${this.yAxis.lowLabel} ${this.yAxis.label}<br/>${this.xAxis.lowLabel} ${this.xAxis.label}"]\n`;
    mermaid += `            direction TB\n`;
    
    const q3Items = this.getQuadrantItems(3);
    if (q3Items.length === 0) {
      mermaid += `            Q3_empty[" "]\n`;
    } else {
      q3Items.forEach(item => {
        const nodeId = this.formatNodeId(`Q3_${item.id}`);
        mermaid += `            ${nodeId}["${this.sanitizeLabel(item.label)}"]\n`;
      });
    }
    
    mermaid += `        end\n`;
    mermaid += `        subgraph Q4["${this.yAxis.lowLabel} ${this.yAxis.label}<br/>${this.xAxis.highLabel} ${this.xAxis.label}"]\n`;
    mermaid += `            direction TB\n`;
    
    const q4Items = this.getQuadrantItems(4);
    if (q4Items.length === 0) {
      mermaid += `            Q4_empty[" "]\n`;
    } else {
      q4Items.forEach(item => {
        const nodeId = this.formatNodeId(`Q4_${item.id}`);
        mermaid += `            ${nodeId}["${this.sanitizeLabel(item.label)}"]\n`;
      });
    }
    
    mermaid += `        end\n`;
    mermaid += `    end\n`;

    // Style definitions
    mermaid += `    classDef q1Style fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px\n`;
    mermaid += `    classDef q2Style fill:#fff3e0,stroke:#f57c00,stroke-width:2px\n`;
    mermaid += `    classDef q3Style fill:#ffebee,stroke:#c62828,stroke-width:2px\n`;
    mermaid += `    classDef q4Style fill:#e3f2fd,stroke:#1565c0,stroke-width:2px\n`;
    mermaid += `    classDef emptyStyle fill:#f5f5f5,stroke:#9e9e9e,stroke-width:1px,stroke-dasharray: 5 5\n`;

    // Apply styles
    q1Items.forEach(item => {
      const nodeId = this.formatNodeId(`Q1_${item.id}`);
      mermaid += `    ${nodeId}:::q1Style\n`;
    });
    q2Items.forEach(item => {
      const nodeId = this.formatNodeId(`Q2_${item.id}`);
      mermaid += `    ${nodeId}:::q2Style\n`;
    });
    q3Items.forEach(item => {
      const nodeId = this.formatNodeId(`Q3_${item.id}`);
      mermaid += `    ${nodeId}:::q3Style\n`;
    });
    q4Items.forEach(item => {
      const nodeId = this.formatNodeId(`Q4_${item.id}`);
      mermaid += `    ${nodeId}:::q4Style\n`;
    });

    // Style empty nodes
    if (q1Items.length === 0) mermaid += `    Q1_empty:::emptyStyle\n`;
    if (q2Items.length === 0) mermaid += `    Q2_empty:::emptyStyle\n`;
    if (q3Items.length === 0) mermaid += `    Q3_empty:::emptyStyle\n`;
    if (q4Items.length === 0) mermaid += `    Q4_empty:::emptyStyle\n`;

    return mermaid;
  }

  // Common matrix templates
  static createEffortImpactMatrix(config: DiagramConfig = {}): TwoByTwoMatrix {
    const matrix = new TwoByTwoMatrix(config);
    matrix.setXAxis('Impact', 'Low Impact', 'High Impact');
    matrix.setYAxis('Effort', 'Low Effort', 'High Effort');
    return matrix;
  }

  static createImportanceUrgencyMatrix(config: DiagramConfig = {}): TwoByTwoMatrix {
    const matrix = new TwoByTwoMatrix(config);
    matrix.setXAxis('Urgency', 'Low Urgency', 'High Urgency');
    matrix.setYAxis('Importance', 'Low Importance', 'High Importance');
    return matrix;
  }

  static createRiskRewardMatrix(config: DiagramConfig = {}): TwoByTwoMatrix {
    const matrix = new TwoByTwoMatrix(config);
    matrix.setXAxis('Reward', 'Low Reward', 'High Reward');
    matrix.setYAxis('Risk', 'Low Risk', 'High Risk');
    return matrix;
  }

  // Analysis helpers
  getQuadrantSummary(): Record<string, { count: number; items: string[] }> {
    return {
      'Q1 (High-High)': {
        count: this.getQuadrantItems(1).length,
        items: this.getQuadrantItems(1).map(item => item.label)
      },
      'Q2 (Low-High)': {
        count: this.getQuadrantItems(2).length,
        items: this.getQuadrantItems(2).map(item => item.label)
      },
      'Q3 (Low-Low)': {
        count: this.getQuadrantItems(3).length,
        items: this.getQuadrantItems(3).map(item => item.label)
      },
      'Q4 (High-Low)': {
        count: this.getQuadrantItems(4).length,
        items: this.getQuadrantItems(4).map(item => item.label)
      }
    };
  }
}