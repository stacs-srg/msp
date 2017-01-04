var predictionMap = {};
var lastSmile;
var ketcher;

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

        var test = document.getElementById("test");
        test.addEventListener("click", function(event){
            addPrediction(1);
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

    function addPrediction(panelNumber){

        var panel = $("#panel-" + panelNumber);

        panel.empty();

        panel.parent().addClass("active");

        //TODO change from: whatever is in the current set up.
        var molfile = ketcher.getMolfile();

        var result = ketcher.showMolfile($('<li>').appendTo(panel)[0], molfile, {
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

    function setStructure(pannelId) {
        var molfile = predictionMap[pannelId];
        if (ketcher && molfile){
            ketcher.setMolecule(molfile);
        }
    }

    function requestPredictions(smiles){
        if (lastSmile != smiles){
            lastSmile = smiles;
            $.ajax({
                url: "http://localhost:8080/prediction",
                type: "get", //send it through get method
                data:{smile: smiles},
                success: function(response) {
                    for(var i in response){
                        console.log(response);
                        addPrediction(response[i]);
                    }
                },
                error: function(xhr) {
                    console.log(xhr);
                }
            });
        }
    }

} ) ( jQuery );