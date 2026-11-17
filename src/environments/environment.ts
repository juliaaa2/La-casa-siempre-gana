/**
 * Configuración de Firebase (opcional).
 *
 * Si se dejan vacíos los campos, la app guarda las jugadas solo en el navegador
 * (localStorage). Para compartir las jugadas de todo el grupo, creen un proyecto en
 * https://console.firebase.google.com, activen Firestore y peguen aquí los datos de
 * "Configuración del proyecto → Tus apps → Configuración del SDK".
 */
export const environment = {
  firebase: {
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: '',
  },
};
