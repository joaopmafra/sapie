import { useQuery } from '@tanstack/react-query';

import { useAuth } from '../../contexts/AuthContext';

import { studyService } from './study-service';

export const studyQueryKeys = {
  dueCards: (rootIds: string[]) =>
    ['study', 'due-cards', ...rootIds.sort()] as const,
  folderCards: (folderId: string) =>
    ['study', 'folder-cards', folderId] as const,
};

export function useDueCards(rootIds: string[]) {
  const { currentUser } = useAuth();

  return useQuery({
    queryKey: studyQueryKeys.dueCards(rootIds),
    queryFn: () => studyService.getDueCards(currentUser!, rootIds),
    enabled: !!currentUser && rootIds.length > 0,
  });
}

export function useFolderCards(folderId: string | undefined) {
  const { currentUser } = useAuth();

  return useQuery({
    queryKey: studyQueryKeys.folderCards(folderId!),
    queryFn: () => studyService.getFolderCards(currentUser!, folderId!),
    enabled: !!currentUser && !!folderId,
  });
}
