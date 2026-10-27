const formE1 = document.querySelector('.form');
const contactInput = document.getElementById('contacto');
const registerLink = document.getElementById('registerLink');
const registroStatus = document.getElementById('registroStatus');
const resetPasswordLink = document.getElementById('resetPasswordLink');
const clientApi = 'http://localhost:8080/api';

let availabilityRequest = 0;
let availabilityTimer;

if (new URLSearchParams(window.location.search).get('registrado') === '1') {
	document.getElementById('resultado1').textContent =
		'Registro exitoso. Ya puede iniciar sesión.';
}
if (new URLSearchParams(window.location.search).get('passwordActualizada') === '1') {
	document.getElementById('resultado1').textContent =
		'Contraseña actualizada. Ya puede iniciar sesión.';
}

resetPasswordLink.addEventListener('click', (event) => {
	event.preventDefault();
	const params = new URLSearchParams();
	if (contactInput.value.trim()) {
		params.set('contacto', contactInput.value.trim());
	}
	const query = params.toString();
	window.location.href = `resetPassword.html${query ? `?${query}` : ''}`;
});

function setRegistrationAvailability(available, message = '') {
	registerLink.setAttribute('aria-disabled', String(!available));
	registerLink.tabIndex = available ? 0 : -1;
	registerLink.classList.toggle('disabled', !available);
	registroStatus.textContent = message;

	if (available) {
		registerLink.href = `registroCliente.html?contacto=${encodeURIComponent(contactInput.value.trim())}`;
	} else {
		registerLink.href = 'registroCliente.html';
	}
}

registerLink.addEventListener('click', (event) => {
	if (registerLink.getAttribute('aria-disabled') === 'true') {
		event.preventDefault();
	}
});

contactInput.addEventListener('input', () => {
	window.clearTimeout(availabilityTimer);
	const requestId = ++availabilityRequest;
	const contacto = contactInput.value.trim();

	setRegistrationAvailability(false);
	if (!contactInput.validity.valid || !contacto) {
		return;
	}

	registroStatus.textContent = ' Verificando correo...';
	availabilityTimer = window.setTimeout(() => {
		fetch(`${clientApi}/checkCliente`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ contacto }),
		})
			.then((response) => {
				if (!response.ok) {
					throw new Error(`Error verificando correo (${response.status})`);
				}
				return response.json();
			})
			.then((result) => {
				if (requestId !== availabilityRequest || contacto !== contactInput.value.trim()) {
					return;
				}
				if (result.response !== 'OK' || typeof result.exists !== 'boolean') {
					throw new Error('Respuesta inválida al verificar el correo');
				}
				if (result.exists) {
					setRegistrationAvailability(false, ' Este correo ya está registrado.');
				} else {
					setRegistrationAvailability(true, ' Correo disponible.');
				}
			})
			.catch((error) => {
				if (requestId !== availabilityRequest) {
					return;
				}
				console.error('Error al verificar correo:', error);
				setRegistrationAvailability(false, ' No se pudo verificar el correo.');
			});
	}, 300);
});

/*---
	Intercepta el submit del formulario
	*/

formE1.addEventListener('submit', (event) => {
	event.preventDefault();
	const formData = new FormData(formE1);
	const data = Object.fromEntries(formData);
	const contacto = (data.contacto || '').trim();
	console.log('Application Server: se recibieron credenciales de acceso');

	/*---
		Realiza validaciones en los datos del formulario antes de procesar
		*/

	if (contacto == '' || data.password == '') {
		console.log('debe indicar email y contraseña');
		document.getElementById('resultado1').style.color = 'RED';
		document.getElementById('resultado1').style.textAlign = 'center';
		document.getElementById('resultado1').textContent =
			'Debe informar email y contraseña para completar el acceso';
		return;
	}

	if (data.termscondition != 'on') {
		console.log('no aceptó los T&C no se puede loggear');
		document.getElementById('resultado2').style.textAlign = 'center';
		document.getElementById('resultado2').style.color = 'RED';
		document.getElementById('resultado2').textContent =
			'Debe aceptar los T&C para poder usar el sistema';
		return;
	}

	/*---
		Genera objeto HTML a ser actualizado en el tag identificado como "app"
		*/

	const HTMLResponse = document.querySelector('#app');
	const ul = document.createElement('ul');

	const tpl = document.createDocumentFragment();

	const systemURL = {
		listarTicket: 'http://127.0.0.1:5500/HTML/listarTicket.html',
		loginCliente: 'http://127.0.0.1:5500/HTML/loginClient.html',
	};

	const RESTAPI = {
		loginCliente: `${clientApi}/loginCliente`,
		listarTicket: 'http://localhost:8080/api/listarTicket',
	};

	/*-----
		Define el URI para realizar el acceso en base al acceso a un servidor local
	*/
	const MODE = 'LOCAL'; /*-- Instrucción a cambiar opciones LOCAL, TYPICODE o AWS --*/

	if (MODE == 'LOCAL') {
		/*-----
			Crea estructuras para acceder a data del cliente
			*/
		const login = {
			contacto,
			password: data.password
		}

		const options = {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(login),
		};



		console.log('API REST:' + RESTAPI.loginCliente);
		var API = RESTAPI.loginCliente;
		var APIoptions = options;

	};


	/*----------------------------------------------------------------------*/
	/*---- Typicode utilizar id 803a62c8-78c8-4b63-9106-73af216d504b -------*/
	/*                                                                      */
	/* El siguiente código es utilizado para resolver la validación de      */
	/* cliente utilizando un "fake" API REST server en Typicode             */
	/* para realizar la validación con el REST API server correcto          */
	/* deberá cambiar la instrucción para que                               */
	/*              const tipycode=false;                                   */
	/*----------------------------------------------------------------------*/


	if (MODE == 'TYPICODE') {
		console.log('Acceso usando Typicode como application server');
		API =
			'https://my-json-server.typicode.com/lu7did/MesaAyuda/posts/' + encodeURIComponent(contacto);
		APIoptions = { method: 'GET' };
	}

	/*----------------------------------------------------------------------*/
	/*---- AWS Accede con URL de Lambda loginUserGET                 -------*/
	/*                                                                      */
	/* cliente: 803a62c8-78c8-4b63-9106-73af216d504b                        */
	/*                                                                      */
	/* Para activar el acceso mediante AWS hacer const aws=true;            */
	/*----------------------------------------------------------------------*/
	if (MODE == 'AWS') {
		console.log('Acceso usando AWS lambda como application server');
		API = 'https://fmtj0jrpp9.execute-api.us-east-1.amazonaws.com/default/loginUserGET?CONTACTO=' + encodeURIComponent(contacto) + '&PASSWORD=' + encodeURIComponent(data.password);
		APIoptions = { method: 'GET' };
	}
	/*-----
	Realiza el acceso al API Rest utilizando gestión de sincronización mediante promesas
	utiliza URL y options definidos en los pasos anteriores
	*/

	fetch(`${API}`, APIoptions)
		.then((res) => {
			return res.json();
		})
		.then((users) => {
			console.log(
				'Datos en respuesta del application server=' + JSON.stringify(users)
			);
			if (users.response === 'OK') {
				console.log('La password es correcta');
				console.log(
					'nombre(' +
					users.nombre +
					') fecha_ultimo_ingreso(' +
					users.fecha_ultimo_ingreso +
					')' +
					'mode(' + MODE + ')'
				);
				console.log(
					'id=' +
					users.id +
					' nombre=' +
					users.nombre +
					' ultimo=' +
					users.fecha_ultimo_ingreso
				);
				console.log(
					'changing to ' +
					systemURL.listarTicket +
					'?id=' +
					users.id +
					'&contacto=' +
					users.contacto +
					'&nombre=' +
					users.nombre +
					'&fecha_ultimo_ingreso=' +
					users.fecha_ultimo_ingreso +
					'&mode=' + MODE
				);
				const params = new URLSearchParams({
					id: users.id,
					contacto: users.contacto,
					nombre: users.nombre,
					fecha_ultimo_ingreso: users.fecha_ultimo_ingreso,
					mode: MODE,
				});
				window.location.href = systemURL.listarTicket + '?' + params.toString();
			} else if (users.response === 'invalido') {
				console.log('Email o contraseña inválidos');
				document.getElementById('resultado1').style.color = 'RED'; /*--Fix hecho por  Germán Lombardi IS1-2025 */
				document.getElementById('resultado1').textContent =
					'Email o contraseña incorrectos';
			} else {
				console.error('Error en respuesta de login:', users.message || users.response);
				document.getElementById('resultado1').style.color = 'RED';
				document.getElementById('resultado1').textContent =
					'No se pudo validar el acceso. Intente nuevamente.';
			}
		})
		.catch((error) => {
			console.error('Error al iniciar sesión:', error);
			document.getElementById('resultado1').style.color = 'RED';
			document.getElementById('resultado1').style.textAlign = 'center';
			document.getElementById('resultado1').textContent =
				'No se pudo conectar con el servidor. Intente nuevamente.';
		});
});
