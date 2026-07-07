package com.fengting.aigcforensics.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.model-registry.nonescape-mini")
public class NonescapeMiniModelProperties {

    private String endpointUrl = "http://localhost:5010";

    public String getEndpointUrl() {
        return endpointUrl;
    }

    public void setEndpointUrl(String endpointUrl) {
        this.endpointUrl = endpointUrl;
    }
}
