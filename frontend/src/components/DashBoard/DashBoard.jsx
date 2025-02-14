import React, { useState, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import "../components_css/DashBoard.css";
import NavBar from "../Navbar/Navbar";
import {
  fetchAlbaranesSinFirmar,
  fetchDocumentosSinUbicar,
  fetchLoginUser,
  authenticate,
  generateEntity,
} from "../../Services/apiServices";
import axios from "axios";

const AUDIO_API_URL = "http://10.83.0.17:5000/api/getAudio"; //Usa variable de entorno.

// Interceptor para manejar errores 401
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      console.warn("Token expirado o no autorizado. Se intentará reautenticar...");
      try {
        const newToken = await authenticate(); // Implementa la lógica de refresco/re autenticación
        // Actualiza el header de autorización en la configuración original
        error.config.headers["Authorization"] = `Bearer ${newToken}`;
        // Reintenta la petición con el nuevo token
        return axios.request(error.config);
      } catch (authError) {
        console.error("Error al re autenticarse:", authError);
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);

const capitalizeFirstLetter = (str) => {
  return str?.replace(/\w\S*/g, function (txt) {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
};

// Función para formatear fechas.
const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString();
};

// Funcion para manejar llamadas a la API.
const useApiCall = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const apiCall = useCallback(async (apiFunction, ...args) => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFunction(...args);
      return data;
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || err.message || "Error desconocido";
      setError(errorMessage);
      console.error("Error en la llamada a la API:", err);
      return null; // Importante retornar null en caso de error
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, apiCall };
};

const DashBoard = ({ email, password, onButtonClick, setIsLoggedIn }) => {
  const [idWarehouse, setIdWarehouse] = useState(null);
  const [albaranesData, setAlbaranesData] = useState([]);
  const [ubicacionesData, setUbicacionesData] = useState([]);
  const [mp3Ids, setMp3Ids] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const {
    apiCall: apiCallAlbaranes,
  } = useApiCall();
  const {
    apiCall: apiCallUbicaciones,
  } = useApiCall();
  const {
    apiCall: apiCallMp3,
  } = useApiCall();
  const { apiCall: apiCallPredicciones } = useApiCall();


  // Transforma la transcripción.
  const transformTranscription = useCallback((transcription) => {
    try {
      return transcription.startsWith("[")
        ? JSON.parse(transcription)
        : transcription;
    } catch (error) {
      console.error("Error parsing transcription:", error);
      return transcription; // Devuelve original si falla el parseo.
    }
  }, []);

  // Fetch MP3 Data.
  const fetchMp3Data = useCallback(async () => {
    const data = await apiCallMp3(
      axios.post,
      "https://erp.wskserver.com:56544/api/audiomp3toordersl/consult",
      {
        CodCompany: "1",
        CodUser: email,
        IDMessage: "",
        IsAll: false,
      },
      {
        headers: {
          Authorization: `Bearer ${await authenticate()}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (data && data.data && data.data.success) {
      const transformedData = data.data.data.map((item) => ({
        ...item,
        TextTranscription: transformTranscription(item.TextTranscription),
      }));
      setMp3Ids(transformedData);
    }
  }, [apiCallMp3, email, transformTranscription]);

  // Fetch Albaranes.
  const fetchAlbaranes = useCallback(async () => {
    if (idWarehouse) {
      const data = await apiCallAlbaranes(fetchAlbaranesSinFirmar, "1", idWarehouse);
      if (data) {
        setAlbaranesData(data);
      }
    }
  }, [apiCallAlbaranes, idWarehouse]);

  // Fetch Ubicaciones.
  const fetchUbicaciones = useCallback(async () => {
    if (idWarehouse) {
      const data = await apiCallUbicaciones(fetchDocumentosSinUbicar, "1", idWarehouse);
      if (data) {
        setUbicacionesData(data);
      }
    }
  }, [apiCallUbicaciones, idWarehouse]);

  // Función para obtener el audio en base64
  const fetchAudioBase64 = useCallback(async () => {
    try {
        const response = await axios.get(AUDIO_API_URL, {
            responseType: "blob",
        });
        
        // Si la respuesta es un JSON en lugar de un blob, asumimos que no hay audio.
        const contentType = response.headers["content-type"];
        if (contentType && contentType.includes("application/json")) {
            console.debug("No hay audio disponible.");
            return null;
        }

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(response.data);
            reader.onloadend = () => {
                resolve(reader.result.split(",")[1]);
            };
            reader.onerror = (error) => reject(error);
        });
    } catch (error) {
        // Si el error es 500, lo tratamos como un caso normal y retornamos null sin loguear el error.
        if (error?.response?.status !== 500) {
            console.error("Error fetching audio:", error);
        }
        return null;
    }
}, []);


const generateEntityFromPredictions = useCallback(async (prediccionesArray) => {
  const base64Audio = await fetchAudioBase64();
  if (!base64Audio) {
    console.error("No se pudo obtener el audio.");
    return;
  }

  // Usamos el correo_id, imagen y datos del audio de la primera predicción (o se podría definir otro criterio)
  const primeraPrediccion = prediccionesArray.length > 0 ? prediccionesArray[0] : {};
  const correo_id = primeraPrediccion.correo_id || "";
  const fileImg = primeraPrediccion.imagen || null;
  const idWorkOrder =
    primeraPrediccion.IDWorkOrder ; // valor por defecto
  const idEmployee = primeraPrediccion.IDEmployee ; // valor por defecto

  const entityData = {
    CodCompany: "1",
    IDWorkOrder: idWorkOrder || "0222",
    IDEmployee: idEmployee || "1074241204161431",
    IDMessage: correo_id || "Desconocido",
    // Se envía el arreglo completo de predicciones en formato string JSON
    TextTranscription: JSON.stringify(prediccionesArray) || "Desconocido",
    FileMP3: base64Audio || "Desconocido",
    FileIMG: fileImg || "Desconocido",
  };

  console.debug("Enviando entidad con datos:", entityData);
  console.log("Enviando entidad con datos:", entityData);

  try {
    const entityResponse = await apiCallPredicciones(generateEntity, entityData);
    if (entityResponse) {
      console.log("Entidad generada exitosamente:", entityResponse);
    } else {
      console.warn("No se obtuvo respuesta para la entidad.");
    }
  } catch (error) {
    console.error("Error al generar la entidad:", error);
  }
}, [apiCallPredicciones, fetchAudioBase64]);


  const fetchPredicciones = useCallback(async () => {
    const response = await apiCallPredicciones(fetch, "http://10.83.0.17:5000/api/predicciones");
    if (!response) return; // Salir si la llamada falla

    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      const responseText = await response.text();
      console.error("Respuesta inesperada:", responseText);
      return;
    }

    let parsedResponse;
    try {
      let responseText = await response.text();
      // Reemplaza NaN por null para evitar errores de parseo
      responseText = responseText.replace(/\bNaN\b/g, "null");
      parsedResponse = JSON.parse(responseText);
      console.log("Predicciones recibidas:", parsedResponse);
    } catch (error) {
      console.error("Error al parsear predicciones:", error);
      return;
    }

    // Verificamos si la respuesta es un array o si es un objeto con la propiedad "predicciones"
    let prediccionesArray = [];
    if (Array.isArray(parsedResponse)) {
      prediccionesArray = parsedResponse;
    } else if (parsedResponse.predicciones && Array.isArray(parsedResponse.predicciones)) {
      prediccionesArray = parsedResponse.predicciones;
    } else {
      // No hay predicciones; no es un error, solo no hay datos
      console.warn("No hay predicciones disponibles.");
      return;
    }

    // Si el array está vacío, simplemente continuamos sin generar entidad
    if (prediccionesArray.length === 0) {
      console.warn("El array de predicciones está vacío.");
      return;
    }

    // Enviar las predicciones recibidas
    await generateEntityFromPredictions(prediccionesArray);
  }, [apiCallPredicciones, generateEntityFromPredictions]);

  // --- Efecto para obtener el idWarehouse ---
  useEffect(() => {
    const fetchData = async () => {
      if (email && password) {
        const userInfo = await apiCallAlbaranes(fetchLoginUser, "1", email, password); // Usa la función genérica
        if (userInfo) {
          setIdWarehouse(userInfo.IDWarehouse);
        }
      }
    };

    if (email && password) {
      fetchData();
    }
  }, [email, password, apiCallAlbaranes]); // Dependencias correctas

  // --- Efecto para refrescar datos ---
  useEffect(() => {
    if (idWarehouse) {
      fetchMp3Data();
      fetchAlbaranes();
      fetchUbicaciones();
      fetchPredicciones();

      const mp3Interval = setInterval(fetchMp3Data, 120000);
      const albaranesInterval = setInterval(fetchAlbaranes, 120000);
      const ubicacionesInterval = setInterval(fetchUbicaciones, 120000);
      const prediccionesInterval = setInterval(fetchPredicciones, 120000);

      return () => {
        clearInterval(mp3Interval);
        clearInterval(albaranesInterval);
        clearInterval(ubicacionesInterval);
        clearInterval(prediccionesInterval);
      };
    }
  }, [
    idWarehouse,
    fetchMp3Data,
    fetchAlbaranes,
    fetchUbicaciones,
    fetchPredicciones,
  ]);

  // Función para refrescar manualmente.  Ahora solo llama a las funciones.
  const refreshData = () => {
    if (idWarehouse) {
      fetchMp3Data();
      fetchAlbaranes();
      fetchUbicaciones();
      fetchPredicciones();
    }
  };

  // Función para renderizar la tabla de MP3.
  const renderMp3Table = () => (
    <table className="table-flex table-bordered">
      <thead style={{ backgroundColor: "#222E3C" }}>
        <tr>
          <th>Orden de Trabajo</th>
          <th>Proyecto</th>
          <th>Empleado</th>
          <th>Artículos</th>
          <th>Acción</th>
        </tr>
      </thead>
      <tbody>
        {mp3Ids.length > 0 ? (
          mp3Ids.map((item, index) => (
            <tr key={index} className="text-center">
              <td>{item.IDWorkOrder}</td>
              <td>{item.DesProject || ""}</td>
              <td>
                {capitalizeFirstLetter(item.DesEmployee) || "Empleado"}
              </td>
              <td>{item.TextTranscription.length}</td>
              <td className="justify-content-center">
                <button
                  onClick={() => onButtonClick(item.IDMessage)}
                  className="btn btn-primary"
                >
                  Detalles
                </button>
              </td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan="5">No se encontraron datos.</td>
          </tr>
        )}
      </tbody>
    </table>
  );

  // Función para renderizar la tabla de Albaranes.
  const renderAlbaranesTable = () => (
    <table className="table-flex table-bordered">
      <thead className="align-middle" style={{ backgroundColor: "#222E3C" }}>
        <tr>
          <th>Empleado</th>
          <th>Nº de Albaranes Pendientes</th>
        </tr>
      </thead>
      <tbody>
        {albaranesData
          .sort((a, b) => b.Items.length - a.Items.length)
          .map((item, index) => (
            <React.Fragment key={index}>
              <tr
                className="text-center"
                onClick={() =>
                  setSelectedEmployee(
                    selectedEmployee?.Description === item.Description
                      ? null
                      : item
                  )
                }
                style={{ cursor: "pointer" }}
              >
                <td>{item.Description}</td>
                <td>{item.Items.length}</td>
              </tr>
              {selectedEmployee?.Description === item.Description && (
                <tr>
                  <td colSpan="2">
                    <div className="child-table mt-2">
                      <h5>Detalle para: {item.Description}</h5>
                      <table className="table table-bordered">
                        <thead style={{ backgroundColor: "#283746" }}>
                          <tr>
                            <th>Código de Albarán</th>
                            <th>Fecha</th>
                          </tr>
                        </thead>
                        <tbody>
                          {item.Items.map((it, idx) => (
                            <tr key={idx}>
                              <td>{it.CodDeliveryNote}</td>
                              <td>{formatDate(it.DeliveryNoteDate)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
      </tbody>
    </table>
  );

  // Función para renderizar la tabla de Ubicaciones.
  const renderUbicacionesTable = () => (
    <table className="table-flex table-bordered">
      <thead className="align-middle" style={{ backgroundColor: "#222E3C" }}>
        <tr>
          <th>Nº de Albarán</th>
          <th>Empleado</th>
          <th>Fecha</th>
          <th>Nº Artículos</th>
        </tr>
      </thead>
      <tbody>
        {ubicacionesData.map((item, index) => (
          <tr key={index}>
            <td>{item.Item}</td>
            <td>{item.Description}</td>
            <td>{item.DateString}</td>
            <td>{item.NArticles}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div>
      <div className="row container-fluid mb-6">
        <div className="col-12">
          <NavBar
            setIsLoggedIn={setIsLoggedIn}
            onNavigateToDashboard={refreshData}
            isDashboardVisible={true}
          />
        </div>
      </div>

      <div className="container-fluid">
        <div className="row text-center">
          {/* Sección de Pedidos de Voz Recibidos */}
          <div className="col-xl-4 col-xxl-4 h-100 d-flex justify-content-center">
            <div className="card flex-fill h-100 border border-2 mt-5">
              <div className="card-header">
                <h4 className="card-title mb-0" style={{ color: "#222E3C" }}>
                  Pedidos de Voz Recibidos
                </h4>
              </div>
              <div className="card-body table-container">
                {renderMp3Table()}
              </div>
            </div>
          </div>

          {/* Sección de Albaranes Pendientes de Firmar */}
          <div className="col-xl-4 col-xxl-4">
            <div className="card flex-fill h-100 border border-2 mt-5">
              <div className="card-header">
                <h4 className="card-title mb-0" style={{ color: "#222E3C" }}>
                  Albaranes Pendientes de Firmar
                </h4>
              </div>
              <div className="card-body table-container">
                {renderAlbaranesTable()}
              </div>
            </div>
          </div>

          {/* Sección de SGA: Pendientes de Ubicar/Desubicar */}
          <div className="col-xl-4 col-xxl-4">
            <div className="card flex-fill h-100 border border-2 mt-5">
              <div className="card-header">
                <h4 className="card-title mb-0" style={{ color: "#222E3C" }}>
                  SGA: Pendientes de Ubicar/Desubicar
                </h4>

              </div>
              <div className="card-body table-container">
                {renderUbicacionesTable()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

DashBoard.propTypes = {
  onButtonClick: PropTypes.func.isRequired,
  email: PropTypes.string.isRequired,
  password: PropTypes.string.isRequired,
  setIsLoggedIn: PropTypes.func.isRequired,
};

export default DashBoard;