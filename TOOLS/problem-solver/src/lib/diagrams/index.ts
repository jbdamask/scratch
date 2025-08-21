import { IssueTree } from './IssueTree';
import { DecisionTree } from './DecisionTree';
import { TwoByTwoMatrix } from './TwoByTwoMatrix';
import { HypothesisTree } from './HypothesisTree';

export { BaseDiagram } from './BaseDiagram';
export { IssueTree } from './IssueTree';
export { DecisionTree } from './DecisionTree';
export { TwoByTwoMatrix } from './TwoByTwoMatrix';
export { HypothesisTree } from './HypothesisTree';

export type { DiagramNode, DiagramConfig } from './BaseDiagram';
export type { IssueTreeNode } from './IssueTree';
export type { DecisionTreeNode } from './DecisionTree';
export type { MatrixItem, MatrixAxis } from './TwoByTwoMatrix';
export type { HypothesisNode } from './HypothesisTree';

export type DiagramType = 'issue-tree' | 'decision-tree' | '2x2-matrix' | 'hypothesis-tree';

export function createDiagram(type: DiagramType, config?: any) {
  switch (type) {
    case 'issue-tree':
      return new IssueTree(config);
    case 'decision-tree':
      return new DecisionTree(config);
    case '2x2-matrix':
      return new TwoByTwoMatrix(config);
    case 'hypothesis-tree':
      return new HypothesisTree(config);
    default:
      throw new Error(`Unknown diagram type: ${type}`);
  }
}