//var hostAddress = "http://localhost:17938/structure-prediction";
var hostAddress = "https://jacr.host.cs.st-andrews.ac.uk/structure-prediction"

var dateFormat = "YYYY-MM-DD HH:mm:ss:SSS";

var predictionMap = {};
// initially nothing.
var structurePath = [ { smiles : "" } ];
var structurePathIndex = structurePath.length - 1;
var predictionIndex = -1;
var startTime = null;

var numberOfStructsToDraw = 10;
var numOfStructs = 0;
var predictionsUsed = 0;

var isStudy = false;
var predictionsOn = false;

var listOfStructures = [];
var structureSkipIndex = 0;

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

            // Move back or forwards in the history if redo or undo. Removes them from the path.
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
            
            console.log("index", structurePathIndex);
            console.log("full-struct path:", structurePath);
            console.log("flat Path: ", flattenStructurePath(structurePath, structurePathIndex));
            if (predictionsOn == "true"){
                requestPredictions(newStrut.smiles);
            }
        });
    });

    $( document ).ready(function() {
        
        // Get custom values.
        isStudy = $('#isStudy').attr("value");
        predictionsOn = $('#predictionsOn').attr("value");

        if (isStudy == 'true' && predictionsOn == 'true'){
            getStructuresFromUserId();
            
	    $('#forceNext').click(function(){
                forceNextStructure();
            });
        }

        $('.prediction-panel').click(function() {
            setStructure($(this).data("panel-id"));
        });

        $('#saveBtn').click(function() {
            if(isStudy == "true"){
                saveStructureStudy(structurePath);
            }else{
                saveStructure(structurePath);
            }
        });

        $('#cleanBtn').click(function(){
            getMolfileForSmiles(true);
        });

        // For Study, sets startTime of drawing, and initalization of errors.
        $('#drawStrucutre').click(function(){
            if (startTime == null){
                startTime = moment().format(dateFormat);
            }
        });

        $("#userId").change(function(){
            if (isStudy == 'true' && predictionsOn == 'true'){
                getStructuresFromUserId();
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
            headers: { userId: user.userId, groupId: user.groupId, type : 1 }, 
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
                    numberOfStructsDrawn();   
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
                headers: { userId: user.userId, groupId: user.groupId, startTime: startTime, predictionsUsed : predictionsUsed }, 
                data: JSON.stringify( flatPath ),
                success: function(){
                    resetKetcher();
                    numberOfStructsDrawn();
                },
                error: function(xhr) {
                    console.log(xhr);
                }
            });
        }
        startTime = null;
    }

    function getStructuresFromUserId(){
        var user = getMetadata();
        $.ajax({
            url:  hostAddress + "/get/structures/userid",
            type: "get",
            datatype: "json",
            contentType: "application/json; charset=utf-8",
            headers: { userId: user.userId },
            success: function(response){
                listOfStructures = response;
                console.log(listOfStructures);
                if (listOfStructures.length > 0){
                    var panel = $("#panel-draw-study");
                    addStructureToPanel(panel, listOfStructures[0].mol);
                }
            },
            error: function(xhr) {
                console.log(xhr);
            }
        });
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


    function addStructureToPanel(panel, molfile){
        panel.empty();
        panel.parent().addClass("active");

        var result = getKetcher().showMolfile($('<li>').appendTo(panel)[0], molfile, {
            bondLength: 20,
            autoScale: true,
            autoScaleMargin: 20,
            debug: true, 
            ignoreMouseEvents: true
        });
        return result;
    }

    function addPrediction(pannelId, prediction){
        var panel = $("#panel-" + pannelId);
        var molfile = prediction.endStructure.mol;
        
        result = addStructureToPanel(panel, molfile);

        var header = $("#panel-" + pannelId + "-footer");
        header.text(prediction.probability);

        if (result){
             predictionMap[pannelId] = prediction;
         }else{
             //TODO remove this alert to a better error message. 
             alert("error");
        }
    }

    function restPanel(pannelId){
        var panel = $("#panel-" + pannelId);
        panel.empty();
        panel.parent().removeClass("active");
        predictionMap[pannelId] = null;
        var header = $("#panel-" + pannelId + "-footer");
        header.text("");
    }

    function setStructure(pannelId) {
        var structure = predictionMap[pannelId];
        if (structure != null){
            predictionsUsed++;
            var molfile = structure.endStructure.mol
            var ketcher = getKetcher();
            if (ketcher && molfile){
                // prediction number picked.
                predictionIndex = pannelId;
                ketcher.setMolecule(molfile);
            }
        }
    }

    function getMetadata(){
        var array = $('#metadataForm').serializeArray();
        return { userId : array[0].value, groupId : array[1].value};
    }

    function forceNextStructure(){
	structureSkipIndex++;
	if (listOfStructures[numOfStructs + structureSkipIndex] != null){
	    var panel = $("#panel-draw-study");
            addStructureToPanel(panel, listOfStructures[numOfStructs + structureSkipIndex].mol);
	} else {
	    $("#drawInfo").text("Looks like you have run out of structures to draw!");
	}
    }

    function numberOfStructsDrawn(){
        $("#numOfStruts").text("Structures Drawn: " + ++numOfStructs);
        //Set next structure to Draw if Study
        if (isStudy == "true"){
            if (listOfStructures[numOfStructs + structureSkipIndex] != null){
                var panel = $("#panel-draw-study");
                addStructureToPanel(panel, listOfStructures[numOfStructs + structureSkipIndex].mol);
            } else {
	         $("#drawInfo").text("Looks like you have run out of structures to draw!.");   
    	    }
                
            if (numOfStructs == numberOfStructsToDraw ){
                $("#info").text("Thank you for finishing the study. Please give feedback! The feedback link is in the bar in the top right corner of the page.");
                $("#drawStrucutre").prop('disabled', true);
            }
        }
    }

} ) ( jQuery );


