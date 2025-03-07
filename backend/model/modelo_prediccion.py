import os
import re
import time
import json
import shutil
import base64
import threading
from threading import Lock

from bs4 import BeautifulSoup
from dotenv import load_dotenv

import ast  # Asegúrate de tener 'import ast' en la parte superior del archivo


import requests
from msal import ConfidentialClientApplication

from flask import Flask, jsonify, request, send_file, send_from_directory
from flask_cors import CORS

import joblib
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import difflib
import unicodedata

import logging

# Configuración básica del logging
logging.basicConfig(level=logging.INFO)

load_dotenv()

CLIENT_ID = os.getenv("CLIENT_ID")
TENANT_ID = os.getenv("TENANT_ID")
CLIENT_SECRET = os.getenv("CLIENT_SECRET")
USER_EMAIL = os.getenv("USER_EMAIL")  # Correo electrónico de la bandeja de entrada a monitorear

SCOPES = ["https://graph.microsoft.com/.default"] 

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
RUTA_MODELO = os.path.join(BASE_DIR, "modelo_actualizado.joblib")
RUTA_CSV_CLEAN = os.path.join(BASE_DIR, "consulta_resultado_clean.csv")
RUTA_CSV = os.path.join(BASE_DIR, "consulta_resultado.csv")
RUTA_DESC_CONFIRMADAS_PKL = os.path.join(BASE_DIR, "descripciones_confirmadas.joblib")
RUTA_DESC_CONFIRMADAS_JSON = os.path.join(BASE_DIR, "descripciones_confirmadas.json")
CARPETA_AUDIOS = os.path.join(BASE_DIR, "audios")
RUTA_BACKUP = os.path.join(BASE_DIR, "../backups")  

STOP_WORDS = [
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
    app_conf = ConfidentialClientApplication(
        CLIENT_ID,
        authority=f"https://login.microsoftonline.com/{TENANT_ID}",
        client_credential=CLIENT_SECRET,
    )
    result = app_conf.acquire_token_for_client(scopes=SCOPES)
    if "access_token" in result:
        return result["access_token"]
    else:
        error_msg = result.get("error_description", "No se pudo obtener el token de acceso.")
        raise Exception(f"No se pudo obtener el token de acceso: {error_msg}")
    
def procesar_correos():
    token = obtener_token()
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
    }
    filtro = "isRead eq false and hasAttachments eq true"
    endpoint = f"https://graph.microsoft.com/v1.0/users/{USER_EMAIL}/mailFolders/Inbox/messages"
    params = {"$filter": filtro, "$expand": "attachments", "$top": "100"}

    response = requests.get(endpoint, headers=headers, params=params)
    if response.status_code == 200:
        messages = response.json().get("value", [])
        productos = []
        audios = descargar_audio_desde_correo(CARPETA_AUDIOS) or []
        audio_dict = {audio["correo_id"]: audio for audio in audios}
        logging.info(f"Encontrados {len(messages)} correos no leídos con adjuntos para procesar.")
        for message in messages:
            correo_id = message.get("id", "Sin ID")
            attachments = message.get("attachments", [])
            tiene_audio = any(attachment.get("name", "").lower().endswith((".mp3", ".mp4")) for attachment in attachments)
            if not tiene_audio:
                logging.info(f"Correo {correo_id} ignorado: no contiene adjuntos MP3/MP4.")
                continue

            cuerpo = message.get("body", {}).get("content", "")
            logging.info(f"Procesando correo {correo_id}, cuerpo (primeros 200 caracteres): {cuerpo[:200]}...")
            if message.get("body", {}).get("contentType", "") == "html":
                soup = BeautifulSoup(cuerpo, "html.parser")
                cuerpo = soup.get_text()
            extracted_items = extract_body_message(cuerpo, correo_id)
            for item in extracted_items:
                audio_info = audio_dict.get(correo_id, {})
                item.append(audio_info.get("audio_base64", ""))  # Audio base64
                item.append(audio_info.get("IDWorkOrder", None))
                item.append(audio_info.get("IDEmployee", None))
                item.append(audio_info.get("nombre", ""))  # Nombre del archivo original
            productos.extend(extracted_items)
        logging.info(f"Procesamiento completado, total de productos extraídos: {len(productos)}.")
        return productos
    else:
        logging.error(f"Error al obtener los correos: {response.status_code} - {response.text}")
        raise Exception(f"Error al obtener los correos: {response.status_code} - {response.text}")

def extract_body_message(cuerpo, correo_id):
    try:
        logging.info(f"Intentando parsear JSON del correo {correo_id}, cuerpo (primeros 200): {cuerpo[:200]}...")
        cuerpo = cuerpo.replace("'", '"')
        try:
            mensaje_json = json.loads(cuerpo)
            logging.info(f"JSON parseado exitosamente para correo {correo_id}: {mensaje_json}")
        except json.JSONDecodeError as e:
            logging.warning(f"Error inicial parseando JSON en correo {correo_id}: {e}")
            match = re.search(r'(\{.*\})', cuerpo, re.DOTALL)
            if match:
                cuerpo_json = match.group(1)
                logging.info(f"Substring JSON extraído para correo {correo_id}: {cuerpo_json[:200]}...")
                mensaje_json = json.loads(cuerpo_json)
                logging.info(f"JSON parseado del substring para correo {correo_id}: {mensaje_json}")
            else:
                logging.error(f"No se pudo extraer JSON válido en correo {correo_id}: {e}")
                raise e
        if "items" in mensaje_json:
            descriptions = []
            logging.info(f"Items encontrados en correo {correo_id}: {len(mensaje_json['items'])}")
            for item in mensaje_json["items"]:
                producto = item.get("product", "")
                size = item.get("size", "")
                if size == "N/A":
                    size = ""
                combined = f"{producto} {size}".strip()
                quantity = item.get("quantity", "")
                descriptions.append([combined, quantity, correo_id])
                logging.info(f"Producto extraído del correo {correo_id}: Descripción '{combined}', Cantidad '{quantity}'")
            return descriptions
        else:
            logging.warning(f"No se encontraron 'items' en el JSON del correo {correo_id}")
            return []
    except json.JSONDecodeError as e:
        logging.error(f"Error final parseando JSON en correo {correo_id}: {e}")
        return []
    except Exception as e:
        logging.error(f"Error general procesando correo {correo_id}: {e}")
        return []

def extraer_datos_del_nombre(nombre_archivo: str) -> tuple:
    """
    Extrae dos datos importantes del nombre del archivo mp4.
    
    Se asume que el nombre tiene el formato: dato1 - dato2-resto.mp4
    (el guion separa los dos datos, pudiendo haber espacios alrededor).
    
    Args:
        nombre_archivo (str): Nombre del archivo.
    
    Returns:
        tuple: (dato1, dato2) o (None, None) si no se cumple el formato.
    """
    import os
    base, _ = os.path.splitext(nombre_archivo)
    partes = [parte.strip() for parte in base.split('_')]
    if len(partes) >= 2:
        dato1, dato2 = partes[0], partes[1]
        logging.info(f"Datos extraídos del audio {nombre_archivo}: IDWorkOrder={dato1}, IDEmployee={dato2}")
        return dato1, dato2
    logging.warning(f"Formato de nombre inválido para {nombre_archivo}, no se extrajeron datos.")
    return None, None

def descargar_audio_desde_correo(carpeta_destino):
    token = obtener_token()
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
    }
    endpoint = f"https://graph.microsoft.com/v1.0/users/{USER_EMAIL}/mailFolders/Inbox/messages"
    params = {"$filter": "isRead eq false and hasAttachments eq true", "$expand": "attachments", "$top": "50"}
    response = requests.get(endpoint, headers=headers, params=params)
    audios = []
    if response.status_code == 200:
        messages = response.json().get("value", [])
        logging.info(f"Encontrados {len(messages)} correos no leídos con adjuntos para descargar audios.")
        for message in messages:
            correo_id = message.get("id", "Sin ID")
            attachments = message.get("attachments", [])
            for attachment in attachments:
                nombre_archivo = attachment.get("name", "")
                if nombre_archivo.lower().endswith((".mp3", ".mp4")):  # Soporte para mp3 y mp4
                    logging.info(f"Procesando archivo de audio del correo {correo_id}: {nombre_archivo}")
                    dato1, dato2 = extraer_datos_del_nombre(nombre_archivo)
                    attachment_id = attachment.get("id")
                    adjunto_endpoint = f'https://graph.microsoft.com/v1.0/users/{USER_EMAIL}/messages/{correo_id}/attachments/{attachment_id}/$value'
                    adjunto_response = requests.get(adjunto_endpoint, headers=headers)
                    if adjunto_response.status_code == 200:
                        audio_content = adjunto_response.content
                        audio_base64 = base64.b64encode(audio_content).decode("utf-8")
                        audios.append({
                            "nombre": nombre_archivo,  # Guardamos el nombre completo del archivo
                            "IDWorkOrder": dato1,
                            "IDEmployee": dato2,
                            "audio_base64": audio_base64,
                            "correo_id": correo_id
                        })
                        logging.info(f"Audio procesado en base64 para {nombre_archivo}, tamaño: {len(audio_base64)} caracteres")
                    else:
                        logging.error(f"Error al obtener el audio {nombre_archivo}: {adjunto_response.status_code}")
        logging.info(f"Descarga completada, total de audios procesados: {len(audios)}")
        return audios if audios else None
    else:
        logging.error(f"Error al obtener correos para audios: {response.status_code} - {response.text}")
        raise Exception(f"Error al obtener correos: {response.status_code} - {response.text}")

def marcar_email_como_leido(email_id):
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
    """
    Normaliza el texto: reemplaza sinónimos, elimina caracteres especiales y elimina stop words.
    
    Args:
        texto (str): Texto original.
    
    Returns:
        str: Texto procesado.
    """
    texto = str(texto)
    sinonimos = {
        "pegamento": "adhesivo",
        "cola": "adhesivo",
        # Agregar más sinónimos según se requiera.
    }
    for palabra, reemplazo in sinonimos.items():
        texto = re.sub(rf"\b{palabra}\b", reemplazo, texto, flags=re.IGNORECASE)
    
    texto = texto.lower()
    texto = unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode("utf-8")
    texto = re.sub(r"\b(dispensadores)\b", r"dispensador", texto)
    texto = re.sub(r"[^\w\s]", "", texto, flags=re.UNICODE)
    texto = re.sub(r"\b(\w+)(es|s)\b", r"\1", texto)
    palabras = texto.split()
    return " ".join([palabra for palabra in palabras if palabra not in STOP_WORDS])

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
    return X, y, df_local

def modelo_predecir_fuzzy(descripcion: str) -> dict:
    descripcion_normalizada = procesar_texto(descripcion)
    lista_descripciones = df["Description_Procesada"].tolist()
    matches = difflib.get_close_matches(descripcion_normalizada, lista_descripciones, n=1, cutoff=0.5)
    if matches:
        match = matches[0]
        row = df.loc[df["Description_Procesada"] == match].iloc[0]
        codigo_prediccion = row["CodArticle"]
        descripcion_csv = row["Description"]
        return {
            "codigo_prediccion": codigo_prediccion,
            "descripcion_producto": descripcion_csv,
            "match_method": "fuzzy"
        }
    else:
        return {
            "codigo_prediccion": None,
            "mensaje": "No se encontró una coincidencia similar",
            "match_method": "fuzzy"
        }

def modelo_predecir(descripcion: str) -> dict:
    descripcion_normalizada = procesar_texto(descripcion)
    if descripcion_normalizada in descripciones_confirmadas:
        codigo_prediccion = descripciones_confirmadas[descripcion_normalizada]
    else:
        resultado = modelo_predecir_fuzzy(descripcion)
        codigo_prediccion = resultado.get("codigo_prediccion")
    
    if not df_lookup.empty and codigo_prediccion in df_lookup["CodArticle"].values:
        registro = df_lookup.loc[df_lookup["CodArticle"] == codigo_prediccion].iloc[0].to_dict()
        return {
            "codigo_prediccion": codigo_prediccion,
            "descripcion_producto": registro.get("Description", ""),
            "otros_datos": registro,
            "match_method": "fuzzy"
        }
    else:
        return {
            "codigo_prediccion": codigo_prediccion,
            "mensaje": "No se encontró registro en consulta_resultado.csv",
            "match_method": "fuzzy"
        }

def actualizar_modelo(descripcion: str, seleccion: str):
    global model, vectorizer, todas_las_clases, df, descripciones_confirmadas
    if seleccion not in todas_las_clases:
        todas_las_clases.append(seleccion)
    descripcion_normalizada = procesar_texto(descripcion)
    descripciones_confirmadas[descripcion_normalizada] = seleccion
    guardar_descripciones_confirmadas(RUTA_DESC_CONFIRMADAS_PKL, RUTA_DESC_CONFIRMADAS_JSON)
    # Crea el nuevo registro incluyendo la columna calculada "Description_Procesada"
    nuevo_registro = pd.DataFrame([{
        "Description": descripcion,
        "CodArticle": seleccion,
        "Description_Procesada": procesar_texto(descripcion)
    }])
    df = pd.concat([df, nuevo_registro], ignore_index=True)
    guardar_modelo({"model": model, "vectorizer": vectorizer}, None, RUTA_MODELO)
    backup_model(RUTA_MODELO, RUTA_BACKUP)
    
def backup_model(ruta_original: str, ruta_backup_dir: str):
    if not os.path.exists(ruta_backup_dir):
        os.makedirs(ruta_backup_dir)
    for archivo in os.listdir(ruta_backup_dir):
        if archivo.startswith("modelo_backup_") and archivo.endswith(".joblib"):
            os.remove(os.path.join(ruta_backup_dir, archivo))
    timestamp = time.strftime("%Y%m%d-%H%M%S")
    nombre_backup = f"{ruta_backup_dir}/modelo_backup_{timestamp}.joblib"
    shutil.copy2(ruta_original, nombre_backup)

def inicializar_modelo():
    global model, vectorizer, todas_las_clases, df_lookup, descripciones_confirmadas, df
    model, vectorizer = cargar_modelo(RUTA_MODELO)
    X_train, y_train, df_train = cargar_datos(RUTA_CSV_CLEAN)
    todas_las_clases = sorted(list(set(y_train)))
    df = df_train.copy()
    if os.path.exists(RUTA_CSV):
        df_lookup = pd.read_csv(RUTA_CSV)
    else:
        df_lookup = pd.DataFrame()
    descripciones_confirmadas = cargar_descripciones_confirmadas(RUTA_DESC_CONFIRMADAS_PKL)
    # Si no existe un modelo, en esta versión no se entrena uno nuevo por no utilizar embeddings.
    if model is None or vectorizer is None:
        model, vectorizer = None, None
        guardar_modelo({"model": model, "vectorizer": vectorizer}, None, RUTA_MODELO)
    backup_model(RUTA_MODELO, RUTA_BACKUP)



def mostrar_correos_no_leidos():
    """
    Obtiene y muestra en consola los correos sin leer junto con su contenido.
    """
    token = obtener_token()
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
    }
    # Puedes ajustar el filtro según necesites
    filtro = "isRead eq false"
    endpoint = f"https://graph.microsoft.com/v1.0/users/{USER_EMAIL}/mailFolders/Inbox/messages"
    params = {"$filter": filtro, "$top": "100"}
    
    response = requests.get(endpoint, headers=headers, params=params)
    if response.status_code == 200:
        messages = response.json().get("value", [])
        for message in messages:
            correo_id = message.get("id", "Sin ID")
            cuerpo = message.get("body", {}).get("content", "")
            # Si el contenido es HTML, extraemos solo el texto
            if message.get("body", {}).get("contentType", "").lower() == "html":
                cuerpo = BeautifulSoup(cuerpo, "html.parser").get_text()
    else:
        print(f"Error al obtener los correos: {response.status_code} - {response.text}")


app = Flask(__name__, static_folder='static')
CORS(app)


@app.after_request
def fix_cors_headers(response):
    # Asegurarse de que el header tenga un único valor
    if response.headers.getlist("Access-Control-Allow-Origin"):
        response.headers["Access-Control-Allow-Origin"] = "*"
    return response


@app.route("/api/cargar_csv", methods=["GET"])
def cargar_csv():
    try:
        df_csv = pd.read_csv(RUTA_CSV, usecols=["CodArticle", "Description","IDArticle"])
        datos_csv = df_csv.to_dict(orient="records")
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
        # Se asume que las predicciones se actualizarán en segundo plano.
        predicciones_actualizadas = obtener_predicciones()
        return predicciones_actualizadas
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if not os.path.exists(CARPETA_AUDIOS):
    os.makedirs(CARPETA_AUDIOS)


audio_info_global = {}


@app.route("/api/getAudio", methods=["GET"])
def get_audio():
    global audio_info_global
    info_list = descargar_audio_desde_correo(CARPETA_AUDIOS)
    if info_list and len(info_list) > 0:
        # Seleccionar el primer audio disponible
        info = info_list[0]
        audio_info_global = {
            "IDWorkOrder": info.get("IDWorkOrder"),
            "IDEmployee": info.get("IDEmployee"),
        }
        return send_file(
            info.get("ruta"),
            mimetype="audio/mpeg",
            as_attachment=True,
            download_name="audio.mp4",
        )
    else:
        return jsonify({"message": "No hay audio disponible."}), 200

predicciones_recientes = []
historial_predicciones = []
predicciones_lock = Lock()


def procesar_producto(producto: list) -> dict:
    descripcion, cantidad, correo_id, audio_base64, id_work_order, id_employee, file_name_original = producto
    descripcion_procesada = procesar_texto(descripcion)
    logging.info(f"Procesando producto del correo {correo_id}: Descripción original '{descripcion}', Procesada '{descripcion_procesada}'")
    
    if descripcion_procesada in descripciones_confirmadas:
        codigo_prediccion = descripciones_confirmadas[descripcion_procesada]
        exactitud = 100
    else:
        resultado_prediccion = modelo_predecir(descripcion)
        codigo_prediccion = resultado_prediccion.get("codigo_prediccion")
        if codigo_prediccion in df["CodArticle"].values:
            descripcion_csv_predicha = df.loc[df["CodArticle"] == codigo_prediccion, "Description_Procesada"].iloc[0]
            vectorizador_similitud = TfidfVectorizer()
            tfidf_matrix = vectorizador_similitud.fit_transform([descripcion_procesada, descripcion_csv_predicha])
            cosine_sim = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
            exactitud = int(min((cosine_sim + 0.15) * 100, 100))
        else:
            exactitud = 0

    if not df_lookup.empty:
        registros = df_lookup[df_lookup["CodArticle"] == codigo_prediccion]
        descripcion_csv = registros["Description"].iloc[0] if not registros.empty else "Descripción no encontrada"
        imagen = ""
        if not registros.empty and "Image" in registros:
            imagen_temp = registros["Image"].iloc[0]
            if pd.isna(imagen_temp):
                imagen = ""
            elif isinstance(imagen_temp, str) and (imagen_temp.startswith("b'") or imagen_temp.startswith('b"')):
                try:
                    imagen_bytes = ast.literal_eval(imagen_temp)
                    imagen_base64 = base64.b64encode(imagen_bytes).decode("utf-8")
                    imagen = imagen_base64
                except Exception as e:
                    logging.error("Error al convertir la imagen a base64: %s", e)
                    imagen = ""
            else:
                imagen = imagen_temp
        id_article_arr = df[df["CodArticle"] == codigo_prediccion]["IDArticle"].values
        id_article = id_article_arr[0] if len(id_article_arr) > 0 else None
    else:
        descripcion_csv = "Descripción no encontrada"
        imagen = ""
        id_article = None

    # Detectar el formato del audio dinámicamente
    formato_audio = "mp4"  # Valor por defecto
    if file_name_original:
        _, extension = os.path.splitext(file_name_original)
        formato_audio = extension.lstrip(".").lower() if extension else "mp4"
    logging.info(f"Formato de audio detectado: {formato_audio}")

    resultado = {
        "descripcion": descripcion.upper(),
        "codigo_prediccion": codigo_prediccion,
        "descripcion_csv": descripcion_csv,
        "cantidad": cantidad,
        "imagen": imagen,
        "exactitud": exactitud,
        "id_article": codigo_prediccion if 'id_article' not in locals() else id_article,
        "correo_id": correo_id,
        "IDWorkOrder": id_work_order,
        "IDEmployee": id_employee,
        "audio_base64": audio_base64,
        "file_name": f"{id_work_order}_{id_employee}_{formato_audio}"
    }
    return resultado

def actualizar_predicciones_periodicamente():
    """
    Actualiza las predicciones de forma periódica procesando correos recibidos.
    """
    global predicciones_recientes, historial_predicciones
    while True:
        try:
            productos = procesar_correos()
            mostrar_correos_no_leidos()
            nuevas_predicciones = [procesar_producto(producto) for producto in productos]
            with predicciones_lock:
                predicciones_recientes.clear()
                predicciones_recientes.extend(nuevas_predicciones)
                historial_predicciones.extend(nuevas_predicciones)
        except Exception as e:
            logging.error("Error actualizando predicciones: %s", e)
        time.sleep(60)


@app.route("/api/marcar_leido", methods=["POST"])
def marcar_correo_leido():
    data = request.get_json()
    correo_id = data.get("correo_id")
    if not correo_id:
        return jsonify({"error": "ID del correo no proporcionado"}), 400
    try:
        marcar_email_como_leido(correo_id)
        return jsonify({"message": "Correo marcado como leído"}), 200
    except Exception as e:
        return jsonify({"error": f"No se pudo marcar el correo como leído: {e}"}), 500

@app.route("/api/predicciones", methods=["GET"])
def obtener_predicciones():
    global predicciones_recientes
    with predicciones_lock:
        predicciones = predicciones_recientes.copy()
    logging.info(f"Enviando {len(predicciones)} predicciones a la API, incluyendo audio_base64")
    return jsonify(predicciones), 200

@app.route("/")
def serve_react():
    return send_from_directory(app.static_folder, "index.html")

@app.errorhandler(404)
def not_found(e):
    return send_from_directory(app.static_folder, "index.html")


@app.route('/assets/<path:filename>')
def static_assets(filename):
    if filename.endswith('.js'):
        return send_from_directory(app.static_folder + '/assets', filename, mimetype='application/javascript')
    return send_from_directory(app.static_folder + '/assets', filename)


if __name__ == "__main__":
    inicializar_modelo()
    hilo_actualizador = threading.Thread(target=actualizar_predicciones_periodicamente, daemon=True)
    hilo_actualizador.start()
    
    try:
        from waitress import serve
        # Serve usando Waitress (pip install waitress)
        serve(app, host="10.83.0.17", port=5000, threads=1)
    except ImportError:
        # Si no está instalado waitress, se arranca en modo desarrollo (no recomendado en producción)
        app.run(host="0.0.0.0", port=5000, debug=False)