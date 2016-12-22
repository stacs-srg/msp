package com.index;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import static org.springframework.web.bind.annotation.RequestMethod.GET;

@RestController
public class ResponseController
{
    @Autowired
    private ResponseService service;

    @RequestMapping("/")
    public Response respond()
    {
        return service.createResponse();
    }

    @RequestMapping(method=GET, path="/predict")
    public Response response() {
        return service.createResponse();
    }
}
