# SOLRAK Registro Beta para Windows

Esta carpeta contiene una copia de desarrollo separada de SOLRAK estable. Su objetivo es probar el registro público de negocios sin reemplazar, actualizar ni editar la instalación que ya funciona.

## Separación de la versión estable

- Rama exclusiva: `codex/windows-public-registration-isolated`.
- Identificador de Windows distinto: `com.facturarapida.desktop.registration-beta`.
- Nombre de instalación distinto: `SOLRAK Registro Beta`.
- La compilación solo genera un artefacto privado de prueba; no crea una publicación ni modifica producción.
- La interfaz funcional se descarga durante la compilación y se modifica únicamente dentro de `beta/index.html`, que no se guarda en Git.

## Registro incluido

1. Nombre del negocio y correo electrónico.
2. Código de seis dígitos enviado por correo.
3. Creación del administrador con usuario y PIN.
4. Creación transaccional del negocio, usuario y configuración fiscal inicial.

Las cuentas nuevas empiezan con el PAC en `sandbox`. Para timbrar CFDI reales, cada negocio deberá completar sus datos fiscales, CSD y configuración del PAC desde su propia cuenta.

## Controles de seguridad

- Los datos se crean con un `business_id` independiente.
- Los PIN se guardan mediante el mismo hash seguro usado por SOLRAK.
- El código de correo vence y se bloquea tras cinco intentos fallidos.
- Se permiten hasta tres solicitudes por correo al día, seis por IP por hora y cien globales al día.
- La clave privilegiada de Supabase permanece únicamente en la función del servidor.
- La tabla de solicitudes está en el esquema privado, con RLS activado y sin permisos para clientes.

## Orden de publicación

1. Validar contrato, JavaScript, SQL y compilación de Windows.
2. Probar alta, verificación, acceso y separación de datos en un proyecto de pruebas.
3. Revisar avisos de seguridad y registros de errores.
4. Solo después, desplegar el registro en producción y publicar un instalador descargable.

No se debe aplicar la migración ni desplegar `tenant-public-signup` en el proyecto productivo antes de completar el paso 2.
