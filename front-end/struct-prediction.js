var predictionMap = {};
var lastSmile;

( function($) {

    $('#ketcherFrame').on('load', function () {   
        var ketcher = getKetcher();
        ketcher.onStructChange(function() {
            requestPredictions(ketcher.getSmiles());
        });
    });

    $( document ).ready(function() {
        
        $('#drawStructureModal').modal('show');

        $('.prediction-panel').click(function() {
            setStructure($(this).data("panel-id"))
        });

        // Remove test button at some point.
        var test = document.getElementById("test");
        test.addEventListener("click", function(event){
            addPrediction(0);
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
        if (lastSmile != smiles){
            lastSmile = smiles;
            $.ajax({
                url: "http://localhost:8080/prediction",
                type: "get", //send it through get method
                data:{smile: smiles},
                success: function(response) {
                    requestPredictionSuccess(response);
                },
                error: function(xhr) {
                    console.log(xhr);
                }
            });
        }
    }

    function requestPredictionSuccess(response){
        console.log(response);
        i = 0;
        while(i < response.size){
            addPrediction(i, response[i]);
            i++;
        }
        while(i < 3){
            resetPanel(i);
        }
    }

    function addPrediction(panelNumber, prediction){

        var panel = $("#panel-" + panelNumber);
        panel.empty();
        panel.parent().addClass("active");

        //TODO change from: whatever is in the current set up.
        var molfile = prediction.getMolfile();

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