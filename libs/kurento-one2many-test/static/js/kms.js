/*
 * libraria para comunicación por algo como el msgbroker con el media server 
 *
 */


// configuración estanda
var stopSiCantidadViewerCeroBlDefaultDefault = false;

/*
configuracion:
{
	stopSiCantidadViewerCeroBlDefault: boolean 	// opcional, si ausente usa valore de stopSiCantidadViewerCeroBlDefaultDefault
	enviaMensajesJSON: function 				// obligatorio, funcion (JSON){...}
	idUsuario: string 							// obligatorio "usr..." id del usario de este kms
}

devuelve:
	un objecto VideoObjecto
*/
var Kms = function (configuracion){
	var thatKms = this;
	this.stopSiCantidadViewerCeroBlDefault = stopSiCantidadViewerCeroBlDefaultDefault;
	this.videoObjecto = null;
	this.enviaMensajesJSON = null;
	
	// this.viewerNotCalled = true;  // xxx solo para demo: donde presener y viewer tienen la misma ID !!!! -> remover todo con viewerNotCalled para producrivo !!!
	
	// clase: -> para toda la comunicación con media server UN solo objecto del tipo VideoObjecto
	// (VideoObjecto tiene internamente para CADA coneción un objecto del tipo VideoObj) -> sigue con definicion de dos tipos.
	function VideoObjecto(idUsuario){
		if (typeof idUsuario !== "string" || idUsuario.substr(0,3) !== 'usr'){
			throw new Error("falta id del usuario")
		}
		var thatVideoObjecto = this;	// this de VideoObjecto -> referencia dentro de VideoObj al etorno
		
		this.idUsuario = idUsuario; // -> es id de presenter ademas es id del quien pide que se conectar camera ademas es id del viewer
		
		this.ultimaGrabacionPresenter = null; // despues de terminar una grabación del enviado como presenter hay aqui datos de acceso a esto 
		
		// permite encontrar por id de presenter (un usario o una camera)
		this.videoObjPorUserId = {};
		
		// VideoObj: clase interna para VideoObjecto 	
		
		// un objecto para un presenter (de camera local o camera IP) Y/O un viewer
		function VideoObj(cameraId){		
			// parametros opcionales
			if (typeof cameraId === 'string' && cameraId.length > 3){
				this.tipo = cameraId.substr(0,3);
			} else if (typeof thatVideoObjecto.idUsuario === 'string' && thatVideoObjecto.idUsuario.length > 3){
				this.tipo = thatVideoObjecto.idUsuario.substr(0,3);
			} else {
				this.tipo = null;
			}
			
			this.cameraId = (typeof cameraId === 'string' && cameraId.length > 3) ? cameraId : null;
			
			// para presenter
			this.stopSiCantidadViewerCeroBl = stopSiCantidadViewerCeroBlDefault;

			// para presenter y viewer
			this.video = null;
			this.webRtcPeer = null;
			
			// para viewer
			this.presenterId = null;	// de quien recibe viewer
			this.sessionId = null; 		// en caso de conecion de viewer exitoso numero de sesion
			this.ultimaGrabacionViewer = null; // despues de terminar una grabación del visto como viewer hay aqui datos de acceso a esto 
		};

		// VideoObjecto:
		this.cameraResponse = function  (message) {
			if (message.response == 'READY' && typeof message.cameraId === 'string'){
				// camera es conectado
				console.log("Camera "+message.cameraId+ " conectado")
				
				// si hay parametro opcional video conectarlo como viewer
				console.log("this.videoObjPorUserId:"+JSON.stringify(this.videoObjPorUserId))
				console.log("this.videoObjPorUserId[message.cameraId]:"+JSON.stringify(this.videoObjPorUserId[message.cameraId]))
				console.log("this.videoObjPorUserId[message.cameraId].video:"+JSON.stringify(this.videoObjPorUserId[message.cameraId].video))
				if (this.videoObjPorUserId[message.cameraId].video){
					// crear videoObj para viewer
					this.viewer(message.cameraId, this.videoObjPorUserId[message.cameraId].video, "av"); // conecta viewer con camera
				}
				
			} 
		}
		
		this.cameraTerminado = function  (message) {
			if (this.videoObjPorUserId[message.cameraId]){
				// camera es conectado
				console.log("Camera "+message.cameraId+ " desconectado")
				console.log("this.videoObjPorUserId[message.cameraId].reconectarBl:"+this.videoObjPorUserId[message.cameraId].reconectarBl)
				if (this.videoObjPorUserId[message.cameraId].reconectarBl){
					// reconectarBl: true -> reconectar la camera (y si hay elemento de video reconectarlo despues como viewer tambien)
					console.log("this.camera(message.cameraId, this.videoObjPorUserId[message.cameraId].video, true) ")
					this.camera(message.cameraId, this.videoObjPorUserId[message.cameraId].video, true) 
				} else {
					// si hay parametro opcional video desconectarlo como viewer
					console.log("this.videoObjPorUserId[message.cameraId].video")
					if (this.videoObjPorUserId[message.cameraId].video){
						console.log("this.stopSession(this.idUsuario)")
						this.stopSession(this.idUsuario); // desconecta viewer de camera
					} 
				}
			}
		}
		
		// procesar respuesta del servidor al spdOffer (para inciar creacion conecion presenter) enviado por navegador
		this.presenterResponse = function (message) {
			if (message.response != 'accepted' && message.response != 'READY') { // ! SDP acceptado && ! usable ICE-candiate encontrado
				// conecion no posible
				var errorMsg = message.message ? message.message : 'Unknow error';
				console.warn('Presenter Call not accepted for the following reason: ' + errorMsg);
			
				if (typeof message.cameraId === 'string'){
					this.videoObjPorUserId[message.cameraId].dispose();
				} else {
					this.videoObjPorUserId[this.idUsuario].dispose();
				}
			
			} else if (message.sdpAnswer){
				// SDP "accepted"
				if (typeof message.cameraId === 'string'){
					this.videoObjPorUserId[message.cameraId].webRtcPeer.processAnswer(message.sdpAnswer);
				} else {
					this.videoObjPorUserId[this.idUsuario].webRtcPeer.processAnswer(message.sdpAnswer);
				}
			}
					
		}

		// VideoObjecto:
		// procesar respuesta del servidor al spdOffer (para inciar creacion conecion viewer) enviado por navegador
		this.viewerResponse = function (message) {
			console.log("viewerResponse")
			var paraPresenter;	// es mensaje para presenter (con quiere conectarse) o para viewer (que quiere conectarse)
		//	if (message.presenterId === this.idUsuario && viewerNotCalled){ // xxx sin viewerNotCalled !!!! 
			if (message.presenterId === this.idUsuario){ // xxx sin viewerNotCalled !!!! 
				// mensaje para presenter: un viewer se ha conectado con el
				paraPresenter = true;
			} else { // si presenterId != idUsuario ->
				// mensaje para viewer: se ha conectado con presenter
				paraPresenter = false;
			}								
		
			if (message.response != 'accepted' && message.response != 'READY') { // ! SDP acceptado && ! usable ICE-candiate encontrado
				// conecion no posible
				var errorMsg = message.message ? message.message : 'Unknow error';
				console.warn('Viewer Call not accepted for the following reason: ' + JSON.stringify(errorMsg));

				if (typeof message.cameraId === 'string'){
					this.videoObjPorUserId[message.cameraId].dispose();
				} else {
					if (! paraPresenter){
						// para viewer
						this.videoObjPorUserId[message.presenterId].dispose(); // viewer guarda por presenter
					}
				}
			} else if (message.sdpAnswer){	
				// SDP "accepted"
				console.log("accepted")
				if (typeof message.cameraId === 'string'){
				console.log("accepted 1")
					this.videoObjPorUserId[message.cameraId].webRtcPeer.processAnswer(message.sdpAnswer);
				} else {
				console.log("accepted 2")
					if (paraPresenter){
						// para presenter -> sabe algien (message.viewerId) se ha conectado con el
						
						// informar presenter xxx
					} else {
						// para viewer
						console.log("Para viewer procesar sdp answer:"+JSON.stringify(message.sdpAnswer))
						this.videoObjPorUserId[message.presenterId].webRtcPeer.processAnswer(message.sdpAnswer);	// viewer guarda por presenter
					}
				}			
			}
			
			// id de session que se crear ahora.
			console.log("message.sessionId"+message.sessionId)
			if (typeof message.sessionId === 'number'){
				console.log("message.sessionId:"+message.sessionId)
				console.log("paraPresenter:"+paraPresenter)
				if (paraPresenter){
					// para presenter -> sabe algien (message.viewerId) se ha conectado con el
					
					// informar presenter xxx
				} else {
					// para viewer
					this.videoObjPorUserId[message.presenterId].sessionId = message.sessionId;	// viewer guarda por presenter
				}
			}
		}
		
		this.iceCandidate = function (parsedMessage){
			if (typeof parsedMessage.viewerId === 'string'){
				// mensaje para viewer
				console.log("mensaje para viewer")			
				this.videoObjPorUserId[parsedMessage.presenterId].webRtcPeer.addIceCandidate(parsedMessage.candidate)
			} else {
				// mensaje para presenter
				console.log("mensaje para presenter")
				console.log(JSON.stringify(this.videoObjPorUserId[parsedMessage.presenterId]))
				this.videoObjPorUserId[parsedMessage.presenterId].webRtcPeer.addIceCandidate(parsedMessage.candidate)
			}
		}
		
		// info para presenter o viewer que una sesion fue terminado
			// la info recibe quien no ha terminado la sesion
		this.sesionTerminado = function (parsedMessage){ 
			if(typeof parsedMessage.cantidadViewer === 'number'){
				// es info para presenter

				// posible procesarlo?
				if (typeof this.videoObjPorUserId[this.idUsuario] === 'object'){
					if(this.videoObjPorUserId[this.idUsuario].stopSiCantidadViewerCeroBl && parsedMessage.cantidadViewer === 0){
						// -> hay que terminar transmision del presenter
						this.videoObjPorUserId[this.idUsuario].dispose();
					} // else : sigue transmitiendo
				} 
			} else {
				// es info para viewer
				if (typeof parsedMessage.sessionId === 'number'){
					// encontrar por sessionId
					for (var videoObj in this.videoObjPorUserId){
						if (videoObj.sessionId === parsedMessage.sessionId){
							videoObj.dispose();
						}
					}
				} else {
					// encontrar por idUsuario
					if (typeof this.videoObjPorUserId[this.idUsuario] === 'object'){
						this.videoObjPorUserId[this.idUsuario].dispose();
					}
				}
			}
		}
		
		// VideoObj: prepara pedir conecion presenter
		// videoQueSeTransmite: elemento video (obligatorio) 
		// stopSiCantidadViewerCeroBl: boolean, opcional
		// modo: string, opcional "a", "v", "av" (audio solo, video solo, audio + video), estandar: "av"
		VideoObj.prototype.presenter = function (videoQueSeTransmite, stopSiCantidadViewerCeroBl, modo) {		
			//if (!this.webRtcPeer) {
				var thatVideoObj = this;	// this de VideoObj -> referencia dentro de callbacks a VideoObj
				var mediaConstraints = {};
				this.video = videoQueSeTransmite;
				
				if (typeof stopSiCantidadViewerCeroBl === 'boolean'){
					this.stopSiCantidadViewerCeroBl = stopSiCantidadViewerCeroBl;
				} else if (typeof stopSiCantidadViewerCeroBl === 'string'){
					// es modo
					modo = stopSiCantidadViewerCeroBl;
				} // else this.stopSiCantidadViewerCeroBl = this.stopSiCantidadViewerCeroBlDefault
				
				if (typeof modo !== 'string'){
					modo = "av"; // estandar: audio + video
				}
				modo = modo.toLowerCase();
				if (typeof modo === 'va'){
					modo = "av"; //coreccion
				}
				if (modo !== "a" && modo !== "v" && modo !== "av"){
					console.error("valor para modo de presenter no permitido: "+modo+" Usando valor de estanda.")
					modo = "av"; // estandar: audio + video
				} 
				
				switch (modo){
					case "a":
						mediaConstraints.audio = true;
						mediaConstraints.video = false;
					break;
					case "v":
						mediaConstraints.audio = false;
						mediaConstraints.video = true;
					break;
					case "av":
					default: // lo mismo como "av"
						mediaConstraints = null; // no cambiar estanda de kurento
				}
						
				showSpinner(this.video);
				
				var options = {
					localVideo: this.video,
					onicecandidate : onIceCandidateCreator(this.tipo === "cmr" ? this.cameraId : thatVideoObjecto.idUsuario, null)
				}
				if (mediaConstraints){
					options.mediaConstraints = mediaConstraints;
				}
				
				console.log( options )

				this.webRtcPeer = kurentoUtils.WebRtcPeer.WebRtcPeerSendonly(options, function(error) {
					if(error) return onError(error);
					this.modo = modo;
					this.generateOffer( thatVideoObj.onOfferPresenter ); // poducir sdpOffer, usarlo con onOfferPresenter 
				});
			//}
		}
		
		// VideoObjecto: iniciarse como presenter
		// videoQueSeTransmite: elemento video (obligatorio) 
		// stopSiCantidadViewerCeroBl: boolean, opcional
		// modo: string, opcional "a", "v", "av" (audio solo, video solo, audio + video), estandar: "av"
		this.presenter = function (videoQueSeTransmite, stopSiCantidadViewerCeroBl, modo){
			if (typeof this.videoObjPorUserId[this.idUsuario] === 'object'){
				this.videoObjPorUserId[this.idUsuario].presenter(videoQueSeTransmite, stopSiCantidadViewerCeroBl, modo)
			} else {
				// de primero crear VideoObj
				this.videoObjPorUserId[this.idUsuario] = new VideoObj()
				this.videoObjPorUserId[this.idUsuario].presenter(videoQueSeTransmite, stopSiCantidadViewerCeroBl, modo)
			}
		}

		//VideoObj: envia sdpOffer inicia al server para inicar creacion de conecion presenter
		VideoObj.prototype.onOfferPresenter = function (error, offerSdp) {
			if (error) return onError(error);

			console.log("SDP offer a presentar")
			var message = {
				tipo : 'kms_presenter',
				userId: this.tipo === "cmr" ? this.cameraId : thatVideoObjecto.idUsuario,
				stopSiCantidadViewerCeroBl: this.stopSiCantidadViewerCeroBl,
				sdpOffer : offerSdp,
				modo: this.modo
			};
			thatKms.sendMessage(message);
		}

		// presenterId: id del presenter que se quiere ver
		// VideoObj: objecto con cual se quiere mostrar el video
		// modo: string, opcional "a", "v", "av" (audio solo, video solo, audio + video), estandar: "av"
		VideoObj.prototype.viewer = function (presenterId, videoElemento, modo) {
			//if (!this.webRtcPeer) {
				var thatVideoObj = this;	// this de VideoObj -> referencia dentro de callbacks a VideoObj
				var mediaConstraints = {};
				
				this.video = videoElemento;
						
				if (typeof modo !== 'string'){
					modo = "av"; // estandar: audio + video
				}
				modo = modo.toLowerCase();
				if (typeof modo === 'va'){
					modo = "av"; //coreccion
				}
				if (modo !== "a" && modo !== "v" && modo !== "av"){
					console.error("valor para modo de viewer no permitido: "+modo+" Usando valor de estanda.")
					modo = "av"; // estandar: audio + video
				} 
				
				switch (modo){
					case "a":
						mediaConstraints.audio = true;
						mediaConstraints.video = false;
					break;
					case "v":
						mediaConstraints.audio = false;
						mediaConstraints.video = true;
					break;
					case "av":
					default: // lo mismo como "av"
						mediaConstraints = null; // no cambiar estanda de kurento
				}
				
				showSpinner(this.video);

				var options = {
					remoteVideo: this.video,
					onicecandidate : onIceCandidateCreator(null, presenterId) 
				}
				
				if (mediaConstraints){
					options.mediaConstraints = mediaConstraints;
				}
				
				
				this.webRtcPeer = kurentoUtils.WebRtcPeer.WebRtcPeerRecvonly(options, function(error) {
					if(error) return onError(error);

					this.modo = modo;
					this.generateOffer( onOfferViewerCreator(presenterId) ); // poducir sdpOffer, usarlo con onOfferViewer 
					
					// apuntarlo para que sessionStop funcione
					
					if (presenterId.substr(0,3) === 'cmr'){
						// is viewer para una camera ip
						thatVideoObj.presenterId = thatVideoObjecto.idUsuario;	// quien ver
						thatVideoObj.viewerId =	thatVideoObjecto.idUsuario;		// quien ver	
						thatVideoObj.cameraId = presenterId;					// de que ver
					} else {
						thatVideoObj.presenterId =	presenterId;				// de quien ver
						thatVideoObj.viewerId =	thatVideoObjecto.idUsuario; 	// quien ver	
					}
				});
			//}
		}
		
		// presenterId: id del presenter que se quiere ver
		// VideoObj: objecto con cual se quiere mostrar el video
		// modo: string, opcional "a", "v", "av" (audio solo, video solo, audio + video), estandar: "av"
		this.viewer = function (presenterId, videoElemento, modo){
			//this.viewerNotCalled = false;  // xxx solo para demo: donde presener y viewer tienen la misma ID !!!! -> remover todo con viewerNotCalled para producrivo !!!

			if (typeof this.videoObjPorUserId[presenterId] === 'object'){
				this.videoObjPorUserId[presenterId].viewer(presenterId, videoElemento, modo)
			} else {
				// de primero crear VideoObj
				this.videoObjPorUserId[presenterId] = new VideoObj()
				this.videoObjPorUserId[presenterId].viewer(presenterId, videoElemento, modo)
			}
		}

		// devuelve una funcion "onOfferViewer"
		// envia sdpOffer inicia al server para inicar creacion de conecion viewer
		function onOfferViewerCreator(presenterId){
			
			// devuelve onOfferViewer
			return function (error, offerSdp) {
				if (error) return onError(error)

				var message = {
					tipo : 'kms_viewer',
					presenterId: presenterId,	// de quien quiere ver 
					userId: thatVideoObjecto.idUsuario, 	// quien quiere conectarse
					sdpOffer : offerSdp,
					modo: this.modo
				}
				thatKms.sendMessage(message);
			}
		}
		
		// devuelve una funcion "onIceCandidate" con cierta id (para identifica presenter o la session)
		function onIceCandidateCreator(idPresenterCaller, idPresenterCallee){
				console.log("onIceCandidateCreator("+idPresenterCaller+","+idPresenterCallee+")")
			// onIceCandidate usando cierta id en mensaje
			return function (candidate) {
			   console.log('Local candidate creado. A enviar al servidor:' + JSON.stringify(candidate));

			   var message = {
				  tipo : 'kms_onIceCandidate',
				  idPresenterCaller: idPresenterCaller,	// si presenter se conecta
				  idPresenterCallee: idPresenterCallee,	// si viewer se conecta para este presenter
				  candidate : candidate
			   }
			   thatKms.sendMessage(message);
			}
		}
		
		// VideoObj: termina que se transmite
		VideoObj.prototype.stopPresenter = function () {
			if (this.webRtcPeer) {
				var message = {
						tipo : 'kms_stopPresenter',
						userId: this.tipo === "cmr" ? this.cameraId : thatVideoObjecto.idUsuario 
				}
				thatKms.sendMessage(message);
				this.dispose();
			}
		}
		
		// VideoObjecto: terminarse como presenter
		this.stopPresenter = function (){
			if (typeof this.videoObjPorUserId[this.idUsuario] === 'object'){
				this.videoObjPorUserId[this.idUsuario].stopPresenter()
			} else {
				// de primero crear VideoObj
				this.videoObjPorUserId[this.idUsuario] = new VideoObj()
				this.videoObjPorUserId[this.idUsuario].stopPresenter()
			}
		}

		// VideoObj: termina sesion que tiene viewer (viewerId) con el presenter (presenterId)
		VideoObj.prototype.stopViewer = function () {
			var message;

			if (this.webRtcPeer) {
				// hay dos formas de indicar la session. Son alternativas de decirlo, pero el resultado es lo mismo:
				// 	indica session por solo sessionId o
				//	indica session por presenterId + viewerId 
				if (typeof this.sessionId === 'number'){
					message = {
							tipo : 'kms_stopSession', 
							sessionId: this.sessionId			
					}
				} else if(typeof this.presenterId === 'string' && typeof this.viewerId === 'string'){
					message = {
							tipo : 'kms_stopSession', 
							presenterId: this.presenterId,
							viewerId: this.viewerId		
					}
				} else {
					console.error("stopSession parametros no validos.")
					return;
				}
				
				thatKms.sendMessage(message);
				this.dispose();
			}
		}
		
		
		// VideoObjecto: 
		// termina sesion que tiene viewer con el presenter (presenterId)
		this.stopViewer = function (presenterId) {		
			if (typeof this.videoObjPorUserId[presenterId] === 'object'){
				this.videoObjPorUserId[presenterId].stopViewer()
			} 
		}
		
		// VideoObj: desocupa recurso webRtcPeer
		VideoObj.prototype.dispose = function () {
			if (this.webRtcPeer) {
				this.webRtcPeer.dispose();
				this.webRtcPeer = null;
			}
			hideSpinner(this.video);
		}
		
		/** 
			para la camera
		*/

		// VideoObj: pedir conecion camera cameraId
		// videoElemento es opcional. Si existe en caso de conecion de camera crear automaticamente viewer usando videoElemento
		// reconectarBl es opcional. Si camera deja de enviar reconcetar automaticamente? (estanda: false)
		// modo: string, opcional "a", "v", "av" (audio solo, video solo, audio + video), estandar: "av"
		VideoObj.prototype.camera = function (cameraId, videoElemento, reconectarBl, modo) {
			if (typeof cameraId !== 'string' || cameraId.substr(0,3) !== 'cmr' ){
				console.error("falta cameraId")
				return;
			}
			
			this.tipo = 'cmr';
			this.cameraId = cameraId;
			
			if (typeof videoElemento === 'object' && videoElemento != null) { // opcional
				// es elemento de video
				this.video = videoElemento;
			} else if (typeof videoElemento === 'boolean') {
				// videoElemento falta. Es reconectarBl. Reconectar camera (pero no un viewer)
				reconectarBl = videoElemento;
			}
			
			if (typeof reconectarBl !== 'boolean') { // opcional
				this.reconectarBl = false;	// default: false
			} else {
				this.reconectarBl = reconectarBl;
			}
			
			if (typeof modo !== 'string'){
				modo = "av"; // estandar: audio + video
			}
			modo = modo.toLowerCase();
			if (typeof modo === 'va'){
				modo = "av"; //coreccion
			}
			if (modo !== "a" && modo !== "v" && modo !== "av"){
				console.error("valor para modo de viewer no permitido: "+modo+" Usando valor de estanda.")
				modo = "av"; // estandar: audio + video
			} 
			
			switch (modo){
				case "a":
					mediaConstraints.audio = true;
					mediaConstraints.video = false;
				break;
				case "v":
					mediaConstraints.audio = false;
					mediaConstraints.video = true;
				break;
				case "av":
				default: // lo mismo como "av"
					mediaConstraints = null; // no cambiar estanda de kurento
			}
				
			this.modo = modo;
			
			var message = {
				tipo : 'kms_presenterCamera',
				cameraId: this.cameraId,
				userId: thatVideoObjecto.idUsuario,
				stopSiCantidadViewerCeroBl: stopSiCantidadViewerCeroBl,
				modo: this.modo
			};
			thatKms.sendMessage(message);
		}
		
		// VideoObjecto: pedir conecion camera cameraId
		// videoElemento es opcional. Si existe en caso de conecion de camera crear automaticamente viewer usando videoElemento
		// reconectarBl es opcional. Si camera deja de enviar reconcetar automaticamente? (estanda: false)
		// modo: string, opcional "a", "v", "av" (audio solo, video solo, audio + video), estandar: "av"
		this.camera = function (cameraId, videoElemento, reconectarBl, modo) {	
			if (typeof this.videoObjPorUserId[cameraId] === 'object'){
				this.videoObjPorUserId[cameraId].camera(cameraId, videoElemento, reconectarBl, modo)
			} 
			else {
				// de primero crear VideoObj
				this.videoObjPorUserId[cameraId] = new VideoObj(cameraId)
				this.videoObjPorUserId[cameraId].camera(cameraId, videoElemento, reconectarBl, modo)
			}
		}
		
		// id: presenter
		this.startGrabarPresenter = function () {
			var message = {
				tipo : 'kms_startGrabar', 
				id: this.idUsuario	
			}
			thatKms.sendMessage(message);
		}
		
		this.pausarGrabarPresenter = function () {
			var message = {
				tipo : 'kms_pausarGrabar', 
				id: this.idUsuario	
			}
			thatKms.sendMessage(message);
		}
		
		this.stopGrabarPresenter = function () {
			var message = {
				tipo : 'kms_stopGrabar', 
				id: this.idUsuario	
			}
			thatKms.sendMessage(message);
		}
		
		this.playPresenter = function () {
			// GETgrabacion del presenter
			if (this.ultimaGrabacionPresenter){
				var video = $('<video />', {
					id: 'video',
					src: 'https://'+location.host+'/GETgrabacion/'+this.ultimaGrabacionPresenter.archivoLlave+'/'+this.ultimaGrabacionPresenter.archivo,
					type: 'video/mp4',
					controls: true,
					width: "640px",
					height: "480px",
					text:"Reprodución de video grabado ..."
				});
				video.appendTo($('#videoGrabadoBig'));
			}
		}
		
		
		// id: session del viewer
		this.startGrabarViewer = function (id) {
			var message;
			console.log("startGrabarViewer:"+id)
			if (typeof id === 'string' && typeof this.videoObjPorUserId[id] === 'object' && typeof this.videoObjPorUserId[id].sessionId === 'number'){
				message = {
					tipo : 'kms_startGrabar', 
					id: this.videoObjPorUserId[id].sessionId	
				}
				thatKms.sendMessage(message);
			}
		}
		
		this.pausarGrabarViewer = function (id) {
			var message;
			
			if (typeof id === 'string' && typeof this.videoObjPorUserId[id] === 'object' && typeof this.videoObjPorUserId[id].sessionId === 'number'){
				message = {
					tipo : 'kms_pausarGrabar', 
					id: this.videoObjPorUserId[id].sessionId	
				}
				thatKms.sendMessage(message);
			}
		}
		
		this.stopGrabarViewer = function (id) {
			var message;
			
			if (typeof id === 'string' && typeof this.videoObjPorUserId[id] === 'object' && typeof this.videoObjPorUserId[id].sessionId === 'number'){
				message = {
					tipo : 'kms_stopGrabar', 
					id: this.videoObjPorUserId[id].sessionId	
				}
				thatKms.sendMessage(message);
			}
		}
		
		// hay dos formas alternativas de indicar lo que se debe reproducir:
		// 1: p1 puede ser id de session de viewer con que fue grabado hace poco
		// o 2: p1 es llave y p2 es nombre del archivo
		this.playViewer = function (p1, p2) {
			var archivoLlave
			,	archivo;
			
			if (typeof p1 === 'string' && typeof p2 === 'string' && p2.length > 3 && p2.indexOf(".") >= 0){
				// 2: p1 es llave y p2 es nombre del archivo
				archivoLlave = p1;
				archivo = p2;
			} else if (typeof p1 === 'string' && typeof this.videoObjPorUserId[p1] === 'object' &&
				this.videoObjPorUserId[p1].ultimaGrabacionViewer !== null){
				// 1: p1 es id de session de viewer con que fue grabado
				archivoLlave  = this.videoObjPorUserId[p1].ultimaGrabacionViewer.archivoLlave
				archivo = 		this.videoObjPorUserId[p1].ultimaGrabacionViewer.archivo
			} else {
				// parametros no usable
				console.error("playViewer: parametros falso")
				return;
			}
			// GETgrabacion del Viewer
			var video = $('<video />', {
				id: 'video',
				src: 'https://'+location.host+'/GETgrabacion/'+archivoLlave+'/'+archivo,
				type: 'video/mp4',
				controls: true,
				width: "640px",
				height: "480px",
				text:"Reprodución de video grabado ..."
			});
			video.appendTo($('#videoGrabadoBig'));
		}
		
		// todos los mensajes que son para kms por a aqui
		VideoObjecto.prototype.procesarMensaje = function (mensajeJSON) {
			console.info('Mensaje para kms: ' + JSON.stringify(mensajeJSON));

			switch (mensajeJSON.tipo) {
			case 'kms_cameraResponse':
				thatKms.videoObjecto.cameraResponse(mensajeJSON);
				break
			case 'kms_cameraTerminado':
				thatKms.videoObjecto.cameraTerminado(mensajeJSON);
				break
			case 'kms_presenterResponse':
				thatKms.videoObjecto.presenterResponse(mensajeJSON);
				break;
			case 'kms_viewerResponse':
				thatKms.videoObjecto.viewerResponse(mensajeJSON);
				break;
			case 'kms_sesionTerminado':
				// info para presenter o viewer que una sesion fue terminado
				// la info recibe quien no ha terminado la sesion
				thatKms.videoObjecto.sesionTerminado(mensajeJSON);
				break;
			case 'kms_iceCandidate':
				thatKms.videoObjecto.iceCandidate(mensajeJSON)
				break;
			case 'kms_grabacionPresenterTerminado':
				if (mensajeJSON.error && mensajeJSON.error.status === 0){
					this.ultimaGrabacionPresenter = {
						archivo:	mensajeJSON.archivo,
						archivoLlave: mensajeJSON.archivoLlave
					}
					console.log(JSON.stringify(this.ultimaGrabacionPresenter))
				}
				break;
			case 'kms_grabacionViewerTerminado':
				if (mensajeJSON.error && mensajeJSON.error.status === 0){
					console.log("mensajeJSON.presenterId:"+mensajeJSON.presenterId)
					if (this.videoObjPorUserId[mensajeJSON.presenterId]){
						this.videoObjPorUserId[mensajeJSON.presenterId].ultimaGrabacionViewer = {
							archivo:	  mensajeJSON.archivo,
							archivoLlave: mensajeJSON.archivoLlave
						}
					}
					console.log(JSON.stringify(this.videoObjPorUserId))
				}
				break;
			case 'kms_kurentoError':
				console.error(mensajeJSON)
				break;
			default:
				console.error('Mensage no reconocida para kms:', mensajeJSON);
			}
		}

	}
	
	// todos los mensajes para el servidor que se refieren a kms por aqui
	this.sendMessage = function (message) {
		if (typeof this.enviaMensajesJSON !== 'function'){
			throw new Error ("falta: funcion enviaMensajesJSON. kms por eso no puede enviar.")
		}
		this.enviaMensajesJSON(message)
	}

	// iniciar kms, procesar configuración
	if (typeof configuracion === 'object'){
		if (typeof configuracion.stopSiCantidadViewerCeroBlDefault === 'boolean'){ // opcional
			this.stopSiCantidadViewerCeroBlDefault = configuracion.stopSiCantidadViewerCeroBlDefault;
		}
		
		if (typeof configuracion.enviaMensajesJSON === 'function'){ // obligatorio
			// la funcion con que kms puede enviar mensajes
			this.enviaMensajesJSON = configuracion.enviaMensajesJSON;
		} else {
			throw new Error("falta enviaMensajesJSON: "+configuracion.enviaMensajesJSON)
		}
		
		if (typeof configuracion.idUsuario === 'string' && configuracion.idUsuario.length > 3){ // obligatorio
			 // el objecto que es para toda la comunicacion con el media server
			this.videoObjecto = new VideoObjecto(configuracion.idUsuario);
			return this.videoObjecto;
		} else {
			throw new Error("falta idUsuario: "+configuracion.idUsuario)
		}
		
	} else {
		throw new Error("faltan datos de configuración de kms: "+configuracion)
	}
}


/**
 interface grafico
*/
// muestra elemento de video (elemento de video es parametro)
function showSpinner() {
	for (var i = 0; i < arguments.length; i++) {
		arguments[i].poster = './img/transparent-1px.png';
		arguments[i].style.background = 'center transparent url("./img/spinner.gif") no-repeat';
	}
}

// esconda elemento de video (elemento de video es parametro)
function hideSpinner() {
	for (var i = 0; i < arguments.length; i++) {
		arguments[i].src = '';
		arguments[i].poster = './img/webrtc.png';
		arguments[i].style.background = '';
	}
}