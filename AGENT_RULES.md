# Agent Rules

## Attachments and Screenshots

Never save, copy, or download images or files attached in chat into the project directory. Attachments and screenshots are strictly for analysis and feedback purposes only. When a user shares an image or file:

1. Read and analyze the content visually.
2. Provide feedback, observations, or act on what is shown.
3. Do NOT add the file to the project's file system under any circumstances.

This applies to all file types: images (PNG, JPEG, WebP, etc.), documents, and any other attachments shared in conversation.

## Attention to Detail and Verification

1. Never assume a fix works. After making any change, trace through every code path that could trigger the behavior and verify the fix covers each one.
2. Do not mark work as completed until verification is done. If you cannot test the UI directly, re-read the changed code and the calling code to confirm correctness.
3. Before modifying code, read the actual current state of the file — do not rely on assumptions about what it contains.
4. When fixing a bug, check whether the same pattern exists in sibling components or parallel code paths (e.g., both DimensionsContent and FixedShapeDimensionsContent share the same logic).
5. Go the extra mile: check edge cases, check all navigation paths, and confirm that the fix handles the scenario the user reported.
