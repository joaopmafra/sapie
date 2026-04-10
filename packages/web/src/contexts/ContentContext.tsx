import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

interface ContentContextType {
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
  expandedNodeIds: string[];
  setExpandedNodeIds: React.Dispatch<React.SetStateAction<string[]>>;
}

const ContentContext = createContext<ContentContextType | undefined>(undefined);

export const ContentProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [expandedNodeIds, setExpandedNodeIds] = useState<string[]>([]);

  return (
    <ContentContext.Provider
      value={{
        selectedNodeId,
        setSelectedNodeId,
        expandedNodeIds,
        setExpandedNodeIds,
      }}
    >
      {children}
    </ContentContext.Provider>
  );
};

export const useContent = (): ContentContextType => {
  const context = useContext(ContentContext);
  if (!context) {
    throw new Error('useContent must be used within a ContentProvider');
  }
  return context;
};
