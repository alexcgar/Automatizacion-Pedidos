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
  fetchEmployeeInfo,
  fetchPartesSinFirmar,
} from "../../Services/apiServices";
import axios from "axios";

// Interceptor para manejar errores 401
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      console.warn("Token expirado o no autorizado. Se intentará reautenticar...");
      try {
        const newToken = await authenticate();
        error.config.headers["Authorization"] = `Bearer ${newToken}`;
        return axios.request(error.config);
      } catch (authError) {
        console.warn("Error al re autenticarse:", authError);
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);

// Función para capitalizar la primera letra de palabras
const capitalizeFirstLetter = (str) => {
  return str?.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
};

// Función para formatear fechas
const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString();
};

// Hook para manejar llamadas a la API
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
      const errorMessage = err.response?.data?.message || err.message || "Error desconocido";
      setError(errorMessage);
      console.warn("Error en la llamada a la API:", err);
      return null;
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
  const [partesData, setPartesData] = useState([]);

  const { apiCall: apiCallAlbaranes } = useApiCall();
  const { apiCall: apiCallUbicaciones } = useApiCall();
  const { apiCall: apiCallMp3 } = useApiCall();
  const { apiCall: apiCallPredicciones } = useApiCall();
  const { apiCall: apiCallPartes } = useApiCall();

  // Transforma la transcripción
  const transformTranscription = useCallback((transcription) => {
    try {
      return transcription.startsWith("[") ? JSON.parse(transcription) : transcription;
    } catch (error) {
      console.warn("Error al parsear transcripción:", error);
      return transcription;
    }
  }, []);

  // Nueva función para marcar el correo como leído
  const marcarCorreoComoLeido = async (correoId) => {
    try {
      const response = await axios.post(
        "http://10.83.0.17:5000/api/marcar_leido",
        { correo_id: correoId },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      if (response.status === 200) {
        console.log(`Correo ${correoId} marcado como leído exitosamente.`);
      } else {
        console.warn(`No se pudo marcar el correo ${correoId} como leído:`, response.data);
      }
    } catch (error) {
      console.warn("Error al marcar el correo como leído:", error);
    }
  };

  const fetchPartes = useCallback(async () => {
    if (idWarehouse) {
      const data = await apiCallPartes(fetchPartesSinFirmar, "1", idWarehouse);
      if (data) {
        setPartesData(data);
      }
    }
  }, [idWarehouse, apiCallPartes]);

  // Fetch de datos MP3
  const fetchMp3Data = useCallback(async () => {
    try {
      const data = await apiCallMp3(fetchEmployeeInfo, "1", email, "");
      let transformedData = [];
      if (Array.isArray(data)) {
        transformedData = data.map((item) => ({
          ...item,
          TextTranscription: transformTranscription(item.TextTranscription),
        }));
      } else if (data && data.success) {
        transformedData = data.data.map((item) => ({
          ...item,
          TextTranscription: transformTranscription(item.TextTranscription),
        }));
      } else {
        console.warn("Respuesta no válida en fetchMp3Data:", data);
        return;
      }
      console.log("Datos MP3 transformados:", transformedData);
      setMp3Ids(transformedData);
    } catch (err) {
      console.warn("Error en fetchMp3Data:", err);
    }
  }, [apiCallMp3, email, transformTranscription]);

  // Fetch de albaranes
  const fetchAlbaranes = useCallback(async () => {
    if (idWarehouse) {
      const data = await apiCallAlbaranes(fetchAlbaranesSinFirmar, "1", idWarehouse);
      if (data) {
        setAlbaranesData(data);
      }
    }
  }, [apiCallAlbaranes, idWarehouse]);

  // Fetch de ubicaciones
  const fetchUbicaciones = useCallback(async () => {
    if (idWarehouse) {
      const data = await apiCallUbicaciones(fetchDocumentosSinUbicar, "1", idWarehouse);
      if (data) {
        setUbicacionesData(data);
      }
    }
  }, [apiCallUbicaciones, idWarehouse]);

  const generateEntityFromPredictions = useCallback(
    async (prediccionesArray) => {
      for (const prediccion of prediccionesArray) {
        const {
          audio_base64,
          correo_id,
          imagen,
          IDWorkOrder,
          IDEmployee,
          descripcion,
          codigo_prediccion,
          descripcion_csv,
          cantidad,
          exactitud,
          id_article,
          file_name,
        } = prediccion;

        if (!audio_base64) {
          console.warn("No se encontró audio_base64 en la predicción:", prediccion);
          continue;
        }

        const resultado = {
          descripcion: descripcion.toUpperCase(),
          codigo_prediccion: codigo_prediccion,
          descripcion_csv: descripcion_csv,
          cantidad: cantidad,
          imagen: imagen,
          exactitud: exactitud,
          id_article: id_article || codigo_prediccion,
          correo_id: correo_id,
        };

        const entityData = {
          CodCompany: "1",
          IDWorkOrder: IDWorkOrder || "0222",
          IDEmployee: IDEmployee || "1074241204161431",
          IDMessage: correo_id || "Desconocido",
          TextTranscription: JSON.stringify(resultado) || "Desconocido",
          FileMP3: audio_base64,
          FileIMG: imagen || "Desconocido",
          FileName: file_name || "unknown_audio.mp4",
        };

        console.log("Enviando entidad con datos:", entityData);

        try {
          const entityResponse = await apiCallPredicciones(generateEntity, entityData);
          if (entityResponse) {
            console.log("Entidad generada exitosamente:", prediccion);
            await marcarCorreoComoLeido(correo_id);
          } else {
            console.warn("No se obtuvo respuesta para la entidad.");
          }
        } catch (error) {
          console.warn("Error al generar la entidad:", error);
        }
      }
      console.log("Actualizando datos MP3 tras generar entidades...");
      fetchMp3Data();
    },
    [apiCallPredicciones, fetchMp3Data]
  );

  const fetchPredicciones = useCallback(
    async () => {
      const response = await apiCallPredicciones(() => fetch("http://10.83.0.17:5000/api/predicciones"));
      if (!response) return;

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const responseText = await response.text();
        console.warn("Respuesta inesperada:", responseText);
        return;
      }

      let parsedResponse;
      try {
        let responseText = await response.text();
        responseText = responseText.replace(/\bNaN\b/g, "null");
        parsedResponse = JSON.parse(responseText);
      } catch (error) {
        console.warn("Error al parsear predicciones:", error);
        return;
      }

      let prediccionesArray = [];
      if (Array.isArray(parsedResponse)) {
        prediccionesArray = parsedResponse;
      } else if (parsedResponse.predicciones && Array.isArray(parsedResponse.predicciones)) {
        prediccionesArray = parsedResponse.predicciones;
      } else {
        console.warn("No hay predicciones disponibles.");
        return;
      }

      if (prediccionesArray.length === 0) {
        console.warn("El array de predicciones está vacío.");
        return;
      }

      console.log("Predicciones obtenidas:", prediccionesArray);
      await generateEntityFromPredictions(prediccionesArray);
    },
    [apiCallPredicciones, generateEntityFromPredictions]
  );

  // Efecto para obtener idWarehouse
  useEffect(() => {
    const fetchData = async () => {
      if (email && password) {
        const userInfo = await apiCallAlbaranes(fetchLoginUser, "1", email, password);
        if (userInfo) {
          console.log("IDWarehouse obtenido:", userInfo.IDWarehouse);
          setIdWarehouse(userInfo.IDWarehouse);
        }
      }
    };
    fetchData();
  }, [email, password, apiCallAlbaranes]);

  // Efecto para refrescar datos
  useEffect(() => {
    if (idWarehouse) {
      fetchMp3Data();
      fetchAlbaranes();
      fetchUbicaciones();
      fetchPredicciones();
      fetchPartes();

      const intervals = [
        window.setInterval(() => fetchMp3Data(), 120000),
        window.setInterval(() => fetchAlbaranes(), 120000),
        window.setInterval(() => fetchUbicaciones(), 120000),
        window.setInterval(() => fetchPredicciones(), 120000),
        window.setInterval(() => fetchPartes(), 120000),
      ];

      return () => {
        intervals.forEach(window.clearInterval);
      };
    }
  }, [
    idWarehouse,
    fetchMp3Data,
    fetchAlbaranes,
    fetchUbicaciones,
    fetchPredicciones,
    fetchPartes
  ]);

  // Efecto para reload la página cada 3 minutos
  useEffect(() => {
    const intervalId = window.setInterval(() => {
      window.location.reload();
    }, 180000); // 3 minutes in milliseconds

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const renderPartesTable = () => (
    <table className="table-flex table-bordered">
      <thead className="align-middle" style={{ backgroundColor: "#222E3C" }}>
        <tr>
          <th>Empleado</th>
          <th>Nº de Partes Pendientes</th>
        </tr>
      </thead>
      <tbody>
        {partesData
          .sort((a, b) => b.Total - a.Total)
          .map((item, index) => (
            <React.Fragment key={index}>
              <tr
                className="text-center"
                onClick={() =>
                  setSelectedEmployee(
                    selectedEmployee?.IDEmployee === item.IDEmployee ? null : item
                  )
                }
                style={{ cursor: "pointer" }}
              >
                <td>{item.Description}</td>
                <td>{item.Total}</td>
              </tr>
              {selectedEmployee && selectedEmployee.IDEmployee === item.IDEmployee && (
                <tr>
                  <td colSpan="2">
                    <div className="child-table mt-2">
                      <h5>Detalle para: {item.Description}</h5>
                      <table className="table table-bordered">
                        <thead style={{ backgroundColor: "#283746" }}>
                          <tr>
                            <th>Cliente</th>
                            <th>Código de Parte</th>
                            <th>Fecha</th>
                          </tr>
                        </thead>
                        <tbody>
                          {item.Items.map((it, idx) => (
                            <tr key={idx}>
                              <td>{it.Customer}</td>
                              <td>{it.WorkImputation}</td>
                              <td>{formatDate(it.DateImputation)}</td>
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

  // Renderizado de la tabla de MP3
  const renderMp3Table = () => {
    return (
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
            mp3Ids.map((item, index) => {
              let count = 0;
              try {
                const transcriptionObj = JSON.parse(item.TextTranscription);
                if (Array.isArray(transcriptionObj)) {
                  count = transcriptionObj.filter(obj => Object.prototype.hasOwnProperty.call(obj, "descripcion")).length;
                } else if (typeof transcriptionObj === "object" && transcriptionObj !== null) {
                  count = Object.prototype.hasOwnProperty.call(transcriptionObj, "descripcion") ? 1 : 0;
                }
              } catch (error) {
                console.warn("Error al parsear TextTranscription:", error);
              }
              return (
                <tr key={index} className="text-center">
                  <td>{item.IDWorkOrder}</td>
                  <td>{item.DesProject || ""}</td>
                  <td>{capitalizeFirstLetter(item.DesEmployee) || "Empleado"}</td>
                  <td>{count}</td>
                  <td className="justify-content-center">
                    <button onClick={() => onButtonClick(item.IDMessage)} className="btn btn-primary">
                      Detalles
                    </button>
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan="5">No se encontraron datos.</td>
            </tr>
          )}
        </tbody>
      </table>
    );
  };

  // Renderizado de la tabla de Albaranes
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
                    selectedEmployee?.Description === item.Description ? null : item
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

  // Renderizado de la tabla de Ubicaciones
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

  // Efecto para reload la página cada 3 minutos
  useEffect(() => {
    const intervalId = window.setInterval(() => {
      window.location.reload();
    }, 180000); // 3 minutes in milliseconds

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  // Refrescar datos manualmente
  const refreshData = () => {
    if (idWarehouse) {
      console.log("Refrescando datos manualmente...");
      fetchMp3Data();
      fetchAlbaranes();
      fetchUbicaciones();
      fetchPredicciones();
      fetchPartes();
    }
  };

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
        <div className="row text-center g-3">
          <div className="col-xl-6 col-lg-6 d-flex justify-content-center">
            <div className="card flex-fill h-100 border border-2 mt-4">
              <div className="card-header">
                <h4 className="card-title mb-0" style={{ color: "#222E3C" }}>
                  <strong>Albaranes Pendientes de Firmar</strong>
                </h4>
              </div>
              <div className="card-body table-container" style={{ overflowX: "auto" }}>
                {renderAlbaranesTable()}
              </div>
            </div>
          </div>

          <div className="col-xl-6 col-lg-6 d-flex justify-content-center">
            <div className="card flex-fill h-100 border border-2 mt-4">
              <div className="card-header">
                <h4 className="card-title mb-0" style={{ color: "#222E3C" }}>
                  <strong>Partes De Trabajo Sin Firmar</strong>
                </h4>
              </div>
              <div className="card-body table-container" style={{ overflowX: "auto" }}>
                {renderPartesTable()}
              </div>
            </div>
          </div>

          <div className="col-xl-6 col-lg-6 d-flex justify-content-center">
            <div className="card flex-fill h-100 border border-2 mt-4">
              <div className="card-header">
                <h4 className="card-title mb-0" style={{ color: "#222E3C" }}>
                  <strong>SGA: Pendientes de Ubicar/Desubicar</strong>
                </h4>
              </div>
              <div className="card-body table-container" style={{ overflowX: "auto" }}>
                {renderUbicacionesTable()}
              </div>
            </div>
          </div>

          <div className="col-xl-6 col-lg-6 d-flex justify-content-center">
            <div className="card flex-fill h-100 border border-2 mt-4">
              <div className="card-header">
                <h4 className="card-title mb-0" style={{ color: "#222E3C" }}>
                  <strong>Pedidos de Voz Recibidos</strong>
                </h4>
              </div>
              <div className="card-body table-container" style={{ overflowX: "auto" }}>
                {renderMp3Table()}
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