var hostAddress = "http://localhost:17938/structure-prediction";
//var hostAddress = "https://jacr.host.cs.st-andrews.ac.uk/structure-prediction"

var dateFormat = "YYYY-MM-DD HH:mm:ss:SSS";

var predictionMap = {};
// initially nothing.
var structurePath = [ { smiles : "" } ];
var structurePathIndex = structurePath.length - 1;
var predictionIndex = -1;
var startTime = null;
var undos = 0;

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
                undos++;
                structurePathIndex--;
            }else if (redo){
                structurePathIndex++;
            }
            
            console.log("index", structurePathIndex);
            console.log("full-struct path:", structurePath);
            console.log("flat Path: ", flattenStructurePath(structurePath, structurePathIndex));
            //requestPredictions(newStrut.smiles);
        });
    });

    $( document ).ready(function() {
        
        //$('#drawStructureModal').modal('show');

        $('.prediction-panel').click(function() {
            setStructure($(this).data("panel-id"))
        });

        $('#saveBtn').click(function() {
            saveStructureStudy(structurePath);
            //saveStructure(structurePath);
        });

        $('#cleanBtn').click(function(){
            getMolfileForSmiles(true);
        });

        // For Study, sets startTime of drawing, and initalization of errors.
        $('#drawStrucutre').click(function(){
            if (startTime == null){
                startTime = moment().format(dateFormat);
                console.log("startTime:", startTime);
                undos = 0;
            }
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
            url: hostAddress + "/prediction",
            type: "get",
            datatype: "json",
            contentType: "application/json; charset=utf-8",
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

    function saveStructure(structurePath){
        startTime = null;
        if (structurePath.length != 1){
            var user = getMetadata();
            flatPath = flattenStructurePath(structurePath, structurePathIndex);
            $.ajax({
                url:  hostAddress + "/add/structure",
                type: "post",
                datatype: "json",
                contentType: "application/json; charset=utf-8",
                headers: { userId: user.userId, groupId: user.groupId}, 
                data: JSON.stringify( flatPath ),
                success: function(){
                    resetKetcher();   
                },
                error: function(xhr) {
                    console.log(xhr);
                }
            });
        }
    }


    function saveStructureStudy(structurePath){
        if (structurePath.length != 1){
            var user = getMetadata();
            flatPath = flattenStructurePath(structurePath, structurePathIndex);
            $.ajax({
                url:  hostAddress + "/add/structure/study",
                type: "post",
                datatype: "json",
                contentType: "application/json; charset=utf-8",
                headers: { userId: user.userId, groupId: user.groupId, undos: undos, startTime: startTime }, 
                data: JSON.stringify( flatPath ),
                success: function(){
                    resetKetcher();   
                },
                error: function(xhr) {
                    console.log(xhr);
                }
            });
        }
        startTime = null;
    }


    function getMolfileForSmiles(repeat){
        var ketcher = getKetcher();
        if (ketcher){
            var smiles = ketcher.getSmiles();
            if (smiles.length > 0){
                $.ajax({
                    url:  hostAddress + "/generate/molfile",
                    type: "get",
                    datatype: "json",
                    contentType: "application/json; charset=utf-8",
                    headers: {  }, 
                    data: { "smiles": smiles },
                    success: function(response){
                        getMoflieOnSuccess(response, false);
                    },
                    error: function(xhr) {
                        console.log(xhr);
                    }
                });
            }
        }
    }

    function getMoflieOnSuccess(response, repeat){
        var ketcher = getKetcher();
        if (ketcher){
            var molfile = response;
            var start = "Ketcher 01301715232D 1   1.00000     0.00000     0\n\n";
            molfile = start + molfile;
            ketcher.setMolecule(molfile);
            if (repeat){
                getMolfileForSmiles(false);
            }
        }
    }

    function resetKetcher(times){
        var ketcher = getKetcher();
        if(ketcher){
            document.getElementById('ketcherFrame').src = document.getElementById('ketcherFrame').src;
            structurePath = [ { smiles : "" } ];
            structurePathIndex = structurePath.length - 1;
            resetNumberOfPanels(0);
        }
    }

    function flattenStructurePath(structurePath, index){
        flatPath = [];
        // i = 1, first empty structure not important
        for(var i = 1; i <= index; i++){
            // Add path inside structure to the flatpath.
            var pathToStruct = structurePath[i].path;
            if (pathToStruct){
                for(var j = 0; j < pathToStruct.length; j++){
                    flatPath.push( { "smiles" : pathToStruct[j] } );
                }
            }
            flatPath.push(structurePath[i]);
        }
        return flatPath;
    }


    function requestPredictionSuccess(response){
        i = 0;

        while(i < response.length && i < 4){
            addPrediction(i, response[i]);
            i++;
        }
        resetNumberOfPanels(i);
    }

    function resetNumberOfPanels(i){
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

