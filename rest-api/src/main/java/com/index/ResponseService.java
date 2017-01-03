package com.index;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class ResponseService
{

    @Autowired
    private StructureRepo repo;

    public Response createResponse()
    {
        String test = "Hello World";
        return new Response(test);
    }

    public Iterable<Structure> prediction(){
        return repo.findAll();
    }
}
