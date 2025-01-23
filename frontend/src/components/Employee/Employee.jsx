import{ useEffect, useState } from "react";
import PropTypes from "prop-types";
import { Table, Button, Alert, Spinner } from "react-bootstrap";
import {
  fetchLoginUser,
  generateOrder,
  authenticate,
} from "../../Services/apiServices";
import axios from "axios";
import "../components_css/Audio.css";

const Employee = ({ productos = [], setIsLoggedIn, email, password, idBoton }) => {
  const [employeeInfo, setEmployeeInfo] = useState(null);
  const [error, setError] = useState(null);
  const [orderGenerated, setOrderGenerated] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [entityData, setEntityData] = useState(null);

  // Fetch employee info when the component mounts or email changes
  useEffect(() => {
    const fetchInfo = async () => {
      try {
        const data = await fetchLoginUser("1", email, password);
        setEmployeeInfo(data);
      } catch (error) {
        setError(error.message);
      }
    };
    fetchInfo();
  }, [email, password]);

  // Fetch entity data using idBoton
  useEffect(() => {
    const fetchEntityData = async () => {
      try {
        const response = await axios.post(
          "https://dinasa.wskserver.com:56544/api/audiomp3toordersl/consult",
          {
            CodCompany: "1",
            CodUser: "juani",
            IDMessage: idBoton,
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
          setEntityData(transformedData);
        } else {
          console.error("Error al obtener los datos del servidor.");
        }
      } catch (error) {
        console.error("Error al conectar con el servidor:", error);
        setError("Error al obtener los datos del servidor: " + error.message);
      }
    };

    if (idBoton) {
      fetchEntityData();
    }
  }, [idBoton]);

  const handleGenerateOrder = async () => {
    setIsLoading(true);
    try {
      if (!productos || productos.length === 0) {
        console.error("No hay productos seleccionados.");
        setIsLoading(false);
        return;
      }

      if (!entityData) {
        console.error("No hay datos de la entidad.");
        setIsLoading(false);
        return;
      }

      const orderData = {
        CodCompany: "1",
        IDAudioMP3ToOrderSL: entityData[0].IDAudioMP3ToOrderSL,
        TextPrediction: entityData[0].TextTranscription
          .map(
            (prediccion) =>
              `${prediccion.codigo_prediccion}-${prediccion.descripcion}`
          )
          .join(","),
        Lines: productos
          .filter((producto) => producto.cantidad > 0)
          .map((producto) => ({
            IDArticle: producto.id_article,
            Quantity: producto.cantidad,
          })),
      };

      console.log("Generando pedido:", orderData);

      try {
        const orderResponse = await generateOrder(orderData);
        console.log("Pedido generado exitosamente:", orderResponse);
        setOrderGenerated(orderResponse);

        const correoId = entityData[0].TextTranscription[0]?.correo_id;
        if (correoId) {
          await axios.post("http://localhost:5000/api/marcar_leido", {
            correo_id: correoId,
          });
          console.log(`Correo ${correoId} marcado como leído.`);
        }

        setTimeout(() => {
          setIsLoggedIn(false);
        }, 988000);
      } catch (error) {
        console.error("Error al generar el pedido:", error);
        setError("Error al generar el pedido: " + error.message);
      }
    } catch (error) {
      console.error("Error al obtener predicciones:", error);
      setError("Error al obtener predicciones: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      {error && <p className="text-danger">Error: {error}</p>}
      {employeeInfo ? (
        <Table
          striped
          bordered
          hover
          variant="light"
          className="border border-5 m-1 mb-3"
        >
          <thead>
            <tr>
              <th>EMPLEADO</th>
              <th>ORDEN DE TRABAJO</th>
              <th>CLIENTE</th>
              <th>FINCA</th>
              <th>PROYECTO</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>VALERA AZNAR JUANA</strong>
              </td>
              <td>
                <strong>1074241204161431 </strong>
              </td>
              <td>
                <strong>ALMONDPLUS CINCO SL </strong>
              </td>
              <td><strong>{employeeInfo.DesSite}</strong></td>
              <td>
                <strong>{employeeInfo.CodProject} {employeeInfo.VersionProject}{" "}
                {employeeInfo.DesProject}</strong>
              </td>
            </tr>
          </tbody>
        </Table>
      ) : (
        <p>Cargando información del empleado...</p>
      )}
      {orderGenerated && (
        <Alert variant="success" className="text-center">
          <strong>Pedido generado correctamente.</strong>
          <br />
          <strong>Código de Pedido:</strong> {orderGenerated.data.CodOrder}
          <br />
          <strong>Fecha de Pedido:</strong>{" "}
          {new Date(orderGenerated.data.OrderDate).toLocaleDateString()}
        </Alert>
      )}
      {isLoading && (
        <div className="d-flex justify-content-center mb-3">
          <Spinner animation="border" variant="primary" />
        </div>
      )}
      <div className="d-flex justify-content-center ">
        <Button
          style={{ backgroundColor: "#283746", width: "100%" }}
          onClick={handleGenerateOrder}
          disabled={isLoading}
        >
          GENERAR PEDIDO
        </Button>
      </div>
    </div>
  );
};

Employee.propTypes = {
  productos: PropTypes.arrayOf(
    PropTypes.shape({
      cantidad: PropTypes.number.isRequired,
    })
  ).isRequired,
  setIsLoggedIn: PropTypes.func.isRequired,
  email: PropTypes.string.isRequired,
  password: PropTypes.string.isRequired,
  idBoton: PropTypes.string.isRequired,
};

export default Employee;
