/**
 * 
 */

/**
 * 
 */

var DtxChart = (function(mod){
    
    var CanvasEngine = mod.CanvasEngine;//Can be FabricJS, EaselJS or even raw Canvas API
    if(!CanvasEngine){
        console.error("CanvasEngine not loaded into DtxChart module! DtxChart.ChartSheet will not render without a Canvas engine");
    }

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
    ChartSheet.prototype.addRectangle = function(positionSize, drawOptions){
        if(CanvasEngine){
            CanvasEngine.addRectangle.call(this, positionSize, drawOptions);
        }
    };

    ChartSheet.prototype.addChip = function(positionSize, drawOptions, imgObject){
        if(CanvasEngine){
            CanvasEngine.addChip.call(this, positionSize, drawOptions, imgObject);
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

    //
    mod.ChartSheet = ChartSheet;
    return mod;
}( DtxChart || {} ));