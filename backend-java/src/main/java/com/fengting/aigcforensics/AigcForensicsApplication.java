package com.fengting.aigcforensics;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class AigcForensicsApplication {

    public static void main(String[] args) {
        SpringApplication.run(AigcForensicsApplication.class, args);
    }
}
