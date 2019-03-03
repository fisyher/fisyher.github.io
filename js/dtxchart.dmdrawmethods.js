/**
 * 
 */

var DtxChart = (function(mod){

    var CanvasEngine = mod.CanvasEngine;//Can be FabricJS, EaselJS or even raw Canvas API
    if(!CanvasEngine){
        console.error("CanvasEngine not loaded into DtxChart module! DtxChart.Charter will not render without a Canvas engine");
    }
    //Preload drum chips image assets
    var drumsChipImageSet = {};
    CanvasEngine.loadChipImageAssets.call(drumsChipImageSet, "assets/images/leftcymbal_chip.png", "LC");
    CanvasEngine.loadChipImageAssets.call(drumsChipImageSet, "assets/images/hihat_chip.png", "HH");
    CanvasEngine.loadChipImageAssets.call(drumsChipImageSet, "assets/images/hihat_chip.png", "HHO");
    CanvasEngine.loadChipImageAssets.call(drumsChipImageSet, "assets/images/snare_chip.png", "SD");
    CanvasEngine.loadChipImageAssets.call(drumsChipImageSet, "assets/images/leftbass_chip.png", "LB");
    CanvasEngine.loadChipImageAssets.call(drumsChipImageSet, "assets/images/lefthihatpedal_chip.png", "LP");
    CanvasEngine.loadChipImageAssets.call(drumsChipImageSet, "assets/images/hitom_chip.png", "HT");
    CanvasEngine.loadChipImageAssets.call(drumsChipImageSet, "assets/images/rightbass_chip.png", "BD");
    CanvasEngine.loadChipImageAssets.call(drumsChipImageSet, "assets/images/lowtom_chip.png", "LT");
    CanvasEngine.loadChipImageAssets.call(drumsChipImageSet, "assets/images/floortom_chip.png", "FT");
    CanvasEngine.loadChipImageAssets.call(drumsChipImageSet, "assets/images/rightcymbal_chip.png", "RC");
    CanvasEngine.loadChipImageAssets.call(drumsChipImageSet, "assets/images/ridecymbal_chip.png", "RD");

    //Load Difficulty Word Art
    CanvasEngine.loadChipImageAssets.call(drumsChipImageSet, "assets/images/DrumBasicBannerSmall.png", "drumBasic");
    CanvasEngine.loadChipImageAssets.call(drumsChipImageSet, "assets/images/DrumAdvancedBannerSmall.png", "drumAdvanced");
    CanvasEngine.loadChipImageAssets.call(drumsChipImageSet, "assets/images/DrumExtremeBannerSmall.png", "drumExtreme");
    CanvasEngine.loadChipImageAssets.call(drumsChipImageSet, "assets/images/DrumMasterBannerSmall.png", "drumMaster");

    //Width and Height of chips are standard
    var DEFAULT_CHIP_HEIGHT = 5;
	var DEFAULT_CHIP_WIDTH = 18;
    var DEFAULT_LANE_BORDER = 1;

    //Put in a map and reference this map instead in case need to change
    var DtxChipWidthHeight = {
        "LC":{width: DEFAULT_CHIP_WIDTH+6, height: DEFAULT_CHIP_HEIGHT},
        "HH":{width: DEFAULT_CHIP_WIDTH, height: DEFAULT_CHIP_HEIGHT},
        "HHO":{width: DEFAULT_CHIP_WIDTH, height: DEFAULT_CHIP_HEIGHT},
        "LB":{width: DEFAULT_CHIP_WIDTH, height: DEFAULT_CHIP_HEIGHT},
		"LP":{width: DEFAULT_CHIP_WIDTH, height: DEFAULT_CHIP_HEIGHT},
		"SD":{width: DEFAULT_CHIP_WIDTH+3, height: DEFAULT_CHIP_HEIGHT},
		"HT":{width: DEFAULT_CHIP_WIDTH, height: DEFAULT_CHIP_HEIGHT},
		"BD":{width: DEFAULT_CHIP_WIDTH+5, height: DEFAULT_CHIP_HEIGHT},
		"LT":{width: DEFAULT_CHIP_WIDTH, height: DEFAULT_CHIP_HEIGHT},
		"FT":{width: DEFAULT_CHIP_WIDTH, height: DEFAULT_CHIP_HEIGHT},
		"RC":{width: DEFAULT_CHIP_WIDTH+6, height: DEFAULT_CHIP_HEIGHT},
		"RD":{width: DEFAULT_CHIP_WIDTH+1, height: DEFAULT_CHIP_HEIGHT},
    };

    var DtxChipLaneOrder = {
        "full": ["LC","HH","LP","SD","HT","BD","LT","FT","RC","RD"],//LP and LB are in the same position, HH and HHO too
        "Gitadora": ["LC","HH","LP","SD","HT","BD","LT","FT","RC"],
        "Vmix": ["HH","SD","BD","HT","LT","RC"]
    }; 

    var DtxChipColor = {
        "LC":"#ff4ca1",
		"HH":"#00ffff",
        "LB":"#e7baff",
		"LP":"#ffd3f0",
		"SD":"#fff040",
		"HT":"#00ff00",
		"BD":"#e7baff",
		"LT":"#ff0000",
		"FT":"#fea101",
		"RC":"#00ccff",
		"RD":"#5a9cf9",
    };

    function createDrawParameters(chartType){
        var drawParameters = {};        
        //Currently works for proper charts but when drawing mismatch chart, chips in lanes ignored are never drawn
        drawParameters.ChipHorizontalPositions = _computeChipHorizontalPositions(chartType);

        //Widths
        drawParameters.chipWidthHeight = _computeChipWidthHeight(chartType);

        //Color
        drawParameters.chipColors = {};
        for(var prop in DtxChipColor){
            if(DtxChipColor.hasOwnProperty(prop)){
                drawParameters.chipColors[prop] = DtxChipColor[prop];
            }
        }
        //Image if available
        drawParameters.imageSet = drumsChipImageSet;

        //
        drawParameters.elementIDPrefix = "dtxdrums";
        return drawParameters;
    };

    function drawNote(laneLabel, chartSheet, pixSheetPos, drawParameters){
        //Compute the final x position for this specific chip given the laneLabel
        var chipPixXpos =  pixSheetPos.posX + drawParameters.ChipHorizontalPositions[laneLabel];

        chartSheet.addChip({x: chipPixXpos, 
                                y: pixSheetPos.posY,
                                width: drawParameters.chipWidthHeight[laneLabel].width,
                                height: drawParameters.chipWidthHeight[laneLabel].height
                            }, {
                                fill: drawParameters.chipColors[laneLabel]
                            }, drawParameters.imageSet[laneLabel]);

    }

    function _computeChipHorizontalPositions(chartType){
        var ChipHorizontalPositions = {
            "BarNum":5,
            "LeftBorder":47
        };

        var innerChartType = chartType;
        if(DtxChipLaneOrder[chartType] === undefined)
        {
            innerChartType = "full";
        }

        var currXpos = 50;
        for(var i=0; i < DtxChipLaneOrder[innerChartType].length; ++i ){
            var lane = DtxChipLaneOrder[innerChartType][i];
            var chipWidth = drumsChipImageSet[lane] ? drumsChipImageSet[lane].width : DtxChipWidthHeight[lane].width;
            ChipHorizontalPositions[lane] = currXpos;
            currXpos += chipWidth + DEFAULT_LANE_BORDER;
        }

        ChipHorizontalPositions["RightBorder"] = currXpos;
        ChipHorizontalPositions["Bpm"] = currXpos + 8;
        ChipHorizontalPositions["width"] = currXpos + 8 + 48;

        //"full", "Gitadora", "Vmix"
        //Do following mapping based on ChartType
        if(innerChartType === "full")
        {
            ChipHorizontalPositions["LB"] = ChipHorizontalPositions["LP"];
            ChipHorizontalPositions["HHO"] = ChipHorizontalPositions["HH"];
        }
        else if(innerChartType === "Gitadora")
        {
            ChipHorizontalPositions["RD"] = ChipHorizontalPositions["RC"];//RD notes will appear at RC lane for Gitadora mode
            ChipHorizontalPositions["LB"] = ChipHorizontalPositions["LP"];
            ChipHorizontalPositions["HHO"] = ChipHorizontalPositions["HH"];
        }
        else if(innerChartType === "Vmix")
        {
            ChipHorizontalPositions["LC"] = ChipHorizontalPositions["HH"];
            ChipHorizontalPositions["LP"] = ChipHorizontalPositions["HH"];
            ChipHorizontalPositions["FT"] = ChipHorizontalPositions["LT"];
            ChipHorizontalPositions["RD"] = ChipHorizontalPositions["RC"];
            ChipHorizontalPositions["LB"] = ChipHorizontalPositions["BD"];
            ChipHorizontalPositions["HHO"] = ChipHorizontalPositions["HH"];
        }

        return ChipHorizontalPositions;
    }

    function _computeChipWidthHeight(chartType){
        var chipWidthHeight = {};
        for(var prop in DtxChipWidthHeight){
            if(DtxChipWidthHeight.hasOwnProperty(prop)){
                chipWidthHeight[prop] = {};
                chipWidthHeight[prop].width = drumsChipImageSet[prop] ? drumsChipImageSet[prop].width : DtxChipWidthHeight[prop].width;
                chipWidthHeight[prop].height = drumsChipImageSet[prop] ? drumsChipImageSet[prop].height : DtxChipWidthHeight[prop].height;
            }
        }

        var innerChartType = chartType;
        if(DtxChipLaneOrder[chartType] === undefined)
        {
            innerChartType = "full";
        }

        //"full", "Gitadora", "Vmix"
        //Do following mapping based on ChartType
        if(innerChartType === "full")
        {
            chipWidthHeight["LB"] = chipWidthHeight["LP"];
            chipWidthHeight["HHO"] = chipWidthHeight["HH"];
        }
        else if(innerChartType === "Gitadora")
        {
            chipWidthHeight["LB"] = chipWidthHeight["LP"];
            chipWidthHeight["RD"] = chipWidthHeight["RC"];//RD notes will appear at RC lane for Gitadora mode
            chipWidthHeight["HHO"] = chipWidthHeight["HH"];
        }
        else if(innerChartType === "Vmix")
        {
            chipWidthHeight["LC"] = chipWidthHeight["HH"];
            chipWidthHeight["LP"] = chipWidthHeight["HH"];
            chipWidthHeight["FT"] = chipWidthHeight["LT"];
            chipWidthHeight["RD"] = chipWidthHeight["RC"];
            chipWidthHeight["LB"] = chipWidthHeight["BD"];
            chipWidthHeight["HHO"] = chipWidthHeight["HH"];
        }

        return chipWidthHeight;
    }     

    var DMDrawMethods = {
        createDrawParameters: createDrawParameters,
        drawNote: drawNote
    };

    mod.DMDrawMethods = DMDrawMethods;
    return mod;
}(DtxChart || {} ));