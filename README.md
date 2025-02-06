_# Project: Automated Prediction System

## Overview
This project is a Flask-based backend application designed to automatically fetch, process, and provide product predictions. The system is particularly useful for scenarios involving large datasets. The frontend is fully developed using React.

## Features
- **Automated Prediction Fetching**: Fetches and processes predictions periodically (every 3 minutes).
- **Machine Learning Integration**: Utilizes a trained model to predict product codes based on descriptions.
- **Data Storage**: Caches predictions in memory for quick retrieval.
- **API Endpoints**:
  - `/api/predicciones` - Retrieves the latest predictions.
  - `/api/send-seleccion` - Accepts and processes user selections.
  - `/api/buscar` - Searches products in the CSV database.
  - `/api/getAudio` - Downloads audio files related to predictions.
- **Text Normalization**: Pre-processes input text for consistent predictions.
- **Thread-Safe Operations**: Ensures cache updates and retrievals are safe in multi-threaded environments.

## How It Works
1. **Data Loading**: Initializes a machine learning model and vectorizer from stored files.
2. **Periodic Updates**: A background thread fetches product data and updates the cache every 3 minutes.
3. **Prediction Logic**: Uses the TF-IDF vectorizer and a trained SGDClassifier to predict product codes based on processed text descriptions.
4. **API Services**: Provides endpoints for predictions, user selections, and data searching.
5. **Text and Image Processing**: Normalizes descriptions and processes image data for base64 encoding.

## Technologies Used
- **Python**
  - Flask
  - Pandas
  - Scikit-learn
  - TheFuzz (for fuzzy matching)
- **Machine Learning**
  - TF-IDF Vectorization
  - Stochastic Gradient Descent Classifier
- **Utilities**
  - `pickle` for model serialization
  - `threading` for background tasks

## Getting Started
### Prerequisites
- Python 3.7+
- Required Libraries:
  - `flask`
  - `flask-cors`
  - `pandas`
  - `scikit-learn`
  - `thefuzz`

### Installation Steps

1. **Clone the Repository**
   ```sh
   git clone https://github.com/alexcgar/F-R.git
   cd F-R
   ```

2. **Set Up the Backend**
   Navigate to the backend directory and install dependencies:
   ```sh
   cd backend
   pip install -r requirements.txt
   ```

3. **Set Up the Frontend**
   Navigate to the frontend directory and install dependencies:
   ```sh
   cd ../frontend
   npm install
   ```

4. **Build the Frontend**
   Generate the production build of the frontend:
   ```sh
   npm run build
   ```
   This will create a `dist` folder with the necessary static files.

5. **Move Frontend Build to Backend**
   Move the built frontend files to the backend static folder:
   ```sh
   mv dist/* ../backend/model/static/
   ```

6. **Run the Backend Server**
   Navigate back to the backend and start the server:
   ```sh
   cd ../backend
   python modelo_prediccion.py
   ```

7. **Access the Application**
   Once the server is running, open your browser and go to:
   ```sh
   http://localhost:5000
   ```

This ensures that both the backend and frontend are properly set up and running.
