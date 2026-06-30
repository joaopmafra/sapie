import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DeckViewPage from './DeckViewPage';

jest.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ currentUser: { uid: 'test-user' }, loading: false }),
}));

jest.mock('../lib/cards/card-service', () => ({
  cardService: {
    getCards: jest.fn().mockResolvedValue([]),
    createCard: jest.fn(),
    updateCard: jest.fn(),
    deleteCard: jest.fn(),
  },
}));

jest.mock('../lib/content/content-service', () => ({
  contentService: {
    getContentById: jest.fn().mockResolvedValue({
      id: 'deck-1',
      name: 'Test Deck',
      type: 'deck',
      parentId: 'note-1',
      ownerId: 'test-user',
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
  },
}));

describe('DeckViewPage', () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  it('renders deck name and Add Card button', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/decks/deck-1']}>
          <Routes>
            <Route path='/decks/:deckId' element={<DeckViewPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(await screen.findByText('Test Deck')).toBeTruthy();
    expect(screen.getByText('Add Card')).toBeTruthy();
  });
});
