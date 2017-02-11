/*
DtxChart.Parser
*/
var DtxChart = (function(mod){
    'use strict';
    var VERSION = "2.0.0";

    var SUPPORTED_HEADERS = ["; Created by DTXCreator 024",
	"; Created by DTXCreator 025(verK)",
	"; Created by DTXCreator 020",
	";Created by GDA Creator Professional Ver.0.10",
	";Created by GDA Creator Professional Ver.0.22"];
    
    /**
    Constructor
    */
    function Parser(config){
        this.config = config;
        
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
            return;
        }
        
        //Start processing all valid lines
		for (var i = 1; i < lines.length; i++) {
			if(lines[i].length > 0 && lines[i][0]==='#')
			{
				this._parseTextLine(lines[i]);
			}
		};        
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
        
        //Handle the actual drum chips
        for(var prop in rawLinesInBar){
            if(prop === "Description"){
                continue;
            }
            
            if(rawLinesInBar.hasOwnProperty(prop) && DtxLaneCodeToLaneLabelMap.hasOwnProperty(prop)){
                var LaneLabel = DtxLaneCodeToLaneLabelMap[prop];
                var rawLine = rawLinesInBar[prop];
                //
                newBarGroup["notes"][LaneLabel] = rawLine;
                //Compute Note count
                var chipCount = countChipBarLine(rawLine, lineCountInCurrentBar);
                var countLabel = DtxLaneCodeToCountLabelMap[prop];
                this._dtxdata.metadata[countLabel] += chipCount;
                this._dtxdata.metadata.totalNoteCount += chipCount;
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
        var level = 0;
        if(value.length <= 2){
            level = (parseInt(value) / 10).toFixed(2);
            //console.log(level);
        }
        else if(value.length === 3){
            level = (parseInt(value) / 100).toFixed(2);
            //console.log(level);	
        }
        dtxData.chartInfo.level = level;
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
                "level": 0.00
            };
        this.metadata = {
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
        this.barGroups = [];
    }

    /**
     * 
     */
    DTXDataObject.prototype.numberOfBars = function(){
        return this.barGroups.length;
    };
    
    //Helper functions
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
		//if(HEADER !== trimLine){
		if(!headerCheckPassed){	
			console.error('Fail to parse: Header not supported');
		}
        
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

	var DtxLaneCodeToLaneLabelMap = {
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
		"SD":"SD",
		"BD":"BD",
		"CY":"RC",
		"HT":"HT",
		"LT":"LT",
		"FT":"FT",
		"HH":"HH"
	};
    
    var DtxLaneCodeToCountLabelMap = {
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

	Parser.DtxLaneLabels = [
		"LC",
		"HH",
		"LP",
        "LB",
		"SD",
		"HT",
		"BD",
		"LT",
		"FT",
		"RC",
		"RD"
	];

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