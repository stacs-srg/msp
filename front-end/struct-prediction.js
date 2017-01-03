// 0 zero for current. 
var predictionMap = {};

( function($) {
    
    $( document ).ready(function() {
        
        $('#drawStructureModal').modal('show');

        $('.prediction-panel').click(function() {
            setStructure($(this).data("panel-id"))
        });

        var test = document.getElementById("test");
        test.addEventListener("click", function(event){
            AddPrediction(1);
        });
    });

    function getKetcher(){
        var frame = null;

        if ('frames' in window && 'ketcherFrame' in window.frames)
            frame = window.frames['ketcherFrame'];
        else
            return null;

        if ('window' in frame)
            var ketcher = frame.window.ketcher;
            ketcher.onStructChange(function() {
                console.log("change");
            });
        return frame.window.ketcher;
    }

    function AddPrediction(panelNumber){

        var panel = $("#panel-" + panelNumber);

        panel.empty();

        panel.parent().addClass("active");

        var ketcher = getKetcher();
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
        var ketcher = getKetcher();
        var molfile = predictionMap[pannelId];
        if (ketcher && molfile){
            predictionMap[0] = ketcher.getMolfile();
            ketcher.setMolecule(molfile);
        }
    }

    function requestPredictions(){
        $.ajax({
            url: "",
            type: "get", //send it through get method
            data:{ajaxid:4,UserID: UserID , EmailAddress:encodeURIComponent(EmailAddress)},
            success: function(response) {
                //Do Something
            },
            error: function(xhr) {
                //Do Something to handle error
            }
        });
    }

} ) ( jQuery );