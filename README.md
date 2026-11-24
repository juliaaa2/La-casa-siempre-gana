# La casa siempre gana

Laboratorio de probabilidad en un casino virtual. Proyecto de Estadística, Universidad del Cauca.

**Integrantes:** Katherin Chamorro, Ángela Chávez, Sebastián Tintinago y Juliana Díaz.

La app tiene 3 juegos (dos dados, ruleta y cartas). Mientras se juega, compara lo que dice la teoría de probabilidad
con lo que realmente está pasando, y analiza estadísticamente las jugadas de todo el grupo. No se apuesta dinero real:
cada jugador empieza con $100.000 ficticios.

## Cómo correrla

Se necesita **Node.js 18.19 o superior** (sirve la 20 o la 22) y npm.

```bash
npm install
npm start
```

`npm start` abre la app en http://localhost:4200.

Para generar la versión de producción: `npm run build` (queda en `dist/casa-siempre-gana/browser`).

## Qué hay en cada página

| Página | Qué muestra | Temas de estadística |
| --- | --- | --- |
| Inicio | Nombre del jugador, saldo y acceso a los juegos | — |
| Dados | Apuestas a la suma, mapa de calor 6 × 6, condicionales, momentos y gráfica de la suma. Modo detective con un dado que puede estar cargado | Distribución bidimensional (conjunta, marginales, condicionales), independencia, covarianza, correlación, chi-cuadrado de bondad de ajuste, errores tipo I y II |
| Ruleta | Apuestas a color, par/impar o un número, tablero, regresión de la ganancia acumulada y ley de los grandes números | Probabilidad clásica, valor esperado, varianza, binomial, geométrica, regresión lineal con tabla ANOVA |
| Cartas | Mayor o menor sin reposición, con el pago según la probabilidad | Probabilidad condicional, teorema de Bayes, hipergeométrica vs. binomial |

## Estructura del código

```
src/app/
├── core/                      Lógica y estadística (TypeScript puro, sin Angular)
│   ├── estadistica/
│   │   ├── distribuciones.ts  Binomial, geométrica, hipergeométrica, normal, chi-cuadrado, F, t y valores críticos
│   │   ├── estadistica.ts     Descriptiva, covarianza, correlación, regresión + ANOVA, pruebas chi-cuadrado y t, tablas bidimensionales
│   │   └── analisis.ts        Análisis de las jugadas reales (rachas, tablas, correlación, prueba t)
│   ├── juegos/
│   │   ├── azar.ts            Números aleatorios con crypto.getRandomValues
│   │   ├── dados.ts           Juego 1
│   │   ├── ruleta.ts          Juego 2
│   │   └── cartas.ts          Juego 3
│   └── modelos.ts             Tipo Jugada, valor esperado y varianza de una apuesta
├── servicios/
│   ├── jugador.service.ts     Nombre y saldo del jugador
│   └── jugadas.service.ts     Guarda las jugadas (navegador y, si se configura, Firebase) y exporta CSV
├── compartido/                Gráfica (Chart.js), panel "Teoría vs. Realidad" y formatos de números
└── paginas/                   Una carpeta por página
```

Reparto sugerido: integrante 1 → `dados`, integrante 2 → `ruleta`, integrante 3 → `cartas`,
integrante 4 → `servicios` e `inicio`.

Las fórmulas estadísticas están programadas a mano en `core/estadistica` (no se usa ninguna librería de estadística),
para que se pueda mostrar exactamente qué se calcula. Se verificaron contra Python (scipy) y contra el ejercicio de
regresión de clase (reducción de sólidos vs. demanda de oxígeno: b₀ = 3,8296 y b₁ = 0,9036).

## Reglas de los juegos

- **Dados:** mayor que 7 o menor que 7 pagan 1 a 1 (probabilidad 15/36); exactamente 7 y dobles pagan 4 a 1
  (probabilidad 6/36). En todas, E(G) = −$167 por cada $1.000.
- **Ruleta europea:** 37 casillas. Rojo, negro, par e impar pagan 1 a 1 (18/37); un número paga 35 a 1 (1/37).
  En todas, E(G) = −1.000/37 ≈ −$27 por cada $1.000.
- **Cartas:** se apuesta si la siguiente carta es mayor o menor (A es la más alta; si sale igual, se pierde). El pago
  depende de la probabilidad condicional p: pago = 0,95 · (1 − p) / p, así que E(G) = −0,05 · (1 − p) · monto.
  Sin esa regla, eligiendo siempre la opción más probable el jugador ganaría a largo plazo.

## Guardar las jugadas de todo el grupo (Firebase, opcional)

Sin configurar nada, cada navegador guarda sus propias jugadas. Para juntar las de todos:

1. Crear un proyecto en https://console.firebase.google.com.
2. Ir a **Firestore Database → Crear base de datos**. Para el proyecto se puede usar el modo de prueba, con estas reglas:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /jugadas/{id} {
         allow read, create: if true;
       }
     }
   }
   ```
3. En **Configuración del proyecto → Tus apps → Web**, registrar la app y copiar los datos de configuración en
   `src/environments/environment.ts`.
4. Volver a correr `npm start`. Las jugadas quedan guardadas en la colección `jugadas` de Firestore.

## Publicarla en internet (Firebase Hosting)

```bash
npm run build
npx firebase-tools login
npx firebase-tools init hosting   # elegir el proyecto; carpeta pública: dist/casa-siempre-gana/browser; SPA: sí; no sobrescribir index.html
npx firebase-tools deploy
```

El archivo `firebase.json` ya trae la configuración de Hosting.
