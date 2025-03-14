# import pandas as pd
# import re

# def clean_dataset(input_path: str, output_path: str):
#     df = pd.read_parquet(input_path)
#     STOP_WORDS = [
#         "a", "acá", "ahí", "ajena", "ajenas", "ajeno", "ajenos", "al", "algo", "algún",
#         "alguna", "algunas", "alguno", "algunos", "allá", "alli", "allí", "ambos", "ampleamos",
#         "ante", "antes", "aquel", "aquella", "aquellas", "aquello", "aquellos", "aqui", "aquí",
#         "arriba", "asi", "atras", "aun", "aunque", "bajo", "bastante", "bien", "cabe", "cada",
#         "casi", "cierta", "ciertas", "cierto", "ciertos", "como", "cómo", "con", "conmigo",
#         "conseguimos", "conseguir", "consigo", "consigue", "consiguen", "consigues", "contigo",
#         "contra", "cual", "cuales", "cualquier", "cualquiera", "cualquieras", "cuan", "cuando",
#         "cuanta", "cuantas", "cuanto", "cuantos", "de", "dejar", "del", "demas", "demasiada",
#         "demasiadas", "demasiado", "demasiados", "dentro", "desde", "donde", "dos", "el", "él",
#         "ella", "ellas", "ello", "ellos", "empleais", "emplean", "emplear", "empleas", "empleo",
#         "en", "encima", "entonces", "entre", "era", "eramos", "eran", "eras", "eres", "es",
#         "esa", "esas", "ese", "eso", "esos", "esta", "estaba", "estado", "estais", "estamos",
#         "estan", "estoy", "fin", "fue", "fueron", "fui", "fuimos", "gueno", "ha", "hace",
#         "haceis", "hacemos", "hacen", "hacer", "haces", "hago", "incluso", "intenta", "intentais",
#         "intentamos", "intentan", "intentar", "intentas", "intento", "ir", "jamás", "junto",
#         "juntos", "la", "largo", "las", "lo", "los", "mientras", "mio", "misma", "mismas",
#         "mismo", "mismos", "modo", "mucha", "muchas", "muchísima", "muchísimas", "muchísimo",
#         "muchísimos", "mucho", "muchos", "muy", "nada", "ni", "ninguna", "ningunas", "ninguno",
#         "ningunos", "no", "nos", "nosotras", "nosotros", "nuestra", "nuestras", "nuestro",
#         "nuestros", "nunca", "os", "otra", "otras", "otro", "otros", "para", "parecer", "pero",
#         "poca", "pocas", "poco", "pocos", "podeis", "podemos", "poder", "podria", "podriais",
#         "podriamos", "podrian", "podrias", "por", "por qué", "porque", "primero", "puede",
#         "pueden", "puedo", "pues", "que", "qué", "querer", "quien", "quién", "quienes", "quienesquiera",
#         "quienquiera", "quiza", "quizas", "sabe", "sabeis", "sabemos", "saben", "saber", "sabes",
#         "se", "segun", "ser", "si", "sí", "siempre", "siendo", "sin", "sino", "so", "sobre",
#         "sois", "solamente", "solo", "somos", "soy", "su", "sus", "suya", "suyas", "suyo",
#         "suyos", "tal", "tales", "también", "tampoco", "tan", "tanta", "tantas", "tanto",
#         "tantos", "te", "teneis", "tenemos", "tener", "tengo", "ti", "tiempo", "tiene", "tienen",
#         "toda", "todas", "todo", "todos", "tomar", "trabaja", "trabajais", "trabajamos", "trabajan",
#         "trabajar", "trabajas", "trabajo", "tras", "tú", "último", "un", "una", "unas", "uno",
#         "unos", "usa", "usais", "usamos", "usan", "usar", "usas", "uso", "usted", "ustedes",
#         "va", "vais", "valor", "vamos", "van", "varias", "varios", "vaya", "verdad", "verdadera",
#         "vosotras", "vosotros", "voy", "vuestra", "vuestras", "vuestro", "vuestros", "y", "ya",
#         "yo"
#     ]
    
#     # Convertir a minúsculas
#     df['Description'] = df['Description'].str.lower()
    
#     # Aplicar limpieza
#     df['Description'] = df['Description'].apply(
#         lambda x: re.sub(r'[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ\s-]', '', x)
#     )
    
#     # Eliminar stopwords
#     df['Description'] = df['Description'].apply(
#         lambda x: ' '.join([word for word in x.split() if word not in STOP_WORDS])
#     )
    
#     # Reemplazar "PE" con "polietileno"
#     df['Description'] = df['Description'].str.replace(r'\bpe\b', 'polietileno', regex=True)
    
#     # Reemplazar "polie" con "polietileno"
#     df['Description'] = df['Description'].str.replace(r'\bpolie\b', 'polietileno', regex=True)
    
#     # Normalización de medidas
#     df['Description'] = df['Description'].str.replace(
#         r'\b(\d+)\s*mm\b', r'\1mm', regex=True
#     )
    
#     # Eliminar "mts" delante de una palabra
#     df['Description'] = df['Description'].str.replace(
#         r'\bmts\s*(\w+)', r'\1', regex=True
#     )
    
#     # Eliminar espacios extras
#     df['Description'] = df['Description'].str.strip()
#     df['Description'] = df['Description'].str.replace(r'\s+', ' ', regex=True)
    
#     # Guardar datos limpios
#     df.to_parquet(output_path, index=False)
#     df.to_csv(output_path.replace('.parquet', '.csv'), index=False)

# # Ejecutar limpieza
# clean_dataset("backend/model/consulta_resultado.parquet", 
#              "backend/model/consulta_resultado_clean.parquet")

import pandas as pd
import re

def clean_dataset(input_path: str, output_path: str):
    # Cargar el CSV de entrada
    df = pd.read_csv(input_path)
    # Guardar la descripción original proveniente de la base de datos
    df["Original"] = df["Description"].copy()
    
    # Aplicar limpieza sobre la columna Description
    df['Description'] = df['Description'].str.lower()
    df['Description'] = df['Description'].apply(
    lambda x: re.sub(r'[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ\s-]', '', x) if isinstance(x, str) else x
)
    df['Description'] = df['Description'].apply(
    lambda x: ' '.join([word for word in x.split() if word not in [
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
    ]] ) if isinstance(x, str) else x
)
    df['Description'] = df['Description'].str.replace(r'\bpe\b', 'polietileno', regex=True)
    df['Description'] = df['Description'].str.replace(r'\bpolie\b', 'polietileno', regex=True)
    df['Description'] = df['Description'].str.replace(r'\b(\d+)\s*mm\b', r'\1mm', regex=True)
    df['Description'] = df['Description'].str.replace(r'\bmts\s*(\w+)', r'\1', regex=True)
    df['Description'] = df['Description'].str.strip()
    df['Description'] = df['Description'].str.replace(r'\s+', ' ', regex=True)
    
    # Crear lista para almacenar las variaciones
    variaciones = []
    
    for _, row in df.iterrows():
        cod = row["CodArticle"]
        id_art = row["IDArticle"]
        original = row["Original"]
        desc = row["Description"]
        # Si desc no es string, lo convierte a cadena
        if not isinstance(desc, str):
            desc = str(desc)
        
        # Variación 0: Texto original sin limpieza (de la BBDD)
        variaciones.append([cod, original, id_art])
        
        # Variación original limpia
        if desc != original:
            variaciones.append([cod, desc, id_art])
        
        # Variación 1: Reemplazar "polietileno" con "pe"
        variacion1 = desc.replace("polietileno", "pe")
        if variacion1 != desc:
            variaciones.append([cod, variacion1, id_art])
        
        # Variación 2: Simplificar dimensiones (eliminar guiones y unir números)
        variacion2 = re.sub(r'(\d+)-(\d+)', r'\1\2', desc)
        if variacion2 != desc:
            variaciones.append([cod, variacion2, id_art])
        
        # Variación 3: Invertir el orden de las palabras principales
        palabras = desc.split()
        if len(palabras) > 1:
            variacion3 = f"{palabras[-1]} {' '.join(palabras[:-1])}"
            variaciones.append([cod, variacion3, id_art])
        
        # Variación 4: Reducir a la mínima expresión (solo palabras clave)
        palabras_clave = [palabra for palabra in palabras if re.match(r'\d+|\w{3,}', palabra)]
        variacion4 = ' '.join(palabras_clave[:2])
        if variacion4 != desc and len(palabras_clave) >= 2:
            variaciones.append([cod, variacion4, id_art])
        
        # Crear DataFrame con todas las variaciones y guardarlo en CSV
        df_variaciones = pd.DataFrame(variaciones, columns=["CodArticle", "Description", "IDArticle"])
        df_variaciones.to_csv(output_path, index=False)
        print(f"Datos limpios y variaciones guardados en {output_path}")

# Ejecutar limpieza
clean_dataset("backend/model/consulta_resultado_clean.csv", 
             "backend/model/consulta_resultado_clean.csv")