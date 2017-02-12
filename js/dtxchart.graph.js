/**
 * 
 */

var DtxChart = (function(mod){

    var CanvasEngine = mod.CanvasEngine;//Can be FabricJS, EaselJS or even raw Canvas API
    if(!CanvasEngine){
        console.error("CanvasEngine not loaded into DtxChart module! DtxChart.Graph will not render without a Canvas engine");
    }

    var DtxGraphLaneColor = {
        "LC_Count":"#ff4ca1",
		"HH_Count":"#00ffff",
        "LB_Count":"#e7baff",
		"LP_Count":"#ffd3f0",
		"SD_Count":"#fff040",
		"HT_Count":"#00ff00",
		"BD_Count":"#e7baff",
		"LT_Count":"#ff0000",
		"FT_Count":"#fea101",
		"RC_Count":"#00ccff",
		"RD_Count":"#5a9cf9",
    };

    var DtxGraphTextColor = {
        "LaneNoteCount":"#ffffff",
        "OtherText": "#ffffff",
        "BaseLine": "#b7b7b7"
    };

    var DEFAULT_GRAPH_BAR_WIDTH = 32;
    var LANE_FONT_SIZE = 12;
    var TOTAL_COUNT_FONT_SIZE = 32;
    var TOTAL_COUNTLABEL_FONT_SIZE = 16;
    var GRAPH_CANVAS_HEIGHT = 845;
    var GRAPH_CANVAS_WIDTH = 450;
    var DtxGraphMargins = {
        "B": 80,
        "C": 20,
        "D": 20,
        "E": 10,
        "F": 40
    };
    var GRAPH_DIAGRAM_HEIGHT = GRAPH_CANVAS_HEIGHT - DtxGraphMargins.B - DtxGraphMargins.C - DtxGraphMargins.D;
    var GRAPH_PROPORTION_CAP = 0.25;//


    var DtxGraphLaneOrderArrays = {
        "full":["LC_Count", "HH_Count", "LP_Count", "LB_Count", "SD_Count", "HT_Count", "BD_Count", "LT_Count", "FT_Count", "RC_Count", "RD_Count"],
        "LP+LB":["LC_Count", "HH_Count", "LP_Count", "SD_Count", "HT_Count", "BD_Count", "LT_Count", "FT_Count", "RC_Count", "RD_Count"],
        "RC+RD":["LC_Count", "HH_Count", "LP_Count", "LB_Count", "SD_Count", "HT_Count", "BD_Count", "LT_Count", "FT_Count", "RC_Count"],
        "Gitadora":["LC_Count", "HH_Count", "LP_Count", "SD_Count", "HT_Count", "BD_Count", "LT_Count", "FT_Count", "RC_Count"]
    };

    /**
     * Parameters:
     * dtxData - The dtxData object
     * canvasID - The id of the canvas element used to draw the graph. If not provided, defaults to "dtxgraph"
     * option - Option <string> to choose which type of graph to draw. Valid options are "full", "LP+LB", "RC+RD", "Gitadora". Defaults to "Gitadora" 
     */
    function Graph(dtxData, canvasID, option){
        
        this._canvasConfig = {
                    "width": GRAPH_CANVAS_WIDTH,
                    "height": GRAPH_CANVAS_HEIGHT,
                    "backgroundColor": "#111111",
                    "elementId": canvasID ? canvasID : "dtxgraph"
                };
        this._graphOption = option? option : "Gitadora";//full, LP+LB, RC+RD, Gitadora 

        //this._metadata = dtxData.metadata;

        convertMetadata.call(this, dtxData.metadata, this._graphOption);

        //this._dtxData = dtxData;
        if(CanvasEngine){
            this._canvasObject = CanvasEngine.createCanvas(this._canvasConfig);//The actual canvasObject
        }
    }

    //Another way to express private function?
    function convertMetadata(metadata, option){
        if(option === "full"){
            this._metadata = {};
            for(var prop in metadata){
                if(metadata.hasOwnProperty(prop)){
                    this._metadata[prop] = metadata[prop];
                }
            }
        }
        else if(option === "LP+LB"){
            this._metadata = {
                "totalNoteCount": metadata.totalNoteCount,
                "LC_Count": metadata.LC_Count,
                "HH_Count": metadata.HH_Count,
                "LP_Count": metadata.LP_Count + metadata.LB_Count,
                "SD_Count": metadata.SD_Count,
                "HT_Count": metadata.HT_Count,
                "BD_Count": metadata.BD_Count,
                "LT_Count": metadata.LT_Count,
                "FT_Count": metadata.FT_Count,
                "RC_Count": metadata.RC_Count,
                "RD_Count": metadata.RD_Count
            };
        }
        else if(option === "RC+RD"){
            this._metadata = {
                "totalNoteCount": metadata.totalNoteCount,
                "LC_Count": metadata.LC_Count,
                "HH_Count": metadata.HH_Count,
                "LP_Count": metadata.LP_Count,
                "LB_Count": metadata.LB_Count,
                "SD_Count": metadata.SD_Count,
                "HT_Count": metadata.HT_Count,
                "BD_Count": metadata.BD_Count,
                "LT_Count": metadata.LT_Count,
                "FT_Count": metadata.FT_Count,
                "RC_Count": metadata.RC_Count + metadata.RD_Count
            };
        }
        else if(option === "Gitadora"){
            this._metadata = {
                "totalNoteCount": metadata.totalNoteCount,
                "LC_Count": metadata.LC_Count,
                "HH_Count": metadata.HH_Count,
                "LP_Count": metadata.LP_Count + metadata.LB_Count,
                "SD_Count": metadata.SD_Count,
                "HT_Count": metadata.HT_Count,
                "BD_Count": metadata.BD_Count,
                "LT_Count": metadata.LT_Count,
                "FT_Count": metadata.FT_Count,
                "RC_Count": metadata.RC_Count + metadata.RD_Count
            };
        }
        else{//All invalid option will be converted to "full"
            this._metadata = {};
            for(var prop in metadata){
                if(metadata.hasOwnProperty(prop)){
                    this._metadata[prop] = metadata[prop];
                }
            }
            this._graphOption = "full";
        }
    }

    /**
     * Remarks: Based on observation, the max height of note graphs in Gitadora is computed using a fixed proportion of 25% of total note count.
     */
    Graph.prototype.drawGraph = function(){
        //Draw a graph where highest count in graph is a fixed proportion of the song note count
        //var proportionFactorCount = this._metadata["totalNoteCount"] * GRAPH_PROPORTION_CAP;
        var proportionFactorCount = 0;
        for(var prop in this._metadata){
            if(this._metadata.hasOwnProperty(prop) && prop !== "totalNoteCount"){
                if(this._metadata[prop] > proportionFactorCount){
                    proportionFactorCount = this._metadata[prop];
                }
            }
        }

        var option = this._graphOption;
        //Compute Side margin based on selected option
        var graphDiagramWidth = DtxGraphLaneOrderArrays[option].length * DEFAULT_GRAPH_BAR_WIDTH;
        var marginA = (GRAPH_CANVAS_WIDTH - graphDiagramWidth)/2;
        marginA = marginA > 0 ? marginA : 0;

        for(var i in DtxGraphLaneOrderArrays[option]){
            //Find the proportion value for current lane
            var lane = DtxGraphLaneOrderArrays[option][i];
            var proportion = this._metadata[ lane ] / proportionFactorCount;
            proportion = proportion > 1.0 ? 1.0 : proportion;//Cap the height to 1.0

            //Calculate the positionSize of current lane
            var index = parseInt(i);
            var currpositionSize = {
                x: index*DEFAULT_GRAPH_BAR_WIDTH + marginA, 
                y: GRAPH_CANVAS_HEIGHT - DtxGraphMargins.B - DtxGraphMargins.C,
                width: DEFAULT_GRAPH_BAR_WIDTH,
                height: proportion * GRAPH_DIAGRAM_HEIGHT
            };
            //Draw Graph
            this._drawGraphOfLane(currpositionSize, lane);

            //Draw count
            var textpositionSize = {
                x: index*DEFAULT_GRAPH_BAR_WIDTH + marginA + DEFAULT_GRAPH_BAR_WIDTH*0.5, 
                y: GRAPH_CANVAS_HEIGHT - DtxGraphMargins.B
            };

            var text = this._metadata[ lane ] + "";
            this._drawLaneNoteCount(textpositionSize, text);
        }   

        //Draw BaseLine
        var linePosSize = {
            x: marginA,
            y: GRAPH_CANVAS_HEIGHT - DtxGraphMargins.B - DtxGraphMargins.C,
            width: graphDiagramWidth,
            height: 0
        };
        var drawOption = {
            stroke: DtxGraphTextColor.BaseLine,
            strokeWidth: 2
        };
        CanvasEngine.addLine.call(this, linePosSize, drawOption);

        //Draw Label
        var textpositionSize = {
            x: marginA,
            y: GRAPH_CANVAS_HEIGHT - DtxGraphMargins.E - DtxGraphMargins.F
        };
        this._drawTotalNoteCountLabelText(textpositionSize, "TOTAL NOTES");

        //Draw Count
        var totalNoteCountTextPosSize = {
            x: marginA + 15,
            y: GRAPH_CANVAS_HEIGHT - DtxGraphMargins.E
        };
        this._drawTotalNoteCount(totalNoteCountTextPosSize, "" + this._metadata.totalNoteCount);

        CanvasEngine.update.call(this);    
        
        //Add other metadata if necesary
    };

    Graph.prototype._drawTotalNoteCountLabelText = function(positionSize, text){
        var textOptions = {
            fill: DtxGraphTextColor.OtherText,
            fontSize: 16,
            fontFamily: "Verdana",
            fontWeight: "bold",
            originY: "bottom"
        };

        CanvasEngine.addText.call(this, positionSize, text, textOptions);
    }

    Graph.prototype._drawTotalNoteCount = function(positionSize, text){
        var textOptions = {
            fill: DtxGraphTextColor.OtherText,
            fontSize: TOTAL_COUNT_FONT_SIZE,
            fontFamily: "Verdana",
            fontWeight: "bold",
            originY: "bottom"
        };

        CanvasEngine.addText.call(this, positionSize, text, textOptions);
    };

    Graph.prototype._drawLaneNoteCount = function(positionSize, text){
        var textOptions = {
            fill: DtxGraphTextColor.LaneNoteCount,
            fontSize: LANE_FONT_SIZE,
            fontFamily: "Arial",
            originY: "bottom",
            originX: "center"
        };

        CanvasEngine.addText.call(this, positionSize, text, textOptions);
    };

    //positionSize {x: <number>, y: <number>, width: <number>, height: <number>}
    Graph.prototype._drawGraphOfLane = function(positionSize, lane){
        var drawOptions = {
            fill: DtxGraphLaneColor[lane],
            originY: "bottom"
        };
        
        CanvasEngine.addRectangle.call(this, positionSize, drawOptions);
        
    };

    //
    var sampleMetadata = {
		"totalNoteCount": 512,
		"LC_Count": 19,
		"HH_Count": 138,
		"LP_Count": 11,//Counted as same lane as LB
		"LB_Count": 0,
		"SD_Count": 122,
		"HT_Count": 12,
		"BD_Count": 168,
		"LT_Count": 10,
		"FT_Count": 9,
		"RC_Count": 23,
		"RD_Count": 0
	};

    mod.Graph = Graph;
    return mod;
}( DtxChart || {} ) );