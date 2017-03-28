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
	var graph = null;

	//
	function createCanvasSheets(canvasConfigArray){
		for(var i in canvasConfigArray){
			var index = parseInt(i);
			if(index === 0)
			{
				$("#chart_container").append('<div class="row"><div class="col-md-12 col-sm-12 col-xs-12 canvasSheetContainer"><canvas id="'+ canvasConfigArray[i].elementId +'"></canvas><canvas id="dtxgraph"></canvas></div></div>');
			}
			else{
				$("#chart_container").append('<div class="row"><div class="col-md-12 col-sm-12 col-xs-12 canvasSheetContainer"><canvas id="'+ canvasConfigArray[i].elementId +'"></canvas></div></div>');
			}
			
		}
	}

	// create a wrapper around native canvas element (with id="c1")
	$('#Open').click(function(e){
		$('#openFile').trigger('click');
	});
	
	//var plotter = new Xcharter.Plotter();
	//
	var charter2 = new DtxChart.Charter();
	
	$('#Draw').click(function(e){
		//Add DOM manipulation code
		charter2.clearDTXChart();		
		$("#chart_container").empty();

		//
		charter2.setConfig({
			scale: parseFloat( $('#SelectScaleFactor').val() ),
			pageHeight: parseInt( $('#SelectPageHeight').val() ),
			pagePerCanvas: parseInt( $('#SelectPagePerCanvas').val()),
			chartType: $('#SelectMode').val(),
			barAligned : true//Test
		});

		//
		var canvasConfigArray = charter2.canvasRequired();
		//console.log("Required canvas count: ",canvasConfigArray.length);
		//
		createCanvasSheets(canvasConfigArray);	

		charter2.setCanvasArray(canvasConfigArray);
		charter2.drawDTXChart();	
		//Draw graph last
		graph = new DtxChart.Graph(dtxdataObject, "dtxgraph");
		graph.drawGraph();
	});

	$('#Clear').click(function(e){
		
		charter2.clearDTXChart();

		//Add DOM manipulation code
		$('#openFile').val('');
		$("#chart_container").empty();
		$('#placeholder').css('display', '');
	});

	$('#openFile').change(function(e){
		//console.log(e);

		var f = e.target.files[0];
		if(f){
			var r = new FileReader();
			r.onload = function(e) { 
				var contents = e.target.result;				

				//Parse contents and create dtx-object from it
				//var dtx_parser = new DtxParser();
				//var status = dtx_parser.parseDtxText(contents);

				//
				var dtxparserv2 = new DtxChart.Parser();
				var ret = dtxparserv2.parseDtxText(contents);
				if(ret){
					dtxdataObject = dtxparserv2.getDtxDataObject();
					console.log(dtxdataObject);
					console.log(JSON.stringify(dtxdataObject));

					lineMapper = new DtxChart.LinePositionMapper(dtxdataObject);
					var estimatedDuration = lineMapper.estimateSongDuration();
					console.log("Song is estimated to be " + estimatedDuration + " seconds long");
					charter2.setDtxData(dtxdataObject, lineMapper);//
					charter2.setConfig({
						scale: parseFloat( $('#SelectScaleFactor').val() ),
						pageHeight: parseInt( $('#SelectPageHeight').val() ),
						pagePerCanvas: parseInt( $('#SelectPagePerCanvas').val()),
						chartType: $('#SelectMode').val(),
						barAligned : true//Test
					});

					
					//
					var canvasConfigArray = charter2.canvasRequired();
					console.log("Required canvas count: ",canvasConfigArray.length);
					
					//Clear chart before loading
					$('#placeholder').css('display', 'none');					
					$("#chart_container").empty();
					//
					createCanvasSheets(canvasConfigArray);

					//canvasConfigArray[0].backgroundColor = "#000000";					
					charter2.setCanvasArray(canvasConfigArray);
					charter2.drawDTXChart();
					
					//Draw graph last
					graph = new DtxChart.Graph(dtxdataObject, "dtxgraph");
					graph.drawGraph();
				}				
			}
			r.readAsText(f,encoding);
		}

	});
	
});