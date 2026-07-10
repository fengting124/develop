# Upload Trust Boundary

**Branch:** `feature/upload-trust-boundary`

## Goal

Turn image upload into an explicit untrusted-input boundary that rejects
spoofed, malformed, oversized, and unsafe inputs before they enter durable
business storage.

## Research Basis

- [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)
  recommends allowlisted formats, size limits, signature and content
  validation, generated storage names, and storage outside the web root.
- [Oracle ImageReader API](https://docs.oracle.com/en/java/javase/25/docs/api/java.desktop/javax/imageio/ImageReader.html)
  exposes image dimensions before full pixel decoding.
- [TwelveMonkeys ImageIO](https://github.com/haraldk/TwelveMonkeys) provides a
  maintained WebP reader and documents dimension inspection before full decode.

No single check is treated as authoritative. The implementation uses layered
validation and keeps accepted originals outside the public frontend assets.

## Current Risks

- The browser-provided `Content-Type` decides whether a file is accepted.
- Validation happens after the file is written to durable upload storage.
- `ImageIO.read` decodes before any width, height, or pixel-count limit.
- Stored filenames retain user-controlled text.
- The API claims WebP support although the JDK has no built-in WebP reader.
- Spring multipart limits are not defined in repository configuration.

## Validation Pipeline

```text
multipart request limit
  -> non-empty and application byte limit
  -> read bytes once
  -> file signature allowlist (JPEG, PNG, WebP)
  -> select ImageIO reader and confirm reader format
  -> inspect width and height without pixel allocation
  -> enforce width, height, and total pixel limits with overflow-safe math
  -> fully decode first image to reject truncated/corrupt content
  -> derive canonical MIME and extension from validated content
  -> hash original evidence bytes
  -> store under generated asset id and canonical extension
  -> persist asset metadata and queued task
```

## Forensics-Specific Decision

The backend does not re-encode accepted images. Re-encoding would remove or
change metadata and compression artifacts that can be useful forensic signals.
Instead, the original bytes are retained under a generated non-executable name
outside the web root. Antivirus or sandbox scanning remains a future adapter
for server deployment.

## Defaults

- maximum encoded bytes: 10 MiB;
- maximum width: 8192 pixels;
- maximum height: 8192 pixels;
- maximum decoded pixels: 25,000,000;
- maximum display filename: 255 characters.

Spring's multipart request limit is set to the same file limit with a slightly
larger total request allowance. Application validation repeats the byte check
because transport configuration is not a domain guarantee.

## Java Boundaries

- `UploadPolicyProperties`: validated configuration with safe defaults.
- `ImageUploadInspector`: signature, reader, dimensions, full decode, and
  canonical type detection.
- `ValidatedImageUpload`: immutable validated metadata and original bytes.
- `UploadFilenameSanitizer`: display-only filename normalization and length
  bound.
- `LocalStorageService`: generated internal filename; no user-controlled path
  component.
- `DetectionWorkflowService`: orchestration and persistence only.

## TDD Sequence

1. Test policy defaults and invalid configuration.
2. Test valid JPEG/PNG/WebP inspection and canonical type detection.
3. Test spoofed client MIME, invalid signatures, corrupt files, dimensions,
   pixels, and encoded-byte limits.
4. Test generated storage names and path isolation.
5. Refactor workflow and controller tests around content-derived metadata.
6. Run all Java and cross-project verification, document operations, then use
   PR and CI gates.

## Deferred

- Authentication, per-user quotas, and rate limiting.
- ClamAV or sandbox integration on the GPU/server environment.
- Object-storage quarantine lifecycle and asynchronous malware scan state.
- Docker-backed filesystem/database rollback tests.
