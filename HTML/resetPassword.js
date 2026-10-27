const resetForm = document.getElementById('resetPasswordForm');
const contactoInput = document.getElementById('contacto');
const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirmPassword');
const result = document.getElementById('resetPasswordResult');
const apiUrl = 'http://localhost:8080/api/resetCliente';

const params = new URLSearchParams(window.location.search);
const contactoPrefill = params.get('contacto');
if (contactoPrefill) {
	contactoInput.value = contactoPrefill;
}

resetForm.addEventListener('submit', async (event) => {
	event.preventDefault();
	result.textContent = '';
	result.style.color = 'red';

	if (!resetForm.reportValidity()) {
		return;
	}

	if (passwordInput.value !== confirmPasswordInput.value) {
		result.textContent = 'Las contraseñas no coinciden.';
		confirmPasswordInput.focus();
		return;
	}

	try {
		const response = await fetch(apiUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				contacto: contactoInput.value.trim(),
				password: passwordInput.value,
				confirmPassword: confirmPasswordInput.value,
			}),
		});
		const data = await response.json();

		if (!response.ok || data.response !== 'OK') {
			throw new Error(data.message || `No se pudo actualizar la contraseña (${response.status})`);
		}

		window.location.href = 'loginClient.html?passwordActualizada=1';
	} catch (error) {
		console.error('Error al restablecer contraseña:', error);
		result.textContent = error.message || 'No se pudo actualizar la contraseña. Intente nuevamente.';
	}
});
