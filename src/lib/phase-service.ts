import type { ProcessNode, ProjectPhase } from './types';
import { serverTimestamp } from './firebase-service';

/* ===== ID Generator ===== */
function genId(): string {
  return Math.random().toString(36).substring(2, 10);
}

/* ===== Default Templates ===== */
export function getDefaultPhases(): Omit<ProjectPhase['data'], 'createdAt' | 'updatedAt'>[] {
  return [
    {
      name: 'Diseño',
      type: 'diseño',
      order: 0,
      processes: [
        { id: genId(), name: 'Conceptualización', children: [] },
        { id: genId(), name: 'Idea básica', children: [] },
        { id: genId(), name: 'Anteproyecto', children: [] },
        { id: genId(), name: 'Proyecto', children: [] },
        { id: genId(), name: 'Detalles', children: [] },
      ],
    },
    {
      name: 'Ejecución',
      type: 'ejecución',
      order: 1,
      processes: [
        { id: genId(), name: 'Preliminares', children: [] },
        { id: genId(), name: 'Excavaciones', children: [] },
        { id: genId(), name: 'Obra gris', children: [] },
        { id: genId(), name: 'Obra blanca', children: [] },
        { id: genId(), name: 'Carpintería', children: [] },
        { id: genId(), name: 'Decoración', children: [] },
      ],
    },
  ];
}

/* ===== Tree Utilities ===== */

/** Find a node by id in the process tree (recursive) */
export function findProcessNode(nodes: ProcessNode[], id: string): ProcessNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    const found = findProcessNode(node.children, id);
    if (found) return found;
  }
  return null;
}

/** Find parent node of a given id */
export function findParentNode(nodes: ProcessNode[], id: string): ProcessNode | null {
  for (const node of nodes) {
    if (node.children.some(c => c.id === id)) return node;
    const found = findParentNode(node.children, id);
    if (found) return found;
  }
  return null;
}

/** Remove a node by id from the tree (mutates and returns the array) */
export function removeProcessNode(nodes: ProcessNode[], id: string): ProcessNode[] {
  return nodes
    .filter(n => n.id !== id)
    .map(n => ({
      ...n,
      children: removeProcessNode(n.children, id),
    }));
}

/** Add a node to a parent (or root if parentId is null) */
export function addProcessNode(
  processes: ProcessNode[],
  parentId: string | null,
  newNode: ProcessNode,
): ProcessNode[] {
  if (!parentId) {
    return [...processes, newNode];
  }
  return processes.map(node => {
    if (node.id === parentId) {
      return { ...node, children: [...node.children, newNode] };
    }
    return { ...node, children: addProcessNode(node.children, parentId, newNode) };
  });
}

/** Update a node's name by id */
export function updateProcessNode(
  nodes: ProcessNode[],
  id: string,
  name: string,
): ProcessNode[] {
  return nodes.map(node => {
    if (node.id === id) return { ...node, name };
    return { ...node, children: updateProcessNode(node.children, id, name) };
  });
}

/** Get all leaf nodes (those without children = process containers for tasks) */
export function getLeafNodes(nodes: ProcessNode[]): ProcessNode[] {
  const leaves: ProcessNode[] = [];
  for (const node of nodes) {
    if (node.children.length === 0) {
      leaves.push(node);
    } else {
      leaves.push(...getLeafNodes(node.children));
    }
  }
  return leaves;
}

/** Get all nodes flattened (for counting tasks, etc.) */
export function getAllProcessNodes(nodes: ProcessNode[]): ProcessNode[] {
  const result: ProcessNode[] = [];
  for (const node of nodes) {
    result.push(node);
    result.push(...getAllProcessNodes(node.children));
  }
  return result;
}

/** Generate a unique id for a new process node */
export function generateProcessId(): string {
  return genId();
}
