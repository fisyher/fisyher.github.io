/**
 * 
 */

var DtxChart = (function(mod){

    var CanvasEngine = mod.CanvasEngine;//Can be FabricJS, EaselJS or even raw Canvas API
    if(!CanvasEngine){
        console.error("CanvasEngine not loaded into DtxChart module! DtxChart.Charter will not render without a Canvas engine");
    }

    var Parser = mod.Parser;//Parser needs to be loaded first
    if(!Parser){
        console.warn("DtxChart.Parser should be loaded first");
    }

    var DEFAULT_SCALE = 1.0;
    var MIN_SCALE = 0.5;
    var MAX_SCALE = 3.0;

    var DEFAULT_PAGE_HEIGHT = 720;
    var MIN_PAGE_HEIGHT = 480;
    var MAX_PAGE_HEIGHT = 3840;

    var DEFAULT_PAGEPERCANVAS = 20;
    var MIN_PAGEPERCANVAS = 4;
    var MAX_PAGEPERCANVAS = 24;

    var BEAT_LINE_GAP = 48;//192/4

    //A collection of width/height constants for positioning purposes. Refer to diagram for details 
    var DtxChartCanvasMargins = {
        "A": 45,//Info section height
        "B": 16,//Top margin of page
        "C": 30,//Left margin of chart
        "D": 30,//Right margin of chart
        "E": 40,//Bottom margin of page
        "F": 20,//Right margin of each page (Except the last page for each canvas)
        "G": 12,//Top/Bottom margin of Last/First line from the top/bottom border of each page
        "H": 5, //Bottom Margin height of Sheet Number text from the bottom edge of canvas
    };

    var DtxChartPageMarkerHorizontalPositions = {
        "Bpm":260,
		"LeftBorder":47,
		"LC":50,
		"HH":70,
        "LB":90,//LB and LP are used in the same lane but different colors
		"LP":90,
		"SD":110,
		"HT":130,
		"BD":150,
		"LT":170,
		"FT":190,
		"RC":210,
		"RD":230,
		"RightBorder": 249,
		"BarNum":18,
        "width": 300
    };

    //Width and Height of chips are standard
    var DEFAULT_CHIP_HEIGHT = 4;
	var DEFAULT_CHIP_WIDTH = 19;

    //Put in a map and reference this map instead in case need to change
    var DtxChipWidthHeight = {
        "LC":{width: DEFAULT_CHIP_WIDTH, height: DEFAULT_CHIP_HEIGHT},
		"HH":{width: DEFAULT_CHIP_WIDTH, height: DEFAULT_CHIP_HEIGHT},
        "LB":{width: DEFAULT_CHIP_WIDTH, height: DEFAULT_CHIP_HEIGHT},
		"LP":{width: DEFAULT_CHIP_WIDTH, height: DEFAULT_CHIP_HEIGHT},
		"SD":{width: DEFAULT_CHIP_WIDTH, height: DEFAULT_CHIP_HEIGHT},
		"HT":{width: DEFAULT_CHIP_WIDTH, height: DEFAULT_CHIP_HEIGHT},
		"BD":{width: DEFAULT_CHIP_WIDTH, height: DEFAULT_CHIP_HEIGHT},
		"LT":{width: DEFAULT_CHIP_WIDTH, height: DEFAULT_CHIP_HEIGHT},
		"FT":{width: DEFAULT_CHIP_WIDTH, height: DEFAULT_CHIP_HEIGHT},
		"RC":{width: DEFAULT_CHIP_WIDTH, height: DEFAULT_CHIP_HEIGHT},
		"RD":{width: DEFAULT_CHIP_WIDTH, height: DEFAULT_CHIP_HEIGHT},
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

    var DtxBarLineColor = {
        "BarLine": "#ffffff",
        "QuarterLine": "#4e4e4e",
        "EndLine": "#ff0000",
        "StartLine":"#00ff00",
        "TitleLine": "#ffffff",
        "BorderLine": "#b7b7b7"
    };

    var DtxTextColor = {
        "BarNumber": "#ffffff",
        "BpmMarker": "#ffffff",
        "ChartInfo": "#ffffff",
        "PageNumber": "#b7b7b7"
    };   

    var DtxFontSizes = {
        "BarNumber": 16,
        "BpmMarker": 12,
        "ChartInfo": 28,
        "PageNumber": 16
    };

    /** 
     * Constructor of Charter
     * 
    */
    function Charter(){
        this._dtxdata = null;
        this._positionMapper = null;

        //
        this._scale = DEFAULT_SCALE;
        this._pageHeight = DEFAULT_PAGE_HEIGHT;
        this._pagePerCanvas = DEFAULT_PAGEPERCANVAS;

        this._chartSheets = [];
        this._pageCount = 0;
        this._heightPerCanvas = 0;
    }

    /**
     * Parameters:
     * dtxData - DtxDataObject type
     * positionMapper - LinePositionMapper type
     */
    Charter.prototype.setDtxData = function(dtxData, positionMapper){
        this._dtxdata = dtxData;
        this._positionMapper = positionMapper;
    }

    /**
     * Parameters:
     * config - An object consist of following options:
     *   scale (Number): The vertical scaling factor for each page. Min value accepted is 1.0 and Max is 3.0. Default is 1.0
     *   pageHeight (Number): The height for each page in pixels. Min is 960 pixel, Max is 3840, Default is 1920 pixel
     *   pagePerCanvas (Number): The number of pages to be rendered per canvas element. Min 4 pages and max 20
     */
    Charter.prototype.setConfig = function(config){
        //
        this._scale = limit(typeof config.scale === "number" ? config.scale : DEFAULT_SCALE, MIN_SCALE, MAX_SCALE);
        this._pageHeight = limit(typeof config.pageHeight === "number" ? config.pageHeight : DEFAULT_PAGE_HEIGHT, MIN_PAGE_HEIGHT, MAX_PAGE_HEIGHT);
        this._pagePerCanvas = limit(typeof config.pagePerCanvas === "number" ? config.pagePerCanvas : DEFAULT_PAGEPERCANVAS, MIN_PAGEPERCANVAS, MAX_PAGEPERCANVAS);

    }

    Charter.prototype.clearDTXChart = function(){
        //
        for(var i in this._chartSheets){
            this._chartSheets[i].clear();
        }

        //this._chartSheets = [];
        this._pageCount = 0;
        this._heightPerCanvas = 0;
    };

    /**
     * Method: DtxChart.Charter.canvasRequired
     * Parameters: None
     * Description: 
     * Charter will calculate the number of canvas, the width/height and pages in each canvas required to draw all bars in the loaded dtxData.
     * and return an array of canvasConfig objects for the calling object to dynamically creat <canvas> elements based on provided information.
     * Returns: A canvasConfigArray object, which is an array of canvasConfig object
     *      pages - The number of pages in each canvas 
            pageHeight - The height of each page. A page is a panel where all chips and beat lines are drawn within
            width - Canvas width
            height - Canvas height
            backgroundColor - Default is black
            elementId - The suggested elementID which takes the form of "dtxchart_0", "dtxchart_1", "dtxchart_2"... 
     */
    Charter.prototype.canvasRequired = function(){
        //Calculate the canvas required, including the width height of each canvas and number of pages per canvas

        //Find total number of pages required
        var chartLength = this._positionMapper.chartLength();
        var requiredPageCount = Math.ceil((chartLength * this._scale) / this._pageHeight);
        this._pageCount = requiredPageCount;

        var canvasCount = Math.ceil(requiredPageCount / this._pagePerCanvas);
        var pageInLastCanvas = requiredPageCount % this._pagePerCanvas;

        //Height required for all canvas
        var heightPerCanvas = this._pageHeight + DtxChartCanvasMargins.A + DtxChartCanvasMargins.B + DtxChartCanvasMargins.E + DtxChartCanvasMargins.G * 2;
        this._heightPerCanvas = heightPerCanvas;

        //Width required for all canvas and last canvas
        var widthPerCanvas = DtxChartCanvasMargins.C + 
            (DtxChartPageMarkerHorizontalPositions.width + DtxChartCanvasMargins.F) * this._pagePerCanvas + DtxChartCanvasMargins.D;
        
        var canvasConfigArray = [];
        for(var i=0; i < canvasCount; ++i ){
            //The last canvas has less pages if pageInLastCanvas is not zero so width needs to be calculated again
            if(pageInLastCanvas !== 0 && i === canvasCount - 1){
                var widthFinalCanvas = DtxChartCanvasMargins.C + 
            (DtxChartPageMarkerHorizontalPositions.width + DtxChartCanvasMargins.F) * 
            (pageInLastCanvas < MIN_PAGEPERCANVAS ? MIN_PAGEPERCANVAS : pageInLastCanvas) + //The width cannot be less than 4 page wide even though the last sheet may contain less than 4 pages  
            DtxChartCanvasMargins.D;
                canvasConfigArray.push({
                    "pages": pageInLastCanvas,
                    "pageHeight": this._pageHeight,
                    "width": widthFinalCanvas,
                    "height": heightPerCanvas,
                    "backgroundColor": "#000000",
                    "elementId": "dtxchart_" + i
                });
            }
            else{
                canvasConfigArray.push({
                    "pages": this._pagePerCanvas,
                    "pageHeight": this._pageHeight,
                    "width": widthPerCanvas,
                    "height": heightPerCanvas,
                    "backgroundColor": "#000000",
                    "elementId": "dtxchart_" + i
                });
            }
        }

        return canvasConfigArray;
    };

    /**
     * Parameters:
     * canvasConfigArray - An array of canvasConfig objects, one per canvas sheet in sequence:
     *    canvasConfig is an object with following information:
     *    pages - Number of pages in this canvas
     *    width - The full width of canvas
     *    height - The full height of canvas
     *    elementId - The id of the html5 canvas element. The caller must ensure the id is valid, otherwise this method will throw an error
     *    backgroundColor - Color string of background color of canvas
     * Remarks: 
     * If the number of sheets created does not match the required number, Charter will only render up to available number of sheets.
     */
    Charter.prototype.setCanvasArray = function(canvasConfigArray){
        this._chartSheets = [];//NOTE: Repeated calls may cause memory issues
        for(var i in canvasConfigArray){
            var chartSheet = new ChartSheet(canvasConfigArray[i]);
            if(!chartSheet){
                console.log("Sheet creation failed! Please ensure the id of a valid canvas element is used");
            }
            this._chartSheets.push(chartSheet);
        }        
    };

    Charter.prototype.drawDTXChart = function(){

        //iterate through barGroups
        var barGroups = this._dtxdata.barGroups;
        var chartInfo = this._dtxdata.chartInfo;
        var metadata = this._dtxdata.metadata;
        var positionMapper = this._positionMapper;

        for(var i in barGroups){
            var index = parseInt(i);
            var barInfo = barGroups[i];
            var absPosBarInfo = positionMapper.barGroups[i];
            var lineCount = barInfo["lines"];

            //Draw BarLines and intermediate lines
            this.drawLinesInBar(lineCount, index);

            //Draw Bar Numbers
            this.drawBarNumber(index);

            //Draw BPM Markers
            for(var j in absPosBarInfo["bpmMarkerArray"]){
                this.drawBPMMarker( absPosBarInfo["bpmMarkerArray"][j]["absPos"], absPosBarInfo["bpmMarkerArray"][j]["bpm"].toFixed(2));
            } 

            //Draw chips
            for(var laneLabel in barInfo["notes"]){
                if(DtxChartPageMarkerHorizontalPositions.hasOwnProperty(laneLabel)){
                    //Make use of utility functions in Parser to decode the line
                    var chipPosArray = Parser.utils.decodeBarLine( barInfo["notes"][laneLabel], lineCount );
                    this.drawChipsInBar(chipPosArray, laneLabel, index);
                }
            }

        }

        //Draw ChartInfo
        this.drawChartInfo(chartInfo, metadata.totalNoteCount);

        //Draw the start and end line
        this.drawChartLine(this._positionMapper.bgmStartAbsolutePosition(), {
            stroke: DtxBarLineColor.StartLine,
            strokeWidth: 3
        });

        this.drawChartLine(this._positionMapper.chartLength(), {
            stroke: DtxBarLineColor.EndLine,
            strokeWidth: 3
        });

        //
        this.drawPageFrames();

        //Draw Chartsheet Number if there are more than 1 sheets used
        if(this._chartSheets.length > 1){
            for(var i in this._chartSheets){
                if(!this._chartSheets[i]){
                    console.log("Sheet unavailable! Unable to draw");
                    continue;
                }
                this.drawSheetNumber(parseInt(i), this._chartSheets.length);
            }
        }        

        //Update all canvas
        for(var i in this._chartSheets){
            this._chartSheets[i].update();
        }

    };

    Charter.prototype.drawPageFrames = function(){
        for(var i in this._chartSheets){
            if(!this._chartSheets[i]){
                console.log("Sheet unavailable! Unable to draw");
                continue;
            }
            var chartSheet = this._chartSheets[i];

            //Iterate for each page, draw the frames
            var canvasWidthHeightPages = chartSheet.canvasWidthHeightPages();
            var pageCount = canvasWidthHeightPages.pages;
            var canvasHeight = canvasWidthHeightPages.height;
            for(var j = 0; j<pageCount; ++j){
                var pageStartXPos = DtxChartCanvasMargins.C + (DtxChartPageMarkerHorizontalPositions.width + DtxChartCanvasMargins.F) * j;
                var lineWidth = DtxChartPageMarkerHorizontalPositions.RightBorder - DtxChartPageMarkerHorizontalPositions.LeftBorder;
                //Draw Top Border Line
                chartSheet.addLine({x: pageStartXPos + DtxChartPageMarkerHorizontalPositions.LeftBorder,
                                y: DtxChartCanvasMargins.A + DtxChartCanvasMargins.B,
                                width: lineWidth,
                                height: 0
                                }, {
                                    stroke: DtxBarLineColor.BorderLine,
		                            strokeWidth: 3,
                                });

                //Draw Bottom Border Line
                chartSheet.addLine({x: pageStartXPos + DtxChartPageMarkerHorizontalPositions.LeftBorder,
                                y: canvasHeight - DtxChartCanvasMargins.E,
                                width: lineWidth,
                                height: 0
                                }, {
                                    stroke: DtxBarLineColor.BorderLine,
		                            strokeWidth: 3,
                                });
                //Draw Left Border Line
                chartSheet.addLine({x: pageStartXPos + DtxChartPageMarkerHorizontalPositions.LeftBorder,
                                y: DtxChartCanvasMargins.A + DtxChartCanvasMargins.B,
                                width: 0,
                                height: this._pageHeight + DtxChartCanvasMargins.G * 2
                                }, {
                                    stroke: DtxBarLineColor.BorderLine,
		                            strokeWidth: 3,
                                });

                //Draw Right Border Line
                chartSheet.addLine({x: pageStartXPos + DtxChartPageMarkerHorizontalPositions.RightBorder,
                                y: DtxChartCanvasMargins.A + DtxChartCanvasMargins.B,
                                width: 0,
                                height: this._pageHeight + DtxChartCanvasMargins.G * 2
                                }, {
                                    stroke: DtxBarLineColor.BorderLine,
		                            strokeWidth: 3,
                                });
            }

        }
    };

    Charter.prototype.drawSheetNumber = function(currentSheet, sheetCount){
        if(!this._chartSheets[currentSheet]){
                console.log("Sheet unavailable! Unable to draw");
                return;
            }

        var pageWidthHeight = this._chartSheets[currentSheet].canvasWidthHeightPages();
        var width = pageWidthHeight.width;
        var height = pageWidthHeight.height;

        var text = "Part " + (currentSheet + 1) + " of " + sheetCount;
        
        this._chartSheets[currentSheet].addText({
                            x: width - DtxChartCanvasMargins.D - 85,
                            y: height - DtxChartCanvasMargins.H, //
                            }, text, {
                            fill: DtxTextColor.PageNumber,
                            fontSize: DtxFontSizes.PageNumber,
                            fontFamily: "Arial",
                            originY: "bottom",
                            textAlign: "right"
                        });
    };

    Charter.prototype.drawChartInfo = function(chartInfo, totalNoteCount){
        
        //Form the text to be printed
        var text = chartInfo.title;
        if(chartInfo.artist === ""){
            text += "   ";
        }
        else{
            text += " - " + chartInfo.artist + "     ";
        }
        //
        text += "Level: " + chartInfo.level + "  BPM: " + chartInfo.bpm + "  Notes: " + totalNoteCount;

        //Repeat for every sheet available
        for(var i in this._chartSheets){
            if(!this._chartSheets[i]){
                console.log("Sheet unavailable! Unable to draw");
                continue;
            }
            this._chartSheets[i].addText({
                                x: DtxChartCanvasMargins.C,
                                y: DtxChartCanvasMargins.A - 0, //A is the Line divider, The text will be slightly above it
                                }, text, {
                                fill: DtxTextColor.ChartInfo,
                                fontSize: DtxFontSizes.ChartInfo,
                                fontFamily: "Arial",
                                originY: "bottom",
                            });
            this._chartSheets[i].addLine({x: DtxChartCanvasMargins.C,
                                y: DtxChartCanvasMargins.A,
                                width:  this._chartSheets[i].canvasWidthHeightPages().width - DtxChartCanvasMargins.C - DtxChartCanvasMargins.D,
                                height: 0
                                }, {
                                    stroke: DtxBarLineColor.TitleLine,
		                            strokeWidth: 3,
                                });
        }
    };

    Charter.prototype.drawBPMMarker = function(absPosition, bpmText){
        var pixSheetPos = this.getPixelPositionOfLine(absPosition);

        //Finally select the correct sheet to draw the chip
        var chartSheet = this._chartSheets[pixSheetPos.sheetIndex];
        if(!chartSheet){
            console.log("Sheet unavailable! Unable to draw");
            return;
        }

        chartSheet.addText({x: pixSheetPos.posX + DtxChartPageMarkerHorizontalPositions.Bpm,
                            y: pixSheetPos.posY}, bpmText, {
                                fill: DtxTextColor.BpmMarker,
                                fontSize: DtxFontSizes.BpmMarker
                            });
    };

    Charter.prototype.drawBarNumber = function(barIndex){
        //Sanity checks
        if(barIndex < 0 || barIndex >= 999){
            console.error('barIndex is out of range [000,999]');
        }

        var barNumText = "";
        if(barIndex < 10){
            barNumText = "00" + barIndex;
        }
        else if(barIndex < 100){
            barNumText = "0" + barIndex;
        }
        else{
            barNumText = "" + barIndex;
        }
        
        var absLinePos = this._positionMapper.absolutePositionOfLine(barIndex, 0);
        var pixSheetPos = this.getPixelPositionOfLine(absLinePos);

        //Finally select the correct sheet to draw the chip
        var chartSheet = this._chartSheets[pixSheetPos.sheetIndex];
        if(!chartSheet){
            console.log("Sheet unavailable! Unable to draw");
            return;
        }

        chartSheet.addText({x: pixSheetPos.posX + DtxChartPageMarkerHorizontalPositions.BarNum,
                            y: pixSheetPos.posY}, barNumText, {
                                fill: DtxTextColor.BarNumber,
                                fontSize: DtxFontSizes.BarNumber
                            });
    };

    /**
     * Draws arbitrary lines in chart. Currently used to draw start and end lines of DTX
     */
    Charter.prototype.drawChartLine = function(absPosition, drawOptions){
        var pixSheetPos = this.getPixelPositionOfLine(absPosition);

        //
        var chartSheet = this._chartSheets[pixSheetPos.sheetIndex];
        if(!chartSheet){
            console.log("Sheet unavailable! Unable to draw");
            return;
        }
        var lineWidth = DtxChartPageMarkerHorizontalPositions.RightBorder - DtxChartPageMarkerHorizontalPositions.LeftBorder;
            chartSheet.addLine({x: pixSheetPos.posX + DtxChartPageMarkerHorizontalPositions.LeftBorder,
                                y: pixSheetPos.posY,
                                width: lineWidth,
                                height: 0
                                }, drawOptions);
    };

    Charter.prototype.drawLinesInBar = function(lineCount, barIndex){
        for(var j=0; j<lineCount; j += BEAT_LINE_GAP){
            var lineColor = j == 0 ? DtxBarLineColor.BarLine : DtxBarLineColor.QuarterLine;

            var absLinePos = this._positionMapper.absolutePositionOfLine(barIndex, j);
            var pixSheetPos = this.getPixelPositionOfLine(absLinePos);

            //Finally select the correct sheet to draw the chip
            var chartSheet = this._chartSheets[pixSheetPos.sheetIndex];
            if(!chartSheet){
                console.log("Sheet unavailable! Unable to draw");
                continue;
            }

            var lineWidth = DtxChartPageMarkerHorizontalPositions.RightBorder - DtxChartPageMarkerHorizontalPositions.LeftBorder;
            chartSheet.addLine({x: pixSheetPos.posX + DtxChartPageMarkerHorizontalPositions.LeftBorder,
                                y: pixSheetPos.posY,
                                width: lineWidth,
                                height: 0
                                }, {
                                    stroke: lineColor,
		                            strokeWidth: 1,
                                });
        }
    };

    /**
     * Parameters:
     * chipPosArray - An array of {pos: <number>, label: <string>}
     * laneLabel - A string containing one of lane code inside Parser.DtxLaneLabels
     * barIndex - The index of bar which the chipPosArray belongs to
     */
    Charter.prototype.drawChipsInBar = function(chipPosArray, laneLabel, barIndex){
        //Iterate for each chip
        for(var i in chipPosArray){
            //Find absolutePosition of current chip (the time dimension only)
            var chipPos = chipPosArray[i];
            var absLinePos = this._positionMapper.absolutePositionOfLine(barIndex, chipPos["pos"]);

            //Convert absLinePos to Sheet Index and actual pixel x,y position of line
            var pixSheetPos = this.getPixelPositionOfLine(absLinePos);

            //Compute the final x position for this specific chip given the laneLabel
            var chipPixXpos =  pixSheetPos.posX + DtxChartPageMarkerHorizontalPositions[laneLabel];

            //Finally select the correct sheet to draw the chip
            var chartSheet = this._chartSheets[pixSheetPos.sheetIndex];
            if(!chartSheet){
                console.log("Sheet unavailable! Unable to draw");
                continue;
            }
            chartSheet.addChip({x: chipPixXpos, 
                                y: pixSheetPos.posY,
                                width: DtxChipWidthHeight[laneLabel].width,
                                height: DtxChipWidthHeight[laneLabel].height
                            }, {
                                fill: DtxChipColor[laneLabel]
                            });
        }

    };

    /**
     * Method: getPixelPositionOfLine
     * Parameter:
     * absolutePositon - The absolute position of the chart
     */
    Charter.prototype.getPixelPositionOfLine = function(absolutePositon){
        //Check if in range of chart
        if(typeof absolutePositon !== "number" || absolutePositon < 0 || absolutePositon > this._positionMapper.chartLength()){//Allow the first line of bar after last bar to be computed
            console.error("absolutePositon is invalid or out of range");
            return;
        }

        //
        var pageIndex = Math.floor((absolutePositon * this._scale) / this._pageHeight);

        if(pageIndex < 0 || pageIndex >= this._pageCount){
            console.error("absolutePositon is out of range of the charter!");
            return;
        }

        //
        var sheetIndex = Math.floor( pageIndex / this._pagePerCanvas );
        var sheetPageIndex = pageIndex % this._pagePerCanvas;
        var remainingRelativePos = (absolutePositon * this._scale) % this._pageHeight;
        
        //Calculate X,Y position of line's leftmost point
        var actualPixHeightPosofLine = this._heightPerCanvas - DtxChartCanvasMargins.E - DtxChartCanvasMargins.G - remainingRelativePos;
        var actualPixWidthPosofLine = DtxChartCanvasMargins.C + 
        ( DtxChartPageMarkerHorizontalPositions.width + DtxChartCanvasMargins.F ) * sheetPageIndex;

        return {
            sheetIndex: sheetIndex,
            posX: actualPixWidthPosofLine,
            posY: actualPixHeightPosofLine
        };

    };

    /**
     * Parameters:
     * canvasConfig is an object with following information:
     *    pages - Number of pages in this canvas
     *    width - The full width of canvas
     *    height - The full height of canvas
     *    elementId - The id of the html5 canvas element
     *    backgroundColor - Color string of background color of canvas
     */
    function ChartSheet(canvasConfig){
        
        this._canvasConfig = canvasConfig;
        if(CanvasEngine){
            this._canvasObject = CanvasEngine.createCanvas(canvasConfig);//The actual canvasObject
        }

    }

    /**
     * 
     */
    ChartSheet.prototype.canvasWidthHeightPages = function(){
        return {
            width: this._canvasConfig.width,
            height: this._canvasConfig.height,
            pages: this._canvasConfig.pages
        };
    };

    /**
     * positionSize - An object defined as {x: <number>, y: <number>, width: <number>, height: <number>}
     * drawOptions - Drawing options consisting of following options:
     *      fill - Fill Color code in string
     *      stroke - Stroke Color, Default is black
     *      strokeWidth - The width of stroke in pixels. Default is 0
     * Remarks: Origin of rect is assumed to be top-left corner by default, unless otherwise 
     */
    ChartSheet.prototype.addPageFrame = function(positionSize, drawOptions){
        if(CanvasEngine){
            CanvasEngine.addRectangle.call(this, positionSize, drawOptions);
        }
    };

    ChartSheet.prototype.addChip = function(positionSize, drawOptions){
        if(CanvasEngine){
            CanvasEngine.addChip.call(this, positionSize, drawOptions);
        }
    };

    ChartSheet.prototype.addLine = function(positionSize, drawOptions){
        if(CanvasEngine){
            CanvasEngine.addLine.call(this, positionSize, drawOptions);
        }
    };

    ChartSheet.prototype.addText = function(positionSize, text, textOptions){
        if(CanvasEngine){
            CanvasEngine.addText.call(this, positionSize, text, textOptions);
        }
    };

    ChartSheet.prototype.clear = function(){
        if(CanvasEngine){
            CanvasEngine.clear.call(this);
        }
    };

    ChartSheet.prototype.update = function(){
        if(CanvasEngine){
            CanvasEngine.update.call(this);
        }
    };

    /**
     * Helper functions
     */
    function limit(input, min, max){
        if(input > max){
            return max;
        }
        else if(input < min){
            return min;
        }
        else{
            return input;
        }
            
    }

    mod.Charter = Charter;
    return mod;
}(DtxChart || {} ));