# Agent Rules

## Attachments and Screenshots — ABSOLUTE RULE

**NEVER add, save, copy, download, or generate images into the project unless the user specifically and explicitly asks for an image to be added.** This is non-negotiable. No exceptions. No "it would look nice." No "the design needs it." If the user did not ask for an image, do not add one.

When a user shares an image or file in chat:

1. **Analyze it** — read and understand the content visually.
2. **Respond to the user's question or comment** — give an opinion, answer a question, or provide feedback, especially in relation to whatever comment the user wrote alongside the image.
3. **Do NOT add the file to the project** under any circumstances.

This applies to all file types: images (PNG, JPEG, WebP, etc.), documents, and any other attachments shared in conversation. It also applies to AI-generated images — do not use image generation tools unless the user explicitly requests it.

## Attention to Detail and Verification

1. Never assume a fix works. After making any change, trace through every code path that could trigger the behavior and verify the fix covers each one.
2. Do not mark work as completed until verification is done. If you cannot test the UI directly, re-read the changed code and the calling code to confirm correctness.
3. Before modifying code, read the actual current state of the file — do not rely on assumptions about what it contains.
4. When fixing a bug, check whether the same pattern exists in sibling components or parallel code paths (e.g., both DimensionsContent and FixedShapeDimensionsContent share the same logic).
5. Go the extra mile: check edge cases, check all navigation paths, and confirm that the fix handles the scenario the user reported.
