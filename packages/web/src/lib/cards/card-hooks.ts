import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { cardService } from './card-service';

export const cardQueryKeys = {
  list: (deckId: string) => ['cards', deckId] as const,
};

export function useCards(deckId: string | undefined) {
  const { currentUser } = useAuth();
  return useQuery({
    queryKey: cardQueryKeys.list(deckId!),
    queryFn: () => cardService.getCards(currentUser!, deckId!),
    enabled: Boolean(currentUser) && Boolean(deckId),
  });
}

export function useCreateCard() {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      deckId,
      front,
      back,
    }: {
      deckId: string;
      front: string;
      back: string;
    }) => cardService.createCard(currentUser!, deckId, front, back),
    onSuccess: (_data, { deckId }) => {
      void queryClient.invalidateQueries({
        queryKey: cardQueryKeys.list(deckId),
      });
    },
  });
}

export function useUpdateCard() {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      deckId,
      cardId,
      front,
      back,
    }: {
      deckId: string;
      cardId: string;
      front: string;
      back: string;
    }) => cardService.updateCard(currentUser!, deckId, cardId, front, back),
    onSuccess: (_data, { deckId }) => {
      void queryClient.invalidateQueries({
        queryKey: cardQueryKeys.list(deckId),
      });
    },
  });
}

export function useDeleteCard() {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ deckId, cardId }: { deckId: string; cardId: string }) =>
      cardService.deleteCard(currentUser!, deckId, cardId),
    onSuccess: (_data, { deckId }) => {
      void queryClient.invalidateQueries({
        queryKey: cardQueryKeys.list(deckId),
      });
    },
  });
}

export function useRecordStudyResult() {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      deckId,
      cardId,
      result,
    }: {
      deckId: string;
      cardId: string;
      result: 'know' | 'dont_know';
    }) => cardService.recordStudyResult(currentUser!, deckId, cardId, result),
    onSuccess: (_data, { deckId }) => {
      void queryClient.invalidateQueries({
        queryKey: cardQueryKeys.list(deckId),
      });
      // Also invalidate roots query to refresh due counts
      void queryClient.invalidateQueries({
        queryKey: ['content', 'roots'],
      });
    },
  });
}
