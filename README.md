# 🚀 Sistema Automatizado de Predicción de Productos

Este proyecto es una aplicación backend basada en Flask que automatiza el proceso de obtención, procesamiento y predicción de productos a partir de descripciones. El sistema recibe datos desde un archivo de audio, los transcribe a texto y luego los procesa para interpretar y gestionar los pedidos. Se integra con un frontend en React y utiliza dos fuentes de datos CSV: una para entrenar el modelo de predicción y otra para presentar la información original al usuario

---

## 📋 Descripción General

El sistema realiza las siguientes tareas:

- **Obtención de Correos**:  
  Utiliza Microsoft Graph para acceder a los correos no leídos de una cuenta y extraer los productos mediante el procesamiento del cuerpo del mensaje.

- **Preprocesamiento de Texto**:  
  Normaliza las descripciones (minúsculas, eliminación de puntuación y palabras irrelevantes) para homogeneizar los datos y facilitar la predicción.

- **Predicción con Fuzzy Matching**:  
  Se aplica un algoritmo de _fuzzy matching_ (usando `difflib`) para encontrar la descripción más similar en el CSV de datos limpios (`consulta_resultado_clean.csv`) y se obtiene el código de producto correspondiente.

- **Lookup de Información Original**:  
  Una vez obtenido el código de producto, se consulta el CSV original (`consulta_resultado.csv`) para extraer la información completa (por ejemplo, descripción real, imagen, ID, etc.) que se mostrará al usuario sin alterar.

- **Actualización del Modelo y Retroalimentación**:  
  Permite que, mediante el endpoint `/api/send-seleccion`, el usuario envíe correcciones o selecciones que se integran en el sistema y actualizan las predicciones.

- **Descarga de Archivos de Audio**:  
  Si un correo contiene adjuntos en formato MP3, se pueden descargar a través del endpoint `/api/getAudio`.

- **Operaciones en Segundo Plano y Seguridad Multihilo**:  
  Un hilo se encarga de actualizar las predicciones cada 10 segundos (ajustable) de forma segura mediante _locks_ para evitar problemas en entornos multihilo.

---

## ⚙️ Funcionalidades y Endpoints

- **Actualización Automática**  
  🔄 Un proceso en segundo plano obtiene correos y actualiza las predicciones en memoria periódicamente.

- **API RESTful**  
  🔌 La aplicación ofrece los siguientes endpoints:
  - `GET /api/cargar_csv`  
    → Devuelve un subconjunto de los datos originales (del CSV `consulta_resultado.csv`) para mostrar productos.
  - `POST /api/send-seleccion`  
    → Recibe la selección del usuario y actualiza el modelo (incorporando la corrección).
  - `GET /api/getAudio`  
    → Descarga el archivo de audio (si lo hay) de un correo.
  - `GET /api/predicciones`  
    → Devuelve las últimas predicciones almacenadas.
  - `POST /api/marcar_leido`  
    → Marca un correo como leído en Microsoft Graph.
  - Además, se sirven las rutas para los archivos estáticos y la aplicación React.

- **Fuzzy Matching para Predicción**  
  🔍 Se utiliza `difflib` para buscar coincidencias cercanas entre la descripción procesada del correo y el CSV de datos limpios, y de esa forma obtener el código de producto.

- **Lookup en CSV Original**  
  📄 La información mostrada al usuario se extrae directamente de `consulta_resultado.csv` sin modificaciones, garantizando que los datos presentados sean los originales.

---

## 🛠 Tecnologías Utilizadas

- **Backend (Python):**
  - [Flask](https://flask.palletsprojects.com/) ⚡
  - [Flask-CORS](https://flask-cors.readthedocs.io/)
  - [Pandas](https://pandas.pydata.org/)
  - [Scikit-learn](https://scikit-learn.org/)
  - [Joblib](https://joblib.readthedocs.io/) para la serialización de modelos
  - [MSAL](https://github.com/AzureAD/microsoft-authentication-library-for-python) para autenticación con Microsoft Graph
  - [difflib](https://docs.python.org/3/library/difflib.html) para fuzzy matching
  - Módulos estándar: `os`, `re`, `time`, `json`, `shutil`, `base64`, `threading`, `ast`

- **Machine Learning:**
  - **TF-IDF Vectorization** para transformar texto
  - **Fuzzy Matching** para similitud de descripciones

- **Frontend:**
  - [React](https://reactjs.org/) 💻

---

## 📥 Guía de Instalación

### Requisitos Previos

- **Python 3.7+**
- **Node.js** (para el frontend)
- Librerías de Python (ver `requirements.txt`):
  - `flask`, `flask-cors`, `pandas`, `scikit-learn`, `joblib`, `msal`, entre otras.

### Pasos de Instalación

1. **Clonar el Repositorio**

   ```bash
   git clone https://github.com/alexcgar/F-R.git
   cd F-R
