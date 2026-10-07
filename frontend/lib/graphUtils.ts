import type {
  CodeGraphEdge,
  CodeGraphNode,
  GraphNodeType,
  GraphRelationshipType,
} from "@/types/graph";

/**
 * Architectural node types shown on the high-level Graph page.
 * Low-level AST/symbol items (variables, parameters, identifiers, statements) are omitted.
 */
export const ARCHITECTURAL_NODE_TYPES: GraphNodeType[] = [
  "project",
  "module",
  "file",
  "class",
  "function",
  "api_route",
  "method",
];

export const DISALLOWED_GRAPH_NODE_TYPES = new Set<string>([
  "variable",
  "parameter",
  "identifier",
  "statement",
  "expression",
  "declaration",
  "block",
  "literal",
]);

export function isGraphRenderableNode(node: CodeGraphNode): boolean {
  if (!node || !node.type) return false;
  return !DISALLOWED_GRAPH_NODE_TYPES.has(node.type.toLowerCase());
}

/**
 * Builds adjacency maps for undirected BFS traversal.
 */
export function buildAdjacencyMap(edges: CodeGraphEdge[]) {
  const adjacency = new Map<string, Set<string>>();
  const edgesByNode = new Map<string, CodeGraphEdge[]>();

  edges.forEach((edge) => {
    if (!adjacency.has(edge.source)) adjacency.set(edge.source, new Set());
    if (!adjacency.has(edge.target)) adjacency.set(edge.target, new Set());
    adjacency.get(edge.source)!.add(edge.target);
    adjacency.get(edge.target)!.add(edge.source);

    if (!edgesByNode.has(edge.source)) edgesByNode.set(edge.source, []);
    if (!edgesByNode.has(edge.target)) edgesByNode.set(edge.target, []);
    edgesByNode.get(edge.source)!.push(edge);
    edgesByNode.get(edge.target)!.push(edge);
  });

  return { adjacency, edgesByNode };
}

/**
 * Performs BFS from a root node up to maxHops (1, 2, or 3).
 * Returns sets of node IDs discovered at each hop distance.
 */
export function computeBfsNeighborhood(
  rootId: string,
  adjacency: Map<string, Set<string>>,
  maxHops: 1 | 2 | 3 = 3
): {
  hop1: Set<string>;
  hop2: Set<string>;
  hop3: Set<string>;
  all: Set<string>;
  distances: Map<string, number>;
} {
  const distances = new Map<string, number>();
  distances.set(rootId, 0);

  const hop1 = new Set<string>();
  const hop2 = new Set<string>();
  const hop3 = new Set<string>();
  const all = new Set<string>([rootId]);

  const queue: Array<{ id: string; dist: number }> = [{ id: rootId, dist: 0 }];

  while (queue.length > 0) {
    const { id, dist } = queue.shift()!;
    if (dist >= maxHops) continue;

    const neighbors = adjacency.get(id);
    if (!neighbors) continue;

    for (const neighbor of neighbors) {
      if (!distances.has(neighbor)) {
        const nextDist = dist + 1;
        distances.set(neighbor, nextDist);
        all.add(neighbor);

        if (nextDist === 1) hop1.add(neighbor);
        else if (nextDist === 2) hop2.add(neighbor);
        else if (nextDist === 3) hop3.add(neighbor);

        if (nextDist < maxHops) {
          queue.push({ id: neighbor, dist: nextDist });
        }
      }
    }
  }

  return { hop1, hop2, hop3, all, distances };
}

/**
 * Computes deterministic depth (0, 1, 2, 3) for all nodes in a project from the project root:
 * - Depth 0: Project root
 * - Depth 1: Modules and Files (Architecture Overview)
 * - Depth 2: Classes, Functions, and API Routes (Code Structure)
 * - Depth 3: Methods (Dependency & Call Exploration)
 */
export function computeProjectHierarchyDepths(
  nodes: CodeGraphNode[],
  edges: CodeGraphEdge[]
): Map<string, number> {
  const depths = new Map<string, number>();

  // 1. Find root node(s)
  const projectNodes = nodes.filter((n) => n.type === "project");

  const rootIds = new Set<string>();
  if (projectNodes.length > 0) {
    projectNodes.forEach((p) => {
      depths.set(p.id, 0);
      rootIds.add(p.id);
    });
  }

  // Build directed hierarchy adjacency map via CONTAINS and DECLARES
  const directedAdjacency = new Map<string, Set<string>>();
  edges.forEach((edge) => {
    if (edge.type === "CONTAINS" || edge.type === "DECLARES" || edge.type === "HAS_METHOD") {
      if (!directedAdjacency.has(edge.source)) {
        directedAdjacency.set(edge.source, new Set());
      }
      directedAdjacency.get(edge.source)!.add(edge.target);
    }
  });

  // Assign depths based on explicit architectural role
  nodes.forEach((node) => {
    if (node.type === "project") {
      depths.set(node.id, 0);
    } else if (node.type === "module" || node.type === "file") {
      depths.set(node.id, 1);
    } else if (
      node.type === "class" ||
      node.type === "function" ||
      node.type === "api_route"
    ) {
      depths.set(node.id, 2);
    } else if (node.type === "method") {
      depths.set(node.id, 3);
    } else {
      // Any other node type defaults to 3 if not disallowed
      depths.set(node.id, 3);
    }
  });

  return depths;
}

export interface ArchitectureNode extends CodeGraphNode {
  parentId?: string | null;
  level: number; // 0 = project, 1 = folder/module, 2 = file, 3 = function/method/class/route
  isExpandable: boolean;
  fileCount?: number;
  subfolderCount?: number;
  entityCount?: number;
  fullPath?: string;
  filePath?: string;
}

export interface ArchitectureTree {
  projectNode: ArchitectureNode;
  allNodes: Map<string, ArchitectureNode>;
  allEdges: CodeGraphEdge[];
  topLevelFolderIds: string[];
  parentMap: Map<string, string>;
  childrenMap: Map<string, string[]>;
  fileEntitiesMap: Map<string, string[]>;
  ancestorsMap: Map<string, string[]>;
}

/**
 * Normalizes file paths and returns directory segments and file name.
 */
function normalizeFilePath(rawPath: string): { folderSegments: string[]; fileName: string } {
  const normalized = rawPath
    .replace(/\\/g, "/")
    .replace(/^\.\//, "")
    .replace(/^\/+/, "")
    .trim();

  const parts = normalized.split("/").filter(Boolean);
  if (parts.length <= 1) {
    return {
      folderSegments: ["root"],
      fileName: parts[0] || normalized,
    };
  }

  const fileName = parts.pop()!;
  return {
    folderSegments: parts,
    fileName,
  };
}

/**
 * Derives a clean, structured architecture tree (Project -> Folders -> Files -> Functions/Methods).
 * Completely omits variables, statements, expressions, and low-level AST dumps.
 */
export function deriveArchitectureTree(
  rawNodes: CodeGraphNode[],
  rawEdges: CodeGraphEdge[],
  projectName: string = "Project",
  projectId?: number | null
): ArchitectureTree {
  const allNodes = new Map<string, ArchitectureNode>();
  const parentMap = new Map<string, string>();
  const childrenMap = new Map<string, string[]>();
  const fileEntitiesMap = new Map<string, string[]>();
  const ancestorsMap = new Map<string, string[]>();

  const addChild = (parentId: string, childId: string) => {
    if (!childrenMap.has(parentId)) {
      childrenMap.set(parentId, []);
    }
    const currentChildren = childrenMap.get(parentId)!;
    if (!currentChildren.includes(childId)) {
      currentChildren.push(childId);
    }
    parentMap.set(childId, parentId);
  };

  // 1. Identify or synthesize Project Node (Level 0)
  const existingProjectNode = rawNodes.find((n) => n.type === "project");
  const projectNodeId = existingProjectNode?.id ?? (projectId ? `project_${projectId}` : "project_root");
  const projectLabel = existingProjectNode?.label ?? projectName;

  const projectNode: ArchitectureNode = {
    id: projectNodeId,
    label: projectLabel,
    type: "project",
    level: 0,
    parentId: null,
    isExpandable: true,
  };
  allNodes.set(projectNodeId, projectNode);

  // 2. Identify Files and filter out variables and disallowed types
  const fileNodes = rawNodes.filter((n) => n.type === "file");
  const entityNodes = rawNodes.filter((n) => {
    if (!n || !n.type) return false;
    const t = n.type.toLowerCase();
    return (
      t === "function" ||
      t === "class" ||
      t === "method" ||
      t === "api_route"
    );
  });

  // Track folders created
  const folderNodesMap = new Map<
    string,
    {
      id: string;
      label: string;
      fullPath: string;
      parentFolderId: string | null;
      isTopLevel: boolean;
      directFileIds: Set<string>;
      allFileIds: Set<string>;
      childFolderIds: Set<string>;
    }
  >();

  // Helper to ensure a folder exists in hierarchy
  const ensureFolder = (segments: string[]): string => {
    let currentPath = "";
    let parentFolderId: string | null = null;

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      currentPath = currentPath ? `${currentPath}/${segment}` : segment;
      const folderId = `module_${currentPath}`;

      if (!folderNodesMap.has(currentPath)) {
        folderNodesMap.set(currentPath, {
          id: folderId,
          label: segment,
          fullPath: currentPath,
          parentFolderId,
          isTopLevel: i === 0,
          directFileIds: new Set<string>(),
          allFileIds: new Set<string>(),
          childFolderIds: new Set<string>(),
        });

        if (parentFolderId) {
          const parentFolder = Array.from(folderNodesMap.values()).find((f) => f.id === parentFolderId);
          parentFolder?.childFolderIds.add(folderId);
        }
      }

      parentFolderId = folderId;
    }

    return `module_${currentPath}`;
  };

  // 3. Process each file into its folder hierarchy
  const fileToFolderMap = new Map<string, string>();

  fileNodes.forEach((file) => {
    const { folderSegments, fileName } = normalizeFilePath(file.label);
    const targetFolderId = ensureFolder(folderSegments);
    fileToFolderMap.set(file.id, targetFolderId);

    // Track file in folder hierarchy
    let currentPath = "";
    folderSegments.forEach((seg) => {
      currentPath = currentPath ? `${currentPath}/${seg}` : seg;
      const folderData = folderNodesMap.get(currentPath);
      if (folderData) {
        folderData.allFileIds.add(file.id);
        if (folderData.id === targetFolderId) {
          folderData.directFileIds.add(file.id);
        }
      }
    });

    const fileNode: ArchitectureNode = {
      id: file.id,
      label: fileName,
      type: "file",
      level: 2,
      filePath: file.label,
      isExpandable: false, // will update if it has entities
    };
    allNodes.set(file.id, fileNode);
  });

  // 4. Build ArchitectureNodes for folders (Level 1)
  const topLevelFolderIds: string[] = [];

  folderNodesMap.forEach((folder) => {
    const folderNode: ArchitectureNode = {
      id: folder.id,
      label: folder.label,
      type: "module",
      level: 1,
      fullPath: folder.fullPath,
      fileCount: folder.allFileIds.size,
      subfolderCount: folder.childFolderIds.size,
      isExpandable: folder.allFileIds.size > 0 || folder.childFolderIds.size > 0,
      parentId: folder.parentFolderId ?? projectNodeId,
    };
    allNodes.set(folder.id, folderNode);

    if (folder.isTopLevel) {
      topLevelFolderIds.push(folder.id);
      addChild(projectNodeId, folder.id);
    } else if (folder.parentFolderId) {
      addChild(folder.parentFolderId, folder.id);
    }
  });

  // Connect files to their folders
  fileNodes.forEach((file) => {
    const folderId = fileToFolderMap.get(file.id);
    if (folderId) {
      addChild(folderId, file.id);
      const fNode = allNodes.get(file.id);
      if (fNode) fNode.parentId = folderId;
    }
  });

  // 5. Connect Declarations (Level 3: Functions, Methods, Classes, Routes) to Files
  const entitiesById = new Map(entityNodes.map((e) => [e.id, e]));

  // Build DECLARES map from raw edges
  rawEdges.forEach((edge) => {
    if (
      edge.type === "DECLARES" ||
      edge.type === "HAS_METHOD" ||
      (edge.type === "CONTAINS" && edge.source.startsWith("file_"))
    ) {
      const fileNode = allNodes.get(edge.source);
      const entity = entitiesById.get(edge.target);

      if (fileNode && fileNode.type === "file" && entity) {
        if (!fileEntitiesMap.has(fileNode.id)) {
          fileEntitiesMap.set(fileNode.id, []);
        }
        const entities = fileEntitiesMap.get(fileNode.id)!;
        if (!entities.includes(entity.id)) {
          entities.push(entity.id);
        }

        const archEntity: ArchitectureNode = {
          id: entity.id,
          label: entity.label,
          type: entity.type,
          level: 3,
          parentId: fileNode.id,
          isExpandable: false,
        };
        allNodes.set(entity.id, archEntity);
        addChild(fileNode.id, entity.id);
        fileNode.isExpandable = true;
      }
    }
  });

  // Also catch any orphan entities linked to files via other edges
  entityNodes.forEach((entity) => {
    if (!allNodes.has(entity.id)) {
      const incoming = rawEdges.find((e) => e.target === entity.id && allNodes.has(e.source));
      if (incoming) {
        const parent = allNodes.get(incoming.source);
        const parentId = parent?.id ?? projectNodeId;
        const archEntity: ArchitectureNode = {
          id: entity.id,
          label: entity.label,
          type: entity.type,
          level: 3,
          parentId,
          isExpandable: false,
        };
        allNodes.set(entity.id, archEntity);
        addChild(parentId, entity.id);
      }
    }
  });

  // Update entity count on file nodes
  fileNodes.forEach((file) => {
    const fNode = allNodes.get(file.id);
    if (fNode) {
      const entityCount = fileEntitiesMap.get(file.id)?.length ?? 0;
      fNode.entityCount = entityCount;
      fNode.isExpandable = entityCount > 0;
    }
  });

  // 6. Build Ancestors Map for each node
  allNodes.forEach((node) => {
    const ancestors: string[] = [];
    let currentId: string | null = parentMap.get(node.id) ?? null;
    while (currentId && !ancestors.includes(currentId)) {
      ancestors.push(currentId);
      currentId = parentMap.get(currentId) ?? null;
    }
    ancestorsMap.set(node.id, ancestors);
  });

  // 7. Synthesize Clean Architectural Edges
  const allEdges: CodeGraphEdge[] = [];
  const edgeDedupe = new Set<string>();

  const addEdge = (source: string, target: string, type: GraphRelationshipType) => {
    const key = `${source}-${target}-${type}`;
    if (!edgeDedupe.has(key)) {
      edgeDedupe.add(key);
      allEdges.push({
        id: `arch-${source}-${target}-${type}`,
        source,
        target,
        type,
      });
    }
  };

  // Hierarchy CONTAINS edges: Project -> Folders -> Files
  childrenMap.forEach((children, parentId) => {
    const parentNode = allNodes.get(parentId);
    if (!parentNode) return;

    children.forEach((childId) => {
      const childNode = allNodes.get(childId);
      if (!childNode) return;

      if (parentNode.type === "project" && childNode.type === "module") {
        addEdge(parentId, childId, "CONTAINS");
      } else if (parentNode.type === "module" && childNode.type === "module") {
        addEdge(parentId, childId, "CONTAINS");
      } else if (parentNode.type === "module" && childNode.type === "file") {
        addEdge(parentId, childId, "CONTAINS");
      } else if (parentNode.type === "file") {
        addEdge(parentId, childId, childNode.type === "method" ? "HAS_METHOD" : "DECLARES");
      }
    });
  });

  // Cross-file and cross-entity architectural edges (IMPORTS, CALLS, EXTENDS, HANDLES)
  rawEdges.forEach((edge) => {
    if (
      edge.type === "IMPORTS" ||
      edge.type === "CALLS" ||
      edge.type === "EXTENDS" ||
      edge.type === "HANDLES"
    ) {
      if (allNodes.has(edge.source) && allNodes.has(edge.target)) {
        addEdge(edge.source, edge.target, edge.type);
      }
    }
  });

  return {
    projectNode,
    allNodes,
    allEdges,
    topLevelFolderIds,
    parentMap,
    childrenMap,
    fileEntitiesMap,
    ancestorsMap,
  };
}

/**
 * Computes currently visible nodes and edges based on Depth, Expansion state, and Focus mode.
 */
export function getVisibleArchitectureGraph(
  tree: ArchitectureTree,
  depth: 1 | 2 | 3,
  expandedNodeIds: Set<string>,
  isFocused: boolean,
  focusNodeId: string | null,
  activeNodeTypes: Set<GraphNodeType>,
  activeRelationships: Set<GraphRelationshipType>
): { visibleNodes: ArchitectureNode[]; visibleEdges: CodeGraphEdge[] } {
  const visibleIds = new Set<string>();

  if (isFocused && focusNodeId && tree.allNodes.has(focusNodeId)) {
    // ── FOCUS MODE ───────────────────────────────────────────────────────────
    visibleIds.add(focusNodeId);
    const focused = tree.allNodes.get(focusNodeId)!;

    // Include immediate parent / container
    const parentId = tree.parentMap.get(focusNodeId);
    if (parentId && tree.allNodes.has(parentId)) {
      visibleIds.add(parentId);
    }

    // Direct connections up to depth hops
    const directEdges = tree.allEdges.filter(
      (e) => e.source === focusNodeId || e.target === focusNodeId
    );

    directEdges.forEach((edge) => {
      const otherId = edge.source === focusNodeId ? edge.target : edge.source;
      const otherNode = tree.allNodes.get(otherId);
      if (!otherNode) return;

      if (focused.type === "file") {
        // At Depth 1: parent folder + other files in folder
        // At Depth 2: files it imports or that import it
        // At Depth 3: functions declared in this file + cross-file calls
        if (depth === 1 && otherNode.type === "module") visibleIds.add(otherId);
        if (depth >= 2 && (otherNode.type === "file" || otherNode.type === "module")) visibleIds.add(otherId);
        if (depth >= 3 && otherNode.level === 3) visibleIds.add(otherId);
      } else if (focused.level === 3) {
        // Focused on function/method: show owning file and direct callers/callees
        if (otherNode.type === "file" || otherNode.level === 3) {
          visibleIds.add(otherId);
        }
      } else {
        // Focused on folder: show parent and child folders/files up to depth
        if (depth === 1 && otherNode.type === "module") visibleIds.add(otherId);
        if (depth >= 2) visibleIds.add(otherId);
      }
    });
  } else {
    // ── OVERVIEW MODE (Depth 1, 2, 3 + Progressive Expansion) ────────────────
    // 1. Project node always visible
    visibleIds.add(tree.projectNode.id);

    // 2. Top-level folders always visible
    tree.topLevelFolderIds.forEach((id) => visibleIds.add(id));

    // 3. Progressively reveal child folders & files if parent folder is expanded
    const folderQueue: string[] = [...tree.topLevelFolderIds];
    const visitedFolders = new Set<string>();

    while (folderQueue.length > 0) {
      const currentFolderId = folderQueue.shift()!;
      if (visitedFolders.has(currentFolderId)) continue;
      visitedFolders.add(currentFolderId);

      if (expandedNodeIds.has(currentFolderId)) {
        const children = tree.childrenMap.get(currentFolderId) ?? [];
        children.forEach((childId) => {
          const childNode = tree.allNodes.get(childId);
          if (!childNode) return;

          if (childNode.type === "module") {
            // Child folder is revealed and can be expanded further
            visibleIds.add(childId);
            folderQueue.push(childId);
          } else if (childNode.type === "file") {
            // Child file is revealed ONLY at Depth 2 or Depth 3!
            if (depth >= 2) {
              visibleIds.add(childId);
            }
          }
        });
      }
    }

    // 4. Progressively reveal functions/methods if file is expanded (ONLY at Depth 3)
    if (depth >= 3) {
      visibleIds.forEach((nodeId) => {
        const node = tree.allNodes.get(nodeId);
        if (node && node.type === "file" && expandedNodeIds.has(nodeId)) {
          const declaredEntities = tree.fileEntitiesMap.get(nodeId) ?? [];
          declaredEntities.forEach((entityId) => visibleIds.add(entityId));
        }
      });
    }
  }

  // Filter visible nodes by active types
  const visibleNodes = Array.from(visibleIds)
    .map((id) => tree.allNodes.get(id))
    .filter((node): node is ArchitectureNode => node !== undefined && activeNodeTypes.has(node.type));

  const finalVisibleIds = new Set(visibleNodes.map((n) => n.id));

  // Filter visible edges: ONLY where both source and target are visible, and type is active
  const visibleEdges = tree.allEdges.filter(
    (edge) =>
      finalVisibleIds.has(edge.source) &&
      finalVisibleIds.has(edge.target) &&
      activeRelationships.has(edge.type)
  );

  return { visibleNodes, visibleEdges };
}

/**
 * Computes descriptive meta text for a node based on graph context.
 */
export function getNodeMetadata(
  node: CodeGraphNode,
  edges: CodeGraphEdge[],
  nodesById: Map<string, CodeGraphNode>
): string {
  const outgoing = edges.filter((e) => e.source === node.id);

  if (node.type === "project") {
    const totalFiles = outgoing.filter((e) => {
      const target = nodesById.get(e.target);
      return target?.type === "file";
    }).length;
    return totalFiles > 0 ? `${totalFiles} files` : "Root project";
  }

  if (node.type === "module") {
    const fileCount = outgoing.filter((e) => {
      const target = nodesById.get(e.target);
      return target?.type === "file";
    }).length;
    return fileCount > 0 ? `${fileCount} files` : "Module folder";
  }

  if (node.type === "file") {
    const declaredCount = outgoing.filter((e) => e.type === "DECLARES").length;
    const callsCount = outgoing.filter((e) => e.type === "CALLS").length;
    if (declaredCount > 0 && callsCount > 0) {
      return `${declaredCount} decl · ${callsCount} calls`;
    }
    if (declaredCount > 0) return `${declaredCount} declarations`;
    return "Source file";
  }

  if (node.type === "class") {
    const methodsCount = outgoing.filter(
      (e) => e.type === "HAS_METHOD" || e.type === "DECLARES"
    ).length;
    return methodsCount > 0 ? `${methodsCount} methods` : "Class";
  }

  if (node.type === "function" || node.type === "method") {
    const callsCount = outgoing.filter((e) => e.type === "CALLS").length;
    return callsCount > 0 ? `${callsCount} calls` : "Callable";
  }

  if (node.type === "api_route") {
    return "API Route";
  }

  return "";
}

