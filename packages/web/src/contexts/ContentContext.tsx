import React, { createContext, useState, useContext } from 'react';
import type { ReactNode } from 'react';

import { ContentType, type Content } from '../lib/content';

export interface EnrichedTreeNode extends Omit<Content, 'type'> {
  type: ContentType | 'dummy';
  children?: EnrichedTreeNode[];
}

interface ContentContextType {
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
  refreshTrigger: number;
  triggerRefresh: () => void;
  nodeMap: Map<string, EnrichedTreeNode>;
  setNodeMap: React.Dispatch<
    React.SetStateAction<Map<string, EnrichedTreeNode>>
  >;
  getParentPath: (id: string | null | undefined) => string;
  addNoteToMap: (note: Content) => void;
}

const ContentContext = createContext<ContentContextType | undefined>(undefined);

export const ContentProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [nodeMap, setNodeMap] = useState<Map<string, EnrichedTreeNode>>(
    new Map()
  );

  const triggerRefresh = () => setRefreshTrigger(prev => prev + 1);

  const addNoteToMap = (note: Content) => {
    setNodeMap(prevMap => {
      const newMap = new Map(prevMap);
      const enrichedNote: EnrichedTreeNode = {
        ...note,
        children: undefined, // Notes don't have children
      };
      newMap.set(note.id, enrichedNote);
      return newMap;
    });
  };

  const getParentPath = (id: string | null | undefined): string => {
    if (!id) return '?';
    let path = '';
    let currentNode = nodeMap.get(id);
    while (currentNode) {
      if (currentNode.type === 'dummy') {
        currentNode = currentNode.parentId
          ? nodeMap.get(currentNode.parentId)
          : undefined;
        continue;
      }
      path = `${currentNode.name}${path}`;
      if (currentNode.parentId === null) {
        break;
      }
      currentNode = currentNode.parentId
        ? nodeMap.get(currentNode.parentId)
        : undefined;
    }
    return path || '?';
  };

  const value = {
    selectedNodeId,
    setSelectedNodeId,
    refreshTrigger,
    triggerRefresh,
    nodeMap,
    setNodeMap,
    getParentPath,
    addNoteToMap,
  };

  return (
    <ContentContext.Provider value={value}>{children}</ContentContext.Provider>
  );
};

export const useContent = (): ContentContextType => {
  const context = useContext(ContentContext);
  if (!context) {
    throw new Error('useContent must be used within a ContentProvider');
  }
  return context;
};
