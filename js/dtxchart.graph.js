/**
 * 
 */

var DtxChart = (function(mod){

    var CanvasEngine = mod.CanvasEngine;//Can be FabricJS, EaselJS or even raw Canvas API
    if(!CanvasEngine){
        console.error("CanvasEngine not loaded into DtxChart module! DtxChart.Graph will not render without a Canvas engine");
    }

    var DtxGraphLaneColor = {
        "LC_Count":"#ff1f7b",
		"HH_Count":"#6ac0ff",
        "LB_Count":"#ff4bed",
		"LP_Count":"#ff4bed",
		"SD_Count":"#fcfe16",
		"HT_Count":"#02ff00",
		"BD_Count":"#9b81ff",
		"LT_Count":"#ff0000",
		"FT_Count":"#ffa919",
		"RC_Count":"#00ccff",
		"RD_Count":"#5eb5ff",
		"Empty":"#2f2f2f"
    };
	var DTX_EMPTY_LANE = "Empty";

    var DtxGraphTextColor = {
        "LaneNoteCount":"#ffffff",
        "OtherText": "#ffffff",
        "BaseLine": "#b7b7b7"
    };
	
	var GRAPH_ASP_RATIO = 190/505;//Base on 180/500
	var GRAPH_CANVAS_HEIGHT = 750;//845
    var GRAPH_CANVAS_WIDTH = GRAPH_CANVAS_HEIGHT * GRAPH_ASP_RATIO;//425
	var REF_HEIGHT = 505;
	var REF_WIDTH = REF_HEIGHT * GRAPH_ASP_RATIO;//180
    var DEFAULT_GRAPH_BAR_WIDTH = 6 * GRAPH_CANVAS_WIDTH / REF_WIDTH;
	var DEFAULT_GRAPH_BAR_GAP_WIDTH = DEFAULT_GRAPH_BAR_WIDTH * 2;
    var LANE_FONT_SIZE = 12;
    var TOTAL_COUNT_FONT_SIZE = 48;
    var TOTAL_COUNTLABEL_FONT_SIZE = 24;
    
    var DtxGraphMargins = {
        "B": 86*(GRAPH_CANVAS_HEIGHT / REF_HEIGHT),
        "C": 12*(GRAPH_CANVAS_HEIGHT / REF_HEIGHT),
        "D": 3*(GRAPH_CANVAS_HEIGHT / REF_HEIGHT),
        "E": 16*(GRAPH_CANVAS_HEIGHT / REF_HEIGHT),
        "F": 40*(GRAPH_CANVAS_HEIGHT / REF_HEIGHT)
    };
    var GRAPH_DIAGRAM_HEIGHT = GRAPH_CANVAS_HEIGHT - DtxGraphMargins.B - DtxGraphMargins.C - DtxGraphMargins.D;
    var GRAPH_PROPORTION_CAP = 0.33;//
	var GRAPH_PROPORTION_MIN = 150;
	var GRAPH_PROPORTION_MAX = 250;

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
     * option - Option <string> to choose which type of graph to draw. Valid options are "full", "LP+LB", "RC+RD", "Gitadora", "Vmix". Defaults to "Gitadora" 
     */
    function Graph(dtxData, canvasID, option){
        
        this._canvasConfig = {
                    "width": GRAPH_CANVAS_WIDTH,
                    "height": GRAPH_CANVAS_HEIGHT,
                    "backgroundColor": "#111111",
                    "elementId": canvasID ? canvasID : "dtxgraph"
                };
        this._graphOption = option? option : "Gitadora";//full, LP+LB, RC+RD, Gitadora, Vmix 

        //this._metadata = dtxData.metadata;

        convertMetadata.call(this, dtxData.metadata.drum, this._graphOption);

        //this._dtxData = dtxData;
        if(CanvasEngine){
            this._canvasObject = CanvasEngine.createCanvas(this._canvasConfig);//The actual canvasObject
        }
    }

    //Another way to express private function?
    function convertMetadata(metadata, option){
        
        var l_metadata;
        if(metadata){
            l_metadata = metadata;
        }
        else{
            l_metadata = {
                "totalNoteCount": 0,
                "LC_Count": 0,
                "HH_Count": 0,
                "LP_Count": 0,
                "LB_Count": 0,
                "SD_Count": 0,
                "HT_Count": 0,
                "BD_Count": 0,
                "LT_Count": 0,
                "FT_Count": 0,
                "RC_Count": 0,
                "RD_Count": 0
            };
        }
        
        if(option === "full"){
            this._metadata = {};
            for(var prop in l_metadata){
                if(l_metadata.hasOwnProperty(prop)){
                    this._metadata[prop] = l_metadata[prop];
                }
            }
        }
        else if(option === "LP+LB"){
            this._metadata = {
                "totalNoteCount": l_metadata.totalNoteCount,
                "LC_Count": l_metadata.LC_Count,
                "HH_Count": l_metadata.HH_Count,
                "LP_Count": l_metadata.LP_Count + l_metadata.LB_Count,
                "SD_Count": l_metadata.SD_Count,
                "HT_Count": l_metadata.HT_Count,
                "BD_Count": l_metadata.BD_Count,
                "LT_Count": l_metadata.LT_Count,
                "FT_Count": l_metadata.FT_Count,
                "RC_Count": l_metadata.RC_Count,
                "RD_Count": l_metadata.RD_Count
            };
        }
        else if(option === "RC+RD"){
            this._metadata = {
                "totalNoteCount": l_metadata.totalNoteCount,
                "LC_Count": l_metadata.LC_Count,
                "HH_Count": l_metadata.HH_Count,
                "LP_Count": l_metadata.LP_Count,
                "LB_Count": l_metadata.LB_Count,
                "SD_Count": l_metadata.SD_Count,
                "HT_Count": l_metadata.HT_Count,
                "BD_Count": l_metadata.BD_Count,
                "LT_Count": l_metadata.LT_Count,
                "FT_Count": l_metadata.FT_Count,
                "RC_Count": l_metadata.RC_Count + l_metadata.RD_Count
            };
        }
        else if(option === "Gitadora"){
            this._metadata = {
                "totalNoteCount": l_metadata.totalNoteCount,
                "LC_Count": l_metadata.LC_Count,
                "HH_Count": l_metadata.HH_Count,
                "LP_Count": l_metadata.LP_Count + l_metadata.LB_Count,
                "SD_Count": l_metadata.SD_Count,
                "HT_Count": l_metadata.HT_Count,
                "BD_Count": l_metadata.BD_Count,
                "LT_Count": l_metadata.LT_Count,
                "FT_Count": l_metadata.FT_Count,
                "RC_Count": l_metadata.RC_Count + l_metadata.RD_Count
            };
        }
        else{//All invalid option will be converted to "full"
            this._metadata = {};
            for(var prop in l_metadata){
                if(l_metadata.hasOwnProperty(prop)){
                    this._metadata[prop] = l_metadata[prop];
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
        var proportionFactorCount = this._metadata["totalNoteCount"] * GRAPH_PROPORTION_CAP;
		proportionFactorCount = Math.max( GRAPH_PROPORTION_MIN, Math.min( GRAPH_PROPORTION_MAX, proportionFactorCount ) );//Cap between min and max number
		console.log("Proportion Factor count is " + proportionFactorCount);
	   /*  var proportionFactorCount = 0;
        for(var prop in this._metadata){
            if(this._metadata.hasOwnProperty(prop) && prop !== "totalNoteCount"){
                if(this._metadata[prop] > proportionFactorCount){
                    proportionFactorCount = this._metadata[prop];
                }
            }
        } */

        var option = this._graphOption;
        //Compute Side margin based on selected option
        var graphDiagramWidth = DtxGraphLaneOrderArrays[option].length * (DEFAULT_GRAPH_BAR_WIDTH + DEFAULT_GRAPH_BAR_GAP_WIDTH) - DEFAULT_GRAPH_BAR_GAP_WIDTH;
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
                x: index*(DEFAULT_GRAPH_BAR_WIDTH + DEFAULT_GRAPH_BAR_GAP_WIDTH) + marginA, 
                y: GRAPH_CANVAS_HEIGHT - DtxGraphMargins.B - DtxGraphMargins.C,
                width: DEFAULT_GRAPH_BAR_WIDTH,
                height: GRAPH_DIAGRAM_HEIGHT
            };
			/* var currpositionSize = {
                x: index*(DEFAULT_GRAPH_BAR_WIDTH + DEFAULT_GRAPH_BAR_GAP_WIDTH) + marginA, 
                y: GRAPH_CANVAS_HEIGHT - DtxGraphMargins.B - DtxGraphMargins.C,
                width: DEFAULT_GRAPH_BAR_WIDTH,
                height: proportion * GRAPH_DIAGRAM_HEIGHT
            }; */
			
			//Draw empty graph bar
			this._drawGraphOfLane(currpositionSize, DTX_EMPTY_LANE);			
			
            //Draw Graph
			currpositionSize.height = proportion * GRAPH_DIAGRAM_HEIGHT;
            this._drawGraphOfLane(currpositionSize, lane);

            //Draw count
            var textpositionSize = {
                x: index*(DEFAULT_GRAPH_BAR_WIDTH + DEFAULT_GRAPH_BAR_GAP_WIDTH) + marginA + DEFAULT_GRAPH_BAR_WIDTH*0.5, 
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

        //Draw TOTAL NOTES Label
        var textpositionSize = {
            x: marginA + 48,
            y: GRAPH_CANVAS_HEIGHT - DtxGraphMargins.E - DtxGraphMargins.F
        };
        this._drawTotalNoteCountLabelText(textpositionSize, "Total Notes");

        //Draw Count
		//HACK for notecount margin since there is no easy way to centralize a text object
		var notecountmarginX = marginA + 53;
		if(this._metadata.totalNoteCount < 1000)
		{
			notecountmarginX += 15;
		}
		if(this._metadata.totalNoteCount < 100)
		{
			notecountmarginX += 15;
		}
		
        var totalNoteCountTextPosSize = {
            x: notecountmarginX,
            y: GRAPH_CANVAS_HEIGHT - DtxGraphMargins.E
        };
        this._drawTotalNoteCount(totalNoteCountTextPosSize, "" + this._metadata.totalNoteCount);

        CanvasEngine.update.call(this);    
        
        //Add other metadata if necesary
    };

    Graph.prototype._drawTotalNoteCountLabelText = function(positionSize, text){
        var textOptions = {
            fill: DtxGraphTextColor.OtherText,
            fontSize: TOTAL_COUNTLABEL_FONT_SIZE,
            fontFamily: "Verdana",
            //fontWeight: "bold",
            originY: "bottom"
        };

        CanvasEngine.addText.call(this, positionSize, text, textOptions);
    }

    Graph.prototype._drawTotalNoteCount = function(positionSize, text){
        var textOptions = {
            fill: DtxGraphTextColor.OtherText,
            fontSize: TOTAL_COUNT_FONT_SIZE,
            fontFamily: "Verdana",
            //fontWeight: "bold",
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

    //Sample meta data for drum chart
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
    
    //sample meta data for guitar chart
    var sampleGuitarMetadata = {
        "totalNoteCount": 0,//Does not equal to total of each individual lane notes!
        "R_Count": 0,
        "G_Count": 0,
        "B_Count": 0,
        "Y_Count": 0,
        "M_Count": 0,
        "O_Count": 0,
        "Wail_Count": 0
    };

    mod.Graph = Graph;
    return mod;
}( DtxChart || {} ) );