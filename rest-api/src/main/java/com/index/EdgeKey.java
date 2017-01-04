package com.index;

import javax.persistence.Column;
import javax.persistence.Embeddable;
import java.io.Serializable;

/**
 * Created by jacr on 04/01/17.
 */
@Embeddable
class EdgeKey implements Serializable {

    @Column
    private String smileTo;

    @Column
    private String smileFrom;

    public EdgeKey(){

    }

    public EdgeKey(String smileTo, String smileFrom){
        this.smileTo = smileTo;
        this.smileFrom = smileFrom;
    }

    public String getSmileTo() {
        return smileTo;
    }

    public void setSmileTo(String smileTo) {
        this.smileTo = smileTo;
    }

    public String getSmileFrom() {
        return smileFrom;
    }

    public void setSmileFrom(String smileFrom) {
        this.smileFrom = smileFrom;
    }

}