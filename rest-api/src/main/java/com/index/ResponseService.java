package com.index;

import org.springframework.stereotype.Service;

@Service
public class ResponseService
{

    public Response createResponse()
    {
        String test = "Hello World";
        return new Response(test);
    }
}
