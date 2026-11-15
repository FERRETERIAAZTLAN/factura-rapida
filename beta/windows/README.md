# SOLRAK Registro Beta para Windows

Esta aplicación es una copia aislada de SOLRAK para probar el alta pública de negocios.

- Se instala con el identificador `com.facturarapida.desktop.registration-beta`.
- No reemplaza ni actualiza la instalación estable.
- El actualizador automático queda desactivado durante las pruebas.
- La interfaz se genera desde `beta/index.html`; nunca modifica el `index.html` estable.
- El workflow de beta solo crea un artefacto temporal. No publica releases ni cambia producción.

El backend de registro requiere la migración `20261115_public_business_registration.sql` y la función `tenant-public-signup`. Deben validarse primero en un proyecto de pruebas separado.
