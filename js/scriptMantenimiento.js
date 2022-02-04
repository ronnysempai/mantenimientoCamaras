//var IPSERVIDOR='localhost';
var IPSERVIDOR='181.196.251.21';
$(document).on("ready", function(){
	
	/*variables globales  */
	//var IPSERVIDOR='181.196.251.21';
	
	var PUERTO='4044';
	var arrModulos=[];
	/*  */
	function cargaEditar(m){
			//$('#modal2').modal({
			  //keyboard: false
			//});
			$('.modal-title').html('Editar Modulo');
			$('#modal2').modal({
			  backdrop: 'static',
			  keyboard: true
			});
			cargaDatosModuloIndicado(m);
	}
	function cargaNuevo(){
			//$('#modal2').modal({
			  //keyboard: false
			//});
			$('.modal-title').html('Nuevo Modulo');
			$('#modal2').modal({
			  backdrop: 'static',
			  keyboard: true
			});	
	}
	
	function cargaDatosModuloIndicado(m){
		console.log(m);
		$("#idtxt_indice_oculto").val(m);
		var modulo={};
		modulo=arrModulos[m];
		$("#idtxt_ubicacion").val(modulo.ubicacion.latitud+','+modulo.ubicacion.longitud);
		$("#idtxt_nombre").val(modulo.propiedades.nombre);
		$("#idtxt_direccion").val(modulo.propiedades.direccion);
		$("#idtxt_marca").val(modulo.propiedades.marca);
		$("#idtxt_modelo").val(modulo.propiedades.modelo);
		$("#idtxt_url").val(modulo.propiedades.url);
		$("#idtxt_usuario").val(modulo.propiedades.usuario);
		//$("#select_modelo .opEscojida").html(modulo.modelo);
		//$("#select_tipo_atencion .opEscojida").html(modulo.tipo_atencion);
	}
	
	function consultaTodasCamaras(){
		var modulo={};
		$.ajax({
				type: "GET",
				url: "http://"+IPSERVIDOR+":"+PUERTO+"/dataCamaras?callback=?",
				async:true,
				/* data: {objeto:$("#idnum_cimedb").val()}, */
				jsonpCallback: 'jsonCallback',
				contentType: "application/json",
				dataType: 'jsonp',
				success: function(data){
					console.log(data);
					cargaDatosModulos(data);
				},
				error: function(e) {
					console.log(e);
				}
			});
	}
	function insertarNuevoModulo(){	
		var arrLatLon= $('#idtxt_ubicacion').val().split(',');
		var d = new Date();
		var n = d.getTime();
		var modulo={};
		modulo.propiedades={};
		modulo.propiedades.id='cmr'+n;
		modulo.estadoLogico=1;
		modulo.ubicacion={latitud:arrLatLon[0],longitud:arrLatLon[1]};
		modulo.propiedades.direccion=$("#idtxt_direccion").val();
		modulo.propiedades.nombre=$("#idtxt_nombre").val();
		modulo.propiedades.marca=$("#idtxt_marca").val();
		modulo.propiedades.modelo=$("#idtxt_modelo").val();
		modulo.propiedades.usuario=$("#idtxt_usuario").val();
		modulo.propiedades.url=$("#idtxt_url").val();
		
		modulo["!nativeeditor_status"]="inserted";
		$.ajax({
				type: "GET",
				url: "http://"+IPSERVIDOR+":"+PUERTO+"/dataInsertaCamara?callback=?",
				async:true,
				data: {objeto:modulo}, 
				jsonpCallback: 'jsonCallback',
				contentType: "application/json",
				dataType: 'jsonp',
				success: function(data) {
					console.log(data);
					consultaTodasCamaras();
				},
				error: function(e) {
					console.log(e);
				}
			});
	}
	function actualizarCamara(){	
		var indice=$("#idtxt_indice_oculto").val();
		var arrLatLon= $('#idtxt_ubicacion').val().split(',');
		var modulo=arrModulos[indice];
		//modulo.propiedades={};
		//modulo.propiedades.id='cmr'+n;
		modulo.ubicacion={latitud:arrLatLon[0],longitud:arrLatLon[1]};
		modulo.propiedades.direccion=$("#idtxt_direccion").val();
		modulo.propiedades.nombre=$("#idtxt_nombre").val();
		modulo.propiedades.marca=$("#idtxt_marca").val();
		modulo.propiedades.modelo=$("#idtxt_modelo").val();
		modulo.propiedades.usuario=$("#idtxt_usuario").val();
		modulo.propiedades.url=$("#idtxt_url").val();
		modulo["!nativeeditor_status"]="updated";
		$.ajax({
				type: "GET",
				url: "http://"+IPSERVIDOR+":"+PUERTO+"/dataInsertaCamara?callback=?",
				async:true,
				data: {objeto:modulo}, 
				jsonpCallback: 'jsonCallback',
				contentType: "application/json",
				dataType: 'jsonp',
				success: function(data) 
				{
					console.log(data);
					consultaTodasCamaras();
				},
				error: function(e) {
					console.log(e);
				}
			});
	}

	function eliminacionLogicaCamara(indice){	
		console.log('indice '+indice);
		console.dir(arrModulos);
		var modulo=arrModulos[indice];
		modulo.estadoLogico=0;
		modulo["!nativeeditor_status"]="updated";
		$.ajax({
				type: "GET",
				url: "http://"+IPSERVIDOR+":"+PUERTO+"/dataInsertaCamara?callback=?",
				async:true,
				data: {objeto:modulo}, 
				jsonpCallback: 'jsonCallback',
				contentType: "application/json",
				dataType: 'jsonp',
				success: function(data) 
				{
					console.log(data);
					consultaTodasCamaras();
				},
				error: function(e) {
					console.log(e);
				}
			});
	}

	function cargaDatosModulos(modulos){  
		var fila;
		var lat,lon;
		console.dir(modulos);
		$('#idTblListaModulos tbody').html('');
		var indice=0;
		for(var m=0;m<modulos.length;m++)
		if(modulos[m].estadoLogico==1)	
		{	fila='';
			if(modulos[m].ubicacion){
			lat=modulos[m].ubicacion.latitud;
			lon=modulos[m].ubicacion.longitud;	
			}
			fila='<tr>'
			+'<td>'+(indice+1)+'</td>'
			+'<td>'+modulos[m].propiedades.id+'</td>'
			+'<td>'+modulos[m].propiedades.nombre+'</td>'
			+'<td><img id="idImgBtnConsultaUbicacion'+(m+1)+'" alt="'+modulos[m].ubicacion.latitud+','+modulos[m].ubicacion.longitud+'" src="img/04_maps.png" style=" margin-left:20px; width:40px; height:40px;" /></td>'
			+'<td>'+modulos[m].propiedades.direccion+'</td>'
			+'<td>'+modulos[m].propiedades.marca+'</td>'
			+'<td>'+modulos[m].propiedades.modelo+'</td>'
			//+'<td>'+modulos[m].propiedades.url+'</td>'
			+'<td><a id="callCamera'+(m+1)+'" href="#" class="btn btn-success"><span class="glyphicon glyphicon-play"></span>Ver Camera</a></td>'
			+'<td>'+modulos[m].propiedades.usuario+'</td>'
			+'<td>'
			+'<a href="#" id="idBtnCargaEditar'+(m+1)+'" class="btn btn-primary">Editar</a>'
			+'<a href="#" id="idBtnEliminar'+(m+1)+'"  class="btn btn-primary">Eliminiar</a>'
			+'</td>'
			+'</tr>';
			$('#idTblListaModulos').append(fila);
			//if(arrModulos[m]==null)arrModulos.push(modulos[m]);
			$('#idImgBtnConsultaUbicacion'+(m+1)).click({lat: lat, lon: lon},function(event){
				console.log(event.data.lat);
				cargarMapaUbicacion(event.data.lat,event.data.lon);
			});
			$('#idBtnCargaEditar'+(m+1)).click({indice:m},function(event){
				ESTADOINSERTARACTUALIZAR=ESTADOACTUALIZAR;
				cargaEditar(event.data.indice);
			});
			$('#idBtnEliminar'+(m+1)).click({indice:m},function(event){
				ESTADOINSERTARACTUALIZAR=ESTADOACTUALIZAR;
				eliminacionLogicaCamara(event.data.indice);
			});
			$('#callCamera'+(m+1)).click({identificador:modulos[m].propiedades.id},function(event){
				$('#modalCamara').modal({
			  	keyboard: true
				});
				$('#modalCamara .modal-title').html('Camara '+event.data.identificador);
				kms.camera(event.data.identificador, videoCamera, true);  // cuando hay un objecto video: pedir verlo
			});
			indice++;
		}
		arrModulos=modulos;
	}
	function cargarMapaUbicacion(latitud,longitud){
			$('#modalMapaUbicacion').modal({
			  keyboard: true
			});
			//-3.997155565977978,-79.2009981489349
			setTimeout(function(e){
				//iniciarMapaConsulta("idMapaConsultaUbicacion",latitud,longitud);
				iniciarMapaConsultaLeafletjs("idMapaConsultaUbicacion",latitud,longitud);
			},1000);
	}
	/* eventos click */
		$('#idImgBtnConsultaUbicacionF').click(function(){
			//-2.217145, -79.889819
			var coordenadas=$("#idtxt_ubicacion").val().split(',');
			console.log(coordenadas[0]);
			cargarMapaUbicacion(''+coordenadas[0],''+coordenadas[1]);
		});
		$('#idBtnCargaEditar0').click(function(){
			cargaEditar();
		});
		$('#idBtnNuevo').click(function(){
			cargaNuevo();
		});
		$('#idBtnGuardarNuevoModulo').click(function(){
			
			switch(ESTADOINSERTARACTUALIZAR) {
			    case ESTADOINSERTAR:
					insertarNuevoModulo();        
			        break;
			    case ESTADOACTUALIZAR:
			        actualizarCamara();
			        break;
			    default:
			        //
			}

			$('#modal2').modal('hide');
		});
	/*  */
	var ESTADOINSERTARACTUALIZAR;
	var ESTADOACTUALIZAR=44;
	var ESTADOINSERTAR=11;
	var map;
	var markerIndicador;
	function iniciar_mapa(idDivMapa){
		var mapOptions={
			zoom: 17,
			center: new google.maps.LatLng(-3.997155565977978,-79.2009981489349),
			mapTypeId: google.maps.MapTypeId.ROADMAP
		  };
		  map = new google.maps.Map(document.getElementById(idDivMapa), mapOptions);
			google.maps.event.addListener(map,'click',function(event){
				var usu;
				$('#idtxt_coordenadas_asignacion').val( event.latLng.lat() + ', ' + event.latLng.lng())
				$('#idtr_destinatarios td').each(function (index){
					var usu = ($(this).attr('id')).split("_")[2];
				});	
			});
	}

	function iniciarMapaConsulta(idDivMapa,latitud,longitud){
		var mapOptions = {
			zoom: 17,
			center: new google.maps.LatLng(latitud,longitud),
			mapTypeId: google.maps.MapTypeId.ROADMAP
		  };
		  map = new google.maps.Map(document.getElementById(idDivMapa), mapOptions);
	  
			google.maps.event.addListener(map,'click',function(event) {
				var usu;
			});
			
			var marker = new google.maps.Marker({
				position: new google.maps.LatLng(latitud,longitud)
				, map: map
				, title: "Aqui esta"
				<!-- , icon: 'http://gmaps-samples.googlecode.com/svn/trunk/markers/red/marker1.png' -->
			});
	}
	/*Leaflet*/
	function iniciarMapaConsultaLeafletjs(idDivMapa,latitud,longitud){
		if(map)destruirMapa();
		var osmUrl = 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
		osmAttrib ='', //'&copy; <a href="http://openstreetmap.org/copyright">OpenStreetMap</a> contributors',
		osm = L.tileLayer(osmUrl,{maxZoom: 18, attribution: osmAttrib});	
		map = new L.Map(idDivMapa,{layers: [osm], center: new L.LatLng(latitud,longitud), zoom: 17})
		agregarMarkerLeaflet(latitud,longitud);
	}
	function destruirMapa(){
	map.remove();
	map = null;
	}
	function asignarCoordenadesCampoFormulario(){
		var latLng=markerIndicador.getLatLng();
		$("#idtxt_ubicacion").val(latLng.lat+','+latLng.lng);
	}
	function agregarMarkerLeaflet(latitud,longitud){
		markerIndicador = L.marker([latitud,longitud],{draggable:true}).addTo(map);
		markerIndicador.on('dragend',function(){ asignarCoordenadesCampoFormulario();});
	}
	/**/
	function existeMarker(idLocalidad){
		if( arrMarkersLocalidades['mark'+idLocalidad] !=undefined )
		return true;
		return false;
	}
	function cambiaEtiquetaMarker(idLocalidad,etiqueta){
		var nuevaEtiqueta= ((etiqueta*1)<10 && (etiqueta*1)>0  )? '0'+etiqueta:etiqueta;
		$('#mark'+idLocalidad).html(nuevaEtiqueta);		
	}
	/* fin script Mapa */
	consultaTodasCamaras();
});

/* list op button  */
$(".dropdown-menu li a").click(function(){
  var selText = $(this).text();
  var idOp=$(this)[0].id;
	console.log($(this)[0]);
	$(this).parents('.btn-group').find('.dropdown-toggle').html(selText+' <span  id="'+idOp+'" class="opEscojida" style="display:none;">'+idOp+'</span>  <span  class="caret"></span>');
});
/*  */
