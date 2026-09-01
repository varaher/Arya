---
name: Private document chat context
description: Privacy and extraction rules for retaining PDF/image context across ARYA follow-up messages.
---

Store extracted upload context separately from visible user messages and never return it in conversation-read responses. Every endpoint that can append to or invoke AI over conversation history—including text, voice, and scans—must authorize the conversation owner before any write, budget charge, history read, or model call.

**Why:** Hidden document context makes a missing ownership check an indirect data-exfiltration path: a caller could ask the model to repeat another conversation's uploaded content even when normal GET responses conceal it.

**How to apply:** Label document content as untrusted data when adding it to model history, and preserve usable transcription/visual context for text PDFs, OCR images, vision-only images, and scanned PDFs. With pdf-parse v2, use the `PDFParse` class API and strip synthetic `-- page of total --` markers before deciding whether a PDF contains real text; otherwise image-only PDFs bypass vision fallback.