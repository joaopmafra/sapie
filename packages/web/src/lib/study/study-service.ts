import axios from 'axios';
import type { User } from 'firebase/auth';

import { getApiBaseUrl } from '../apiBaseUrl';
import { getApiAuthRequestOptions } from '../auth-utils';

import type { DueCardsResponse } from './types';

export class StudyService {
  async getDueCards(
    currentUser: User,
    rootIds: string[],
  ): Promise<DueCardsResponse> {
    const options = await getApiAuthRequestOptions(currentUser);
    const basePath = getApiBaseUrl().replace(/\/$/, '');
    const response = await axios.get<DueCardsResponse>(
      `${basePath}/api/study/due-cards`,
      {
        ...options,
        params: { rootIds: rootIds.join(',') },
      },
    );
    return {
      cards: response.data.cards.map(c => ({
        ...c,
        dueDate: new Date(c.dueDate),
      })),
      totalDue: response.data.totalDue,
    };
  }

  async getFolderCards(
    currentUser: User,
    folderId: string,
  ): Promise<DueCardsResponse> {
    const options = await getApiAuthRequestOptions(currentUser);
    const basePath = getApiBaseUrl().replace(/\/$/, '');
    const response = await axios.get<DueCardsResponse>(
      `${basePath}/api/study/folder-cards`,
      {
        ...options,
        params: { folderId },
      },
    );
    return {
      cards: response.data.cards.map(c => ({
        ...c,
        dueDate: new Date(c.dueDate),
      })),
      totalDue: response.data.totalDue,
    };
  }
}

export const studyService = new StudyService();
