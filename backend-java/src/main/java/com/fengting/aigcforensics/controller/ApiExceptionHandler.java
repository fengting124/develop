package com.fengting.aigcforensics.controller;

import java.time.Instant;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.support.MissingServletRequestPartException;

import com.fengting.aigcforensics.dto.error.ErrorResponse;
import com.fengting.aigcforensics.domain.InvalidJobOutboxStateException;
import com.fengting.aigcforensics.service.ResourceNotFoundException;

@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(IllegalArgumentException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ErrorResponse handleBadRequest(IllegalArgumentException exception) {
        return new ErrorResponse(exception.getMessage(), Instant.now());
    }

    @ExceptionHandler(InvalidJobOutboxStateException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public ErrorResponse handleConflict(InvalidJobOutboxStateException exception) {
        return new ErrorResponse(exception.getMessage(), Instant.now());
    }

    @ExceptionHandler(MissingServletRequestPartException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ErrorResponse handleMissingPart(MissingServletRequestPartException exception) {
        return new ErrorResponse("Missing required multipart field: " + exception.getRequestPartName(), Instant.now());
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ErrorResponse handleNotFound(ResourceNotFoundException exception) {
        return new ErrorResponse(exception.getMessage(), Instant.now());
    }
}
