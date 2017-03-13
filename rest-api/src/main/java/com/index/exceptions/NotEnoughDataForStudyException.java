package com.index.exceptions;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Created by jaco1a on 13/03/17.
 */
@ResponseStatus(value=HttpStatus.METHOD_NOT_ALLOWED, reason="Not enough data for this user to run the study")  // 404
public class NotEnoughDataForStudyException extends Exception {
}
