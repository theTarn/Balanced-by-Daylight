/*
Name:
    checker-modal.js
Purpose:
    This file is designed for the purpose of handling notes in the checker page.
    Notes and maps are shown in the Notes & Maps tab; new notes are marked on that tab.
*/

/**
 * Checks whether this balancing profile has global notes and, if the app is to mark new notes, marks them.
 */
function CheckGlobalBalanceNotes() {
    UpdateNotesTabMark();
}

/**
 * Marks the notes of the selected killer if they haven't been opened yet (and the setting is enabled).
 */
function CheckIndividualKillerNotes() {
    UpdateNotesTabMark();
}

/**
 * Checks whether a note string contains a link-like value.
 */
function ContainsLink(text) {
    if (text == undefined || text == null) { return false; }
    if (typeof text !== "string") { return false; }

    return /<a\b[^>]*\bhref\s*=/i.test(text) ||
        /(?:https?:\/\/|www\.)\S+/i.test(text);
}
