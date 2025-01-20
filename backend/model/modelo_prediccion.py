# Importaciones de librerías estándar (sistema, utilidades, etc.)
import os
import re
import time
import json
import shutil
import base64
import threading
from threading import Lock

# Importaciones para lectura de variables de entorno
from dotenv import load_dotenv

# Importaciones para solicitudes HTTP y autenticación
import requests
from msal import ConfidentialClientApplication

# Importaciones para el framework Flask
from flask import Flask, jsonify, request, send_file, send_from_directory
from flask_cors import CORS

# Importaciones para manejo de datos y modelos de ML
import joblib
import pandas as pd
from typing import List
from sklearn.linear_model import SGDClassifier
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

load_dotenv()

CLIENT_ID = os.getenv("CLIENT_ID")
TENANT_ID = os.getenv("TENANT_ID")
CLIENT_SECRET = os.getenv("CLIENT_SECRET")
USER_EMAIL = os.getenv("USER_EMAIL")  # Correo electrónico de la bandeja de entrada que se va a monitorear


SCOPES = ["https://graph.microsoft.com/.default"] 

BASE_DIR = os.path.dirname(os.path.abspath(__file__))  # Obtiene la ruta absoluta del archivo actual
RUTA_MODELO = os.path.join(BASE_DIR, "modelo_actualizado.joblib")
RUTA_CSV = os.path.join(BASE_DIR, "consulta_resultado.csv")
RUTA_DESC_CONFIRMADAS_PKL = os.path.join(BASE_DIR, "descripciones_confirmadas.joblib")
RUTA_DESC_CONFIRMADAS_JSON = os.path.join(BASE_DIR, "descripciones_confirmadas.json")
CARPETA_AUDIOS = os.path.join(BASE_DIR, "audios")
RUTA_BACKUP = os.path.join(BASE_DIR, "../backups")  
STOP_WORDS= [
        "a", "acá", "ahí", "ajena", "ajenas", "ajeno", "ajenos", "al", "algo", "algún",
        "alguna", "algunas", "alguno", "algunos", "allá", "alli", "allí", "ambos", "ampleamos",
        "ante", "antes", "aquel", "aquella", "aquellas", "aquello", "aquellos", "aqui", "aquí",
        "arriba", "asi", "atras", "aun", "aunque", "bajo", "bastante", "bien", "cabe", "cada",
        "casi", "cierta", "ciertas", "cierto", "ciertos", "como", "cómo", "con", "conmigo",
        "conseguimos", "conseguir", "consigo", "consigue", "consiguen", "consigues", "contigo",
        "contra", "cual", "cuales", "cualquier", "cualquiera", "cualquieras", "cuan", "cuando",
        "cuanta", "cuantas", "cuanto", "cuantos", "de", "dejar", "del", "demas", "demasiada",
        "demasiadas", "demasiado", "demasiados", "dentro", "desde", "donde", "dos", "el", "él",
        "ella", "ellas", "ello", "ellos", "empleais", "emplean", "emplear", "empleas", "empleo",
        "en", "encima", "entonces", "entre", "era", "eramos", "eran", "eras", "eres", "es",
        "esa", "esas", "ese", "eso", "esos", "esta", "estaba", "estado", "estais", "estamos",
        "estan", "estoy", "fin", "fue", "fueron", "fui", "fuimos", "gueno", "ha", "hace",
        "haceis", "hacemos", "hacen", "hacer", "haces", "hago", "incluso", "intenta", "intentais",
        "intentamos", "intentan", "intentar", "intentas", "intento", "ir", "jamás", "junto",
        "juntos", "la", "largo", "las", "lo", "los", "mientras", "mio", "misma", "mismas",
        "mismo", "mismos", "modo", "mucha", "muchas", "muchísima", "muchísimas", "muchísimo",
        "muchísimos", "mucho", "muchos", "muy", "nada", "ni", "ninguna", "ningunas", "ninguno",
        "ningunos", "no", "nos", "nosotras", "nosotros", "nuestra", "nuestras", "nuestro",
        "nuestros", "nunca", "os", "otra", "otras", "otro", "otros", "para", "parecer", "pero",
        "poca", "pocas", "poco", "pocos", "podeis", "podemos", "poder", "podria", "podriais",
        "podriamos", "podrian", "podrias", "por", "por qué", "porque", "primero", "puede",
        "pueden", "puedo", "pues", "que", "qué", "querer", "quien", "quién", "quienes", "quienesquiera",
        "quienquiera", "quiza", "quizas", "sabe", "sabeis", "sabemos", "saben", "saber", "sabes",
        "se", "segun", "ser", "si", "sí", "siempre", "siendo", "sin", "sino", "so", "sobre",
        "sois", "solamente", "solo", "somos", "soy", "su", "sus", "suya", "suyas", "suyo",
        "suyos", "tal", "tales", "también", "tampoco", "tan", "tanta", "tantas", "tanto",
        "tantos", "te", "teneis", "tenemos", "tener", "tengo", "ti", "tiempo", "tiene", "tienen",
        "toda", "todas", "todo", "todos", "tomar", "trabaja", "trabajais", "trabajamos", "trabajan",
        "trabajar", "trabajas", "trabajo", "tras", "tú", "último", "un", "una", "unas", "uno",
        "unos", "usa", "usais", "usamos", "usan", "usar", "usas", "uso", "usted", "ustedes",
        "va", "vais", "valor", "vamos", "van", "varias", "varios", "vaya", "verdad", "verdadera",
        "vosotras", "vosotros", "voy", "vuestra", "vuestras", "vuestro", "vuestros", "y", "ya",
        "yo"
    ]
    

def obtener_token():
    """Obtiene un token de acceso utilizando Client Credentials Flow."""
    app = ConfidentialClientApplication(
        CLIENT_ID,
        authority=f"https://login.microsoftonline.com/{TENANT_ID}",
        client_credential=CLIENT_SECRET,
    )
    result = app.acquire_token_for_client(scopes=SCOPES)
    if "access_token" in result:
        return result["access_token"]
    else:
        error_msg = result.get(
            "error_description", "No se pudo obtener el token de acceso."
        )
        raise Exception(f"No se pudo obtener el token de acceso: {error_msg}")
    
    
def procesar_correos():
    """
    Procesa los correos no leídos y extrae los productos del cuerpo del mensaje.
    Returns:
        list: Lista de productos extraídos de los correos no leídos.
    """
    token = obtener_token()
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
    }
    # Filtro para correos no leídos
    filtro_no_leidos = "isRead eq false"
    endpoint = f"https://graph.microsoft.com/v1.0/users/{USER_EMAIL}/mailFolders/Inbox/messages"
    params = {"$filter": filtro_no_leidos, "$top": "10"}  # Limitar a los 10 correos no leídos más recientes

    response = requests.get(endpoint, headers=headers, params=params)
    
    if response.status_code == 200:
        messages = response.json().get("value", [])
        productos = []
        for message in messages:
            cuerpo = message.get("body", {}).get("content", "")
            correo_id = message.get("id", "")
            
            # Procesar cuerpo del mensaje (HTML o texto plano)
            if message.get("body", {}).get("contentType", "") == "html":
                from bs4 import BeautifulSoup
                soup = BeautifulSoup(cuerpo, "html.parser")
                cuerpo = soup.get_text()

            # Extraer productos
            extracted_items = extract_body_message(cuerpo, correo_id)
            productos.extend(extracted_items)


        return productos
    else:
        raise Exception(
            f"Error al obtener los correos: {response.status_code} - {response.text}"
        )

def extract_body_message(cuerpo, correo_id):
    """Procesa el cuerpo del mensaje y extrae la información necesaria."""
    try:
        # Cambiar comillas simples por dobles para que sea un JSON válido
        cuerpo = cuerpo.replace("'", '"')
        mensaje_json = json.loads(cuerpo)
        
        if "items" in mensaje_json:
            descriptions = []
            for item in mensaje_json["items"]:
                producto = item.get("product", "")
                size = item.get("size", "")
                if size == "N/A":
                    size = ""
                combined = f"{producto} {size}".strip()
                quantity = item.get("quantity", "")
                descriptions.append([combined, quantity, correo_id])
            return descriptions
        return []
    except json.JSONDecodeError:
        return []
    except Exception:
        return []
    
    
def descargar_audio_desde_correo(carpeta_destino):
    """Descarga archivos mp3 adjuntos de los correos no leídos y los guarda en la carpeta destino."""
    token = obtener_token()
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
    }
    # Filtrar correos que tienen adjuntos no leídos
    endpoint = f"https://graph.microsoft.com/v1.0/users/{USER_EMAIL}/mailFolders/Inbox/messages"
    params = {
        "$filter": "isRead eq false and hasAttachments eq true",
        "$expand": "attachments",
        "$top": "10",
    }
    response = requests.get(endpoint, headers=headers, params=params)
    if response.status_code == 200:
        messages = response.json().get("value", [])
        for message in messages:
            attachments = message.get("attachments", [])
            for attachment in attachments:
                nombre_archivo = attachment.get("name", "")
                if nombre_archivo.lower().endswith(".mp3"):
                    attachment_id = attachment.get("id")
                    # Descargar el adjunto
                    adjunto_endpoint = f'https://graph.microsoft.com/v1.0/users/{
                        USER_EMAIL}/messages/{message["id"]}/attachments/{attachment_id}/$value'
                    adjunto_response = requests.get(adjunto_endpoint, headers=headers)
                    if adjunto_response.status_code == 200:
                        # Asegurarse de que la carpeta de destino exista
                        if not os.path.exists(carpeta_destino):
                            os.makedirs(carpeta_destino)
                        ruta_archivo = os.path.join(carpeta_destino, nombre_archivo)
                        with open(ruta_archivo, "wb") as archivo:
                            archivo.write(adjunto_response.content)
                        return ruta_archivo  # Devolver la ruta del archivo de audio
                    else:
                        print(f"Error al descargar el adjunto: {adjunto_response.status_code}")
        return None
    else:
        raise Exception(
            f"Error al obtener correos: {response.status_code} - {response.text}")


def marcar_email_como_leido(email_id):
    """Marca un correo como leído usando su ID, solo se llamara una vez procesado el pedido"""
    
    token = obtener_token()
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    endpoint = f"https://graph.microsoft.com/v1.0/users/{USER_EMAIL}/messages/{email_id}"
    data = {"isRead": True}
    response = requests.patch(endpoint, headers=headers, json=data)
    if response.status_code != 200:
        print(f"Error al marcar correo como leído: {response.status_code} - {response.text}")


def procesar_texto(texto: str) -> str:
    texto = texto.lower()
    texto = re.sub(r"[^\w\s]", "", texto, flags=re.UNICODE)
    texto = re.sub(r"\b(\w+)(es|s)\b", r"\1", texto)
    palabras = texto.split()
    texto_procesado = " ".join([palabra for palabra in palabras if palabra not in STOP_WORDS])
    return texto_procesado


def guardar_modelo(modelo, vectorizer, ruta_modelo: str):
    joblib.dump({"model": modelo, "vectorizer": vectorizer}, ruta_modelo)


def guardar_descripciones_confirmadas(ruta_pkl: str, ruta_json: str):
    joblib.dump(descripciones_confirmadas, ruta_pkl)

    with open(ruta_json, "w", encoding="utf-8") as f:
        json.dump(descripciones_confirmadas, f, ensure_ascii=False, indent=4)

def cargar_descripciones_confirmadas(ruta: str):
    if os.path.exists(ruta):
        return joblib.load(ruta)
    else:
        return {}


def cargar_modelo(ruta_modelo):
    # Cargar con joblib
    if os.path.exists(ruta_modelo):
        data = joblib.load(ruta_modelo)
        return data["model"], data["vectorizer"]
    else:
        return None, None


def cargar_datos(ruta_csv: str):

    df_local = pd.read_csv(ruta_csv)

    df_local = df_local.dropna(subset=["CodArticle", "Description"])

    df_local["Description_Procesada"] = df_local["Description"].apply(procesar_texto)

    X = df_local["Description_Procesada"].tolist()

    y = df_local["CodArticle"].tolist()

    images = df_local["Image"].tolist()

    return X, y, df_local, images


def entrenar_modelo(X_train: List[str], y_train: List[str]):

    vectorizador = TfidfVectorizer()

    X_train_tfidf = vectorizador.fit_transform(X_train)

    modelo_sgd = SGDClassifier(random_state=42)

    clases = sorted(list(set(y_train)))

    modelo_sgd.partial_fit(X_train_tfidf, y_train, classes=clases)

    return modelo_sgd, vectorizador


def modelo_predecir(descripcion: str) -> str:

    descripcion_normalizada = procesar_texto(descripcion)

    if descripcion_normalizada in descripciones_confirmadas:
        return descripciones_confirmadas[descripcion_normalizada]

    descripcion_vectorizada = vectorizer.transform([descripcion_normalizada])

    prediccion = model.predict(descripcion_vectorizada)
    return prediccion[0]


def procesar_imagen(image_data):

    if image_data.startswith("b'") and image_data.endswith("'"):
        image_data = image_data[2:-1]

    image_bytes = image_data.encode("utf-8").decode("unicode_escape").encode("latin1")

    base64_encoded = base64.b64encode(image_bytes).decode("utf-8")

    return base64_encoded


def actualizar_modelo(descripcion: str, seleccion: str):

    global model, vectorizer, todas_las_clases, df, update_counter, descripciones_confirmadas

    if seleccion not in todas_las_clases:
        todas_las_clases.append(seleccion)

    descripcion_normalizada = procesar_texto(descripcion)

    descripciones_confirmadas[descripcion_normalizada] = seleccion

    guardar_descripciones_confirmadas(RUTA_DESC_CONFIRMADAS_PKL, RUTA_DESC_CONFIRMADAS_JSON)

    nuevo_registro = pd.DataFrame([{"Description": descripcion, "CodArticle": seleccion}])

    df = pd.concat([df, nuevo_registro], ignore_index=True)

    X = df["Description"].apply(procesar_texto).tolist()

    y = df["CodArticle"].astype(str).tolist()

    X_vectorized = vectorizer.transform(X)

    model.partial_fit(X_vectorized, y, classes=todas_las_clases)

    guardar_modelo(model, vectorizer, RUTA_MODELO)
    
    backup_model(RUTA_MODELO, RUTA_BACKUP)

    
def backup_model(ruta_original: str, ruta_backup_dir: str):
    if not os.path.exists(ruta_backup_dir):
        os.makedirs(ruta_backup_dir)

    # Eliminar backups antiguos
    for archivo in os.listdir(ruta_backup_dir):
        if archivo.startswith("modelo_backup_") and archivo.endswith(".joblib"):
            os.remove(os.path.join(ruta_backup_dir, archivo))

    timestamp = time.strftime("%Y%m%d-%H%M%S")
    nombre_backup = f"{ruta_backup_dir}/modelo_backup_{timestamp}.joblib"
    shutil.copy2(ruta_original, nombre_backup)




def inicializar_modelo():
    global model, vectorizer, todas_las_clases, df, descripciones_confirmadas, images

    # Cargar el modelo y vectorizador desde archivo si existe
    model, vectorizer = cargar_modelo(RUTA_MODELO)

    # Cargar los datos desde el CSV
    X, y, df_local, images = cargar_datos(RUTA_CSV)

    # Inicializamos las clases
    todas_las_clases = sorted(list(set(y)))

    # Guardar el dataframe en una variable global
    df = df_local

    # Cargar descripciones confirmadas
    descripciones_confirmadas = cargar_descripciones_confirmadas(RUTA_DESC_CONFIRMADAS_PKL)

    # Si no existe un modelo, entrenamos uno nuevo
    if model is None or vectorizer is None:
        model, vectorizer = entrenar_modelo(X, y)
        guardar_modelo(model, vectorizer, RUTA_MODELO)
    
    # Hacer un backup del modelo después de cargarlo o entrenarlo
    backup_model(RUTA_MODELO, RUTA_BACKUP)


app = Flask(__name__, static_folder='static')
CORS(app)


@app.route("/api/cargar_csv", methods=["GET"])
def cargar_csv():
    try:
        df = pd.read_csv(RUTA_CSV, usecols=["CodArticle", "Description"]) 
        datos_csv = df.to_dict(orient="records")
        return jsonify({"data": datos_csv}), 200
        
    except Exception as e:
        return jsonify({"error": f"No se pudo cargar el archivo CSV: {str(e)}"}), 500
    

@app.route("/api/send-seleccion", methods=["POST"])
def recibir_seleccion():
    data = request.get_json()
    seleccion = data.get("seleccion")
    descripcion = data.get("descripcion")
    if not descripcion or not seleccion:
        return jsonify({"error": "Faltan datos en la solicitud."}), 400
    try:
        actualizar_modelo(descripcion, seleccion)

        actualizar_predicciones_periodicamente()  

        predicciones_actualizadas = obtener_predicciones()

        return predicciones_actualizadas

    except Exception as e:
        return jsonify({"error": str(e)}), 500



if not os.path.exists(CARPETA_AUDIOS):
    os.makedirs(CARPETA_AUDIOS)


@app.route("/api/getAudio", methods=["GET"])
def get_audio():
    # Reemplaza con la ruta deseada
    carpeta_destino = r"C:\Users\acaparros\Desktop\F+R\backend\model\audios"
    ruta_audio = descargar_audio_desde_correo(carpeta_destino)
    if ruta_audio:
        try:
            return send_file(
                ruta_audio,
                mimetype="audio/mpeg",
                as_attachment=True,
                download_name="audio.mp3",  # Puedes ajustar el nombre del archivo según sea necesario
            )
        except Exception as e:
            return jsonify({"error": "Error al enviar el archivo de audio."}), 500
    else:
        return (jsonify({"error": "No se encontró ningún archivo de audio para descargar."}),404,)


predicciones_recientes = []
historial_predicciones = []
predicciones_lock = Lock()



def actualizar_predicciones_periodicamente():
    global predicciones_recientes, historial_predicciones

    while True:
        try:
            productos = procesar_correos()

            nuevas_predicciones = []

            for producto in productos:
                descripcion = producto[0]
                cantidad = producto[1]
                correo_id = producto[2]

                # Normalizar y predecir
                descripcion_procesada = procesar_texto(descripcion)
                if descripcion_procesada in descripciones_confirmadas:
                    codigo_prediccion = descripciones_confirmadas[descripcion_procesada]
                    exactitud = 100
                else:
                    codigo_prediccion = modelo_predecir(descripcion)
                    if codigo_prediccion in df["CodArticle"].values:
                        descripcion_predicha_procesada = df.loc[df["CodArticle"] == codigo_prediccion, "Description_Procesada"].iloc[0]

                        # Similaridad de coseno
                        vectorizador_similitud = TfidfVectorizer()
                        tfidf_matrix = vectorizador_similitud.fit_transform([descripcion_procesada, descripcion_predicha_procesada])
                        
                        cosine_sim = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
                        exactitud = int(cosine_sim * 100)
                    else:
                        exactitud = 0

                # Obtener datos adicionales
                descripcion_csv = df[df["CodArticle"] == codigo_prediccion]["Description"].values
                
                descripcion_csv = (
                    descripcion_csv[0]
                    if len(descripcion_csv) > 0
                    else "Descripción no encontrada"
                )
                
                imagen = df[df["CodArticle"] == codigo_prediccion]["Image"].values
                imagen = (imagen[0] if len(imagen) > 0 and pd.notna(imagen[0]) else None)
                id_article = df[df["CodArticle"] == codigo_prediccion]["IDArticle"].values
                id_article = id_article[0] if len(id_article) > 0 else None

                nuevas_predicciones.append(
                    {
                        "descripcion": descripcion.upper(),
                        "codigo_prediccion": codigo_prediccion,
                        "descripcion_csv": descripcion_csv,
                        "cantidad": cantidad,
                        "imagen": procesar_imagen(imagen) if imagen else None,
                        "exactitud": exactitud,
                        "id_article": id_article,
                        "correo_id": correo_id,
                    }
                )
            # Usar un lock para actualizar de manera segura las predicciones
            with predicciones_lock:
                predicciones_recientes.clear()
                predicciones_recientes.extend(nuevas_predicciones)
                historial_predicciones.extend(nuevas_predicciones)  # Opcional

        except Exception as e:
            print(f"Error actualizando predicciones: {e}")
        time.sleep(10)

@app.route("/api/obtener_ids_correos", methods=["GET"])
def obtener_ids_correos():
    try:
        token = obtener_token()
        headers = {
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
        }
        filtro_no_leidos = "isRead eq false"
        endpoint = f"https://graph.microsoft.com/v1.0/users/{USER_EMAIL}/mailFolders/Inbox/messages"
        params = {"$filter": filtro_no_leidos, "$top": "10"}

        response = requests.get(endpoint, headers=headers, params=params)
        if response.status_code == 200:
            messages = response.json().get("value", [])
            ids_correos = [message.get("id", "") for message in messages]
            return jsonify({"ids_correos": ids_correos}), 200
        else:
            return jsonify({"error": f"Error al obtener los correos: {response.status_code} - {response.text}"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    

@app.route("/api/marcar_leido", methods=["POST"])
def marcar_correo_leido():
    """Endpoint para marcar un correo como leído."""
    data = request.get_json()
    correo_id = data.get("correo_id")
    if not correo_id:
        return jsonify({"error": "ID del correo no proporcionado"}), 400

    try:
        marcar_email_como_leido(correo_id)  # Llamada a la función importada
        return jsonify({"message": "Correo marcado como leído"}), 200
    except Exception as e:
        return jsonify({"error": f"No se pudo marcar el correo como leído: {e}"}), 500


@app.route("/api/predicciones", methods=["GET"])
def obtener_predicciones():
    global predicciones_recientes
    with predicciones_lock:
        if not predicciones_recientes:
            return jsonify({"message": "No se encontraron predicciones", "predicciones": []}), 200
        return jsonify(predicciones_recientes), 200


@app.route("/")
def serve_react():
    return send_from_directory(app.static_folder, "index.html")


# Manejar rutas desconocidas y devolver React
@app.errorhandler(404)
def not_found(e):
    return send_from_directory(app.static_folder, "index.html")


# Forzar MIME type correcto para JS
@app.route('/assets/<path:filename>')
def static_assets(filename):
    if filename.endswith('.js'):
        return send_from_directory(app.static_folder + '/assets', filename, mimetype='application/javascript') # Forzar MIME type correcto para JS MIME
    return send_from_directory(app.static_folder + '/assets', filename)


if __name__ == "__main__":
    inicializar_modelo()
    # Inicia el hilo para actualizar predicciones periódicamente
    hilo_actualizador = threading.Thread(
        target=actualizar_predicciones_periodicamente, daemon=True)
    hilo_actualizador.start()
    app.run(host="0.0.0.0", port=5000, debug=True)
 