import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { Table, Button, Alert, Spinner } from "react-bootstrap";
import {
  generateOrder,
  authenticate,
} from "../../Services/apiServices";
import axios from "axios";

const Employee = ({ productos = [], setIsLoggedIn, idBoton }) => {
  const [employeeInfo, setEmployeeInfo] = useState(null);
  const [error, setError] = useState(null);
  const [orderGenerated, setOrderGenerated] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [entityData, setEntityData] = useState(null);

  // Fetch entity data using idBoton
  useEffect(() => {
    const fetchEntityData = async () => {
      try {
        const response = await axios.post(
          "https://erp.wskserver.com:56544/api/audiomp3toordersl/consult",
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
          setEmployeeInfo(transformedData[0]);
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
            (prediction) =>
              `${prediction.codigo_prediccion}-${prediction.descripcion}`
          )
          .join(","),
        Lines: productos
          .filter((producto) => producto.cantidad > 0)
          .map((producto, index) => ({
            IDArticle: entityData[0].TextTranscription[index].id_article,
            Quantity: producto.cantidad,
          })),
      };

      console.log("Generando pedido:", orderData);
      const orderResponse = await generateOrder(orderData);
      console.log("Pedido generado exitosamente:", orderResponse);
      setOrderGenerated(orderResponse);

      // Marcar el correo como leído una vez generado el pedido
      const correoId = entityData[0].TextTranscription[0]?.correo_id;
      if (correoId) {
        try {
          await axios.post("http://localhost:5000/api/marcar_leido", {
            correo_id: correoId,
          });
          console.log(`Correo ${correoId} marcado como leído.`);
        } catch (markError) {
          console.error(
            "Error al marcar el correo como leído:",
            markError.message
          );
        }
      }

      // Redirige inmediatamente al Dashboard (salir de Employee)
      setIsLoggedIn(false);
    } catch (error) {
      console.error("Error al generar el pedido:", error);
      setError("Error al generar el pedido: " + error.message);
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
          className="border border-5 m-1 mb-"
          style={{ fontSize: "1.1rem" }} // Sin espacio entre el número y 'rem'
        >
          <thead>
            <tr>
              <th>
                <strong>EMPLEADO</strong>
              </th>
              <th>
                <strong>ORDEN DE TRABAJO</strong>
              </th>
              <th>
                <strong>CLIENTE</strong>
              </th>
              <th>
                <strong>FINCA</strong>
              </th>
              <th>
                <strong>PROYECTO</strong>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{employeeInfo.DesEmployee}</td>
              <td>{employeeInfo.IDWorkOrder}</td>
              <td>ALMONDPLUS CINCO SL</td>
              <td>{employeeInfo.DesCustomerDeliveryAddress}</td>
              <td>
                {employeeInfo.CodProject} {employeeInfo.VersionProject}{" "}
                {employeeInfo.DesProject}
              </td>
            </tr>
          </tbody>
        </Table>
      ) : (
        <p>Cargando información del empleado...</p>
      )}
      {orderGenerated && (
        <Alert variant="success" className="text-center mt-1">
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
      <div className="d-flex justify-content-center mt-3 mb-4">
        <Button
          style={{
            backgroundColor: "#28374C", // Código hexadecimal válido
            width: "100%",
            fontSize: "1.1rem",
            boxShadow: "none",
            border: "none",
          }}
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