import {
  NOTE_BODY_AUTOSAVE_DEBOUNCE_MS,
  NOTE_BODY_SAVED_HEADER_MS,
  noteEditorSaveHeaderText,
  noteEditorShouldWarnBeforeUnload,
} from './note-editor-save-status';

describe('note-editor-save-status', () => {
  it('uses the story debounce and saved-indicator durations', () => {
    expect(NOTE_BODY_AUTOSAVE_DEBOUNCE_MS).toBe(5000);
    expect(NOTE_BODY_SAVED_HEADER_MS).toBe(3000);
  });

  it('maps phases to header copy', () => {
    expect(noteEditorSaveHeaderText('idle')).toBeNull();
    expect(noteEditorSaveHeaderText('pending')).toBe('Saving…');
    expect(noteEditorSaveHeaderText('saving')).toBe('Saving…');
    expect(noteEditorSaveHeaderText('saved')).toBe('Saved');
    expect(noteEditorSaveHeaderText('error')).toBe('Error saving');
  });

  it('warns before unload when edits are pending or a save is in flight', () => {
    expect(
      noteEditorShouldWarnBeforeUnload({
        draftBody: 'a',
        baselineBody: 'b',
        debounceScheduled: false,
        saveInFlight: false,
      })
    ).toBe(true);

    expect(
      noteEditorShouldWarnBeforeUnload({
        draftBody: 'same',
        baselineBody: 'same',
        debounceScheduled: true,
        saveInFlight: false,
      })
    ).toBe(true);

    expect(
      noteEditorShouldWarnBeforeUnload({
        draftBody: 'same',
        baselineBody: 'same',
        debounceScheduled: false,
        saveInFlight: true,
      })
    ).toBe(true);

    expect(
      noteEditorShouldWarnBeforeUnload({
        draftBody: 'same',
        baselineBody: 'same',
        debounceScheduled: false,
        saveInFlight: false,
      })
    ).toBe(false);
  });
});
