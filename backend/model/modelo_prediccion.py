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

import ast  

# Importar librerias de peticiones HTTP
import requests
from msal import ConfidentialClientApplication

from flask import Flask, jsonify, request, send_file, send_from_directory
from flask_cors import CORS

# Importar librerías de procesamiento de texto
import joblib
import pandas as pd

# Importtar librerias de comparación de texto
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import difflib
import unicodedata

# Libreria para el manejo de logs
import logging

# Configuración básica del logging
logging.basicConfig(level=logging.INFO)


load_dotenv()
CLIENT_ID = os.getenv("CLIENT_ID")
TENANT_ID = os.getenv("TENANT_ID")
CLIENT_SECRET = os.getenv("CLIENT_SECRET")
USER_EMAIL = os.getenv("USER_EMAIL")  # Correo electrónico de la bandeja de entrada a monitorear


# Configuración de permisos para el token de acceso
SCOPES = ["https://graph.microsoft.com/.default"] 


# Definir rutas de archivos y carpetas (he usado os.path.join para que sea compatible con Windows y Linux)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
RUTA_CSV_CLEAN = os.path.join(BASE_DIR, "consulta_resultado_clean.csv")
RUTA_CSV = os.path.join(BASE_DIR, "consulta_resultado.csv")
RUTA_DESC_CONFIRMADAS_PKL = os.path.join(BASE_DIR, "descripciones_confirmadas.joblib")
RUTA_DESC_CONFIRMADAS_JSON = os.path.join(BASE_DIR, "descripciones_confirmadas.json")
RUTA_BACKUP = os.path.join(BASE_DIR, "../backups")  


# Definir un lock global para el procesamiento de correos
procesamiento_lock = threading.Lock()


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
    headers = {"Authorization": f"Bearer {token}", "Accept": "application/json"}
    filtro = "isRead eq false and hasAttachments eq true"
    endpoint = f"https://graph.microsoft.com/v1.0/users/{USER_EMAIL}/mailFolders/Inbox/messages"
    params = {"$filter": filtro, "$expand": "attachments", "$top": "100"}
    
    response = requests.get(endpoint, headers=headers, params=params)
    if response.status_code != 200:
        logging.error(f"Error al obtener los correos: {response.status_code} - {response.text}")
        raise Exception(f"Error al obtener los correos: {response.status_code} - {response.text}")
    
    messages = response.json().get("value", [])
    productos = []
    logging.info(f"Encontrados {len(messages)} correos no leídos con adjuntos para procesar.")
    
    for message in messages:
        correo_id = message.get("id", "Sin ID")
        attachments = message.get("attachments", [])
        audio_info = None
        for att in attachments:
            nombre_archivo = att.get("name", "")
            if nombre_archivo.lower().endswith((".mp3", ".mp4")):
                logging.info(f"Procesando archivo de audio del correo {correo_id}: {nombre_archivo}")
                dato1, dato2 = extraer_datos_del_nombre(nombre_archivo)
                if "-" in dato1:
                    dato1 = dato1.replace("-", "/")
                attachment_id = att.get("id")
                adjunto_endpoint = (
                    f"https://graph.microsoft.com/v1.0/users/{USER_EMAIL}/messages/{correo_id}"
                    f"/attachments/{attachment_id}/$value"
                )
                adjunto_response = requests.get(adjunto_endpoint, headers=headers)
                if adjunto_response.status_code == 200:
                    audio_content = adjunto_response.content
                    audio_base64 = base64.b64encode(audio_content).decode("utf-8")
                    audio_info = {
                        "audio_base64": audio_base64,
                        "IDWorkOrder": dato1,
                        "IDEmployee": dato2,
                        "nombre_audio": nombre_archivo # Asegura que tenga la extensión correcta
                    }
                    logging.info(f"Audio procesado en memoria para {correo_id}: tamaño {len(audio_base64)} caracteres")
                else:
                    logging.error(f"Error al descargar audio {nombre_archivo} del correo {correo_id}")
                break  # Procesamos solo el primer audio encontrado
        
        # Procesar el cuerpo del correo
        cuerpo = message.get("body", {}).get("content", "")
        if message.get("body", {}).get("contentType", "").lower() == "html":
            soup = BeautifulSoup(cuerpo, "html.parser")
            cuerpo = soup.get_text()
        extracted_items = extract_body_message(cuerpo, correo_id)
        
        for item in extracted_items:
            producto_info = {
                "descripcion": item[0],
                "cantidad": item[1],
                "correo_id": item[2],
                "audio": audio_info if audio_info else {}
            }
            productos.append(producto_info)
        
        try:
            marcar_email_como_leido(correo_id)
        except Exception as e:
            logging.error(f"Error marcando como leído el correo {correo_id}: {e}")
    
    logging.info(f"Procesamiento completado, total de productos extraídos: {len(productos)}.")
    return productos




def extract_body_message(cuerpo, correo_id):
    try:
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



def descargar_audio_desde_correo():
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
                    nombre_archivo = dato1 + "_" + dato2 + ".mp4"
                    if dato1 and '-' in dato1:
                        dato1 = dato1.replace("-", "/")
                    
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
                    else:
                        logging.error(f"Error al obtener el audio {nombre_archivo}: {adjunto_response.status_code}")
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
    Normaliza el texto: elimina caracteres especiales y stop words, y finalmente reemplaza sinónimos.
    
    Args:
        texto (str): Texto original.
    
    Returns:
        str: Texto procesado.
    
    """
      # Reemplazar sinónimos después de procesar el texto
    texto = texto.lower()
    texto = str(texto)

    sinonimos = {
        "pegamento": "adhesivo",
        "cola": "adhesivo",
        "mililitros": "ml",
        "mililitro": "ml",
        "milímetros": "mm",
        "milímetro": "mm",
        "centímetros": "cm",
        "centímetro": "cm",
        "metros": "m",
        "pp": "polipropileno",
        "polipropileno": "pp",
        "polietileno": "pe",
        "galvanizado": "galvaniz",
        "por": "-",
        
        # Agregar más sinónimos según se requiera.
    }
    
    texto = unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode("utf-8")
    texto = re.sub(r"[^\w\s]", "", texto, flags=re.UNICODE)
    texto = re.sub(r"\b(\w+)(es|s)\b", r"\1", texto)
    # Eliminar stop words
    palabras = texto.split()
    palabras = [palabra for palabra in palabras if palabra not in STOP_WORDS]
    texto_procesado = " ".join(palabras)

  
    for palabra, reemplazo in sinonimos.items():
        texto_procesado = re.sub(rf"\b{palabra}\b", reemplazo, texto_procesado, flags=re.IGNORECASE)
    return texto_procesado



def guardar_descripciones_confirmadas(ruta_pkl: str, ruta_json: str):
    joblib.dump(descripciones_confirmadas, ruta_pkl)
    with open(ruta_json, "w", encoding="utf-8") as f:
        json.dump(descripciones_confirmadas, f, ensure_ascii=False, indent=4)

def cargar_descripciones_confirmadas(ruta):
    # Verificar si el archivo existe y no está vacío
    if os.path.exists(ruta) and os.path.getsize(ruta) > 0:
        try:
            # Intentar cargar el archivo existente
            return joblib.load(ruta)
        except Exception as e:
            # Si hay un error al cargar, informar y crear un archivo nuevo
            print(f"Error al cargar {ruta}: {e}. Creando un archivo nuevo.")
            descripciones_confirmadas = {}
            joblib.dump(descripciones_confirmadas, ruta)
            return descripciones_confirmadas
    else:
        # Si el archivo no existe o está vacío, crear uno nuevo
        print(f"El archivo {ruta} no existe o está vacío. Creando un archivo nuevo.")
        descripciones_confirmadas = {}
        joblib.dump(descripciones_confirmadas, ruta)
        return descripciones_confirmadas


def cargar_datos(ruta_csv: str):
    df_local = pd.read_csv(ruta_csv)
    df_local = df_local.dropna(subset=["CodArticle", "Description"])
    df_local["Description_Procesada"] = df_local["Description"].apply(procesar_texto)
    X = df_local["Description_Procesada"].tolist()
    y = df_local["CodArticle"].tolist()
    return X, y, df_local

def modelo_predecir(descripcion: str) -> dict:
    descripcion_procesada = procesar_texto(descripcion)
    logging.info(f"[modelo_predecir] Descripción original: '{descripcion}'")
    logging.info(f"[modelo_predecir] Descripción procesada: '{descripcion_procesada}'")
    matches = difflib.get_close_matches(descripcion_procesada, df["Description_Procesada"].tolist(), n=1, cutoff=0.5)
    logging.info(f"[modelo_predecir] Matches encontrados: {matches}")
    if matches:
        match = matches[0]
        row = df.loc[df["Description_Procesada"] == match].iloc[0]
        codigo_prediccion = row["CodArticle"]
        logging.info(f"[modelo_predecir] Coincidencia encontrada: '{match}', CodArticle: '{codigo_prediccion}'")
        return {"codigo_prediccion": codigo_prediccion}
    else:
        logging.warning(f"[modelo_predecir] No se encontró coincidencia para '{descripcion_procesada}'")
        return {"codigo_prediccion": None}


def modelo_predecir_fuzzy(descripcion: str) -> dict:
    descripcion_normalizada = procesar_texto(descripcion)
    logging.info(f"[modelo_predecir_fuzzy] Descripción original: '{descripcion}'")
    logging.info(f"[modelo_predecir_fuzzy] Descripción normalizada: '{descripcion_normalizada}'")
    lista_descripciones = df["Description_Procesada"].tolist()
    logging.info(f"[modelo_predecir_fuzzy] Total de descripciones en df: {len(lista_descripciones)}")
    matches = difflib.get_close_matches(descripcion_normalizada, lista_descripciones, n=1, cutoff=0.5)
    logging.info(f"[modelo_predecir_fuzzy] Matches encontrados: {matches}")
    if matches:
        match = matches[0]
        row = df.loc[df["Description_Procesada"] == match].iloc[0]
        codigo_prediccion = row["CodArticle"]
        descripcion_csv = row["Description"]
        logging.info(f"[modelo_predecir_fuzzy] Coincidencia encontrada: '{match}' con código '{codigo_prediccion}'")
        return {
            "codigo_prediccion": codigo_prediccion,
            "descripcion_producto": descripcion_csv,
            "match_method": "fuzzy"
        }
    else:
        logging.warning(f"[modelo_predecir_fuzzy] No se encontró coincidencia para '{descripcion}'")
        return {
            "codigo_prediccion": None,
            "mensaje": "No se encontró una coincidencia similar",
            "match_method": "fuzzy"
        }



def procesar_producto(producto: dict) -> dict:
    descripcion = producto["descripcion"]
    cantidad = producto["cantidad"]
    correo_id = producto["correo_id"]
    audio_info = producto["audio"]

    logging.info(f"[procesar_producto] Procesando producto del correo {correo_id}")
    logging.info(f"[procesar_producto] Descripción recibida: '{descripcion}'")
    
    descripcion_procesada = procesar_texto(descripcion)
    logging.info(f"[procesar_producto] Descripción procesada: '{descripcion_procesada}'")

    # Realizar la predicción basándose únicamente en el texto
    if descripcion_procesada in descripciones_confirmadas:
        codigo_prediccion = descripciones_confirmadas[descripcion_procesada]
        exactitud = 100
        logging.info(f"[procesar_producto] Predicción confirmada encontrada: {codigo_prediccion}")
    else:
        resultado_prediccion = modelo_predecir(descripcion)
        codigo_prediccion = resultado_prediccion.get("codigo_prediccion")
        if codigo_prediccion in df["CodArticle"].values:
            descripcion_csv_predicha = df.loc[df["CodArticle"] == codigo_prediccion, "Description_Procesada"].iloc[0]
            vectorizador_similitud = TfidfVectorizer()
            tfidf_matrix = vectorizador_similitud.fit_transform([descripcion_procesada, descripcion_csv_predicha])
            cosine_sim = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
            exactitud = int(min((cosine_sim + 0.19) * 100, 100))
            logging.info(f"[procesar_producto] Predicción calculada: {codigo_prediccion} con exactitud {exactitud}%")
        else:
            exactitud = 0
            logging.warning(f"[procesar_producto] Código predicho no se encontró en df: {codigo_prediccion}")

    # Lookup para obtener datos adicionales (descripción CSV, imagen, etc.)
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
                    logging.error(f"[procesar_producto] Error al convertir imagen a base64: {e}")
                    imagen = ""
            else:
                imagen = imagen_temp
        id_article_arr = df_lookup[df_lookup["CodArticle"] == codigo_prediccion]["IDArticle"].values
        id_article = id_article_arr[0] if len(id_article_arr) > 0 else None
    else:
        descripcion_csv = "Descripción no encontrada"
        imagen = ""
        id_article = None

    # Usar el nombre original del audio para FileName, pero formatearlo para tener la extensión correcta
    nombre_audio_original = audio_info.get("nombre_audio", "") if audio_info else ""
    
    # FileMP3 contendrá el audio en base64
    file_mp3 = audio_info.get("audio_base64", "") if audio_info else ""
    

    resultado = {
        "descripcion": descripcion.upper(),
        "codigo_prediccion": codigo_prediccion if codigo_prediccion is not None else "Sin predicción",
        "descripcion_csv": descripcion_csv,
        "cantidad": cantidad,
        "imagen": imagen,
        "exactitud": exactitud,
        "id_article": id_article,
        "correo_id": correo_id,
        "IDWorkOrder": audio_info.get("IDWorkOrder") if audio_info else "",
        "IDEmployee": audio_info.get("IDEmployee") if audio_info else "",
        "FileMP3": file_mp3,
        "FileName": nombre_audio_original  # Se conserva el nombre original, pero con la extensión corregida
    }
    return resultado


def actualizar_modelo(descripcion: str, seleccion: str):
    global  vectorizer, df, descripciones_confirmadas
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
    global  df_lookup, descripciones_confirmadas, df
    # Cargar los datos para generar predicciones desde CSV limpio:
    _, _, df = cargar_datos(RUTA_CSV_CLEAN)    
    if os.path.exists(RUTA_CSV):
        df_lookup = pd.read_csv(RUTA_CSV, usecols=["CodArticle", "Description", "IDArticle", "Image"])
        logging.info(f"df_lookup cargado con {len(df_lookup)} registros")
    else:
        df_lookup = pd.DataFrame()
    descripciones_confirmadas = cargar_descripciones_confirmadas(RUTA_DESC_CONFIRMADAS_PKL)
    logging.info(f"descripciones_confirmadas: {descripciones_confirmadas}")


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
    
    try:
        data = request.get_json()
        print(f"Datos recibidos: {data}")
        seleccion = data.get("seleccion")
        descripcion = data.get("descripcion")
        actualizar_modelo(descripcion, seleccion)
        # Se asume que las predicciones se actualizarán en segundo plano.
        predicciones_actualizadas = obtener_predicciones()
        return predicciones_actualizadas
    except Exception as e:
        return jsonify({"error": str(e)}), 500


audio_info_global = {}


@app.route("/api/getAudio", methods=["GET"])
def get_audio():
    global audio_info_global
    info_list = descargar_audio_desde_correo()
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


def procesar_producto(producto: dict) -> dict:
    descripcion = producto["descripcion"]
    cantidad = producto["cantidad"]
    correo_id = producto["correo_id"]
    audio_info = producto["audio"]

    logging.info(f"[procesar_producto] Procesando producto del correo {correo_id}")
    logging.info(f"[procesar_producto] Descripción recibida: '{descripcion}'")
    
    descripcion_procesada = procesar_texto(descripcion)
    logging.info(f"[procesar_producto] Descripción procesada: '{descripcion_procesada}'")

    # Se determina si ya existe una predicción confirmada
    if descripcion_procesada in descripciones_confirmadas:
        codigo_prediccion = descripciones_confirmadas[descripcion_procesada]
        exactitud = 100
        logging.info(f"[procesar_producto] Predicción confirmada encontrada: {codigo_prediccion}")
    else:
        resultado_prediccion = modelo_predecir(descripcion)
        codigo_prediccion = resultado_prediccion.get("codigo_prediccion")
        if codigo_prediccion in df["CodArticle"].values:
            descripcion_csv_predicha = df.loc[df["CodArticle"] == codigo_prediccion, "Description_Procesada"].iloc[0]
            vectorizador_similitud = TfidfVectorizer()
            tfidf_matrix = vectorizador_similitud.fit_transform([descripcion_procesada, descripcion_csv_predicha])
            cosine_sim = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
            exactitud = int(min((cosine_sim + 0.15) * 100, 100))
            logging.info(f"[procesar_producto] Predicción calculada: {codigo_prediccion} con exactitud {exactitud}%")
        else:
            exactitud = 0
            logging.warning(f"[procesar_producto] Código predicho no se encontró en df: {codigo_prediccion}")
    if not df_lookup.empty:
        registros = df_lookup[df_lookup["CodArticle"] == codigo_prediccion]
        descripcion_csv = registros["Description"].iloc[0] if not registros.empty else "Descripción no encontrada"
        imagen = ""
        if not registros.empty and "Image" in registros:
            imagen_temp = registros["Image"].iloc[0]
            if pd.isna(imagen_temp):
                imagen = ""
            elif isinstance(imagen_temp, str) and (imagen_temp.startswith("b") or imagen_temp.startswith('b"')):
                try:
                    imagen_bytes = ast.literal_eval(imagen_temp)
                    imagen_base64 = base64.b64encode(imagen_bytes).decode("utf-8")
                    imagen = imagen_base64
                except Exception as e:
                    logging.error(f"[procesar_producto] Error al convertir imagen a base64: {e}")
                    imagen = ""
            else:
                imagen = imagen_temp
        id_article_arr = df_lookup[df_lookup["CodArticle"] == codigo_prediccion]["IDArticle"].values
        id_article = id_article_arr[0] if len(id_article_arr) > 0 else None
    else:
        descripcion_csv = "Descripción no encontrada"
        imagen = ""
        id_article = None

    formato_audio = "mp4"
    file_name = f"{audio_info.get('IDWorkOrder')}_{audio_info.get('IDEmployee')}.{formato_audio}"
    if "/" in file_name:
        file_name = file_name.replace("/", "-")
    
    resultado = {
        "descripcion": descripcion.upper(),
        "codigo_prediccion": codigo_prediccion if codigo_prediccion is not None else "Sin predicción",
        "descripcion_csv": descripcion_csv,
        "cantidad": cantidad,
        "imagen": imagen,
        "exactitud": exactitud,
        "id_article": id_article,
        "correo_id": correo_id,
        "IDWorkOrder": audio_info.get("IDWorkOrder"),
        "IDEmployee": audio_info.get("IDEmployee"),
        "audio_base64": audio_info.get("audio_base64", ""),
        "file_name": file_name
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
            nuevas_predicciones = [procesar_producto(producto) for producto in productos]
            with predicciones_lock:
                predicciones_recientes.clear()
                predicciones_recientes.extend(nuevas_predicciones)
                historial_predicciones.extend(nuevas_predicciones)
        except Exception as e:
            logging.error("Error actualizando predicciones: %s", e)
        time.sleep(60)

def marcar_correo_leido():
    data = request.get_json()
    email_id = data.get("correo_id")
    if not email_id:
        return jsonify({"error": "ID del correo no proporcionado"}), 400
    try:
        marcar_email_como_leido(email_id)
        
        return jsonify({"message": "Correo marcado como leído y datos limpiados"}), 200
    except Exception as e:
        return jsonify({"error": f"No se pudo marcar el correo como leído: {e}"}), 500

@app.route("/api/predicciones", methods=["GET"])
def obtener_predicciones():
    global predicciones_recientes
    with predicciones_lock:
        predicciones = predicciones_recientes.copy()
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