import { Position, type Node } from "@xyflow/react";
import type { FlowCodeGraphNodeData } from "@/components/graph/CodeGraphNode";
import { getNodeMetadata, type ArchitectureNode } from "@/lib/graphUtils";
import type { CodeGraphEdge, CodeGraphNode as CodeGraphNodeRecord } from "@/types/graph";

export const NODE_WIDTH = 168;
export const NODE_HEIGHT = 64;
const HORIZONTAL_GAP = 28;
const VERTICAL_GAP = 96;

/**
 * Computes a clean, Figma-matched hierarchical layout for CodeGraph AI:
 * PROJECT
 *    ↓
 * FOLDERS
 *    ↓
 * FILES (when expanded)
 *    ↓
 * FUNCTIONS / METHODS (when expanded)
 */
export function computeHierarchicalLayout(
  inputNodes: (CodeGraphNodeRecord | ArchitectureNode)[],
  inputEdges: CodeGraphEdge[],
  nodesById: Map<string, CodeGraphNodeRecord>,
  focusNodeId: string | null = null,
  isFocused: boolean = false,
  expandedNodeIds: Set<string> = new Set(),
  onToggleExpand?: (nodeId: string) => void
): Node<FlowCodeGraphNodeData>[] {
  if (!inputNodes.length) return [];

  const nodeMap = new Map(inputNodes.map((n) => [n.id, n]));
  const edgeSet = inputEdges.filter(
    (e) => nodeMap.has(e.source) && nodeMap.has(e.target)
  );

  // Focus mode layout
  if (isFocused && focusNodeId && nodeMap.has(focusNodeId)) {
    return computeFocusNeighborhoodLayout(
      focusNodeId,
      inputNodes,
      edgeSet,
      nodesById,
      expandedNodeIds,
      onToggleExpand
    );
  }

  // 1. Group nodes by hierarchy levels
  const projectNodes = inputNodes.filter((n) => n.type === "project");
  const moduleNodes = inputNodes.filter((n) => n.type === "module");

  // Map parent -> children in visible graph
  const childrenByParent = new Map<string, string[]>();
  const parentByChild = new Map<string, string>();

  edgeSet.forEach((edge) => {
    if (
      edge.type === "CONTAINS" ||
      edge.type === "DECLARES" ||
      edge.type === "HAS_METHOD"
    ) {
      if (!childrenByParent.has(edge.source)) {
        childrenByParent.set(edge.source, []);
      }
      const children = childrenByParent.get(edge.source)!;
      if (!children.includes(edge.target)) {
        children.push(edge.target);
      }
      parentByChild.set(edge.target, edge.source);
    }
  });

  const positions = new Map<string, { x: number; y: number }>();

  // Helper to layout entities belonging to a file
  const layoutFileSubtree = (
    fileNode: CodeGraphNodeRecord,
    baseY: number
  ): { width: number; height: number; filePos: { x: number; y: number } } => {
    const childEntityIds = childrenByParent.get(fileNode.id) ?? [];
    const visibleEntities = childEntityIds
      .map((id) => nodeMap.get(id))
      .filter((n): n is CodeGraphNodeRecord => Boolean(n));

    if (visibleEntities.length === 0) {
      return {
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        filePos: { x: 0, y: baseY },
      };
    }

    // Wrap functions into rows (max 3 per row for compact appearance)
    const MAX_ENTITIES_PER_ROW = 3;
    const cols = Math.min(MAX_ENTITIES_PER_ROW, visibleEntities.length);
    const rows = Math.ceil(visibleEntities.length / cols);
    const entitiesWidth = cols * (NODE_WIDTH + HORIZONTAL_GAP) - HORIZONTAL_GAP;
    const subtreeWidth = Math.max(NODE_WIDTH, entitiesWidth);

    const fileCenterX = subtreeWidth / 2;
    const fileX = fileCenterX - NODE_WIDTH / 2;
    positions.set(fileNode.id, { x: fileX, y: baseY });

    visibleEntities.forEach((entity, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const entityX = col * (NODE_WIDTH + HORIZONTAL_GAP) + (subtreeWidth - entitiesWidth) / 2;
      const entityY = baseY + VERTICAL_GAP + row * (NODE_HEIGHT + 20);
      positions.set(entity.id, { x: entityX, y: entityY });
    });

    const totalHeight = VERTICAL_GAP + rows * (NODE_HEIGHT + 20);
    return {
      width: subtreeWidth,
      height: totalHeight,
      filePos: { x: fileX, y: baseY },
    };
  };

  // Helper to layout a folder subtree
  const layoutFolderSubtree = (
    folderNode: CodeGraphNodeRecord,
    baseY: number
  ): { width: number } => {
    const childIds = childrenByParent.get(folderNode.id) ?? [];
    const childFolders = childIds
      .map((id) => nodeMap.get(id))
      .filter((n): n is CodeGraphNodeRecord => Boolean(n && n.type === "module"));
    const childFiles = childIds
      .map((id) => nodeMap.get(id))
      .filter((n): n is CodeGraphNodeRecord => Boolean(n && n.type === "file"));

    if (childFolders.length === 0 && childFiles.length === 0) {
      positions.set(folderNode.id, { x: 0, y: baseY });
      return { width: NODE_WIDTH };
    }

    let folderSubtreeWidth = NODE_WIDTH;

    // If subfolders exist, lay them out side by side
    if (childFolders.length > 0) {
      let subfoldersWidth = 0;
      const subfolderPositions: Array<{ id: string; x: number; y: number; width: number }> = [];

      childFolders.forEach((subFolder) => {
        const subResult = layoutFolderSubtree(subFolder, baseY + VERTICAL_GAP);
        subfolderPositions.push({
          id: subFolder.id,
          x: subfoldersWidth,
          y: baseY + VERTICAL_GAP,
          width: subResult.width,
        });
        subfoldersWidth += subResult.width + HORIZONTAL_GAP;
      });
      subfoldersWidth = Math.max(NODE_WIDTH, subfoldersWidth - HORIZONTAL_GAP);
      folderSubtreeWidth = Math.max(folderSubtreeWidth, subfoldersWidth);

      // Offset child folders to be centered under parent
      const subShift = (folderSubtreeWidth - subfoldersWidth) / 2;
      subfolderPositions.forEach((sp) => {
        const cur = positions.get(sp.id);
        if (cur) {
          positions.set(sp.id, { x: sp.x + subShift, y: sp.y });
        }
      });
    }

    // Lay out child files
    if (childFiles.length > 0) {
      // If there are files, wrap them neatly in rows if > 4 files
      const MAX_FILES_PER_ROW = childFiles.length <= 4 ? 4 : childFiles.length <= 6 ? 3 : 4;
      const fileYStart = baseY + (childFolders.length > 0 ? VERTICAL_GAP * 2 : VERTICAL_GAP);

      // Layout each file and its subtree
      let currentX = 0;
      let currentRow = 0;
      let maxRowWidth = 0;

      childFiles.forEach((file, idx) => {
        const row = Math.floor(idx / MAX_FILES_PER_ROW);

        if (row !== currentRow) {
          currentRow = row;
          currentX = 0;
        }

        const fileSub = layoutFileSubtree(file, fileYStart + row * 160);
        positions.set(file.id, { x: currentX, y: fileYStart + row * 160 });

        currentX += fileSub.width + HORIZONTAL_GAP;
        if (currentX - HORIZONTAL_GAP > maxRowWidth) {
          maxRowWidth = currentX - HORIZONTAL_GAP;
        }
      });

      folderSubtreeWidth = Math.max(folderSubtreeWidth, maxRowWidth);
    }

    // Center folder node over its subtree
    positions.set(folderNode.id, {
      x: folderSubtreeWidth / 2 - NODE_WIDTH / 2,
      y: baseY,
    });

    return { width: folderSubtreeWidth };
  };

  // 2. Identify top-level folders (direct children of Project or no parent)
  const topLevelFolders = moduleNodes.filter((m) => {
    const parent = parentByChild.get(m.id);
    return !parent || parent.startsWith("project_") || parent === "project_root";
  });

  // Calculate layout for all top-level folders side by side
  let totalTopLevelWidth = 0;
  const topLevelBranches: Array<{ id: string; x: number; width: number }> = [];

  topLevelFolders.forEach((folder) => {
    const branch = layoutFolderSubtree(folder, 125);
    topLevelBranches.push({
      id: folder.id,
      x: totalTopLevelWidth,
      width: branch.width,
    });
    totalTopLevelWidth += branch.width + HORIZONTAL_GAP * 2;
  });

  if (topLevelBranches.length > 0) {
    totalTopLevelWidth -= HORIZONTAL_GAP * 2;
  }
  totalTopLevelWidth = Math.max(NODE_WIDTH, totalTopLevelWidth);

  // Shift each top-level branch into place
  topLevelBranches.forEach((branch) => {
    const shiftX = branch.x;
    // Recursively shift all nodes in this folder's branch
    const shiftSubtree = (parentId: string) => {
      const cur = positions.get(parentId);
      if (cur) {
        positions.set(parentId, { x: cur.x + shiftX, y: cur.y });
      }
      const children = childrenByParent.get(parentId) ?? [];
      children.forEach((cId) => shiftSubtree(cId));
    };
    shiftSubtree(branch.id);
  });

  // 3. Center Project node(s) over the entire layout
  const projectX = totalTopLevelWidth / 2 - NODE_WIDTH / 2;
  projectNodes.forEach((pNode, index) => {
    positions.set(pNode.id, {
      x: projectX + index * (NODE_WIDTH + HORIZONTAL_GAP),
      y: 20,
    });
  });

  // 4. Any standalone nodes not yet positioned
  const unpositioned = inputNodes.filter((n) => !positions.has(n.id));
  if (unpositioned.length > 0) {
    let unposX = 0;
    unpositioned.forEach((uNode) => {
      positions.set(uNode.id, {
        x: unposX,
        y: uNode.type === "file" ? 245 : 360,
      });
      unposX += NODE_WIDTH + HORIZONTAL_GAP;
    });
  }

  // 5. Center the entire layout around x = 0
  const allX = Array.from(positions.values()).map((p) => p.x);
  const minX = allX.length ? Math.min(...allX) : 0;
  const maxX = allX.length ? Math.max(...allX) : 0;
  const centerShift = (minX + maxX) / 2;

  positions.forEach((pos, id) => {
    positions.set(id, { x: pos.x - centerShift, y: pos.y });
  });

  // 6. Build final ReactFlow Node objects
  return inputNodes.map((node) => {
    const pos = positions.get(node.id) ?? { x: 0, y: 0 };
    const meta = getNodeMetadata(node, inputEdges, nodesById);
    const archNode = node as ArchitectureNode;

    return {
      id: node.id,
      type: "codeGraph",
      position: { x: pos.x, y: pos.y },
      style: { width: NODE_WIDTH, height: NODE_HEIGHT },
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
      data: {
        label: node.label,
        nodeType: node.type,
        focused: node.id === focusNodeId,
        selected: node.id === focusNodeId,
        connected: false,
        matched: false,
        dimmed: false,
        meta,
        isExpandable: archNode.isExpandable ?? false,
        isExpanded: expandedNodeIds.has(node.id),
        onToggleExpand,
        nodeId: node.id,
      },
    };
  });
}

/**
 * Focus mode neighborhood layout: focused node centered at top, child tiers branching neatly below.
 */
function computeFocusNeighborhoodLayout(
  focusNodeId: string,
  inputNodes: (CodeGraphNodeRecord | ArchitectureNode)[],
  inputEdges: CodeGraphEdge[],
  nodesById: Map<string, CodeGraphNodeRecord>,
  expandedNodeIds: Set<string>,
  onToggleExpand?: (nodeId: string) => void
): Node<FlowCodeGraphNodeData>[] {
  const nodeMap = new Map(inputNodes.map((n) => [n.id, n]));

  // BFS hop grouping from focus node
  const distances = new Map<string, number>();
  distances.set(focusNodeId, 0);

  const adjacency = new Map<string, string[]>();
  inputEdges.forEach((e) => {
    if (!adjacency.has(e.source)) adjacency.set(e.source, []);
    if (!adjacency.has(e.target)) adjacency.set(e.target, []);
    adjacency.get(e.source)!.push(e.target);
    adjacency.get(e.target)!.push(e.source);
  });

  const queue = [focusNodeId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentDist = distances.get(current)!;
    const neighbors = adjacency.get(current) ?? [];

    for (const neighbor of neighbors) {
      if (!distances.has(neighbor) && nodeMap.has(neighbor)) {
        distances.set(neighbor, currentDist + 1);
        queue.push(neighbor);
      }
    }
  }

  // Group nodes by hop distance
  const hopGroups = new Map<number, CodeGraphNodeRecord[]>();
  inputNodes.forEach((node) => {
    const dist = distances.get(node.id) ?? 1;
    if (!hopGroups.has(dist)) hopGroups.set(dist, []);
    hopGroups.get(dist)!.push(node);
  });

  const positions = new Map<string, { x: number; y: number }>();

  // Position focus node at the top center
  positions.set(focusNodeId, { x: 0, y: 30 });

  // Position subsequent hop tiers below
  const sortedDistances = Array.from(hopGroups.keys()).sort((a, b) => a - b);

  sortedDistances.forEach((dist) => {
    if (dist === 0) return;
    const nodesInTier = hopGroups.get(dist)!;
    const tierWidth = nodesInTier.length * (NODE_WIDTH + HORIZONTAL_GAP) - HORIZONTAL_GAP;

    const startX = -tierWidth / 2;
    const tierY = 30 + dist * 120;

    nodesInTier.forEach((node, idx) => {
      positions.set(node.id, {
        x: startX + idx * (NODE_WIDTH + HORIZONTAL_GAP),
        y: tierY,
      });
    });
  });

  return inputNodes.map((node) => {
    const pos = positions.get(node.id) ?? { x: 0, y: 0 };
    const meta = getNodeMetadata(node, inputEdges, nodesById);
    const archNode = node as ArchitectureNode;

    return {
      id: node.id,
      type: "codeGraph",
      position: { x: pos.x, y: pos.y },
      style: { width: NODE_WIDTH, height: NODE_HEIGHT },
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
      data: {
        label: node.label,
        nodeType: node.type,
        focused: node.id === focusNodeId,
        selected: node.id === focusNodeId,
        connected: false,
        matched: false,
        dimmed: false,
        meta,
        isExpandable: archNode.isExpandable ?? false,
        isExpanded: expandedNodeIds.has(node.id),
        onToggleExpand,
        nodeId: node.id,
      },
    };
  });
}
