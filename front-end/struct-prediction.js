var predictionMap = {};
// initially nothing.
var structurePath = [ { smiles : "" } ];
var structurePathIndex = structurePath.length - 1;
var predictionIndex = -1;

( function($) {

    $('#ketcherFrame').on('load', function () {   
        var ketcher = getKetcher();
        ketcher.onStructChange(function() {
            var path = [];
            if (predictionIndex != -1){
                path = predictionMap[predictionIndex].path;
                predictionIndex = -1;
            }
            var newStrut = { "smiles": ketcher.getSmiles(), "mol": ketcher.getMolfile() , "path": path};
            var pastStruct = structurePath[structurePathIndex - 1];
            var futureStruct = structurePath[structurePathIndex + 1];

            // Move back or forwards in the history if redo or undo.
            var undo = (pastStruct && pastStruct.smiles == newStrut.smiles);
            var redo = (futureStruct && futureStruct.smiles == newStrut.smiles);
            if (!undo && !redo){
                structurePathIndex++;
                structurePath.splice(structurePathIndex, 0, newStrut);
            } else if (undo){
                structurePathIndex--;
            }else if (redo){
                structurePathIndex++;
            }
            console.log("full-struct path:", structurePath);
            requestPredictions(newStrut.smiles);
        });
    });

    $( document ).ready(function() {
        
        $('#drawStructureModal').modal('show');

        $('.prediction-panel').click(function() {
            setStructure($(this).data("panel-id"))
        });

        $('#searchBtn').click(function() {
            addStructure();
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
            type: "get",
            datatype: "json",
            contentType: "application/json",
            headers: { userId: user.userId, groupId: user.groupId }, 
            data:{"smiles": smiles},
            
            success: function(response) {
                requestPredictionSuccess(response);
                console.log("predictions: ", response);
            },
            
            error: function(xhr) {
                console.log(xhr);
            }
        });
    }

    function addStructure(){
        if (structurePath.length != 1){
            var user = getMetadata();
            structurePath = flattenStructurePath(structurePath, structurePathIndex);
            $.ajax({
                url: "http://localhost:8080/add/structure/",
                type: "post",
                datatype: "json",
                contentType: "application/json",
                headers: { userId: user.userId, groupId: user.groupId }, 
                data: JSON.stringify( structurePath ),
                success: function(){
                    clearKetcher();   
                },
                error: function(xhr) {
                    console.log(xhr);
                }
            });
        }
    }

    function clearKetcher(){
        var ketcher = getKetcher();
        if(ketcher){
            document.getElementById('ketcherFrame').src = document.getElementById('ketcherFrame').src;
            structurePath = [ { smiles : "" } ];
            structurePathIndex = structurePath.length - 1;
        }
    }

    function flattenStructurePath(structurePath, structurePathIndex){
        flatPath = [];
        // i = 1, first empty structure not important
        for(var i = 1; i <= structurePathIndex; i++){
            // Add path inside structure to the flatpath.
            var pathToStruct = structurePath[i].path;
            if (pathToStruct){
                for(var j = 0; j < pathToStruct.length; j++){
                    flatPath.push( { "smiles" : pathToStruct[j] } );
                }
            }
            flatPath.push(structurePath[i]);
        }
        console.log("flat Path: ", flatPath);
        return flatPath;
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

        var molfile = prediction.endStructure.mol;

        var result = getKetcher().showMolfile($('<li>').appendTo(panel)[0], molfile, {
            bondLength: 20,
            autoScale: true,
            autoScaleMargin: 20,
            debug: true, 
            ignoreMouseEvents: true
        });

        var header = $("#panel-" + panelNumber + "-footer");
        header.text(prediction.probability);

        if (result){
             predictionMap[panelNumber] = prediction;
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
        var header = $("#panel-" + panelNumber + "-footer");
        header.text("");
    }

    function setStructure(pannelId) {
        var structure = predictionMap[pannelId];
        var molfile = structure.endStructure.mol
        var ketcher = getKetcher();
        if (ketcher && molfile){
            // prediction number picked.
            predictionIndex = pannelId;
            ketcher.setMolecule(molfile);
        }
    }

    function getMetadata(){
        var array = $('#metadataForm').serializeArray();
        return { userId : array[0].value, groupId : array[1].value};
    }

} ) ( jQuery );