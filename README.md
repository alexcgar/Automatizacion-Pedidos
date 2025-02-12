# 🚀 Sistema Automatizado de Predicción de Productos

Una aplicación **backend** basada en Flask diseñada para **automatizar la predicción de códigos de productos** a partir de descripciones. Este sistema es ideal para trabajar con grandes volúmenes de datos y se integra con un frontend desarrollado en React. Además, utiliza dos fuentes de datos:
- **consulta_resultado_clean.csv**: Se utiliza para entrenar el modelo y homogeneizar el preprocesamiento.
- **consulta_resultado.csv**: Se utiliza sin alterar para entregar la información original al usuario.

---

## 📋 Descripción General

El proyecto cuenta con las siguientes características:

- **Actualización Automática de Predicciones**  
  🚦 Un hilo en segundo plano actualiza las predicciones cada 3 minutos, consultando nuevos correos y procesando los datos.

- **Integración de Machine Learning**  
  🧠 Utiliza un modelo entrenado (SGDClassifier con TF-IDF) para predecir códigos de producto a partir de descripciones preprocesadas.

- **Uso de Dos Fuentes de Datos**  
  - **CSV Clean**: Se utiliza para el entrenamiento y la vectorización (aplicando un preprocesamiento homogéneo).  
  - **CSV Original**: Se consulta para obtener la información original que se mostrará al usuario, sin ningún cambio.

- **API RESTful**  
  🔌 Proporciona varios endpoints:
  - `/api/predicciones`: Devuelve las últimas predicciones almacenadas en caché.
  - `/api/send-seleccion`: Recibe y procesa la selección del usuario, actualizando el modelo.
  - `/api/buscar`: (Opcional) Permite buscar productos en la base de datos CSV.
  - `/api/getAudio`: Descarga archivos de audio relacionados con las predicciones.

- **Preprocesamiento de Texto**  
  ✂️ Normaliza las descripciones (minúsculas, eliminación de tildes, eliminación de puntuación irrelevante, etc.) para mejorar la precisión del modelo.

- **Operaciones Seguras en Entornos Multihilo**  
  🔒 El uso de locks asegura que las actualizaciones de la caché sean seguras.

---

## ⚙️ ¿Cómo Funciona?

1. **Carga de Datos y Entrenamiento**  
   - Se cargan los datos desde `consulta_resultado_clean.csv` y se preprocesan para entrenar el modelo.
   - Simultáneamente, se carga `consulta_resultado.csv` sin alterar para posteriores búsquedas de información original.
   - Se calcula el peso de las muestras para manejar el balanceo de clases.
   - Se inicializa el modelo y el vectorizador (o se carga desde archivo si ya existe).

2. **Actualización Periódica**  
   - Un hilo de fondo consulta el correo, extrae las descripciones y genera predicciones.
   - Se utiliza el modelo entrenado para predecir el código de producto a partir de la versión preprocesada del texto.
   - Una vez obtenida la predicción, se busca en `consulta_resultado.csv` la información original que se entregará al usuario.

3. **Interacción a Través de la API**  
   - Los endpoints permiten consultar las predicciones, enviar correcciones y descargar archivos de audio relacionados.
   - Las operaciones se realizan de forma segura en un entorno multihilo.

---

## 🛠 Tecnologías Utilizadas

- **Backend (Python):**
  - [Flask](https://flask.palletsprojects.com/) ⚡
  - [Flask-CORS](https://flask-cors.readthedocs.io/)  
  - [Pandas](https://pandas.pydata.org/)  
  - [Scikit-learn](https://scikit-learn.org/)  
  - [Joblib](https://joblib.readthedocs.io/) para la serialización del modelo  
  - [MSAL](https://github.com/AzureAD/microsoft-authentication-library-for-python) para autenticación con Microsoft Graph
  - [Threading](https://docs.python.org/3/library/threading.html) para tareas en segundo plano

- **Machine Learning:**
  - **TF-IDF Vectorization** para la transformación de texto  
  - **SGDClassifier** para la clasificación

- **Frontend:**
  - [React](https://reactjs.org/) 💻

---

## 📥 Guía de Instalación

### Requisitos Previos

- **Python 3.7+**
- **Node.js** (para el frontend)
- Las siguientes librerías de Python:
  - `flask`, `flask-cors`, `pandas`, `scikit-learn`, `joblib`, `msal`

### Pasos de Instalación

1. **Clonar el Repositorio**

   ```sh
   git clone https://github.com/alexcgar/F-R.git
   cd F-R
Configurar el Backend

Navega a la carpeta del backend e instala las dependencias:

sh
Copiar
Editar
cd backend
pip install -r requirements.txt
Configurar el Frontend

Navega a la carpeta del frontend e instala las dependencias:

sh
Copiar
Editar
cd ../frontend
npm install
Construir el Frontend

Genera la versión de producción del frontend:

sh
Copiar
Editar
npm run build
Esto creará una carpeta dist con los archivos estáticos necesarios.

Mover el Build del Frontend al Backend

Mueve los archivos del build a la carpeta estática del backend:

sh
Copiar
Editar
mv dist/* ../backend/model/static/
Ejecutar el Servidor Backend

Regresa a la carpeta del backend y ejecuta el servidor:

sh
Copiar
Editar
cd ../backend
python modelo_prediccion.py
Acceder a la Aplicación

Una vez que el servidor esté en ejecución, abre tu navegador y visita:

sh
Copiar
Editar
http://localhost:5000
🔄 Flujo de Trabajo
Entrenamiento y Actualización:
El modelo se entrena usando consulta_resultado_clean.csv. Cada 3 minutos se actualizan las predicciones consultando nuevos correos.

Predicción y Lookup:
El texto de entrada se preprocesa y se usa para predecir un código de producto. Con ese código, se consulta consulta_resultado.csv para obtener la información original que se entrega al usuario.

Interacción con la API:
Los usuarios pueden consultar las predicciones, enviar sus selecciones o descargar archivos de audio a través de los endpoints disponibles.

📞 Contacto
Si tienes alguna duda o sugerencia, ¡no dudes en contactarme!
Alejandro Caparrós García

¡Gracias por tu interés y feliz desarrollo! 😄✨

yaml
Copiar
Editar

---

Este **README.md** está diseñado para ser claro, visual y reflejar con precisión el funcionamiento actual del backend, manteniendo la integridad de la información que se entrega al usuario y explicando paso a paso el flujo de trabajo del sistema. ¡Espero que te resulte útil!






