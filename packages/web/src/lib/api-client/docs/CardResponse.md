# CardResponse


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **string** | Unique identifier for the card | [default to undefined]
**deckId** | **string** | ID of the deck this card belongs to | [default to undefined]
**ownerId** | **string** | ID of the user who owns this card | [default to undefined]
**front** | **string** | Front side of the flashcard (question / prompt) | [default to undefined]
**back** | **string** | Back side of the flashcard (answer) | [default to undefined]
**dueDate** | **string** | Next due date for review | [default to undefined]
**interval** | **number** | Current interval in days between reviews (FSRS-compatible) | [default to undefined]
**repetitions** | **number** | Number of consecutive times the card was recalled correctly | [default to undefined]
**lastResult** | **string** | Result of the last study session | [optional] [default to undefined]
**lastStudied** | **string** | Timestamp of the last study session | [optional] [default to undefined]
**correctCount** | **number** | Total number of times the card was answered correctly | [default to undefined]
**incorrectCount** | **number** | Total number of times the card was answered incorrectly | [default to undefined]
**deleted** | **boolean** | Soft-delete flag | [optional] [default to undefined]
**deletedAt** | **string** | Soft-delete timestamp | [optional] [default to undefined]
**createdAt** | **string** | Timestamp when the card was created | [default to undefined]
**updatedAt** | **string** | Timestamp when the card was last updated | [default to undefined]

## Example

```typescript
import { CardResponse } from 'api-client';

const instance: CardResponse = {
    id,
    deckId,
    ownerId,
    front,
    back,
    dueDate,
    interval,
    repetitions,
    lastResult,
    lastStudied,
    correctCount,
    incorrectCount,
    deleted,
    deletedAt,
    createdAt,
    updatedAt,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
