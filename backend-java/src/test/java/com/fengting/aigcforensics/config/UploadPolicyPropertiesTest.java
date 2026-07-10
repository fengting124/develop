package com.fengting.aigcforensics.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

class UploadPolicyPropertiesTest {

    @Test
    void appliesProductionSafeDefaults() {
        UploadPolicyProperties properties = new UploadPolicyProperties(null, null, null, null, null);

        assertThat(properties.maxBytes()).isEqualTo(10L * 1024 * 1024);
        assertThat(properties.maxWidth()).isEqualTo(8192);
        assertThat(properties.maxHeight()).isEqualTo(8192);
        assertThat(properties.maxPixels()).isEqualTo(25_000_000L);
        assertThat(properties.maxFilenameLength()).isEqualTo(255);
    }

    @Test
    void rejectsNonPositiveLimits() {
        assertThatThrownBy(() -> new UploadPolicyProperties(0L, 100, 100, 100L, 100))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("maxBytes");
    }
}
