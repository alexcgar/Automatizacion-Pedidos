import pandas as pd
import re

def clean_dataset(input_path: str, output_path: str):
    df = pd.read_parquet(input_path)
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
    
    # Convertir a minúsculas
    df['Description'] = df['Description'].str.lower()
    
    # Aplicar limpieza
    df['Description'] = df['Description'].apply(
        lambda x: re.sub(r'[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ\s-]', '', x)
    )
    
    # Eliminar stopwords
    df['Description'] = df['Description'].apply(
        lambda x: ' '.join([word for word in x.split() if word not in STOP_WORDS])
    )
    
    # Reemplazar "PE" con "polietileno"
    df['Description'] = df['Description'].str.replace(r'\bpe\b', 'polietileno', regex=True)
    
    # Reemplazar "polie" con "polietileno"
    df['Description'] = df['Description'].str.replace(r'\bpolie\b', 'polietileno', regex=True)
    
    # Normalización de medidas
    df['Description'] = df['Description'].str.replace(
        r'\b(\d+)\s*mm\b', r'\1mm', regex=True
    )
    
    # Eliminar "mts" delante de una palabra
    df['Description'] = df['Description'].str.replace(
        r'\bmts\s*(\w+)', r'\1', regex=True
    )
    
    # Eliminar espacios extras
    df['Description'] = df['Description'].str.strip()
    df['Description'] = df['Description'].str.replace(r'\s+', ' ', regex=True)
    
    # Guardar datos limpios
    df.to_parquet(output_path, index=False)
    df.to_csv(output_path.replace('.parquet', '.csv'), index=False)

# Ejecutar limpieza
clean_dataset("backend/model/consulta_resultado.parquet", 
             "backend/model/consulta_resultado_clean.parquet")