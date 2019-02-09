'use strict';

$(document).ready(function(){
	
	if (window.File && window.FileReader && window.FileList && window.Blob) {
	  console.log('Dtx Chart Drawing ready');
	} 
	else {
	  alert('The File APIs are not fully supported by your browser.');
	  //Put some message html tags on page
	  return;
	}

	//Fix the encoding to Japanese for now
	var encoding = "Shift-JIS";

	//
	var currDtxObject = null;
	var dtxdataObject = null;
	var lineMapper = null;
	var graphDrum = null;
	var graphGuitar = null;
	var graphBass = null;
	var availableCharts = {
            drum: false,
            guitar: false,
            bass: false
        };
	var canRedraw = false;

	//
	function createCanvasSheets(canvasConfigArray, elementSelector){
		for(var i in canvasConfigArray){
			$(elementSelector).append('<canvas class="invis" id="'+ canvasConfigArray[i].elementId +'"></canvas>');
		}
	}

	function createImgElementsFromCanvas(canvasConfigArray, elementSelector){
		for(var i in canvasConfigArray){
			var currCanvas = document.getElementById(canvasConfigArray[i].elementId);
			var dataUrl = currCanvas.toDataURL();
			var imgElement = $('<img id="img_'+ canvasConfigArray[i].elementId +'">');
			
			var zoomFactor = 0.2;
			imgElement.attr('src', dataUrl);
			imgElement.addClass('zoomable');

			//Initialize each image as zoomed-out
			//jquery style does not work
			imgElement.addClass('out');
			imgElement[0].onload = function(){
				console.log(this.width + ", " + this.height);
				this.height = window.innerHeight - 104;
			};
			//End zoomed-out

			imgElement.click(function(){
				var currImg = $(this);
				currImg.toggleClass('out');				
				if(currImg.hasClass('out')){
					//Zoomed-out
					currImg.height( window.innerHeight - 104);
				}
				else{
					//Zoomed-in
					currImg.height( currImg[0].naturalHeight);
				}
			});
			$(elementSelector).append(imgElement);
		}
	}

	function createGraphPage(){
		$("#graph_container").append('<div class="row"><div class="col-md-2 col-sm-2 col-xs-2 canvasSheetContainer" id="dtxgraphdiv"></div><div class="col-md-2 col-sm-2 col-xs-2 canvasSheetContainer" id="guitargraphdiv"></div><div class="col-md-2 col-sm-2 col-xs-2 canvasSheetContainer" id="bassgraphdiv"></div></div>')
		$("#dtxgraphdiv").append('<h1>Drums</h1><canvas class="graphs" id="dtxgraph"></canvas>');
		$("#guitargraphdiv").append('<h1>Guitar</h1><canvas class="graphs" id="guitargraph"></canvas>');
		$("#bassgraphdiv").append('<h1>Bass</h1><canvas class="graphs" id="bassgraph"></canvas>');
	}

	// create a wrapper around native canvas element (with id="c1")
	$('#Open').click(function(e){
		$('#openFile').trigger('click');
	});
	
	//var plotter = new Xcharter.Plotter();
	//
	var dmcharter = new DtxChart.Charter();
	var gfgcharter = new DtxChart.Charter();
	var gfbcharter = new DtxChart.Charter();
	
	$('#Draw').click(function(e){
		if(!canRedraw){
			return;
		}

		//Add DOM manipulation code
		dmcharter.clearDTXChart();
		gfgcharter.clearDTXChart();
		gfbcharter.clearDTXChart();		
		$("#drum_chart_container").empty();
		$("#guitar_chart_container").empty();
		$("#bass_chart_container").empty();		
		//
		dmcharter.setConfig({
			scale: parseFloat( $('#SelectScaleFactor').val() ),
			pageHeight: parseInt( $('#SelectPageHeight').val() ),
			pagePerCanvas: parseInt( $('#SelectPagePerCanvas').val()),
			chartType: $('#SelectMode').val(),
			mode: "drum",
			difficultyTier: $('#SelectDifficulty').val(),
			barAligned : true,//Test
			direction: "up",//up or down
			drawParameters: DtxChart.DMDrawMethods.createDrawParameters( $('#SelectMode').val() ),
			drawNoteFunction: DtxChart.DMDrawMethods.drawNote
		});
		gfgcharter.setConfig({
			scale: parseFloat( $('#SelectScaleFactor').val() ),
			pageHeight: parseInt( $('#SelectPageHeight').val() ),
			pagePerCanvas: parseInt( $('#SelectPagePerCanvas').val()),
			chartType: $('#SelectMode').val(),
			mode: "guitar",
			difficultyTier: $('#SelectDifficulty').val(),
			barAligned : true,//Test
			direction: "down",//up or down
			drawParameters: DtxChart.GFDrawMethods.createDrawParameters( $('#SelectMode').val(), 'G' ),
			drawNoteFunction: DtxChart.GFDrawMethods.drawNote
		});
		gfbcharter.setConfig({
			scale: parseFloat( $('#SelectScaleFactor').val() ),
			pageHeight: parseInt( $('#SelectPageHeight').val() ),
			pagePerCanvas: parseInt( $('#SelectPagePerCanvas').val()),
			chartType: $('#SelectMode').val(),
			mode: "bass",
			difficultyTier: $('#SelectDifficulty').val(),
			barAligned : true,//Test
			direction: "down",//up or down
			drawParameters: DtxChart.GFDrawMethods.createDrawParameters( $('#SelectMode').val(), 'B' ),
			drawNoteFunction: DtxChart.GFDrawMethods.drawNote
		});

		//
		var dmcanvasConfigArray = dmcharter.canvasRequired();
		var gfgcanvasConfigArray = gfgcharter.canvasRequired();
		var gfbcanvasConfigArray = gfbcharter.canvasRequired();
		//console.log("Required canvas count: ",canvasConfigArray.length);
		//
		createCanvasSheets(dmcanvasConfigArray, "#drum_chart_container");
		createCanvasSheets(gfgcanvasConfigArray, "#guitar_chart_container");
		createCanvasSheets(gfbcanvasConfigArray, "#bass_chart_container");
		//createGraphPage();
		
		dmcharter.setCanvasArray(dmcanvasConfigArray);
		dmcharter.drawDTXChart();
		gfgcharter.setCanvasArray(gfgcanvasConfigArray);
		gfgcharter.drawDTXChart();
		gfbcharter.setCanvasArray(gfbcanvasConfigArray);
		gfbcharter.drawDTXChart();

		//
		createImgElementsFromCanvas(dmcanvasConfigArray, "#drum_chart_container");
		createImgElementsFromCanvas(gfgcanvasConfigArray, "#guitar_chart_container");
		createImgElementsFromCanvas(gfbcanvasConfigArray, "#bass_chart_container");
		
		//'Click' on first non-home tabs
		var hLink = "home";
		if(availableCharts.drum){
			hLink = "menu1";				
		}
		else if(availableCharts.guitar){
			hLink = "menu2";					
		}
		else if(availableCharts.bass){
			hLink = "menu3";
		}
		$('.nav-tabs a[href="#' + hLink + '"]').tab('show');//Programmatically clicks on the selected tab
	});

	$('#Clear').click(function(e){
		
		dmcharter.clearDTXChart();
		canRedraw = false;
		availableCharts  = {
            drum: false,
            guitar: false,
            bass: false
        };

		//Add DOM manipulation code
		$('#openFile').val('');
		$("#drum_chart_container").empty();
		$("#guitar_chart_container").empty();
		$("#bass_chart_container").empty();
		$("#graph_container").empty();
		$('#placeholder1').css('display', '');
		$('#placeholder2').css('display', '');
		$('#placeholder3').css('display', '');
		$('#placeholder4').css('display', '');
		$('.nav-tabs a[href="#home"]').tab('show');
	});

	$('#openFile').change(function(e){
		//console.log(e);

		var f = e.target.files[0];
		if(f){
			var r = new FileReader();
			r.onload = function(e) { 
				var contents = e.target.result;
				var arrayString = f.name.split(".");
				var extension = arrayString[arrayString.length - 1];			
				//Parse contents and create dtx-object from it
				//var dtx_parser = new DtxParser();
				//var status = dtx_parser.parseDtxText(contents);

				//
				var dtxparserv2 = new DtxChart.Parser({mode: extension.toLowerCase()});
				var ret = dtxparserv2.parseDtxText(contents);
				if(ret){
					dtxdataObject = dtxparserv2.getDtxDataObject();
					//console.log(dtxdataObject);
					//console.log(JSON.stringify(dtxdataObject));

					lineMapper = new DtxChart.LinePositionMapper(dtxdataObject);
					var estimatedDuration = lineMapper.estimateSongDuration();
					console.log("Song is estimated to be " + estimatedDuration + " seconds long");
					dmcharter.setDtxData(dtxdataObject, lineMapper);//
					dmcharter.setConfig({
						scale: parseFloat( $('#SelectScaleFactor').val() ),
						pageHeight: parseInt( $('#SelectPageHeight').val() ),
						pagePerCanvas: parseInt( $('#SelectPagePerCanvas').val()),
						chartType: $('#SelectMode').val(),
						mode: "drum",
						difficultyTier: $('#SelectDifficulty').val(),
						barAligned : true,//Test
						direction: "up",//up or down
						drawParameters: DtxChart.DMDrawMethods.createDrawParameters( $('#SelectMode').val() ),
						drawNoteFunction: DtxChart.DMDrawMethods.drawNote
					});

					/*
					var gfgcharter = new DtxChart.Charter();
					var gfbcharter = new DtxChart.Charter();
					*/

					gfgcharter.setDtxData(dtxdataObject, lineMapper);//
					gfgcharter.setConfig({
						scale: parseFloat( $('#SelectScaleFactor').val() ),
						pageHeight: parseInt( $('#SelectPageHeight').val() ),
						pagePerCanvas: parseInt( $('#SelectPagePerCanvas').val()),
						chartType: $('#SelectMode').val(),
						mode: "guitar",
						difficultyTier: $('#SelectDifficulty').val(),
						barAligned : true,//Test
						direction: "down",//up or down
						drawParameters: DtxChart.GFDrawMethods.createDrawParameters( $('#SelectMode').val(), "G" ),
						drawNoteFunction: DtxChart.GFDrawMethods.drawNote
					});

					gfbcharter.setDtxData(dtxdataObject, lineMapper);//
					gfbcharter.setConfig({
						scale: parseFloat( $('#SelectScaleFactor').val() ),
						pageHeight: parseInt( $('#SelectPageHeight').val() ),
						pagePerCanvas: parseInt( $('#SelectPagePerCanvas').val()),
						chartType: $('#SelectMode').val(),
						mode: "bass",
						difficultyTier: $('#SelectDifficulty').val(),
						barAligned : true,//Test
						direction: "down",//up or down
						drawParameters: DtxChart.GFDrawMethods.createDrawParameters( $('#SelectMode').val(), "B" ),
						drawNoteFunction: DtxChart.GFDrawMethods.drawNote
					});
					
					//
					var dmcanvasConfigArray = dmcharter.canvasRequired();
					console.log("Required canvas count: ",dmcanvasConfigArray.length);

					var gfgcanvasConfigArray = gfgcharter.canvasRequired();
					var gfbcanvasConfigArray = gfbcharter.canvasRequired();
					
					//Clear chart before loading										
					$("#drum_chart_container").empty();
					$("#guitar_chart_container").empty();
					$("#bass_chart_container").empty();
					$("#graph_container").empty();
					//
					createCanvasSheets(dmcanvasConfigArray, "#drum_chart_container");
					createCanvasSheets(gfgcanvasConfigArray, "#guitar_chart_container");
					createCanvasSheets(gfbcanvasConfigArray, "#bass_chart_container");
					createGraphPage();

					//canvasConfigArray[0].backgroundColor = "#000000";					
					dmcharter.setCanvasArray(dmcanvasConfigArray);
					dmcharter.drawDTXChart();
					gfgcharter.setCanvasArray(gfgcanvasConfigArray);
					gfgcharter.drawDTXChart();
					gfbcharter.setCanvasArray(gfbcanvasConfigArray);
					gfbcharter.drawDTXChart();
					
					//
					createImgElementsFromCanvas(dmcanvasConfigArray, "#drum_chart_container");
					createImgElementsFromCanvas(gfgcanvasConfigArray, "#guitar_chart_container");
					createImgElementsFromCanvas(gfbcanvasConfigArray, "#bass_chart_container");
					
					//Hide placeholders of available charts only
					availableCharts = dtxparserv2.availableCharts();
					//Drum
					if(availableCharts.drum){
						$('#placeholder1').css('display', 'none');
						graphDrum = new DtxChart.Graph(dtxdataObject, "dtxgraph");
						graphDrum.drawGraph();					
					}
					else{
						$('#placeholder1').css('display', '');
					}
					//Guitar
					if(availableCharts.guitar){
						$('#placeholder2').css('display', 'none');
						graphGuitar = new DtxChart.Graph(dtxdataObject, "guitargraph", null, "Guitar");
						graphGuitar.drawGraph();					
					}
					else{
						$('#placeholder2').css('display', '');	
					}
					//Bass
					if(availableCharts.bass){
						$('#placeholder3').css('display', 'none');
						graphBass = new DtxChart.Graph(dtxdataObject, "bassgraph", null, "Bass");
						graphBass.drawGraph();
					}
					else{
						$('#placeholder3').css('display', '');
					}
					$('#placeholder4').css('display', 'none');

					//'Click' on first non-home tabs
					var hLink = "home";
					if(availableCharts.drum){
						hLink = "menu1";				
					}
					else if(availableCharts.guitar){
						hLink = "menu2";					
					}
					else if(availableCharts.bass){
						hLink = "menu3";
					}
					$('.nav-tabs a[href="#' + hLink + '"]').tab('show');//Programmatically clicks on the selected tab
					canRedraw = true;
				}				
			}
			r.readAsText(f,encoding);
		}

	});
	
});