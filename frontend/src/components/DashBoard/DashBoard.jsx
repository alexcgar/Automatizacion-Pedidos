import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import "../components_css/DashBoard.css";
import NavBar from "../Navbar/Navbar";
import {
  fetchAlbaranesSinFirmar,
  fetchDocumentosSinUbicar,
  fetchLoginUser,
} from "../../Services/apiServices";
import { getIdMP3 } from "../../Services/Api";

const DashBoard = ({ onButtonClick, email, password }) => {
  const [idWarehouse, setIdWarehouse] = useState(null);
  const [albaranesData, setAlbaranesData] = useState([]);
  const [ubicacionesData, setUbicacionesData] = useState([]);
  const [mp3Ids, setMp3Ids] = useState([]);
  const [loadingAlbaranes, setLoadingAlbaranes] = useState(true); // loading para albaranes
  const [loadingUbicaciones, setLoadingUbicaciones] = useState(true); // loading para ubicaciones
  const [loadingMp3, setLoadingMp3] = useState(true); // loading para mp3
  const [allDataLoaded, setAllDataLoaded] = useState(false); // Bandera para saber si todos los datos se han cargado

  // Fetch MP3 IDs every 60 seconds
  useEffect(() => {
    const fetchMp3Ids = async () => {
      try {
        const response = await getIdMP3();
        if (response && response.data) {
          setMp3Ids((prev) =>
            [...new Set([...prev.map((item) => item.correo_id), ...response.data.map((d) => d.correo_id)])].map((id) => {
              const foundItem = [...prev, ...response.data].find((obj) => obj.correo_id === id);
              return foundItem || { correo_id: id, product_count: 0 };
            })
          );
        }
      } catch (error) {
        console.error("Error fetching MP3 IDs", error);
      } finally {
        setLoadingMp3(false); // Termina el loading de mp3
      }
    };

    fetchMp3Ids();
    const intervalId = setInterval(fetchMp3Ids, 60000);

    return () => clearInterval(intervalId);
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

  // Fetch Albaranes Sin Firmar
  useEffect(() => {
    const fetchAlbaranes = async () => {
      if (idWarehouse) {
        setLoadingAlbaranes(true); // Muestra el loading mientras se cargan los albaranes
        try {
          const data = await fetchAlbaranesSinFirmar("1", idWarehouse);
          setAlbaranesData(data);
        } catch (error) {
          console.error("Error fetching albaranes data", error);
        } finally {
          setLoadingAlbaranes(false); // Termina el loading de albaranes
        }
      }
    };

    if (idWarehouse) {
      fetchAlbaranes();
    }
  }, [idWarehouse]);

  // Fetch documentos sin ubicar and keep existing data
  useEffect(() => {
    const fetchUbicaciones = async () => {
      if (idWarehouse) {
        setLoadingUbicaciones(true); // Muestra el loading mientras se cargan las ubicaciones
        try {
          const data = await fetchDocumentosSinUbicar(
            "1",
            "aef9438a-784f-450e-a8e9-5fa9c98c895b"
          );
          setUbicacionesData((prevData) => [
            ...prevData.filter((item) => !data.some((d) => d.Item === item.Item)),
            ...data,
          ]);
        } catch (error) {
          console.error("Error fetching ubicaciones data", error);
        } finally {
          setLoadingUbicaciones(false); // Termina el loading de ubicaciones
        }
      }
    };

    if (idWarehouse) {
      fetchUbicaciones();
    }
  }, [idWarehouse]);

  // Verificar si todos los datos están cargados
  useEffect(() => {
    if (!loadingMp3 && !loadingAlbaranes && !loadingUbicaciones) {
      setAllDataLoaded(true); // Si todos los datos están cargados, cambia la bandera
    }
  }, [loadingMp3, loadingAlbaranes, loadingUbicaciones]);

  const handleButtonClick = (id) => {
    console.log(`ID del botón: ${id}`);
    onButtonClick();
  };

  return (
    <div>
      <div className="row container-fluid mb-6">
        <div className="col-12">
          <NavBar />
        </div>
      </div>

      <div className="container-fluid ">
          {loadingMp3 || loadingAlbaranes || loadingUbicaciones ? (
            <div className="text-center mt-4" style={{ marginTop: "20px" }}>
              <p>Cargando todos los datos...</p>
              {/* Aquí puedes agregar un spinner o un loader visualmente más atractivo */}
            </div>
          ) : !allDataLoaded ? (
            <div className="text-center mt-4" style={{ marginTop: "20px" }}>
              <p>Cargando todos los datos...</p>
            </div>
          ) : (
            <div className="row text-center">
              {/* Tabla de Pedidos de Voz Recibidos */}
            <div className="col-xl-4 col-xxl-4">
              <div className="card border border-3 mt-5">
                <div className="card-header">
                  <h4 className="card-title mb-0" style={{ color: "#222E3C" }}>
                    Pedidos de Voz Recibidos
                  </h4>
                </div>
                <div className="card-body m-1">
                  <table className="table-flex table-bordered">
                    <thead style={{ backgroundColor: "#222E3C" }}>
                      <tr>
                        <th>Orden de Trabajo</th>
                        <th>Proyecto</th>
                        <th>Empleado</th>
                        <th>Número de Artículos</th>
                        <th>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mp3Ids.length > 0 ? (
                        mp3Ids.map((id, index) => (
                          <tr key={index}>
                            <td>OT00{index + 1}</td>
                            <td>Proyecto</td>
                            <td>Empleado </td>
                            <td>{id.product_count}</td>
                            <td>
                              <button
                                onClick={() => handleButtonClick(id)}
                                className="btn btn-primary bt"
                                value={id}
                              >
                                Ver Detalles
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

            {/* Tabla de Albaranes Pendientes de Firmar */}
            <div className="col-xl-4 col-xxl-4">
              <div className="card flex-fill h-100 border border-2 mt-5">
                <div className="card-header">
                  <h4 className="card-title mb-0" style={{ color: "#222E3C" }}>
                    Albaranes Pendientes de Firmar
                  </h4>
                </div>
                <div className="card-body m-1">
                  <table className="table-flex table-bordered">
                    <thead className="align-middle" style={{ backgroundColor: "#222E3C" }}>
                      <tr>
                        <th>Empleado</th>
                        <th>Número de Albaranes Pendientes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {albaranesData.map((item, index) => (
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

            {/* Tabla de Ubicaciones */}
            <div className="col-xl-4 col-xxl-4">
              <div className="card flex-fill h-100 border border-2 mt-5">
                <div className="card-header">
                  <h4 className="card-title mb-0" style={{ color: "#222E3C" }}>
                    SGA: Pendientes de Ubicar/Desubicar
                  </h4>
                </div>
                <div className="card-body m-2">
                  <table className="table-flex table-bordered">
                    <thead className="align-middle" style={{ backgroundColor: "#222E3C" }}>
                      <tr>
                        <th>Número de Albarán</th>
                        <th>Empleado</th>
                        <th>Tipo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ubicacionesData.map((item, index) => (
                        <tr key={index}>
                          <td>{item.Item}</td>
                          <td>{item.Description}</td>
                          <td>{item.GeneratedFromString}</td>
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
};

export default DashBoard;
