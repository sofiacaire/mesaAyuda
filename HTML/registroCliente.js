const registroForm = document.getElementById('registroForm');
const contactoInput = document.getElementById('contacto');
const passwordInput = document.getElementById('password');
const termsInput = document.getElementById('termscondition');
const resultado = document.getElementById('registroResultado');
const apiUrl = 'http://localhost:8080/api/registrarCliente';

const params = new URLSearchParams(window.location.search);
const contactoPrefill = params.get('contacto');
if (contactoPrefill) {
	contactoInput.value = contactoPrefill;
}

registroForm.addEventListener('submit', async (event) => {
	event.preventDefault();
	resultado.textContent = '';
	resultado.style.color = 'red';

	if (!registroForm.reportValidity()) {
		return;
	}

	if (!termsInput.checked) {
		resultado.textContent = 'Debe aceptar los términos y condiciones para registrarse.';
		return;
	}

	try {
		const response = await fetch(apiUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				contacto: contactoInput.value.trim(),
				password: passwordInput.value,
				termscondition: termsInput.checked,
			}),
		});
		const result = await response.json();

		if (response.status === 409) {
			resultado.textContent = 'Este correo ya está registrado.';
			return;
		}
		if (!response.ok || result.response !== 'OK') {
			throw new Error(result.message || `Error al registrarse (${response.status})`);
		}

		window.location.href = 'loginClient.html?registrado=1';
	} catch (error) {
		console.error('Error al registrar cliente:', error);
		resultado.textContent = error.message || 'No se pudo completar el registro. Intente nuevamente.';
	}
});
