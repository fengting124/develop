package com.fengting.aigcforensics.controller;

import static org.assertj.core.api.Assertions.assertThat;

import java.lang.reflect.Method;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

class ApiExceptionHandlerTest {

    @Test
    void mapsMultipartLimitToPayloadTooLarge() throws Exception {
        ApiExceptionHandler handler = new ApiExceptionHandler();

        var response = handler.handleUploadTooLarge(new MaxUploadSizeExceededException(10L));
        Method method = ApiExceptionHandler.class.getMethod(
                "handleUploadTooLarge",
                MaxUploadSizeExceededException.class);

        assertThat(response.message()).isEqualTo("Uploaded file exceeds the configured request limit");
        assertThat(method.getAnnotation(ResponseStatus.class).value())
                .isEqualTo(HttpStatus.PAYLOAD_TOO_LARGE);
    }
}
