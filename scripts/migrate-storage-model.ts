#!/usr/bin/env bun

/**
 * Migration script: storage model refactor
 *
 * Converts the pre-refactor data model to the new model:
 * 1. Moves cards from subcollection `content/{deckId}/cards` to top-level `cards`
 * 2. Moves study state from card documents to `study_results` collection
 * 3. Renames `folderId` → `directoryId` on deck documents
 *
 * Usage: bun run scripts/migrate-storage-model.ts <ownerId>
 *
 * Prerequisites: Firebase emulators running (`bash scripts/emulator-test-unit-start.sh`),
 * or set FIRESTORE_EMULATOR_HOST for a remote emulator.
 */

import * as admin from 'firebase-admin';

const ownerId = process.argv[2];
if (!ownerId) {
  console.error('Usage: bun run scripts/migrate-storage-model.ts <ownerId>');
  process.exit(1);
}

// Initialize Firebase Admin
const app = admin.initializeApp({
  projectId: process.env.FIREBASE_PROJECT_ID || 'sapie-dev',
});
const firestore = app.firestore();

async function main() {
  console.log(`Migrating storage model for owner: ${ownerId}`);

  // 1. Find all deck-type content documents
  const decksSnapshot = await firestore
    .collection('content')
    .where('type', '==', 'deck')
    .where('ownerId', '==', ownerId)
    .get();

  console.log(`Found ${decksSnapshot.size} decks`);

  for (const deckDoc of decksSnapshot.docs) {
    const deckId = deckDoc.id;
    const deckData = deckDoc.data();
    console.log(`  Processing deck: ${deckId} (${deckData.name})`);

    // 1a. Rename folderId → directoryId if present
    if (deckData.folderId !== undefined) {
      await deckDoc.ref.update({
        directoryId: deckData.folderId,
        folderId: admin.firestore.FieldValue.delete(),
      });
      console.log(`    Renamed folderId → directoryId`);
    }

    // 2. Migrate cards from subcollection to top-level
    const cardsSnapshot = await firestore
      .collection('content')
      .doc(deckId)
      .collection('cards')
      .get();

    if (!cardsSnapshot.empty) {
      console.log(`    Migrating ${cardsSnapshot.size} cards...`);

      const batch = firestore.batch();

      for (const cardDoc of cardsSnapshot.docs) {
        const cardData = cardDoc.data();
        const cardId = cardDoc.id;

        // 2a. Create card in top-level `cards` collection
        const cardRef = firestore.collection('cards').doc(cardId);
        batch.set(cardRef, {
          deckId,
          ownerId: cardData.ownerId || ownerId,
          position: cardData.position || 0,
          front: cardData.front || '',
          back: cardData.back || '',
          deleted: cardData.deleted || false,
          deletedAt: cardData.deletedAt || null,
          createdAt: cardData.createdAt || admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: cardData.updatedAt || admin.firestore.FieldValue.serverTimestamp(),
        });

        // 2b. Extract study state to study_results
        if (cardData.dueDate) {
          const studyResultRef = firestore.collection('study_results').doc();
          batch.set(studyResultRef, {
            cardId,
            userId: ownerId,
            dueDate: cardData.dueDate,
            interval: cardData.interval || 0,
            repetitions: cardData.repetitions || 0,
            lastResult: cardData.lastResult || null,
            lastStudied: cardData.lastStudied || null,
            correctCount: cardData.correctCount || 0,
            incorrectCount: cardData.incorrectCount || 0,
            createdAt: cardData.createdAt || admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: cardData.updatedAt || admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      }

      await batch.commit();
      console.log(`    Cards migrated`);

      // 2c. Delete the old subcollection documents
      // Note: Firestore doesn't support deleting subcollections in a single operation.
      // We'll leave them for now — they'll be cleaned up manually.
    }
  }

  // 3. Update any remaining `folderId` fields on non-deck documents (shouldn't exist, but defensive)
  const remainingSnapshot = await firestore
    .collection('content')
    .where('folderId', '!=', null)
    .where('ownerId', '==', ownerId)
    .get();

  for (const doc of remainingSnapshot.docs) {
    const data = doc.data();
    if (data.type !== 'deck' && data.folderId !== undefined) {
      console.log(`  Removing stray folderId from ${doc.id}`);
      await doc.ref.update({
        folderId: admin.firestore.FieldValue.delete(),
      });
    }
  }

  console.log('\nMigration complete!');
  console.log('Next steps:');
  console.log('  1. Verify data integrity in Firestore emulator UI');
  console.log('  2. Run tests to confirm app works with new data model');
  console.log('  3. Manually delete old subcollections if needed');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
