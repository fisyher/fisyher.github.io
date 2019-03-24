/**
 * 
 */

var DtxChart = (function(mod){

    var CanvasEngine = mod.CanvasEngine;//Can be FabricJS, EaselJS or even raw Canvas API
    if(!CanvasEngine){
        console.error("CanvasEngine not loaded into DtxChart module! DtxChart.Charter will not render without a Canvas engine");
    }

    //Preload drum chips image assets
    var gfChipImageSet_ArrayPromises = [];
    var gfChipImageSet = {};
    gfChipImageSet_ArrayPromises.push(CanvasEngine.loadChipImageAssets.call(gfChipImageSet, "assets/images/red_gfchip.png", "GFR"));
    gfChipImageSet_ArrayPromises.push(CanvasEngine.loadChipImageAssets.call(gfChipImageSet, "assets/images/green_gfchip.png", "GFG"));
    gfChipImageSet_ArrayPromises.push(CanvasEngine.loadChipImageAssets.call(gfChipImageSet, "assets/images/blue_gfchip.png", "GFB"));    
    gfChipImageSet_ArrayPromises.push(CanvasEngine.loadChipImageAssets.call(gfChipImageSet, "assets/images/yellow_gfchip.png", "GFY"));
    gfChipImageSet_ArrayPromises.push(CanvasEngine.loadChipImageAssets.call(gfChipImageSet, "assets/images/mag_gfchip.png", "GFM"));
    gfChipImageSet_ArrayPromises.push(CanvasEngine.loadChipImageAssets.call(gfChipImageSet, "assets/images/open_gfchip.png", "GFO"));
    gfChipImageSet_ArrayPromises.push(CanvasEngine.loadChipImageAssets.call(gfChipImageSet, "assets/images/open_gfvchip.png", "GFOV"));
    gfChipImageSet_ArrayPromises.push(CanvasEngine.loadChipImageAssets.call(gfChipImageSet, "assets/images/wail_gfchip.png", "GFW"));

    //Load Difficulty Word Art
    gfChipImageSet_ArrayPromises.push(CanvasEngine.loadChipImageAssets.call(gfChipImageSet, "assets/images/BassBasicBannerSmall.png", "bassBasic"));
    gfChipImageSet_ArrayPromises.push(CanvasEngine.loadChipImageAssets.call(gfChipImageSet, "assets/images/BassAdvancedBannerSmall.png", "bassAdvanced"));
    gfChipImageSet_ArrayPromises.push(CanvasEngine.loadChipImageAssets.call(gfChipImageSet, "assets/images/BassExtremeBannerSmall.png", "bassExtreme"));
    gfChipImageSet_ArrayPromises.push(CanvasEngine.loadChipImageAssets.call(gfChipImageSet, "assets/images/BassMasterBannerSmall.png", "bassMaster"));
    gfChipImageSet_ArrayPromises.push(CanvasEngine.loadChipImageAssets.call(gfChipImageSet, "assets/images/GuitarBasicBannerSmall.png", "guitarBasic"));
    gfChipImageSet_ArrayPromises.push(CanvasEngine.loadChipImageAssets.call(gfChipImageSet, "assets/images/GuitarAdvancedBannerSmall.png", "guitarAdvanced"));
    gfChipImageSet_ArrayPromises.push(CanvasEngine.loadChipImageAssets.call(gfChipImageSet, "assets/images/GuitarExtremeBannerSmall.png", "guitarExtreme"));
    gfChipImageSet_ArrayPromises.push(CanvasEngine.loadChipImageAssets.call(gfChipImageSet, "assets/images/GuitarMasterBannerSmall.png", "guitarMaster"));

    //Width and Height of chips are standard
    var DEFAULT_CHIP_HEIGHT = 5;
	var DEFAULT_CHIP_WIDTH = 19;
    var DEFAULT_LANE_BORDER = 0;

    //Put in a map and reference this map instead in case need to change
    var DtxChipWidthHeight = {
        "GFR":{width: DEFAULT_CHIP_WIDTH, height: DEFAULT_CHIP_HEIGHT},
		"GFG":{width: DEFAULT_CHIP_WIDTH, height: DEFAULT_CHIP_HEIGHT},
        "GFB":{width: DEFAULT_CHIP_WIDTH, height: DEFAULT_CHIP_HEIGHT},
		"GFY":{width: DEFAULT_CHIP_WIDTH, height: DEFAULT_CHIP_HEIGHT},
		"GFM":{width: DEFAULT_CHIP_WIDTH, height: DEFAULT_CHIP_HEIGHT},
		"GFO":{width: DEFAULT_CHIP_WIDTH*5, height: DEFAULT_CHIP_HEIGHT},
        "GFOV":{width: DEFAULT_CHIP_WIDTH*3, height: DEFAULT_CHIP_HEIGHT},
		"GFW":{width: DEFAULT_CHIP_WIDTH, height: 19}
    };

    var DtxDefaultChipsHorizontalPos = {
            "BarNum":5,
            "LeftBorder":47,
            //Placeholders for lanelabels but does not have actual positions
            "G00000": 0,
            "G00100": 0,
            "G01000": 0,
            "G10000": 0,
            "G00010": 0,
            "G00001": 0,
            "G01100": 0,
            "G10100": 0,
            "G11000": 0,
            "G00110": 0,
            "G01010": 0,
            "G10010": 0,
            "G00101": 0,
            "G01001": 0,
            "G10001": 0,
            "G00011": 0,
            "G11100": 0,
            "G01110": 0,
            "G10110": 0,
            "G11010": 0,
            "G01101": 0,
            "G10101": 0,
            "G11001": 0,
            "G00111": 0,
            "G01011": 0,
            "G10011": 0,
            "G11110": 0,
            "G11101": 0,
            "G01111": 0,
            "G10111": 0,
            "G11011": 0,
            "G11111": 0,
            "GWail": 0,
            "B00000": 0,
            "B00100": 0,
            "B01000": 0,
            "B10000": 0,
            "B00010": 0,
            "B00001": 0,
            "B01100": 0,
            "B10100": 0,
            "B11000": 0,
            "B00110": 0,
            "B01010": 0,
            "B10010": 0,
            "B00101": 0,
            "B01001": 0,
            "B10001": 0,
            "B00011": 0,
            "B11100": 0,
            "B01110": 0,
            "B10110": 0,
            "B11010": 0,
            "B01101": 0,
            "B10101": 0,
            "B11001": 0,
            "B00111": 0,
            "B01011": 0,
            "B10011": 0,
            "B11110": 0,
            "B11101": 0,
            "B01111": 0,
            "B10111": 0,
            "B11011": 0,
            "B11111": 0,
            "BWail": 0,
            "G000": 0,
            "G001": 0,
            "G010": 0,
            "G011": 0,
            "G100": 0,
            "G101": 0,
            "G110": 0,
            "G111": 0,
            "B000": 0,
            "B001": 0,
            "B010": 0,
            "B011": 0,
            "B100": 0,
            "B101": 0,
            "B110": 0,
            "B111": 0,
            };

    var DtxChipColor = {
        "GFR":"#ff0000",
		"GFG":"#00ff00",
        "GFB":"#0000ff",
		"GFY":"#ffff00",
		"GFM":"#ff00ff",
		"GFO":"#ffffff",
		"GFW":"#654321"
    };

    var DtxChipLaneOrder = {
        "full": ["GFR","GFG","GFB","GFY","GFM","GFW"],
        "Gitadora": ["GFR","GFG","GFB","GFY","GFM","GFW"],
        "Vmix": ["GFR","GFG","GFB","GFW"]
    }; 

    function createDrawParameters(chartType, bassGuitar){
        var drawParameters = {};        
        //Currently works for proper charts but when drawing mismatch chart, chips in lanes ignored are never drawn
        drawParameters.ChipHorizontalPositions = _computeChipHorizontalPositions(chartType);

        //Widths
        drawParameters.chipWidthHeight = _computeChipWidthHeight(chartType);

        //flagArray
        drawParameters.flagArray = _getFlagArray(chartType);

        //Color
        drawParameters.chipColors = {};
        for(var prop in DtxChipColor){
            if(DtxChipColor.hasOwnProperty(prop)){
                drawParameters.chipColors[prop] = DtxChipColor[prop];
            }
        }

        drawParameters.bassGuitar = bassGuitar;//"B" or "G" 
        //
        drawParameters.elementIDPrefix = "dtxGF" + bassGuitar;

        //Image if available
        drawParameters.imageSet_promises = gfChipImageSet_ArrayPromises;
        drawParameters.imageSet = gfChipImageSet;
        return drawParameters;
    };

    function drawNote(laneLabel, chartSheet, pixSheetPos, drawParameters){
        
        if(drawParameters.bassGuitar !== laneLabel.charAt(0)){
            return;
        }

        if(laneLabel === "GWail" || laneLabel === "BWail")
        {
            var chipPixXpos =  pixSheetPos.posX + drawParameters.ChipHorizontalPositions["GFW"];

            chartSheet.addChip({x: chipPixXpos, 
                                    y: pixSheetPos.posY,
                                    width: drawParameters.chipWidthHeight["GFW"].width,
                                    height: drawParameters.chipWidthHeight["GFW"].height
                                }, {
                                    fill: drawParameters.chipColors["GFW"]
                                }, drawParameters.imageSet["GFW"]);
        }
        else
        {
            //laneLabel needs to be decoded 
            //var flagArray = [0,0,0,0,0];//Array of integers
            var isOpen = true;
            var currNoteFlagArray = [];
            for (var i = 0; i < drawParameters.flagArray.length; i++) {
                var flag = laneLabel.charAt(i+1) === "1" ? 1 : 0;
                if(flag === 1){
                    isOpen = false;
                }
                currNoteFlagArray.push(flag);                
            }

            if(isOpen){
                var code = "GFO";
                if(drawParameters.flagArray.length === 5){
                    code = "GFO";
                }
                else if(drawParameters.flagArray.length === 3){
                    code = "GFOV";
                }

                var chipPixXpos =  pixSheetPos.posX + drawParameters.ChipHorizontalPositions[code];

                chartSheet.addChip({x: chipPixXpos, 
                                        y: pixSheetPos.posY,
                                        width: drawParameters.chipWidthHeight[code].width,
                                        height: drawParameters.chipWidthHeight[code].height
                                    }, {
                                        fill: drawParameters.chipColors[code]
                                    }, drawParameters.imageSet[code]);
            }
            else{
                
                for (var j = 0; j < drawParameters.flagArray.length; j++) {
                    var flag = currNoteFlagArray[j];
                    var flagLabel = drawParameters.flagArray[j]; 
                    if(flag === 1){
                        var chipPixXpos =  pixSheetPos.posX + drawParameters.ChipHorizontalPositions[flagLabel];

                        chartSheet.addChip({x: chipPixXpos, 
                                                y: pixSheetPos.posY,
                                                width: drawParameters.chipWidthHeight[flagLabel].width,
                                                height: drawParameters.chipWidthHeight[flagLabel].height
                                            }, {
                                                fill: drawParameters.chipColors[flagLabel]
                                            }, drawParameters.imageSet[flagLabel]);


                    }
                    
                    
                }


            }
            
        }
        

    }


    function _computeChipHorizontalPositions(chartType){
        var ChipHorizontalPositions = DtxDefaultChipsHorizontalPos;

        var innerChartType = chartType;
        if(DtxChipLaneOrder[chartType] === undefined)
        {
            innerChartType = "full";
        }

        var currXpos = 50;
        for(var i=0; i < DtxChipLaneOrder[innerChartType].length; ++i ){
            var lane = DtxChipLaneOrder[innerChartType][i];
            var chipWidth = gfChipImageSet[lane] ? gfChipImageSet[lane].width : DtxChipWidthHeight[lane].width;
            ChipHorizontalPositions[lane] = currXpos;
            currXpos += chipWidth + DEFAULT_LANE_BORDER;
        }

        ChipHorizontalPositions["RightBorder"] = currXpos;
        ChipHorizontalPositions["Bpm"] = currXpos + 8;
        ChipHorizontalPositions["width"] = currXpos + 8 + 48;

        

        //"full", "Gitadora", "Vmix"
        //Do following mapping based on ChartType
        if(innerChartType === "Vmix")
        {
            ChipHorizontalPositions["GFY"] = ChipHorizontalPositions["GFG"];
            ChipHorizontalPositions["GFM"] = ChipHorizontalPositions["GFB"];
            ChipHorizontalPositions["GFOV"] = ChipHorizontalPositions["LeftBorder"] + 3;//
        }
        else {
            ChipHorizontalPositions["GFO"] = ChipHorizontalPositions["LeftBorder"] + 3;//
        }

        return ChipHorizontalPositions;
    }

    function _getFlagArray(chartType){
        var innerChartType = chartType;
        if(DtxChipLaneOrder[chartType] === undefined)
        {
            innerChartType = "full";
        }

        var flagArray = []

        //"full", "Gitadora", "Vmix"
        //Do following mapping based on ChartType
        if(innerChartType === "Vmix")
        {
            flagArray.push("GFR");
            flagArray.push("GFG");
            flagArray.push("GFB");
        }
        else
        {
            flagArray.push("GFR");
            flagArray.push("GFG");
            flagArray.push("GFB");
            flagArray.push("GFY");
            flagArray.push("GFM");
        }

        return flagArray;
    }

    function _computeChipWidthHeight(chartType){
        var chipWidthHeight = {};
        for(var prop in DtxChipWidthHeight){
            if(DtxChipWidthHeight.hasOwnProperty(prop)){
                chipWidthHeight[prop] = {};
                chipWidthHeight[prop].width = gfChipImageSet[prop] ? gfChipImageSet[prop].width : DtxChipWidthHeight[prop].width;
                chipWidthHeight[prop].height = gfChipImageSet[prop] ? gfChipImageSet[prop].height : DtxChipWidthHeight[prop].height;
            }
        }

        var innerChartType = chartType;
        if(DtxChipLaneOrder[chartType] === undefined)
        {
            innerChartType = "full";
        }

        //"full", "Gitadora", "Vmix"
        //Do following mapping based on ChartType
        if(innerChartType === "Vmix")
        {
            chipWidthHeight["GFY"] = chipWidthHeight["GFG"];
            chipWidthHeight["GFM"] = chipWidthHeight["GFB"];
        }

        return chipWidthHeight;
    }


    var GFDrawMethods = {
        createDrawParameters: createDrawParameters,
        drawNote: drawNote
    };

    mod.GFDrawMethods = GFDrawMethods;
    return mod;
}(DtxChart || {} ));