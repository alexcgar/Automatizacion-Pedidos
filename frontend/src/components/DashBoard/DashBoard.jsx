/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect } from "react";
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
import { Spinner } from "react-bootstrap";
import axios from "axios";


const capitalizeFirstLetter = (str) => {
  return str.replace(/\w\S*/g, function(txt){
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
};


const DashBoard = ({ email, password, onButtonClick, setIsLoggedIn }) => {
  const [idWarehouse, setIdWarehouse] = useState(null);
  const [albaranesData, setAlbaranesData] = useState([]);
  const [ubicacionesData, setUbicacionesData] = useState([]);
  const [mp3Ids, setMp3Ids] = useState([]); // Aquí guardamos los datos de la consulta MP3
  const [loadingAlbaranes, setLoadingAlbaranes] = useState(true);
  const [loadingUbicaciones, setLoadingUbicaciones] = useState(true);
  const [loadingMp3, setLoadingMp3] = useState(true);
  const [allDataLoaded, setAllDataLoaded] = useState(false);
  const [error, setError] = useState("");

  
  const fetchMp3Data = async () => {
    try {
      setLoadingMp3(true);
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
        const transformedData = response.data.data.map(item => ({
          ...item,
          TextTranscription: item.TextTranscription.startsWith('[')
            ? JSON.parse(item.TextTranscription)
            : item.TextTranscription
        }));
        setMp3Ids(transformedData); // Guarda los resultados de la consulta MP3
      } else {
        if (error) {
          console.error("Error al obtener los datos del servidor.");
        }
      }
    } catch (error) {
      console.error("Error al conectar con el servidor:", error);
    } finally {
      setLoadingMp3(false);
    }
  };

  const fetchAlbaranes = async () => {
    if (idWarehouse) {
      setLoadingAlbaranes(true);
      try {
        const data = await fetchAlbaranesSinFirmar("1", idWarehouse);
        setAlbaranesData(data);
      } catch (error) {
        console.error("Error fetching albaranes data", error);
      } finally {
        setLoadingAlbaranes(false);
      }
    }
  };

  const fetchUbicaciones = async () => {
    if (idWarehouse) {
      setLoadingUbicaciones(true);
      try {
        const data = await fetchDocumentosSinUbicar(
          "1",
          "aef9438a-784f-450e-a8e9-5fa9c98c895b"
        );
        setUbicacionesData((prevData) => [
          ...prevData.filter(
            (item) => !data.some((d) => d.Item === item.Item)
          ),
          ...data,
        ]);
      } catch (error) {
        console.error("Error fetching ubicaciones data", error);
      } finally {
        setLoadingUbicaciones(false);
      }
    }
  };

  const refreshData = () => {
    fetchMp3Data();
    fetchAlbaranes();
    fetchUbicaciones();
  };

  useEffect(() => {
    fetchMp3Data();
    const interval = setInterval(fetchMp3Data, 60000); // Actualiza cada 2 minutos
    return () => clearInterval(interval); // Limpia el intervalo al desmontar el componente
  }, []);

  useEffect(() => {
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
    if (idWarehouse) {
      fetchAlbaranes();
      const interval = setInterval(fetchAlbaranes, 60000); // Actualiza cada 2 minutos
      return () => clearInterval(interval); // Limpia el intervalo al desmontar el componente
    }
  }, [idWarehouse]);

  useEffect(() => {
    if (idWarehouse) {
      fetchUbicaciones();
      const interval = setInterval(fetchUbicaciones, 60000); // Actualiza cada 2 minutos
      return () => clearInterval(interval); // Limpia el intervalo al desmontar el componente
    }
  }, [idWarehouse]);

  useEffect(() => {
    if (!loadingMp3 && !loadingAlbaranes && !loadingUbicaciones) {
      setAllDataLoaded(true);
    }
  }, [loadingMp3, loadingAlbaranes, loadingUbicaciones]);

  const handleButtonClick = (id) => {
    onButtonClick(id);
  };

  const fetchPrediccionesAndGenerateEntity = async () => {
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
        const filteredPredicciones = predicciones.filter(prediccion => prediccion.correo_id === IdMessage);

        const entityData = JSON.stringify({
          CodCompany: "1",
          IDWorkOrder: "1074241204161431", // Datos de ejemplo
          IDEmployee: email, // ID de empleado
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
    fetchPrediccionesAndGenerateEntity();
    const interval = setInterval(fetchPrediccionesAndGenerateEntity, 30000); // Actualiza cada 30 segundos
    return () => clearInterval(interval); // Limpia el intervalo al desmontar el componente
  }, []);

  return (
    <div>
      <div className="row container-fluid mb-6">
        <div className="col-12">
          <NavBar
            setIsLoggedIn={setIsLoggedIn}
            onNavigateToDashboard={refreshData}
            isDashboardVisible={true} // Pasar la prop adicional

          />
        </div>
      </div>

      <div className="container-fluid ">
        {loadingMp3 || loadingAlbaranes || loadingUbicaciones ? (
          <div className="text-center " style={{ marginTop: "140px" }}>
            <Spinner animation="border" role="status">
              <span className="visually-hidden">Cargando...</span>
            </Spinner>
          </div>
        ) : !allDataLoaded ? (
          <div className="text-center " style={{ marginTop: "140px" }}>
            <Spinner animation="border" role="status">
              <span className="visually-hidden">Cargando...</span>
            </Spinner>
          </div>
        ) : (
          <div className="row text-center">
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
                            <td>{capitalizeFirstLetter(item.DesEmployee) || "Empleado"}</td>
                            <td>{item.TextTranscription.length}</td>
                            <td className=" justify-content-center">
                              <button
                                onClick={() =>
                                  handleButtonClick(item.IDMessage)
                                }
                                className="btn  btn-primary"
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

            <div className="col-xl-4 col-xxl-4">
              <div className="card flex-fill h-100 border border-2 mt-5">
                <div className="card-header">
                  <h4 className="card-title mb-0" style={{ color: "#222E3C" }}>
                    Albaranes Pendientes de Firmar
                  </h4>
                </div>
                <div className="card-body table-container">
                  <table className="table-flex table-bordered">
                    <thead
                      className="align-middle"
                      style={{ backgroundColor: "#222E3C" }}
                    >
                      <tr>
                        <th>Empleado</th>
                        <th>Nº de Albaranes Pendientes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {albaranesData
                        .sort((a, b) => b.Items.length - a.Items.length)
                        .map((item, index) => (
                          <tr key={index}>
                            <td>{item.Description}</td>
                            <td>{item.Items.length}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="col-xl-4 col-xxl-4">
              <div className="card flex-fill h-100 border border-2 mt-5">
                <div className="card-header">
                  <h4 className="card-title mb-0" style={{ color: "#222E3C" }}>
                    SGA: Pendientes de Ubicar/Desubicar
                  </h4>
                </div>
                <div className="card-body table-container">
                  <table className="table-flex table-bordered">
                    <thead
                      className="align-middle"
                      style={{ backgroundColor: "#222E3C" }}
                    >
                      <tr>
                        <th>Nº de Albarán</th>
                        <th>Empleado</th>
                        <th>Fecha</th>
                        <th>Nº Articulos</th>
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
        )}
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
