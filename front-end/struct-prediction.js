//var hostAddress = "http://localhost:17938/structure-prediction";
var hostAddress = "https://jacr.host.cs.st-andrews.ac.uk/structure-prediction"

var dateFormat = "YYYY-MM-DD HH:mm:ss:SSS";

var predictionMap = {};
// Used to keep track of path being created.
var structurePath = [ { smiles : "" } ];
var structurePathIndex = structurePath.length - 1;
var predictionIndex = -1;
// default value 10
var numberOfStructsToDraw = 10;
var numOfStructs = 0;
var structureSkipIndex = 0;
// Data that is sent for study
var studyData = { startTime: null, userId : null, predictionsUsed : 0, predictionType : 0, rubs : 0, undos : 0};
// Settings on what to use.
var htmlSettings = { isStudy : false, predictionsOn : true }
// Describes the structures format for the study data. 
// GROUPS: no-prediction: 0, user : 1, groups: 2, both: 3
var description = { numUserStructures: 4, numOtherStructures : 3, numOfGroups : 4 }
// List of strucutres that is producted from the desciption.
var structuresToDraw = null;

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
            if (htmlSettings.predictionsOn){
                requestPredictions(newStrut.smiles);
            }
        });
    });

    $( document ).ready(function() {
        
        // Get custom values for each HTML page. 
        htmlSettings.isStudy = ( $('#isStudy').attr("value") == "true");
        htmlSettings.predictionsOn = ( $('#predictionsOn').attr("value") == "true");
        // If both things are true, then we are in study-2
        if (htmlSettings.isStudy && htmlSettings.predictionsOn){
            getStructuresForUserToDrawStudy();
            
           $('#forceNext').click(function(){
                forceNextStructure();
            });

            $("#userId").change(function(){
                getStructuresForUserToDrawStudy();
            });

        } else if (htmlSettings.isStudy){
            $("#numOfStruts").text("Structures Drawn: " + numOfStructs + " out of " + numberOfStructsToDraw);
        } else {
            $("#numOfStruts").text("Structures Drawn: " + numOfStructs);
        }
        // Panel pressed, set the ketcker to that structure
        $('.prediction-panel').click(function() {
            setStructure($(this).data("panel-id"));
        });

        $('#saveBtn').click(function() {
            if(htmlSettings.isStudy){
                saveStructureStudy(structurePath);
            }else{
                saveStructure(structurePath);
            }
        });

        $('#cleanBtn').click(function(){
            getMolfileForSmiles();
        });
        // For Study, sets startTime of drawing, and initalization of errors.
        $('#drawStrucutre').click(function(){
            if (studyData.startTime == null){
                $("#panel-draw-study").hide();
                studyData.startTime = moment().format(dateFormat);
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
        // Gets the type of prediction else just default.
        var type = (structuresToDraw == null || structuresToDraw.structures.length <= 0 ? 1 : structuresToDraw.types[numOfStructs + structureSkipIndex]);
        $.ajax({
            url: hostAddress + "/prediction",
            type: "get",
            datatype: "json",
            contentType: "application/json; charset=utf-8",
            headers: { userId: user.userId, groupId: user.groupId, predictionType : type }, 
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

    function resetKetcher(times){
        var ketcher = getKetcher();
        if(ketcher){
            document.getElementById('ketcherFrame').src = document.getElementById('ketcherFrame').src;
            structurePath = [ { smiles : "" } ];
            structurePathIndex = structurePath.length - 1;
            resetNumberOfPanels(0);
        }
    }

    function saveStructureStudy(structurePath){
        if (structurePath.length != 1){
            var user = getMetadata();
            flatPath = flattenStructurePath(structurePath, structurePathIndex);
            var type = (structuresToDraw == null || structuresToDraw.structures.length <= 0 ? 1 : structuresToDraw.types[numOfStructs + structureSkipIndex]);
            // Whether to just save structure and study data or just study data.
            var path = (htmlSettings.predictionsOn) ? "/add/study" : "/add/structure/study";
            console.log()
            // Set up study Data object.
            studyData.userId = user.userId;
            studyData.predictionType = type;
            var studyDataJson = JSON.stringify(studyData);

            $.ajax({
                url:  hostAddress + path,
                type: "post",
                datatype: "json",
                contentType: "application/json; charset=utf-8",
                headers: { groupId: user.groupId, studyDataJson: studyDataJson }, 
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
        studyData.startTime = null;
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

    function getMolfileForSmiles(){
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
                        getMoflieOnSuccess(response);
                    },
                    error: function(xhr) {
                        console.log(xhr);
                    }
                });
            }
        }
    }

    function getMoflieOnSuccess(response){
        var ketcher = getKetcher();
        if (ketcher){
            var molfile = response;
            var start = "Ketcher 01301715232D 1   1.00000     0.00000     0\n\n";
            molfile = start + molfile;
            ketcher.setMolecule(molfile);
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

        var prob = prediction.probability;
        prob = (prob.countDecimals() > 1) ? prob.toFixed(2) : prob ;
        var header = $("#panel-" + pannelId + "-footer");
        header.text(prob);

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
            studyData.predictionsUsed++;
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


// -----------------------------------------------------------------------------------------------
//      Functions for Study
// -----------------------------------------------------------------------------------------------

    function forceNextStructure(){
        structureSkipIndex++;
        if (structuresToDraw.structures[numOfStructs + structureSkipIndex] != null){
            var panel = $("#panel-draw-study");
            addStructureToPanel(panel, structuresToDraw.structures[numOfStructs + structureSkipIndex].mol);
        } else {
            $("#drawInfo").text("Looks like you have run out of structures to draw!");
        }
    }

    function numberOfStructsDrawn(){
        //Set next structure to Draw if Study 
        if (htmlSettings.isStudy){
            $("#numOfStruts").text("Structures Drawn: " + ++numOfStructs + " out of " + numberOfStructsToDraw);

            if (structuresToDraw != null && structuresToDraw.structures[numOfStructs + structureSkipIndex] != null){
                var panel = $("#panel-draw-study");
                panel.show();
                addStructureToPanel(panel, structuresToDraw.structures[numOfStructs + structureSkipIndex].mol);
            } else if (numOfStructs == numberOfStructsToDraw ){
                $("#info").text("Thank you for finishing the study. Please give feedback. The feedback link is in the bar in the top right corner of the page.");
                $("#drawStrucutre").prop('disabled', true);
            }else {
                $("#drawInfo").text("Looks like you have run out of structures to draw.");   
            }
                
        } else {
            $("#numOfStruts").text("Structures Drawn: " + ++numOfStructs);
        }
    }

    function getStructuresForUserToDrawStudy(){
        var user = getMetadata();
        var descirptionJson = JSON.stringify( description );
        $.ajax({
            url:  hostAddress + "/get/structures/userid",
            type: "get",
            datatype: "json",
            contentType: "application/json",
            headers: { userId: user.userId, "description" : descirptionJson },

            success: function(response){
                console.log(response)
                setUserStructuresToDraw(response);
            	$("#drawInfo").text("");
	    },
            error: function(xhr) {
                if (xhr.responseText != null && (xhr.responseText).includes("\"exception\":\"com.index.exceptions.NotEnoughDataForStudyException\"")){
                    $("#drawInfo").text(" Current user does not have enough data to do study. ");
                }else{
                    $("#drawInfo").text("");
		    console.log(xhr);
                }
            }
        });
    }

    function setUserStructuresToDraw(response){
        structuresToDraw = response;
        if (structuresToDraw.structures.length > 0){
            numberOfStructsToDraw = structuresToDraw.structures.length;
            $("#numOfStruts").text("Structures Drawn: " + numOfStructs + " out of " + numberOfStructsToDraw);
            var panel = $("#panel-draw-study");
            addStructureToPanel(panel, structuresToDraw.structures[0].mol);
        }
    }

    Number.prototype.countDecimals = function () {
        if(Math.floor(this.valueOf()) === this.valueOf()) return 0;
        return this.toString().split(".")[1].length || 0; 
    }

} ) ( jQuery );


