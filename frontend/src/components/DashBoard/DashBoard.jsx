import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import "../components_css/DashBoard.css";
import NavBar from "../Navbar/Navbar";
import Footer from "../Footer/Footer";
import {
  fetchAlbaranesSinFirmar,
  fetchDocumentosSinUbicar,
  fetchLoginUser,
} from "../../Services/apiServices";

const DashBoard = ({ onButtonClick, email, password }) => {
  const [showOrders, setShowOrders] = useState(false);
  const [idWarehouse, setIdWarehouse] = useState(null);
  const [albaranesData, setAlbaranesData] = useState([]);
  const [ubicacionesData, setUbicacionesData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Debugging the email and password
  console.log("Email:", email);
  console.log("Password:", password);
  // Fetch user info and set IDWarehouse
  useEffect(() => {
    let intervalId;

    const fetchData = async () => {
      try {
        if (email && password) {
          const userInfo = await fetchLoginUser("1", email, password);
          setIdWarehouse(userInfo.IDWarehouse);
        }
      } catch (error) {
        setError("Error fetching user info. Please try again later.");
        console.error("Error fetching user info", error);
      }
    };

    if (email && password) {
      fetchData();
      intervalId = setInterval(fetchData, 60000);
    }

    return () => clearInterval(intervalId);
  }, [email, password]);

  // Fetch albaranes data once idWarehouse is available
  useEffect(() => {
    let intervalId;

    const fetchAlbaranes = async () => {
      if (idWarehouse) {
        setLoading(true);
        try {
          const data = await fetchAlbaranesSinFirmar("1", idWarehouse);
          setAlbaranesData(data);
        } catch (error) {
          setError("Error fetching albaranes data. Please try again later.");
          console.error("Error fetching albaranes data", error);
        } finally {
          setLoading(false);
        }
      }
    };

    if (idWarehouse) {
      fetchAlbaranes();
      intervalId = setInterval(fetchAlbaranes, 60000);
      setLoading(false);
    }

    return () => clearInterval(intervalId);
  }, [idWarehouse]);

  // Fetch documentos sin ubicar once idWarehouse is available
  useEffect(() => {
    let intervalId;

    const fetchUbicaciones = async () => {
      if (idWarehouse) {
        setLoading(true);
        try {
          const data = await fetchDocumentosSinUbicar("1", "aef9438a-784f-450e-a8e9-5fa9c98c895b");
          setUbicacionesData(data);
          console.log(data);
        } catch (error) {
          setError("Error fetching ubicaciones data. Please try again later.");
          console.error("Error fetching ubicaciones data", error);
        } finally {
          setLoading(false);
        }
      }
    };

    if (idWarehouse) {
      fetchUbicaciones();
      intervalId = setInterval(fetchUbicaciones, 60000);
    }

    return () => clearInterval(intervalId);
  }, [idWarehouse]);

  const handleButtonClick = () => {
    setShowOrders(true);
    onButtonClick();
  };

  return (
    <div>
      <div className="row container-fluid">
        <div className="col-12">
          <NavBar />
        </div>
      </div>
      <div className="p-5 mt-3">
        <div className="container-fluid p-3">
          <div className="row text-center">
            {/* Tabla de Pedidos de Voz Recibidos */}
            <div className="col-xl-12 col-xxl-12 p-3">
              <div className="card border border-5">
                <div className="card-header">
                  <h4 className="card-title mb-0" style={{ color: "#222E3C" }}>
                    Pedidos de Voz Recibidos
                  </h4>
                </div>
                <div className="card-body m-2">
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
                      <tr>
                        <td>OT001</td>
                        <td>Proyecto A</td>
                        <td>Juan Pérez</td>
                        <td>15</td>
                        <td>
                          <button className="btn btn-primary bt">
                            Ver Detalles
                          </button>
                        </td>
                      </tr>
                      <tr>
                        <td>OT002</td>
                        <td>Proyecto B</td>
                        <td>María López</td>
                        <td>8</td>
                        <td>
                          <button className="btn btn-primary bt">
                            Ver Detalles
                          </button>
                        </td>
                      </tr>
                      <tr>
                        <td>OT003</td>
                        <td>Proyecto C</td>
                        <td>Carlos Gómez</td>
                        <td>20</td>
                        <td>
                          <button
                            onClick={handleButtonClick}
                            className="btn btn-primary bt"
                          >
                            Ver Detalles
                          </button>
                          {showOrders && (
                            <div>
                              <p>Additional content revealed!</p>
                            </div>
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Tabla de Albaranes Pendientes de Firmar */}
            <div className="col-xl-6 col-xxl-6 p-3">
              <div className="card border border-5">
                <div className="card-header">
                  <h4 className="card-title mb-0" style={{ color: "#222E3C" }}>
                    Albaranes Pendientes de Firmar
                  </h4>
                </div>
                {loading ? <p>Loading...</p> : null}
                <div className="card-body m-2">
                  <table className="table-flex table-bordered">
                    <thead
                      className="align-middle"
                      style={{ backgroundColor: "#222E3C" }}
                    >
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
            <div className="col-xl-6 col-xxl-6 p-3">
              <div className="card flex-fill h-100 border border-5">
                <div className="card-header">
                  <h4 className="card-title mb-0" style={{ color: "#222E3C" }}>
                    SGA: Pendientes de Ubicar/Desubicar
                  </h4>
                </div>
                {loading ? <p>Loading data, please wait...</p> : null}
                {error ? <p style={{ color: "red" }}>{error}</p> : null}
                <div className="card-body m-2">
                  <table className="table-flex table-bordered">
                    <thead
                      className="align-middle"
                      style={{ backgroundColor: "#222E3C" }}
                    >
                      <tr>
                        <th>Número de Albarán</th>
                        <th>Empleado</th>
                        <th>Tipo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan="3">Loading...</td>
                        </tr>
                      ) : ubicacionesData.length > 0 ? (
                        ubicacionesData.map((item, index) => (
                          <tr key={index}>
                            <td>{item.Item}</td>
                            <td>{item.Description}</td>
                            <td>{item.GeneratedFromString}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="3">No data found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <Footer />
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
};

export default DashBoard;
