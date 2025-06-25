There are some types of contents that we need to support:

- Directories
- Notes
- Images
- Flashcards
- Quizzes
- PDFs (only in a future version)
- audio files (only in a future version)

Firestore maximum document length: 1 MiB (1,048,576 bytes)
- https://firebase.google.com/docs/firestore/quotas
- for now, don't allow notes/flashcards/quizzes bigger than that
- in the future we must find a way to support bigger documents

entity versioning for easy migration
- migration happens only when user access the application

content versioning to allow restoration of old versions

TODO: remove
to make list directory contents and moving a directory more efficient:  
- do not store the content path or depth
- each content should have a list of its children

I don't this we need to store the content path or depth

store only metadata on firestore and contents on cloud storage?

the solution must be cost effective
- track each api call, how many queries were performed and amount of data transferred
- consider a new entity "directory index" that should hold all the metadata for the directory and it's immediate 
  children

FlashcardDeck
- Flashcard
  - content (front/back): markdown with attachments
  - start/end time for tracking the total time taken to answer
  - timeout for defining a maximum total time to answer
- ReversedFlashcard
  - do not have contents, only a reference to flashcard
- store flashcards in a specific content or inside card decks?

spaced repetition algorithm
- https://github.com/open-spaced-repetition/ts-fsrs (example: https://open-spaced-repetition.github.io/ts-fsrs/example)
- search for others

Notes
- markdown
  - https://github.com/mdx-editor/editor
  - https://www.wysimark.com/
- attachments
  - may have flashcard decks, images, quizzes, other notes, etc., as attachments

virtual file system
- local cache
- local indexing for search

tags
- name/value
- system tags
  - content root
  - knowledge area
- user defined tags

favorites

sharing content with other users
- for now, only the owner will be able to change contents 
- study tracking must be separated from the flashcard