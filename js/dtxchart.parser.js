/*
DtxChart.Parser
*/
var DtxChart = (function(mod){
    'use strict';
    var VERSION = "2.0.0";

    var SUPPORTED_HEADERS = [
    "; Created by DTXCreator 024",
	"; Created by DTXCreator 025(verK)",
	"; Created by DTXCreator 020",
	";Created by GDA Creator Professional Ver.0.10",
	";Created by GDA Creator Professional Ver.0.22"];
    
    /**
     * Method: DtxChart.Parser constructor
     * Parameters:
     * config - The config object for the text parser
     *    mode - Either "dtx" or "gda"
     * Description: 
     * 
     */
    function Parser(config){
        this._config = config;
        
        //Initialize the dtxdata object
        //dtxdata follows the JSON Schema as described in "ChartData Scheme Doc.txt"
        this._dtxdata = initializeDtxData();
        
        //
		this._largestBarIndex = -1;
		this._rawBarLines = {};
        this._bpmMarkerLabelMap = {};

		//
		this._currBarLength = 1.0;
		var self = this;
    }
    
    //Public Methods

    /*
    Method: DtxChart.Parser.parseDtxText
    Parameters:
    dtxText - The text content of a .dtx or .gda File
    Description:
    Parse and decodes the .dtx or .gda file to retrieve chip data and store in 
    a DtxData object
    Returns:
    True if parsing is successful, otherwise return false.
    */ 
    Parser.prototype.parseDtxText = function(dtxText){
        var lines = dtxText.split('\n');
		//
		if(lines.length === 0){
			console.error('Fail to parse: File is empty!');
			return;
		}
        //Check if header is supported
		if(!checkSupportedHeader(lines[0])){
            console.warn('Warning: Header not supported or header is missing. Parsing may fail');
            //return;
        }
        
        //Start processing all valid lines
		for (var i = 1; i < lines.length; i++) {
			if(lines[i].length > 0 && lines[i][0]==='#')
			{
				this._parseTextLine(lines[i]);
			}
		}; 

        //
        if(this._dtxdata.chartInfo.drumlevel > 0.00){
            this._dtxdata.initMetadata("drum");
        }
        if(this._dtxdata.chartInfo.guitarlevel > 0.00){
            this._dtxdata.initMetadata("guitar");
        }
        if(this._dtxdata.chartInfo.basslevel > 0.00){
            this._dtxdata.initMetadata("bass");
        }

        //console.log(this._rawBarLines);
		//console.log(this._largestBarIndex);
        
        //Further decode rawBarLines
        for (var i = 0; i <= this._largestBarIndex; i++) {
            var barGroup = this._createBarGroup(this._rawBarLines[i]);
            this._dtxdata.barGroups.push(barGroup);
        }
        
        //parser incomplete, return true when complete
        return true;
    };
    
    /*
    Method: DtxChart.Parser.clear
    Parameters:
    None
    Description:
    Clear data inside DtxData object and reset the parser
    Returns:
    True if parsing is successful, otherwise return false.
    */
    Parser.prototype.clear = function(){
        this._dtxdata = initializeDtxData();
        //
		this._largestBarIndex = -1;
		this._rawBarLines = {};
        this._bpmMarkerLabelMap = {};
		//
		this._currBarLength = 1.0;
	};

    /*
    Method: DtxChart.Parser.getDtxDataObject
    Parameters:
    None
    Description:
    Use this method to access the dtxdata object created after successful parsing
    Returns:
    The internal dtxdata object. 
    */
    //May include extended object methods in future
    Parser.prototype.getDtxDataObject = function(){
        var dtxDataObject = this._dtxdata;
        return dtxDataObject;
    };

     /*
    Method: DtxChart.Parser.availableCharts
    Parameters:
    None
    Description:
    Use this method to query available types of charts the loaded dtx has. Check based on levels.
    All charts with notes must be given a non-zero levels.
    Returns:
    The availableCharts result object
    */
    //May include extended object methods in future
    Parser.prototype.availableCharts = function(){
        var ret = {
            drum: this._dtxdata.chartInfo.drumlevel > 0.00 ? true : false,
            guitar: this._dtxdata.chartInfo.guitarlevel > 0.00 ? true : false,
            bass: this._dtxdata.chartInfo.basslevel > 0.00 ? true : false
        };
        return ret;
    };
    
    //Internal methods are denoted with a first character underscore

    /*
    Method: DtxChart.Parser._parseDtxText
    Parameters:
    line - A single text line 
    Returns:
    None
    */
    Parser.prototype._parseTextLine = function(line){
        var trimLine = trimExternalWhiteSpace(line);

        var lineKeyValue = splitKeyValueByColonOrWhiteSpace(trimLine);

        var key = lineKeyValue["key"];
        var value = lineKeyValue["value"];          
        //Select which decode function to use
        if(decodeFunctionMap.hasOwnProperty(key)){
            decodeFunctionMap[key](this._dtxdata, value);
        }
        else if(key.length === 5 && key.indexOf('BPM') === 0){
            var bpmMarkerLabel = key.substring(3);

            decodeFunctionMap["BPM_Marker"](this, value, bpmMarkerLabel);
        }
        else{
            var barNum = parseInt(key.substring(0, 3));
            var laneCode = key.substring(3);
            decodeFunctionMap["BAR_LANE"](this, barNum, laneCode, value);
        }
    };
    
    //Returns a bar group object
    Parser.prototype._createBarGroup = function(rawLinesInBar){
        
        //Current Bar is empty
        if(!rawLinesInBar || !rawLinesInBar['Description'] || rawLinesInBar['Description'] !== "dtxBarLine"){
			var lineCountInCurrentBar = computeLinesFromBarLength(this._currBarLength);
            return {
                "lines": lineCountInCurrentBar,
                "notes": {}
            };
		}
        
        var newBarGroup = {};
        newBarGroup["notes"] = {};
        //Handle Bar Length change first
		if(rawLinesInBar.hasOwnProperty(DtxBarLabelMap.BAR_LENGTH_CHANGE_LABEL)){
            this._currBarLength = readBarLength(rawLinesInBar[DtxBarLabelMap.BAR_LENGTH_CHANGE_LABEL]);
		}        
        var lineCountInCurrentBar = computeLinesFromBarLength(this._currBarLength);        
        newBarGroup["lines"] = lineCountInCurrentBar;
        
        //Handle BPM change flag
        if(rawLinesInBar.hasOwnProperty(DtxBarLabelMap.BPM_CHANGE_LABEL)){
            var posArray = decodeBarLine(rawLinesInBar[DtxBarLabelMap.BPM_CHANGE_LABEL], lineCountInCurrentBar);
            
            newBarGroup["bpmMarkerArray"] = [];
            for(var i=0; i<posArray.length; i++){
                //Look for actual BPM from labelarray
                var label = posArray[i]["label"];
                var bpmValue = this._bpmMarkerLabelMap[label];
                
                newBarGroup["bpmMarkerArray"].push({
                    "pos": posArray[i]["pos"],
                    "bpm": bpmValue
                });
            }
        }
        
        //Handle show/hide bar line flags
        if(rawLinesInBar.hasOwnProperty(DtxBarLabelMap.LINE_SHOW_HIDE_LABEL)){
            var posArray = decodeBarLine(rawLinesInBar[DtxBarLabelMap.LINE_SHOW_HIDE_LABEL], lineCountInCurrentBar);
            
            newBarGroup["showHideLineMarkerArray"] = [];
            for(var i=0; i<posArray.length; i++){
                var label = posArray[i]["label"];
                var show = DtxShowLineLabelMap[label];
                if(!show){
                    show = false;
                }                
                newBarGroup["showHideLineMarkerArray"].push({
                    "pos":posArray[i]["pos"],
                    "show": show
                });
            }
        }

        //Handle BGM chip (normally only one per dtx)
        if(rawLinesInBar.hasOwnProperty(DtxBarLabelMap.BGM_LANE)){
            var posArray = decodeBarLine(rawLinesInBar[DtxBarLabelMap.BGM_LANE], lineCountInCurrentBar);

            newBarGroup["bgmChipArray"] = [];
            for(var i=0; i<posArray.length; i++){
                //var bgmChipLabel = posArray[i]["label"];                
                newBarGroup["bgmChipArray"].push({
                    "pos":posArray[i]["pos"]
                });
            }
        }  
                
        for(var prop in rawLinesInBar){
            if(prop === "Description"){
                continue;
            }

            //Handle the actual drum chips only if DLevel is available
            if(this._dtxdata.chartInfo.drumlevel > 0.00){
                var DLaneCodeToLaneLabelMap = DtxDrumsLaneCodeToLaneLabelMap;
                var DLaneCodeToCountLabelMap = DtxDrumsLaneCodeToCountLabelMap;
                if(this._config.mode === "dtx"){
                    DLaneCodeToLaneLabelMap = DtxDrumsLaneCodeToLaneLabelMap;
                    DLaneCodeToCountLabelMap = DtxDrumsLaneCodeToCountLabelMap;
                }
                else if(this._config.mode === "gda"){
                    DLaneCodeToLaneLabelMap = GDADrumsLaneCodeToLaneLabelMap;
                    DLaneCodeToCountLabelMap = GDADrumsLaneCodeToCountLabelMap;
                }

                if(rawLinesInBar.hasOwnProperty(prop) && DLaneCodeToLaneLabelMap.hasOwnProperty(prop)){
                    var LaneLabel = DLaneCodeToLaneLabelMap[prop];
                    var rawLine = rawLinesInBar[prop];
                    //
                    newBarGroup["notes"][LaneLabel] = rawLine;
                    //Compute Note count
                    var chipCount = countChipBarLine(rawLine, lineCountInCurrentBar);
                    var countLabel = DLaneCodeToCountLabelMap[prop];
                    this._dtxdata.increaseCount("drum", countLabel, chipCount);
                    //this._dtxdata.metadata[countLabel] += chipCount;
                    //this._dtxdata.metadata.totalNoteCount += chipCount;
                }
            }

            //Handle the actual guitar chips only if GLevel is available
            if(this._dtxdata.chartInfo.guitarlevel > 0.00){
                var GLanesToButtonsMap = DtxGuitarLanesCodeToButtonsMap;
                if(this._config.mode === "dtx"){
                    GLanesToButtonsMap = DtxGuitarLanesCodeToButtonsMap;
                }
                else if(this._config.mode === "gda"){
                    GLanesToButtonsMap = GDAGuitarLanesCodeToButtonsMap;
                }

                if(rawLinesInBar.hasOwnProperty(prop) && GLanesToButtonsMap.hasOwnProperty(prop)){
                    var ButtonCombination = GLanesToButtonsMap[prop];
                    var rawLine = rawLinesInBar[prop];
                    //
                    newBarGroup["notes"][ButtonCombination] = rawLine;
                    //Compute Note count...
                    var chipCount = countChipBarLine(rawLine, lineCountInCurrentBar);
                    this._dtxdata.increaseCount("guitar", ButtonCombination, chipCount);
                }
            }

            //Handle the actual guitar chips only if GLevel is available
            if(this._dtxdata.chartInfo.basslevel > 0.00){
                var BLanesToButtonsMap = DtxBassLanesCodeToButtonsMap;
                if(this._config.mode === "dtx"){
                    BLanesToButtonsMap = DtxBassLanesCodeToButtonsMap;
                }
                else if(this._config.mode === "gda"){
                    BLanesToButtonsMap = GDABassLanesCodeToButtonsMap;
                }


                if(rawLinesInBar.hasOwnProperty(prop) && BLanesToButtonsMap.hasOwnProperty(prop)){
                    var ButtonCombination = BLanesToButtonsMap[prop];
                    var rawLine = rawLinesInBar[prop];
                    //
                    newBarGroup["notes"][ButtonCombination] = rawLine;
                    //Compute Note count...
                    var chipCount = countChipBarLine(rawLine, lineCountInCurrentBar);
                    this._dtxdata.increaseCount("bass", ButtonCombination, chipCount);
                }
            }   
            
        } 
        

            
        
        //TODO: Finish _createBarGroup
        return newBarGroup;
        
    };
    
    
    //List all possible types of keys
    var decodeFunctionMap = {
        "TITLE": readTitle,
		"ARTIST": readArtist,
		"BPM": readBPM,
		"DLEVEL": readDLevel,
        "GLEVEL": readGLevel,
        "BLEVEL": readBLevel,
        "PREVIEW": readPreview,
        "PREIMAGE": readPreimage,
        //Following labels occur multiple times have index numbers
        "WAV": readWav,
        "VOLUME": readVolume,
        "PAN": readPan,
        "BMP": readBMPInfo,
        //Special decode functions
        "BPM_Marker": readBPMMarker,
        "BAR_LANE": readBarLane,
        //Reserved for future features
        "DTXC_LANEBINDEDCHIP": readDtxLaneChip,
        "DTXC_CHIPPALETTE": readChipPalette        
    };
    
    //Actual read in functions
    function readTitle(dtxData, value){
        dtxData.chartInfo.title = value;
    }
    
    function readArtist(dtxData, value){
        dtxData.chartInfo.artist = value;
    }
    
    function readBPM(dtxData, value){
        dtxData.chartInfo.bpm = parseFloat(value);
    }
    
    function readDLevel(dtxData, value){
        var drumlevel = 0;
        if(value.length <= 2){
            drumlevel = (parseInt(value) / 10).toFixed(2);
            //console.log(drumlevel);
        }
        else if(value.length === 3){
            drumlevel = (parseInt(value) / 100).toFixed(2);
            //console.log(drumlevel);	
        }
        dtxData.chartInfo.drumlevel = drumlevel;
    }

    function readGLevel(dtxData, value){
        var guitarlevel = 0;
        if(value.length <= 2){
            guitarlevel = (parseInt(value) / 10).toFixed(2);
            //console.log(guitarlevel);
        }
        else if(value.length === 3){
            guitarlevel = (parseInt(value) / 100).toFixed(2);
            //console.log(guitarlevel);	
        }
        dtxData.chartInfo.guitarlevel = guitarlevel;
    }

    function readBLevel(dtxData, value){
        var basslevel = 0;
        if(value.length <= 2){
            basslevel = (parseInt(value) / 10).toFixed(2);
            //console.log(basslevel);
        }
        else if(value.length === 3){
            basslevel = (parseInt(value) / 100).toFixed(2);
            //console.log(basslevel);	
        }
        dtxData.chartInfo.basslevel = basslevel;
    }
    
    function readPreview(dtxData, value){
        //TO BE ADDED
    }
    
    function readPreimage(dtxData, value){
        //TO BE ADDED
    }
    
    function readWav(dtxData, value, index){
        //TO BE ADDED
    }
    
    function readVolume(dtxData, value, index){
        //TO BE ADDED
    }
    
    function readPan(dtxData, value, index){
        //TO BE ADDED
    }
    
    function readBMPInfo(dtxData, value, index){
        //TO BE ADDED
    }
    
    function readBPMMarker(dtxParser, value, label){
        dtxParser._bpmMarkerLabelMap[label] = parseFloat(value);
    }
    
    function readBarLane(dtxParser, barNumber, lane, value){
        if(barNumber >=0 || barNumber <= 999){
            //console.log('barNumber: ' + value);
            if(barNumber > dtxParser._largestBarIndex){
                dtxParser._largestBarIndex = barNumber;
            }

            if(!dtxParser._rawBarLines[barNumber]){
                dtxParser._rawBarLines[barNumber] = {
                    "Description" : "dtxBarLine"
                };
            }
            dtxParser._rawBarLines[barNumber][lane] = value;

        }
    }
    
    function readBarLength(value){
        //Check for sensible values
        var barLength = parseFloat(value);
        //DtxCreator actually allows for up to 100 but not practical
        if(barLength >= 1/192 && barLength < 10.0){
            return barLength;
        }
        else{
            return 1.0;
        }
    }
    
    function readDtxLaneChip(dtxData, value){
        
    }
    
    function readChipPalette(dtxData, value){
        
    }
    
    
    
    //Create a starting object for dtxdata
    function initializeDtxData(){
        return new DTXDataObject();
    }

    /**
     * Constructor for wrapper class
     */
    function DTXDataObject(){
        this.chartInfo = {
                "title": "",
                "artist": "",
                "bpm": 0.0,
                "drumlevel": 0.00,
                "guitarlevel": 0.00,
                "basslevel": 0.00
            };
        this.metadata = {};
        this.barGroups = [];
    }

    /**
     * 
     */
    DTXDataObject.prototype.numberOfBars = function(){
        return this.barGroups.length;
    };

    DTXDataObject.prototype.initMetadata = function(mode){
        
        if(mode === "drum"){
            this.metadata.drum = {
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
        else if(mode === "guitar")
        {
            this.metadata.guitar = {
                "totalNoteCount": 0,//Does not equal to total of each individual lane notes!
				"R_Count": 0,
				"G_Count": 0,
				"B_Count": 0,
				"Y_Count": 0,
				"M_Count": 0,
                "Wail_Count": 0
            };
        }
        else if(mode === "bass")
        {
            this.metadata.bass = {
                "totalNoteCount": 0,//Does not equal to total of each individual lane notes!
				"R_Count": 0,
				"G_Count": 0,
				"B_Count": 0,
				"Y_Count": 0,
				"M_Count": 0,
                "Wail_Count": 0
            };
        }
    };

     DTXDataObject.prototype.increaseCount = function(mode, countLabel, count){
        
        if(mode === "drum"){
            this.metadata[mode][countLabel] += count;
            this.metadata[mode].totalNoteCount += count;            
        }
        else if(mode === "guitar")
        {            
            if(countLabel === "GWail"){
                //Wailing does not count towards note count!
                this.metadata[mode].Wail_Count += count;
            }
            else{
                //Assumes no overlaps, which is always true for data from the editor
                this.metadata[mode].totalNoteCount += count;

                var flagArray = buttomCombinationsToFlagArray(countLabel);
                this.metadata[mode].R_Count += count * flagArray[0];
                this.metadata[mode].G_Count += count * flagArray[1];
                this.metadata[mode].B_Count += count * flagArray[2];
                this.metadata[mode].Y_Count += count * flagArray[3];
                this.metadata[mode].M_Count += count * flagArray[4];
            }
        }
        else if(mode === "bass")
        {
            //Assumes no overlaps, which is always true for data from the editor            
            if(countLabel === "BWail"){
                //Wailing does not count towards note count!
                this.metadata[mode].Wail_Count += count;
            }
            else{
                this.metadata[mode].totalNoteCount += count;

                var flagArray = buttomCombinationsToFlagArray(countLabel);
                this.metadata[mode].R_Count += count * flagArray[0];
                this.metadata[mode].G_Count += count * flagArray[1];
                this.metadata[mode].B_Count += count * flagArray[2];
                this.metadata[mode].Y_Count += count * flagArray[3];
                this.metadata[mode].M_Count += count * flagArray[4];
            }
        }        
     };
    
    //Helper functions
    function buttomCombinationsToFlagArray(buttonCombi){
        var flagArray = [0,0,0,0,0];//Array of integers
        flagArray[0] = buttonCombi.charAt(1) === "1" ? 1 : 0;
        flagArray[1] = buttonCombi.charAt(2) === "1" ? 1 : 0;
        flagArray[2] = buttonCombi.charAt(3) === "1" ? 1 : 0;
        flagArray[3] = buttonCombi.charAt(4) === "1" ? 1 : 0;
        flagArray[4] = buttonCombi.charAt(5) === "1" ? 1 : 0;
        return flagArray;
    }

    function checkSupportedHeader(inStr){
        var trimLine = trimExternalWhiteSpace(inStr);		
		//Check first line against any of the supported header
		var headerCheckPassed = false;
		for (var i = SUPPORTED_HEADERS.length - 1; i >= 0; i--) {
			if(trimLine === SUPPORTED_HEADERS[i]){
				headerCheckPassed = true;
				break;
			}
		};
        
        return headerCheckPassed;
    }
    
    /**
    Parameters:
    inputLine - A string
    totalLineCount - A number
    returns:
    chipPosArray - [{pos:<number>,label:<string>}]
    */    
    function decodeBarLine(inputLine, totalLineCount){
        //Split barline into array of 2 characters
		var chipStringArray = inputLine.match(/.{1,2}/g);
		//console.log(chipStringArray);
		var chipPosArray = [];
        
        for (var i = 0; i < chipStringArray.length; i++) {
			if(chipStringArray[i] !== '00'){
				var linePos = i*totalLineCount/chipStringArray.length;
				var item = {"pos":linePos, "label":chipStringArray[i]};
				chipPosArray.push(item);
			}
		};

		return chipPosArray;
    }
    
    /**
    Parameters:
    inputLine - A string
    totalLineCount - A number
    returns:
    chipCount - Number
    */ 
    function countChipBarLine(inputLine, totalLineCount){
        //Split barline into array of 2 characters
		var chipStringArray = inputLine.match(/.{1,2}/g);
		//console.log(chipStringArray);
		var chipCount = 0;        
        for (var i = 0; i < chipStringArray.length; i++) {
			if(chipStringArray[i] !== '00'){
				++chipCount;
			}
		};
        
        return chipCount;
    }
    
    function computeLinesFromBarLength(barLength){
        return Math.floor(192 * barLength / 1.0);
    }
    
    function trimExternalWhiteSpace(inStr){
		if(typeof inStr === 'string'){
			return inStr.replace(/^\s+|\s+$/g, '');
		}
	}
    
    function splitKeyValueByColonOrWhiteSpace(input){
        var keyValue = input.split(/:(.+)?/,2);
			if(keyValue.length !== 2){
				keyValue = input.split(/\s(.+)?/,2);
			}
        //Remove the remove character '#' from key string
        var key = keyValue[0].substring(1);
        var value = trimExternalWhiteSpace(keyValue[1]);
        
        return {
            "key": key,
            "value": value
        };
    }
    
    //Fixed mapping values
    var DtxBarLabelMap = {
        BGM_LANE: "01",
		BAR_LENGTH_CHANGE_LABEL: "02",
		LINE_SHOW_HIDE_LABEL: "C2",
		BPM_CHANGE_LABEL: "08"
	};

	var DtxDrumsLaneCodeToLaneLabelMap = {
		//New DTX Creator uses these codes
        "1A":"LC",
		"11":"HH",
		"18":"HH",
		"1C":"LB",//Should be LB
		"1B":"LP",
		"12":"SD",
		"14":"HT",
		"13":"BD",
		"15":"LT",
		"17":"FT",
		"16":"RC",
		"19":"RD",
		//Old GDA uses the label mostly as is
		// "SD":"SD",
		// "BD":"BD",
		// "CY":"RC",
		// "HT":"HT",
		// "LT":"LT",
		// "FT":"FT",
		// "HH":"HH"
	};

    var GDADrumsLaneCodeToLaneLabelMap = {
		//Old GDA uses the label mostly as is
		"SD":"SD",
		"BD":"BD",
		"CY":"RC",
		"HT":"HT",
		"LT":"LT",
		"FT":"FT",
		"HH":"HH"
	};

    var DtxGuitarLanesCodeToButtonsMap = {
        "20": "G00000",
        "21": "G00100",
        "22": "G01000",
        "24": "G10000",
        "93": "G00010",
        "9B": "G00001",
        "23": "G01100",
        "25": "G10100",
        "26": "G11000",
        "94": "G00110",
        "95": "G01010",
        "97": "G10010",
        "9C": "G00101",
        "9D": "G01001",
        "9F": "G10001",
        "AC": "G00011",
        "27": "G11100",
        "96": "G01110",
        "98": "G10110",
        "99": "G11010",
        "9E": "G01101",
        "A9": "G10101",
        "AA": "G11001",
        "AD": "G00111",
        "AE": "G01011",
        "D0": "G10011",
        "9A": "G11110",
        "AB": "G11101",
        "AF": "G01111",
        "D1": "G10111",
        "D2": "G11011",
        "D3": "G11111",
        "28": "GWail"
        //GDA style (May clashes with unknown dtx lane codes!)
        // "G0": "G000",
        // "G1": "G001",
        // "G2": "G010",
        // "G3": "G011",
        // "G4": "G100",
        // "G5": "G101",
        // "G6": "G110",
        // "G7": "G111",
        // "GW": "GWail"
    };

    var GDAGuitarLanesCodeToButtonsMap = {        
        //GDA style (May clashes with unknown dtx lane codes!)
        "G0": "G000",
        "G1": "G001",
        "G2": "G010",
        "G3": "G011",
        "G4": "G100",
        "G5": "G101",
        "G6": "G110",
        "G7": "G111",
        "GW": "GWail"
    };

    var DtxBassLanesCodeToButtonsMap = {
        "A0": "B00000",
        "A1": "B00100",
        "A2": "B01000",
        "A4": "B10000",
        "C5": "B00010",
        "CE": "B00001",
        "A3": "B01100",
        "A5": "B10100",
        "A6": "B11000",
        "C6": "B00110",
        "C8": "B01010",
        "CA": "B10010",
        "CF": "B00101",
        "DA": "B01001",
        "DC": "B10001",
        "E1": "B00011",
        "A7": "B11100",
        "C9": "B01110",
        "CB": "B10110",
        "CC": "B11010",
        "DB": "B01101",
        "DD": "B10101",
        "DE": "B11001",
        "E2": "B00111",
        "E3": "B01011",
        "E5": "B10011",
        "CD": "B11110",
        "DF": "B11101",
        "E4": "B01111",
        "E6": "B10111",
        "E7": "B11011",
        "E8": "B11111",
        "A8": "BWail"
        //GDA style (Clashes with unknown dtx lane codes!)
        // "B0": "B000",
        // "B1": "B001",
        // "B2": "B010",
        // "B3": "B011",
        // "B4": "B100",
        // "B5": "B101",
        // "B6": "B110",
        // "B7": "B111",
        // "BW": "BWail"
    };

    var GDABassLanesCodeToButtonsMap = {
        //GDA style (Clashes with unknown dtx lane codes!)
        "B0": "B000",
        "B1": "B001",
        "B2": "B010",
        "B3": "B011",
        "B4": "B100",
        "B5": "B101",
        "B6": "B110",
        "B7": "B111",
        "BW": "BWail"
    };
    
    var DtxDrumsLaneCodeToCountLabelMap = {
        //New DTX Creator uses these codes
		"1A":"LC_Count",
		"11":"HH_Count",
		"18":"HH_Count",
		"1C":"LB_Count",//Should be LB
		"1B":"LP_Count",
		"12":"SD_Count",
		"14":"HT_Count",
		"13":"BD_Count",
		"15":"LT_Count",
		"17":"FT_Count",
		"16":"RC_Count",
		"19":"RD_Count",
		//Old GDA uses the label mostly as is
		// "SD":"SD_Count",
		// "BD":"BD_Count",
		// "CY":"RC_Count",
		// "HT":"HT_Count",
		// "LT":"LT_Count",
		// "FT":"FT_Count",
		// "HH":"HH_Count"
    };

    var GDADrumsLaneCodeToCountLabelMap = {
		//Old GDA uses the label mostly as is
		"SD":"SD_Count",
		"BD":"BD_Count",
		"CY":"RC_Count",
		"HT":"HT_Count",
		"LT":"LT_Count",
		"FT":"FT_Count",
		"HH":"HH_Count"
    };
    
    var DtxShowLineLabelMap = {
        "01": true,
        "02": false
    };

    //Drums
	// Parser.DtxLaneLabels = [
	// 	"LC",
	// 	"HH",
	// 	"LP",
    //     "LB",
	// 	"SD",
	// 	"HT",
	// 	"BD",
	// 	"LT",
	// 	"FT",
	// 	"RC",
	// 	"RD"
	// ];

    Parser.utils = {
        computeLinesFromBarLength: computeLinesFromBarLength,
        decodeBarLine: decodeBarLine,
        trimExternalWhiteSpace: trimExternalWhiteSpace
    };
    
    //Export the module with new class and useful functions
    mod.Parser = Parser;
    mod.VERSION = VERSION;
    
    //Return the updated module
    return mod;
}(DtxChart || {}));