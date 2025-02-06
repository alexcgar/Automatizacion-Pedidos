/* eslint-disable no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect } from "react";
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

const capitalizeFirstLetter = (str) => {
  return str.replace(/\w\S*/g, function (txt) {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
};

const DashBoard = ({ email, password, onButtonClick, setIsLoggedIn }) => {
  const [idWarehouse, setIdWarehouse] = useState(null);
  const [albaranesData, setAlbaranesData] = useState([]);
  const [ubicacionesData, setUbicacionesData] = useState([]);
  const [mp3Ids, setMp3Ids] = useState([]); // Datos de la consulta MP3
  const [error, setError] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [loadingAlbaranes, setLoadingAlbaranes] = useState(false);
  const [loadingUbicaciones, setLoadingUbicaciones] = useState(false);

  // --- Función para obtener datos de MP3 ---
  const fetchMp3Data = async () => {
    try {
      console.log("Fetching MP3 data...");
      const response = await axios.post(
        "https://dinasa.wskserver.com:56544/api/audiomp3toordersl/consult",
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

      if (response.data && response.data.success) {
        const transformedData = response.data.data.map((item) => ({
          ...item,
          TextTranscription: item.TextTranscription.startsWith("[")
            ? JSON.parse(item.TextTranscription)
            : item.TextTranscription,
        }));
        setMp3Ids(transformedData);
      } else {
        console.error("Error al obtener los datos del servidor (MP3).");
      }
    } catch (error) {
      console.error("Error al conectar con el servidor (MP3):", error);
    }
  };

  // --- Función para obtener Albaranes ---
  const fetchAlbaranes = async () => {
    if (idWarehouse) {
      console.log("Fetching Albaranes data...");
      setLoadingAlbaranes(true);
      try {
        const data = await fetchAlbaranesSinFirmar("1", idWarehouse);
        // Se actualiza el estado con los datos nuevos (puedes ajustar si quieres combinar datos antiguos y nuevos)
        setAlbaranesData(data);
      } catch (error) {
        console.error("Error fetching albaranes data", error);
      } finally {
        setLoadingAlbaranes(false);
      }
    }
  };

  // --- Función para obtener Ubicaciones ---
  const fetchUbicaciones = async () => {
    if (idWarehouse) {
      console.log("Fetching Ubicaciones data...");
      setLoadingUbicaciones(true);
      try {
        const data = await fetchDocumentosSinUbicar("1", idWarehouse);
        console.log(idWarehouse);
        // Aquí se actualiza el estado; en este ejemplo se reemplazan los datos,
        // pero si necesitas combinar (por ejemplo, añadir nuevos) puedes usar lógica de merge.
        setUbicacionesData(data);
      } catch (error) {
        console.error("Error fetching ubicaciones data", error);
      } finally {
        setLoadingUbicaciones(false);
      }
    }
  };

  // --- Función para refrescar todos los datos manualmente ---
  const refreshData = () => {
    console.log("Refreshing data...");
    fetchPrediccionesAndGenerateEntity(); // Si se necesita para otro proceso
    fetchMp3Data();
    fetchAlbaranes();
    fetchUbicaciones();
  };

  // --- Intervalos para actualizar automáticamente ---
  useEffect(() => {
    // Actualiza MP3 cada 60 segundos
    fetchMp3Data();
    const mp3Interval = setInterval(fetchMp3Data, 60000);
    return () => clearInterval(mp3Interval);
  }, []);

  useEffect(() => {
    // Se obtiene el idWarehouse mediante fetchLoginUser
    const fetchData = async () => {
      try {
        if (email && password) {
          const userInfo = await fetchLoginUser("1", email, password);
          setIdWarehouse(userInfo.IDWarehouse);
        }
      } catch (error) {
        console.error("Error fetching user info", error);
      }
    };

    if (email && password) {
      fetchData();
    }
  }, [email, password]);

  useEffect(() => {
    // Una vez obtenido el idWarehouse, actualiza albaranes cada 60 segundos
    if (idWarehouse) {
      fetchAlbaranes();
      const albaranesInterval = setInterval(fetchAlbaranes, 90000);
      return () => clearInterval(albaranesInterval);
    }
  }, [idWarehouse]);

  useEffect(() => {
    // Una vez obtenido el idWarehouse, actualiza ubicaciones cada 60 segundos
    if (idWarehouse) {
      fetchUbicaciones();
      const ubicacionesInterval = setInterval(fetchUbicaciones, 90000);
      return () => clearInterval(ubicacionesInterval);
    }
  }, [idWarehouse]);

  // --- Función para predicciones y generación de entidad (sin cambios) ---
  const fetchPrediccionesAndGenerateEntity = async () => {
    console.log("Obteniendo predicciones y generando entidad...");
    try {
      const response = await fetch("http://localhost:5000/api/predicciones");

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const responseText = await response.text();
        console.error("Respuesta inesperada:", responseText);
        throw new Error("La respuesta no es un JSON válido");
      }

      const predicciones = await response.json();
      if (predicciones && predicciones.length > 0) {
        const IdMessage = predicciones[0]?.correo_id;

        // Filtrar las predicciones que coincidan con el IDMessage
        const filteredPredicciones = predicciones.filter(
          (prediccion) => prediccion.correo_id === IdMessage
        );

        const entityData = JSON.stringify({
          CodCompany: "1",
          IDWorkOrder: "1074241204161431", // Datos de ejemplo
          IDEmployee: "0222", // ID de empleado
          IDMessage: IdMessage, // ID de mensaje
          TextTranscription: JSON.stringify(filteredPredicciones),
          FileMP3: "base64String", // Aquí deberías poner el audio en base64
        });

        try {
          const entityResponse = await generateEntity(entityData);
          console.log("Entidad generada exitosamente:", entityResponse);
        } catch (error) {
          console.error("Error al generar la entidad:", error);
          setError("Error al generar la entidad: " + error.message);
        }
      }
    } catch (error) {
      setError("Error al obtener las predicciones: " + error.message);
    }
  };

  useEffect(() => {
    // Refresca las predicciones cada 30 segundos
    fetchPrediccionesAndGenerateEntity();
    const prediccionesInterval = setInterval(fetchPrediccionesAndGenerateEntity, 30000);
    return () => clearInterval(prediccionesInterval);
  }, []);

  const handleButtonClick = (id) => {
    onButtonClick(id);
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
                              onClick={() => handleButtonClick(item.IDMessage)}
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
                                selectedEmployee &&
                                  selectedEmployee.Description === item.Description
                                  ? null
                                  : item
                              )
                            }
                            style={{ cursor: "pointer" }}
                          >
                            <td>{item.Description}</td>
                            <td>{item.Items.length}</td>
                          </tr>
                          {selectedEmployee &&
                            selectedEmployee.Description === item.Description && (
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
                                            <td>
                                              {new Date(it.DeliveryNoteDate).toLocaleDateString()}
                                            </td>
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
