# Upload Security Boundary

This runbook defines which image inputs the backend accepts, how it validates
them, and which controls remain deployment responsibilities.

## Accepted Formats

The backend accepts only content that is both signature-compatible and
decodable as:

| Format | Canonical MIME | Stored extension |
| --- | --- | --- |
| JPEG | `image/jpeg` | `.jpg` |
| PNG | `image/png` | `.png` |
| WebP | `image/webp` | `.webp` |

The multipart `Content-Type`, filename, and extension are not trusted for type
detection. The API derives canonical type from the file signature and the
ImageIO reader that successfully decodes the content. WebP decoding is supplied
by the maintained TwelveMonkeys ImageIO plugin.

## Validation Order

```text
Spring multipart request limit
  -> application encoded-byte limit
  -> signature allowlist
  -> ImageIO reader and signature agreement
  -> width and height inspection before full decode
  -> decoded pixel-count limit
  -> complete first-image decode
  -> SHA-256 of original evidence
  -> generated storage path
  -> database asset and task records
```

Rejected bytes never enter the application's accepted upload directory. The
servlet container may use its own temporary multipart storage while receiving a
request; its lifecycle remains container-managed.

## Default Limits

| Environment variable | Default | Purpose |
| --- | --- | --- |
| `APP_UPLOAD_MAX_FILE_SIZE` | `10MB` | Spring per-file transport limit |
| `APP_UPLOAD_MAX_REQUEST_SIZE` | `11MB` | Spring multipart request limit |
| `APP_UPLOAD_MAX_BYTES` | `10485760` | Repeated application byte limit |
| `APP_UPLOAD_MAX_WIDTH` | `8192` | Maximum decoded width |
| `APP_UPLOAD_MAX_HEIGHT` | `8192` | Maximum decoded height |
| `APP_UPLOAD_MAX_PIXELS` | `25000000` | Maximum width multiplied by height |
| `APP_UPLOAD_MAX_FILENAME_LENGTH` | `255` | Display metadata length only |

Transport and application limits are intentionally separate. A reverse proxy,
servlet container, or future ingestion adapter cannot silently remove the
business-layer byte limit.

Transport-level overflow returns `413 Payload Too Large`. Content and decoded
dimension failures return `400 Bad Request` with a deterministic reason.

## Storage Rules

- User-controlled filenames never become path components.
- Accepted files use `uploads/{assetId}/{assetId}.{canonicalExtension}`.
- Asset ids and extensions pass strict character allowlists.
- Writes use a generated temporary file and an atomic move when supported.
- Existing files are not overwritten.
- The storage root is separate from frontend static assets and has no download
  route in the current product boundary.
- The original filename is retained only as bounded, control-character-free
  display metadata.

## Evidence Preservation

Many upload services re-encode images to remove metadata and active content.
This project deliberately does not re-encode accepted evidence. Re-encoding can
change EXIF data, JPEG quantization, compression artifacts, and other signals
that authenticity analysis may need.

The compensating controls are strict format decoding, generated non-executable
storage names, non-public storage, size and pixel limits, and a narrow model
service contract. Do not expose the upload directory through a generic static
file server.

## Deployment Checklist

1. Mount `STORAGE_ROOT` outside the frontend web root.
2. Grant the backend user read/write access without execute permission.
3. Apply an equal or smaller request limit at the reverse proxy.
4. Monitor rejected uploads and storage growth without logging image bytes.
5. Keep the TwelveMonkeys dependency and JDK patched.
6. Add authentication, per-user quotas, and rate limiting before public access.
7. Add an isolated antivirus or sandbox adapter before accepting uploads from
   untrusted public users at scale.

## Verification Boundary

Automated tests cover JPEG, PNG, and a real TwelveMonkeys WebP fixture; spoofed
MIME headers; invalid signatures; truncated input; encoded bytes; dimensions;
decoded pixels; filename traversal; generated storage paths; atomic storage;
and the `413` exception contract.

Antivirus behavior, object-storage quarantine, concurrent disk exhaustion, and
container temporary-file cleanup require the later server and Docker
environment. They are not claimed by this branch.

## References

- [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)
- [OWASP ASVS File and Resource Requirements](https://github.com/OWASP/ASVS/blob/master/4.0/en/0x20-V12-Files-Resources.md)
- [Oracle ImageReader API](https://docs.oracle.com/en/java/javase/25/docs/api/java.desktop/javax/imageio/ImageReader.html)
- [TwelveMonkeys ImageIO](https://github.com/haraldk/TwelveMonkeys)
