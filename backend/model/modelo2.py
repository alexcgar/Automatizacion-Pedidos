import os
import re
import time
import json
import logging
import pyarrow.parquet as pq
import pandas as pd
import numpy as np
import faiss
import torch
from sentence_transformers import SentenceTransformer
from datetime import datetime
from typing import List, Dict

# Configuración inicial
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class SemanticSearchEngine:
    def __init__(self, model_name: str = 'sentence-transformers/paraphrase-multilingual-mpnet-base-v2'):
        self.device = 'cuda' if torch.cuda.is_available() else 'cpu'
        self.model = SentenceTransformer(model_name, device=self.device)
        self.quantizer = faiss.IndexFlatIP(768)  # Nueva dimensión del modelo
        self.index = faiss.IndexIVFFlat(self.quantizer, 768, 1024)  # Más clusters para mejor pre
        self.index.nprobe = 20  # Mayor número de clusters a investigar
        self.metadata = []
        self.embedding_cache = {}
        self.cache_file = 'embeddings_cache.parquet'
        self._load_embedding_cache()

    def build_index(self, data: pd.DataFrame):
        """Construye el índice FAISS con los embeddings preprocesados"""

        # Verificar que hay datos antes de continuar
        if data.empty:
            logger.error("❌ No hay datos para construir el índice.")
            return

        embeddings = []
        
        for desc in data['Description_Procesada']:
            if desc in self.embedding_cache:
                embeddings.append(self.embedding_cache[desc])
            else:
                embed = self.model.encode(
                    desc, convert_to_tensor=True).cpu().numpy()
                self.embedding_cache[desc] = embed
                embeddings.append(embed)

        embeddings = np.array(embeddings).astype('float32')

        # Verificar que hay embeddings antes de entrenar
        if len(embeddings) == 0:
            logger.error(
                "❌ No se generaron embeddings, no se puede construir el índice FAISS.")
            return

        faiss.normalize_L2(embeddings)

        # Entrenar FAISS con una muestra aleatoria de los embeddings
        # Evitar errores si hay menos de 10,000
        num_samples = min(len(embeddings), 10000)
        sample_embeddings = embeddings[np.random.choice(
            len(embeddings), num_samples, replace=False)]

        self.index.train(sample_embeddings)  # Entrenar FAISS con la muestra

        # Agregar los embeddings al índice FAISS
        self.index.add(embeddings)

        # Almacenar metadatos
        self.metadata = data[['CodArticle', 'Description']].to_dict('records')

        logger.info(f"✅ Índice FAISS construido con {len(data)} elementos")

    def save_index(self, index_path: str, metadata_path: str):
        """Guarda el índice y metadatos en disco"""
        faiss.write_index(self.index, index_path)
        with open(metadata_path, 'w') as f:
            json.dump(self.metadata, f)

    def load_index(self, index_path: str, metadata_path: str):
        """Carga el índice desde disco"""
        self.index = faiss.read_index(index_path)
        with open(metadata_path, 'r') as f:
            self.metadata = json.load(f)

    def _load_embedding_cache(self):
        """Carga el caché de embeddings desde disco si existe"""
        if os.path.exists(self.cache_file):
            try:
                df_cache = pd.read_parquet(self.cache_file)
                self.embedding_cache = {
                    row['description']: row['embedding'] for _, row in df_cache.iterrows()}
                logging.info( 
                    f"🔄 Caché de embeddings cargado con {len(self.embedding_cache)} elementos")
            except Exception as e:
                logging.error(
                    f"⚠️ Error al cargar el caché de embeddings: {e}")
                self.embedding_cache = {}  # En caso de error, inicializa como vacío

    def _save_embedding_cache(self):
        """Guarda el caché de embeddings en disco"""
        df_cache = pd.DataFrame([
            {"description": desc, "embedding": emb.tolist()} for desc, emb in self.embedding_cache.items()
        ])
        df_cache.to_parquet(self.cache_file, index=False)
        logger.info(f"💾 Caché de embeddings guardado con {len(self.embedding_cache)} elementos.")


    def search(self, query: str, top_k: int = 3) -> List[Dict]:
        """Búsqueda con filtrado por similitud"""
        query_embedding = self.model.encode(query, convert_to_tensor=True).cpu().numpy()
        faiss.normalize_L2(query_embedding)

        distances, indices = self.index.search(query_embedding, top_k)

        results = []
        for i, idx in enumerate(indices[0]):
            score = 1 - distances[0][i]  # Convert distance to similarity score
            if score >= 0.65:  # Ajustar según necesidades
                results.append({
                    'position': i,
                    'score': score,
                    'CodArticle': self.metadata[idx]['CodArticle'],
                    'Description': self.metadata[idx]['Description']
                })

        # Ordenar por score y posición
        results = sorted(results, key=lambda x: (-x['score'], x['position']))

        # Log the number of results found
        logger.info(f"Found {len(results)} results for query: {query}")

        # Ensure we return at most top_k results
        return results[:top_k]



    @staticmethod
    def _preprocess_text(text: str) -> str:
        text = text.lower().strip()
        
        # Normalización de unidades y medidas
        replacements = {
            r'\b(\d+)mm\b': r'\1 mm',
            r'\b(\d+)cm\b': r'\1 cm',
            r'\b(\d+)lts?\b': r'\1 litros',
            r'\b(\d+)m\b': r'\1 metros',
            r'\bde\b': ' ',
            r'\bpara\b': ' ',
            r'\bdel\b': ' ',
            r'[^\w\s.-]': '',  # Eliminar caracteres especiales
            r'\bcon\b': ' ',
            r'\ben\b': ' ',
        }
        
        for pattern, replacement in replacements.items():
            text = re.sub(pattern, replacement, text)
        
        # Eliminar caracteres especiales y espacios múltiples
        text = re.sub(r'[^\w\s.-]', '', text)
        text = re.sub(r'\s+', ' ', text)

        # Eliminar stopwords en español
        stopwords = set([
            'a', 'al', 'algo', 'algunas', 'algunos', 'ante', 'antes', 'como', 'con', 'contra', 'cual', 'cuando', 'de', 
            'del', 'desde', 'donde', 'durante', 'e', 'el', 'ella', 'ellas', 'ellos', 'en', 'entre', 'era', 'erais', 
            'eran', 'eras', 'eres', 'es', 'esa', 'esas', 'ese', 'eso', 'esos', 'esta', 'estaba', 'estabais', 'estaban', 
            'estabas', 'estad', 'estada', 'estadas', 'estado', 'estados', 'estamos', 'estando', 'estar', 'estaremos', 
            'estará', 'estarán', 'estarás', 'estaré', 'estaréis', 'estaría', 'estaríais', 'estaríamos', 'estarían', 
            'estarías', 'estas', 'este', 'estemos', 'esto', 'estos', 'estoy', 'estuve', 'estuviera', 'estuvierais', 
            'estuvieran', 'estuvieras', 'estuvieron', 'estuviese', 'estuvieseis', 'estuviesen', 'estuvieses', 'estuvimos', 
            'estuviste', 'estuvisteis', 'estuviéramos', 'estuviésemos', 'está', 'estábamos', 'estáis', 'están', 'estás', 
            'esté', 'estéis', 'estén', 'estés', 'fue', 'fuera', 'fuerais', 'fueran', 'fueras', 'fueron', 'fuese', 
            'fueseis', 'fuesen', 'fueses', 'fui', 'fuimos', 'fuiste', 'fuisteis', 'fueramos', 'ha', 'habida', 'habidas', 
            'habido', 'habidos', 'habiendo', 'habremos', 'habrá', 'habrán', 'habrás', 'habré', 'habréis', 'habría', 
            'habríais', 'habríamos', 'habrían', 'habrías', 'habéis', 'había', 'habíais', 'habíamos', 'habían', 'habías', 
            'han', 'has', 'hasta', 'hay', 'haya', 'hayamos', 'hayan', 'hayas', 'he', 'hemos', 'hube', 'hubiera', 
            'hubierais', 'hubieran', 'hubieras', 'hubieron', 'hubiese', 'hubieseis', 'hubiesen', 'hubieses', 'hubimos', 
            'hubiste', 'hubisteis', 'hubiéramos', 'hubiésemos', 'hubo', 'la', 'las', 'le', 'les', 'lo', 'los', 'me', 
            'mi', 'mis', 'mucho', 'muchos', 'muy', 'más', 'mí', 'mía', 'mías', 'mío', 'míos', 'nada', 'ni', 'no', 'nos', 
            'nosotras', 'nosotros', 'nuestra', 'nuestras', 'nuestro', 'nuestros', 'o', 'os', 'otra', 'otras', 'otro', 
            'otros', 'para', 'pero', 'poco', 'por', 'porque', 'que', 'quien', 'quienes', 'qué', 'se', 'sea', 'seamos', 
            'sean', 'seas', 'seremos', 'será', 'serán', 'serás', 'seré', 'seréis', 'sería', 'seríais', 'seríamos', 
            'serían', 'serías', 'seáis', 'sido', 'siendo', 'sin', 'sobre', 'sois', 'somos', 'son', 'soy', 'su', 'sus', 
            'suya', 'suyas', 'suyo', 'suyos', 'sí', 'también', 'tanto', 'te', 'tened', 'tenemos', 'tenga', 'tengamos', 
            'tengan', 'tengas', 'tengo', 'tenida', 'tenidas', 'tenido', 'tenidos', 'teniendo', 'tenéis', 'tenía', 
            'teníais', 'teníamos', 'tenían', 'tenías', 'ti', 'tiene', 'tienen', 'tienes', 'todo', 'todos', 'tu', 'tus', 
            'tuve', 'tuviera', 'tuvierais', 'tuvieran', 'tuvieras', 'tuvieron', 'tuviese', 'tuvieseis', 'tuviesen', 
            'tuvieses', 'tuvimos', 'tuviste', 'tuvisteis', 'tuviéramos', 'tuviésemos', 'tuvo', 'tuya', 'tuyas', 'tuyo', 
            'tuyos', 'un', 'una', 'uno', 'unos', 'vosotras', 'vosotros', 'vuestra', 'vuestras', 'vuestro', 'vuestros', 
            'y', 'ya', 'yo'
        ])
        
        text = ' '.join([word for word in text.split() if word not in stopwords])
        
        return text


class PredictionService:
    def __init__(self):
        self.data = None
        self.search_engine = SemanticSearchEngine()
        self.logger = PerformanceLogger()
        self.updater = ModelUpdater()

    def initialize(self, parquet_path: str):
        """Carga con datos precalculados si existen"""
        index_path = 'faiss_index.idx'
        metadata_path = 'metadata.json'
        
        new_data = self._load_data(parquet_path)

        if os.path.exists(index_path) and os.path.exists(metadata_path):
            self.search_engine.load_index(index_path, metadata_path)
            self.search_engine._load_embedding_cache()
            
             # Verificación mejorada de cambios
            current_hash = self._data_hash(new_data)
            stored_hash = self._read_config_hash()
            
            if current_hash != stored_hash:
                logger.info("🔄 Cambios detectados en los datos. Reconstruyendo índice...")
                self.search_engine.build_index(new_data)
                self.search_engine.save_index(index_path, metadata_path)
                self.search_engine._save_embedding_cache()
                self._save_config_hash(current_hash)
         
            # Verificar cambios sustanciales en los datos
            existing_records = set(
                (item['CodArticle'], item['Description']) 
                for item in self.search_engine.metadata
            )
            new_records = set(
                (row['CodArticle'], row['Description']) 
                for _, row in new_data.iterrows()
            )
            
            added_records = new_records - existing_records
            removed_records = existing_records - new_records
            
            if len(added_records) > 100 or len(removed_records) > 50:
                logger.info("🔄 Cambios significativos detectados. Reconstruyendo índice completo...")
                self.search_engine.build_index(new_data)
                self.search_engine.save_index(index_path, metadata_path)
                self.search_engine._save_embedding_cache()
                
        else:
            logger.info("Construyendo nuevo índice...")
            self.search_engine.build_index(new_data)
            self.search_engine.save_index(index_path, metadata_path)
            self.search_engine._save_embedding_cache()
    def _data_hash(self, df: pd.DataFrame) -> str:
        """Genera hash único de los datos para detectar cambios"""
        return pd.util.hash_pandas_object(df).sum().tobytes().hex()

    def _save_config_hash(self, hash_str: str):
        """Guarda el hash de configuración"""
        with open('data_config.hash', 'w') as f:
            f.write(hash_str)

    def _read_config_hash(self) -> str:
        """Lee el hash de configuración"""
        try:
            with open('data_config.hash', 'r') as f:
                return f.read()
        except FileNotFoundError:
            return ""
        
        
    @staticmethod
    def _extract_keywords(desc: str) -> str:
        """Extrae características clave de la descripción"""
        keywords = []
        measures = re.findall(r'\b(\d+)\s*(mm|cm|m|litros?)\b', desc)
        materials = re.findall(r'\b(pvc|acero|inoxidable|hierro|plastico)\b', desc)
        types = re.findall(r'\b(tuberia|abrazadera|valvula|bomba|conector)\b', desc)
        
        if measures:
            keywords.extend([f"{m[0]}{m[1]}" for m in measures])
        if materials:
            keywords.extend(materials)
        if types:
            keywords.extend(types)
            
        return ' '.join(keywords)

    def predict(self, text: str) -> Dict:
        """Realiza una predicción"""
        start_time = time.time()

        try:
            results = self.search_engine.search(text)
            best_match = results[0] if results else {}

            self.logger.log_operation('predict', time.time() - start_time)
            return {
                'success': True,
                'result': best_match,
                'alternatives': results[1:3]
            }
        except Exception as e:
            self.logger.log_error('predict', str(e))
            return {
                'success': False,
                'error': str(e)
            }


    def _load_data(self, parquet_path: str) -> pd.DataFrame:
        logger.info(f"Cargando y validando datos desde {parquet_path}...")
        
        try:
            df = pq.read_table(parquet_path).to_pandas()
            
            # Validación estricta
            required_columns = ['CodArticle', 'Description']
            if not all(col in df.columns for col in required_columns):
                raise ValueError("Formato Parquet inválido: Columnas requeridas faltantes")
                
            # Limpieza de datos
            df = df.dropna(subset=required_columns)
            df = df.drop_duplicates(subset=['CodArticle'], keep='last')
            
            # Normalización de descripciones
            df['Description'] = df['Description'].apply(
                lambda x: re.sub(r'\s+', ' ', x).strip()
            )
            
            # Filtrado de descripciones no válidas
            df = df[df['Description'].str.len() >= 10]
            
            # Preprocesamiento técnico
            df['Description_Procesada'] = df['Description'].apply(
                lambda x: self._enhanced_processing(x)
            )
            
            logger.info(f"✅ Datos cargados: {len(df)} registros válidos")
            return df
            
        except Exception as e:
            logger.error(f"🚨 Error crítico en carga de datos: {str(e)}")
            raise
    
    def _enhanced_processing(self, desc: str) -> str:
        """Procesamiento avanzado de descripciones"""
        # Paso 1: Normalización básica
        desc = desc.lower().strip()
        
        # Paso 2: Eliminación de códigos y referencias innecesarias
        desc = re.sub(r'\b(?:ref|cod|art|modelo?)\s*[.:-]?\s*\w+\b', '', desc)
        
        # Paso 3: Extracción de características técnicas
        technical_features = self._extract_technical_features(desc)
        
        # Paso 4: Limpieza final
        desc = re.sub(r'[^\w\sxáéíóúñ]', '', desc)  # Permitir 'x' para medidas
        desc = re.sub(r'\s+', ' ', desc).strip()
        
        return f"{desc} {technical_features}"
    
    def _extract_technical_features(self, desc: str) -> str:
        """Extracción mejorada de características técnicas"""
        features = []
        
        # Materiales
        materials = re.findall(r'\b(pvc|polietileno|acero|inoxidable|latón|hierro)\b', desc)
        if materials:
            features.append(' '.join(materials))
            
        # Medidas
        measures = re.findall(r'\b(\d+mm|\d+cm|\d+x\d+|\d+-\d+|\d+\.\d+m)\b', desc)
        if measures:
            features.append(' '.join(measures))
            
        # Tipo de producto
        product_types = re.findall(r'\b(brida|válvula|tubería|conector|abrazadera|accesorio)\b', desc)
        if product_types:
            features.append(' '.join(product_types))
            
        # Aplicación
        applications = re.findall(r'\b(riego|agua|gas|presión|drenaje)\b', desc)
        if applications:
            features.append(' '.join(applications))
            
        return ' '.join(features)

    @staticmethod
    def _clean_description(desc: str) -> str:
        """Limpieza de descripciones"""
        return desc.lower().strip()

class PerformanceLogger:
    """Registro de rendimiento del sistema"""
    def __init__(self):
        self.log_file = 'service_performance.log'
        
    def log_operation(self, operation: str, duration: float):
        entry = {
            'timestamp': datetime.now().isoformat(),
            'operation': operation,
            'duration': round(duration, 4)
        }
        with open(self.log_file, 'a') as f:
            f.write(json.dumps(entry) + '\n')

    def log_error(self, operation: str, error: str):
        entry = {
            'timestamp': datetime.now().isoformat(),
            'operation': operation,
            'error': error
        }
        with open(self.log_file, 'a')  as f:
            f.write(json.dumps(entry) + '\n')

class ModelUpdater:
    def retrain(self, search_engine: SemanticSearchEngine):
        """Reentrenamiento con fine-tuning"""
        # Generar dataset de entrenamiento
        train_data = pd.DataFrame({
            'text': [item['Description_Procesada'] for item in search_engine.metadata],
            'label': [item['CodArticle'] for item in search_engine.metadata]
        })
        
        # Configurar entrenamiento
        training_args = {
            'epochs': 3,
            'warmup_steps': 100,
            'batch_size': 16,
            'learning_rate': 2e-5
        }
        
        # Fine-tuning del modelo
        self._fine_tune_model(search_engine.model, train_data, training_args)
        
        # Reconstruir índice completo
        search_engine.build_index(pd.DataFrame(search_engine.metadata))

# Uso del sistema -------------------------------------------------------------
if __name__ == "__main__":
    # Configuración
    PARQUET_PATH = "backend/model/consulta_resultado.parquet"
    
    # Inicializar servicio
    service = PredictionService()
    service.initialize(PARQUET_PATH)
    
    # Ejemplo de predicción
    result = service.predict("brida riego galvan")
    print("Mejor coincidencia:", json.dumps(result, indent=2))
    
