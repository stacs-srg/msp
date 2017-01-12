var predictionMap = {};
var strucutresHistory = { structures : [], index : 0 };

( function($) {

    $('#ketcherFrame').on('load', function () {   
        var ketcher = getKetcher();
        ketcher.onStructChange(function() {
            var newStrut = { smiles: ketcher.getSmiles(), mol : ketcher.getMolfile() };
            
            var structures = strucutresHistory.structures;

            if (strucutresHistory.index == 0){
                var top = { smiles : ""};
                structures.push(top);
            }
            
            var lastStrut = structures[strucutresHistory.index - 1];
            var futureStrut = structures[strucutresHistory.index + 1];
            var undo = false;
            var redo = false;
            if (lastStrut && lastStrut.smiles == newStrut.smiles){
                undo = true;
            }

            if (futureStrut && futureStrut.smiles == newStrut.smiles){
                redo = true;
            }

            if (!undo && !redo){
                // ingore the starting edge. 
                if(lastStrut){
                    addUserDecision(lastStrut, newStrut);
                }

                structures.splice(++strucutresHistory.index, 0, newStrut);
                requestPredictions(newStrut.smiles);
            } else if (undo){
                strucutresHistory.index--;
            }else if (redo){
                strucutresHistory.index++;
            }
        });
    });

    $( document ).ready(function() {
        
        $('#drawStructureModal').modal('show');

        $('.prediction-panel').click(function() {
            setStructure($(this).data("panel-id"))
        });

    });

    function getKetcher(){
        var frame = null;

        if ('frames' in window && 'ketcherFrame' in window.frames)
            frame = window.frames['ketcherFrame'];
        else
            return null;

        if ('window' in frame)            
            return frame.window.ketcher;
    }

    function requestPredictions(smiles){
        var user = getMetadata();
        $.ajax({
            url: "http://localhost:8080/prediction",
            type: "get", //send it through get method
            datatype: "json",
            contentType: "application/json",
            headers: { userId: user.userId, groupId: user.groupId }, 
            data:{"smiles": smiles},
            
            success: function(response) {
                requestPredictionSuccess(response);
            },
            
            error: function(xhr) {
                console.log(xhr);
            }
        });
    }

    function addUserDecision(from, to){
        var user = getMetadata();
        $.ajax({
            url: "http://localhost:8080/add/user/decision",
            type: "post", //send it through get method
            datatype: "json",
            contentType: "application/json",
            headers: { userId: user.userId, groupId: user.groupId }, 
            data: JSON.stringify( [to, from] ),
            error: function(xhr) {
                console.log(xhr);
            }
        });
    }

    function requestPredictionSuccess(response){
        i = 0;

        while(i < response.length && i < 4){
            addPrediction(i, response[i]);
            i++;
        }
        while(i < 4){
            restPanel(i);
            i++;
        }
    }

    function addPrediction(panelNumber, prediction){

        var panel = $("#panel-" + panelNumber);
        panel.empty();
        panel.parent().addClass("active");

        //TODO change from: whatever is in the current set up.
        var molfile = prediction.mol;

        var result = getKetcher().showMolfile($('<li>').appendTo(panel)[0], molfile, {
            bondLength: 20,
            autoScale: true,
            autoScaleMargin: 20,
            debug: true, 
            ignoreMouseEvents: true
        });

        if (result){
             predictionMap[panelNumber] = molfile;
         }else{
             //TODO remove this alert to a better error message. 
             alert("error");
        }
    }

    function restPanel(panelNumber){
        var panel = $("#panel-" + panelNumber);
        panel.empty();
        panel.parent().removeClass("active");
        predictionMap[panelNumber] = null;
    }

    function setStructure(pannelId) {
        var molfile = predictionMap[pannelId];
        var ketcher = getKetcher();
        if (ketcher && molfile){
            ketcher.setMolecule(molfile);
        }
    }

    function getMetadata(){
        var array = $('#metadataForm').serializeArray();
        return { userId : array[0].value, groupId : array[1].value};
    }

} ) ( jQuery );