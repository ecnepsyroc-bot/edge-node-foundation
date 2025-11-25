# Answer System Debug Report

## How the Answer System Should Work

### Correct Flow:
1. **Select a Question**: Click on a green question bubble (e.g., "Question: test 123456")
   - This highlights the question with a yellow border
   - Enables the "Answer" button in the top bar
   
2. **Click "Answer" Button**: Click the cyan "Answer" button in the top bar
   - Opens a modal popup with a textarea
   - Modal has "Add Answer" title
   
3. **Type Answer**: Type your answer in the modal textarea
   - NOT in the yellow border box (that's just the selected question indicator)
   - NOT in the main message input
   
4. **Submit**: Click "Submit Answer" button in the modal
   - Sends answer to server via `/api/messages/{id}/solve`
   - Answer appears in yellow box below the question
   - Question marked as solved with "● Answer" indicator

## Current Issue

### Observed Behavior:
- User sends messages "TEst 123456789" and "test 23456789"
- These appear as regular messages (dark teal bubbles)
- NOT appearing as answers in yellow boxes below questions

### Possible Causes:

1. **Modal Not Opening**
   - Answer button might not be triggering `openSolvedModal()`
   - Check browser console for errors
   
2. **Modal Hidden Behind Other Elements**
   - CSS z-index issue
   - Modal display: none not changing to flex
   
3. **User Bypassing Modal**
   - User typing in main input instead of waiting for modal
   - Messages sent as regular messages, not answers

## Code Locations

- **Answer Button Click Handler**: `leaves/ui/app.js` line 689
- **openSolvedModal Function**: `leaves/ui/app.js` line 1678
- **submitSolved Function**: `leaves/ui/app.js` line 1706
- **Answer Modal HTML**: `leaves/ui/index.html` line 93
- **Solution Display Logic**: `leaves/ui/app.js` line 1230-1253

## Testing Steps

1. Open browser console (F12)
2. Click a green question bubble
3. Check if `selectedQuestionId` is set
4. Click the "Answer" button
5. Check console for any errors
6. Verify modal appears (`#solved-modal` should have `display: flex`)
7. Type in the modal textarea
8. Submit and check network tab for `/api/messages/{id}/solve` PATCH request

## Quick Fix

If modal isn't appearing, check:
- CSS `.modal` z-index (should be very high, like 10000)
- Verify no JavaScript errors blocking modal display
- Ensure `display: flex` is being set on the modal element
