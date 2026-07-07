package com.fengting.aigcforensics.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.storage")
public record AppStorageProperties(String root) {

    public String root() {
        return root == null || root.isBlank() ? "storage" : root;
    }
}
