/**
 * 
 */

var DtxChart = (function(mod){
    
    //Check if fabric.js has been loaded
    if(!fabric){
        console.error("fabric.js not found! Please load fabric.js before loading DtxChart.ChartEngine module");
        return mod;
    }


    //CanvasEngine act as abstract interface to the actual canvas library
    
    /**
     * canvasConfig:
     *    pages - Number of pages in this canvas
     *    width - The full width of canvas
     *    height - The full height of canvas
     *    elementId - The id of the html5 canvas element
     *    backgroundColor - Color string of background color of canvas
     */
    function createCanvas(canvasConfig){
        //TODO: Handle thrown exceptions when elementID is invalid
        var canvas = null;
        try {
            canvas = new fabric.StaticCanvas( canvasConfig.elementId, 
            {
				backgroundColor: canvasConfig.backgroundColor,
				height: canvasConfig.height,
				width: canvasConfig.width,
				renderOnAddRemove: false
			});
        } catch (error) {
            //console.error("CanvasEngine error: ", error);
            throw new Error("Invalid <canvas> element. CanvasEngine fail to create canvasObject");
        }

        return canvas;
    }

    function addChip(positionSize, drawOptions){
        var rect = new fabric.Rect({
			  fill: drawOptions.fill,
			  width: positionSize.width,
			  height: positionSize.height,
              left: positionSize.x,
              top: positionSize.y,
			  originY: 'center'
			});
        
        this._canvasObject.add(rect);
    }

    function addRectangle(positionSize, drawOptions){
        var rect = new fabric.Rect({
			  fill: drawOptions.fill,
              originY: drawOptions.originY,
			  width: positionSize.width,
			  height: positionSize.height,
			  left: positionSize.x,
              top: positionSize.y
			});

        this._canvasObject.add(rect);
    }

    function addLine(positionSize, drawOptions){
        
        var line = new fabric.Line([
            positionSize.x, 
            positionSize.y, 
            positionSize.x + positionSize.width, 
            positionSize.y + positionSize.height
        ],{
            stroke: drawOptions.stroke,
            strokeWidth: drawOptions.strokeWidth
        });

        this._canvasObject.add(line);
        
    }

    function addText(positionSize, text, textOptions){
        /**
         * "BARNUM":new fabric.Text('000',{
				// backgroundColor: 'black',
				fill: '#ffffff',
				fontSize: 16,
				originY: 'center'
         */

        var textObject = new fabric.Text(text, {
            left: positionSize.x,
            top: positionSize.y,
            fill: textOptions.fill ? textOptions.fill : "#ffffff",
            fontSize: textOptions.fontSize ? textOptions.fontSize : 20,
            fontWeight: textOptions.fontWeight ? textOptions.fontWeight : "",
            fontFamily: textOptions.fontFamily ? textOptions.fontFamily : "Times New Roman",
            originY: textOptions.originY ? textOptions.originY : "center",
            originX: textOptions.originX ? textOptions.originX : "left"
        });

        var currTextWidth = textObject.width;
        if(positionSize.width && currTextWidth >  positionSize.width){
            textObject.scaleToWidth(positionSize.width); //positionSize.width/currTextWidth required for fabric 1.7.6! But why? getBoundingRectWidth also return wrong value for text object
        }

        this._canvasObject.add(textObject);
    }

    //Clears the canvas of all note chart information and resets the background color
    function clear(){
        var bgColor = this._canvasObject.backgroundColor;
        this._canvasObject.clear();
        this._canvasObject.setBackgroundColor(bgColor, this._canvasObject.renderAll.bind(this._canvasObject));
        //TODO: May still need to call renderAll

    }

    function update(){
        this._canvasObject.renderAll();
    }

   //
    mod.CanvasEngine = {
        createCanvas: createCanvas,
        addChip: addChip,
        addRectangle: addRectangle,
        addLine: addLine,
        addText: addText,
        clear: clear,
        update: update
    };

    //
    return mod;
}( DtxChart || {} ));