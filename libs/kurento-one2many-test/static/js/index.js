/*
 * (C) Copyright 2014-2015 Kurento (http://kurento.org/)
 *
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the GNU Lesser General Public License
 * (LGPL) version 2.1 which accompanies this distribution, and is available at
 * http://www.gnu.org/licenses/lgpl-2.1.html
 *
 * This library is distributed in the hope thatVideoObjecto it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 */

//var ws = new WebSocket('wss://' + location.host + '/kms');
var IPSERVER="181.196.251.21"
var ws = new WebSocket('wss://'+IPSERVER+':8443/kms');

var stopSiCantidadViewerCeroBl = true;
var stopSiCantidadViewerCeroBlDefault = false;
var idPresenterGlobal = 'usr123456789'  // para presenter: quien es
,	idViewerGlobal = 'usr1234567890';	// para viewer: con quien conectar 
										// idPresenterGlobal no puede ser fijo !!! xxx
										// idViewerGlobal no puede ser fijo !!! xxx
var kms;
window.onload = function() {
	//console = new Console();
	video = document.getElementById('video');
	videoCamera = document.getElementById('videoCamera');
	
	// el objecto que es para toda la comunicacion con el media server
	kms = new Kms(
	{
		stopSiCantidadViewerCeroBlDefault: stopSiCantidadViewerCeroBlDefault, 	// opcional, si ausente usa valore de stopSiCantidadViewerCeroBlDefaultDefault
		enviaMensajesJSON: sendMessage, 				// obligatorio, funcion (JSON){...}
		idUsuario: idPresenterGlobal 					// obligatorio "usr..." id del usario de este kms
	}
	);
	
	// asi el servidor nota que ya no disponible
	window.onbeforeunload = function() {
		ws.close();
	}

	ws.onmessage = function(message) {
		var mensajeJSON = JSON.parse(message.data);
		if (mensajeJSON.tipo && mensajeJSON.tipo.substr(0,4) === 'kms_'){
			kms.procesarMensaje(mensajeJSON);
		}
	}

	// presenter
	// usar camera del laptop para presenter
	if(document.getElementById('call'))
	document.getElementById('call').addEventListener('click', function() { 
		kms.presenter(video, stopSiCantidadViewerCeroBl, "av"); // modos: "a", "v", "av" (audio solo, video solo, audio + video) 
	} );
	if(document.getElementById('startRecordPresenter'))
	document.getElementById('startRecordPresenter').addEventListener('click', function() { 
		kms.startGrabarPresenter(); 
	} );
	if(document.getElementById('pauseRecordPresenter'))
	document.getElementById('pauseRecordPresenter').addEventListener('click', function() { 
		kms.pausarGrabarPresenter(); 
	} );
	if(document.getElementById('stopRecordPresenter'))
	document.getElementById('stopRecordPresenter').addEventListener('click', function() { 
		kms.stopGrabarPresenter(); 
	} );
	if(document.getElementById('terminatePresenter'))
	document.getElementById('terminatePresenter').addEventListener('click', function() { 
		kms.stopPresenter(); 
	} );
	if(document.getElementById('playPresenterRecorded'))
	document.getElementById('playPresenterRecorded').addEventListener('click', function() { 
		kms.playPresenter(); 
	} );
	
	// viewer
	// ver camera del laptop como viewer
	if(document.getElementById('viewer'))
	document.getElementById('viewer').addEventListener('click', function() { 
		kms.viewer(idViewerGlobal, video, "av"); // modos: "a", "v", "av" (audio solo, video solo, audio + video) 
	} ); // xxx fijo con quien se conectar
	if(document.getElementById('startRecordViewer'))
	document.getElementById('startRecordViewer').addEventListener('click', function() { 
		kms.startGrabarViewer(idViewerGlobal); 
	} ); // xxx fijo cual sesio grabar
	if(document.getElementById('pauseRecordViewer'))
	document.getElementById('pauseRecordViewer').addEventListener('click', function() { 
		kms.pausarGrabarViewer(idViewerGlobal); 
	} ); // xxx fijo cual sesio grabar
	if(document.getElementById('stopRecordViewer'))
	document.getElementById('stopRecordViewer').addEventListener('click', function() { 
		kms.stopGrabarViewer(idViewerGlobal); 
	} ); // xxx fijo cual sesio grabar
	if(document.getElementById('terminateViewer'))
	document.getElementById('terminateViewer').addEventListener('click', function() {
		kms.stopViewer(idViewerGlobal);
	}); // xxx fijo de quien se desconectar
	if(document.getElementById('playViewerRecorded'))
	document.getElementById('playViewerRecorded').addEventListener('click', function() { 
		kms.playViewer(idViewerGlobal); 
	} ); // xxx fijo cual sesio grabar
	
	// camera
	// usar camera IP	
	if(document.getElementById('callCamera'))
	document.getElementById('callCamera').addEventListener('click', function(){ 
		kms.camera("cmr123", videoCamera, true);  // cuando hay un objecto video: pedir verlo
		// true: reconcetar presenter (y viewer si hay objecto de video) en caso de que la camera deja de enviar
		// videoObjecto.camera("cmr123");  // cuando NO hay un objecto video: solo conectar camera como presenter
	}); // conecta camera. Cuando "READY", pedir verlo (entonces es como presenter + viewer)
}

function sendMessage(message) {
	message = JSON.stringify(message);
	//console.log('Sending message: ' + message);
	ws.send(message);
}

// Ligthbox es solo para debugging:

/**
 * Lightbox utility (to display media pipeline image in a modal dialog)
 */
$(document).delegate('*[data-toggle="lightbox"]', 'click', function(event) {
	event.preventDefault();
	$(this).ekkoLightbox();
});
