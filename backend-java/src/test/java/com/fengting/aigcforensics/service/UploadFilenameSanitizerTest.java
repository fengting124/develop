package com.fengting.aigcforensics.service;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class UploadFilenameSanitizerTest {

    private final UploadFilenameSanitizer sanitizer = new UploadFilenameSanitizer(20);

    @Test
    void keepsOnlyLeafNameAcrossPlatformSeparators() {
        assertThat(sanitizer.sanitize("../../folder\\evidence.png"))
                .isEqualTo("evidence.png");
    }

    @Test
    void removesControlCharactersAndBoundsDisplayLength() {
        assertThat(sanitizer.sanitize("report\r\n<script>.png"))
                .isEqualTo("report__<script>.png");
        assertThat(sanitizer.sanitize("a".repeat(30) + ".png"))
                .hasSize(20);
    }

    @Test
    void suppliesFallbackForMissingOrUnsafeName() {
        assertThat(sanitizer.sanitize(null)).isEqualTo("upload.bin");
        assertThat(sanitizer.sanitize("..\\..\\" )).isEqualTo("upload.bin");
    }
}
