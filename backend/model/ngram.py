import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer

# Cargar el CSV (asegúrate de que la ruta al archivo es correcta)
df = pd.read_csv("consulta_resultado.csv")

# Extraer la columna de descripciones
descriptions = df["Description"].astype(str)

# Configurar el vectorizador para capturar unigrama y bigramas
vectorizer = TfidfVectorizer(ngram_range=(1, 2))

# Ajustar el vectorizador al corpus y transformar las descripciones en una matriz TF-IDF
X = vectorizer.fit_transform(descriptions)

# Mostrar los términos extraídos (n-gramas)
print("Términos extraídos:")
print(vectorizer.get_feature_names_out())

# Mostrar la forma de la matriz TF-IDF resultante
print("\nForma de la matriz TF-IDF:", X.shape)
