/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { sendSeleccion } from "../../Services/Api";
import { authenticate } from "../../Services/apiServices";
import "../components_css/Correos.css";
import axios from "axios";

// Función para limpiar la cadena base64 eliminando el prefijo "b'" y la comilla final, si existen.
function limpiarBase64(imgStr) {
  let cleaned = imgStr.trim();
  if (
    (cleaned.startsWith("b'") && cleaned.endsWith("'")) ||
    (cleaned.startsWith('b"') && cleaned.endsWith('"'))
  ) {
    cleaned = cleaned.slice(2, -1);
  }
  return cleaned;
}

const Correos = ({ setProductosSeleccionados, idBoton }) => {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busquedas, setBusquedas] = useState({});
  const [opcionesBusqueda, setOpcionesBusqueda] = useState({});
  const [isLoadingBusqueda] = useState({});
  const [datosCSV, setDatosCSV] = useState([]);
  const [autoSeleccionada, setAutoSeleccionada] = useState(false);

  const obtenerProductos = async () => {
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
      const result = response.data;
      if (result.success && Array.isArray(result.data)) {
        const productosProcesados = result.data
          .map((item) => {
            const transcriptionData = JSON.parse(item.TextTranscription);
            return transcriptionData.map((transcription) => ({
              correo_id: transcription.correo_id,
              cantidad: Number(transcription.cantidad),
              codigo_prediccion: transcription.codigo_prediccion,
              descripcion: transcription.descripcion || "Sin descripción",
              descripcion_csv: transcription.descripcion_csv || "",
              id_article: transcription.id_article,
              exactitud: transcription.exactitud || 0,
              imagen: transcription.imagen || null,
            }));
          })
          .flat();
        setProductos(productosProcesados);
      } else {
        console.error("Error en la respuesta de la API:", result);
      }
    } catch (err) {
      console.error("Error al obtener los productos:", err);
    } finally {
      setLoading(false);
    }
  };

  const cargarCSV = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/cargar_csv");
      const data = await response.json();
      if (data && data.data) {
        const datosProcesados = data.data.map((item) => ({
          ...item,
          Combined: `${item.CodArticle} - ${item.Description}`,
        }));
        setDatosCSV(datosProcesados);
      } else {
        console.error("Error al cargar el CSV:", data);
      }
    } catch (err) {
      console.error("Error al cargar el CSV:", err);
    }
  };

  useEffect(() => {
    const cargarDatos = async () => {
      await obtenerProductos();
      await cargarCSV();
    };
    cargarDatos();
  }, []);

  useEffect(() => {
    setProductosSeleccionados(productos);
  }, [productos, setProductosSeleccionados]);

  // Función para confirmar automáticamente sin actualizar el input (busquedas)
  const manejarSeleccionChangeAuto = async (
    selectedOption,
    codigoPrediccion,
    combinedValue,
    descripcion
  ) => {
    const descripcionArticulo = combinedValue.split(" - ")[1]?.trim() || "";
    const productosActualizados = productos.map((producto) =>
      producto.codigo_prediccion === codigoPrediccion
        ? {
            ...producto,
            codigo_prediccion: selectedOption,
            descripcion_csv: descripcionArticulo,
          }
        : producto
    );
    setProductos(productosActualizados);
    try {
      await sendSeleccion(selectedOption, descripcion);
      // Marcar que la selección ya fue enviada para que no se reintente
      setProductos((prevProductos) =>
        prevProductos.map((p) =>
          p.codigo_prediccion === codigoPrediccion
            ? { ...p, seleccionEnviada: true }
            : p
        )
      );
      // También puedes resetear opciones y busquedas
      setOpcionesBusqueda((prevState) => ({
        ...prevState,
        [codigoPrediccion]: [],
      }));
    } catch (error) {
      console.error("Error al manejar la selección (auto):", error);
    }
  };

  // Efecto para confirmar automáticamente solo si la selección aún no ha sido enviada y no se ha procesado auto-selección
  useEffect(() => {
    if (!autoSeleccionada) {
      productos.forEach((producto) => {
        // Se ejecuta solo si se cumple la condición y la selección no se ha enviado
        if (
          producto.exactitud >= 95 &&
          producto.exactitud < 100 &&
          !producto.seleccionEnviada
        ) {
          manejarSeleccionChangeAuto(
            producto.codigo_prediccion,
            producto.codigo_prediccion,
            `${producto.codigo_prediccion} - ${producto.descripcion_csv}`,
            producto.descripcion
          );
        }
      });
      setAutoSeleccionada(true);
    }
  }, [productos, autoSeleccionada]);

  // Función para manejar la selección manual (cuando exactitud < 95)
  const manejarSeleccionChange = async (
    selectedOption,
    codigoPrediccion,
    combinedValue,
    descripcion
  ) => {
    const descripcionArticulo = combinedValue.split(" - ")[1]?.trim() || "";
    const productosActualizados = productos.map((producto) =>
      producto.codigo_prediccion === codigoPrediccion
        ? {
            ...producto,
            codigo_prediccion: selectedOption,
            descripcion_csv: descripcionArticulo,
          }
        : producto
    );
    setProductos(productosActualizados);
    try {
      await sendSeleccion(selectedOption, descripcion);
      // Actualizamos "busquedas" para reflejar la confirmación manual en el input
      setBusquedas((prevState) => ({
        ...prevState,
        [codigoPrediccion]: combinedValue,
      }));
      setOpcionesBusqueda((prevState) => ({
        ...prevState,
        [codigoPrediccion]: [],
      }));
    } catch (error) {
      console.error("Error al manejar la selección:", error);
    }
  };

  const manejarBuscar = (valorBusqueda, productoId) => {
    if (!valorBusqueda.trim()) {
      setOpcionesBusqueda((prev) => ({
        ...prev,
        [productoId]: [],
      }));
      return;
    }
    const busquedaNormalizada = valorBusqueda.trim().toLowerCase();
    const palabrasBusqueda = busquedaNormalizada.split(" ");
    const resultados = datosCSV.filter((item) => {
      const textoObjetivo = `${item.CodArticle} ${item.Description}`.toLowerCase();
      return palabrasBusqueda.every((palabra) =>
        textoObjetivo.includes(palabra)
      );
    });
    setOpcionesBusqueda((prev) => ({
      ...prev,
      [productoId]:
        resultados.length > 0
          ? resultados.slice(0, 10)
          : [{ Combined: "No hay coincidencias", CodArticle: "" }],
    }));
  };

  const manejarInputBusqueda = (valor, productoId) => {
    setBusquedas((prev) => ({
      ...prev,
      [productoId]: valor,
    }));
    manejarBuscar(valor, productoId);
  };

  if (loading || productos.length === 0) {
    return (
      <div className="loader-container">
        <div className="loader"></div>
        <p>Cargando productos...</p>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", padding: "0px" }}>
      <div className="bg-white" style={{ margin: "0 auto" }}>
        <table
          className="table table-striped table-bordered border border-5"
          style={{
            margin: "0 auto",
            textAlign: "center",
            fontSize: "1.1rem",
          }}
        >
          <thead className="thead-dark">
            <tr>
              <th>
                <strong>IMAGEN</strong>
              </th>
              <th>
                <strong>DESCRIPCIÓN TRANSCRITA</strong>
              </th>
              <th>
                <strong>EXACTITUD (%)</strong>
              </th>
              <th>
                <strong>DESCRIPCIÓN PRODUCTO</strong>
              </th>
              <th>
                <strong>CÓDIGO ARTÍCULO</strong>
              </th>
              <th>
                <strong>BUSCAR PRODUCTO</strong>
              </th>
              <th>
                <strong>CANTIDAD</strong>
              </th>
            </tr>
          </thead>
          <tbody>
            {productos.map((producto, index) => {
              const exactitud = Number(producto.exactitud);
              const exactitudColor =
                exactitud > 60
                  ? "#a5d6a7"
                  : exactitud > 40
                  ? "#fff59d"
                  : "#ef9a9a";

              return (
                <tr
                  key={`${producto.codigo_prediccion}-${producto.descripcion}-${index}`}
                >
                  <td
                    style={{
                      verticalAlign: "middle",
                      textAlign: "center",
                    }}
                  >
                    {producto.imagen ? (
                      <img
                        src={`data:image/jpeg;base64,${limpiarBase64(
                          producto.imagen
                        )}`}
                        className="img-thumbnail"
                        style={{
                          width: "70px",
                          height: "70px",
                          objectFit: "contain",
                        }}
                        alt={`Imagen para ${producto.codigo_prediccion}`}
                      />
                    ) : (
                      <img
                        src="https://static.vecteezy.com/system/resources/previews/006/059/989/non_2x/crossed-camera-icon-avoid-taking-photos-image-is-not-available-illustration-free-vector.jpg"
                        className="img-thumbnail"
                        alt={`Imagen no disponible para el producto ${producto.codigo_prediccion}`}
                        style={{
                          width: "70px",
                          height: "70px",
                          objectFit: "cover",
                        }}
                      />
                    )}
                  </td>
                  <td
                    style={{
                      verticalAlign: "middle",
                      textAlign: "center",
                    }}
                  >
                    {producto.descripcion}
                  </td>
                  <td
                    style={{
                      backgroundColor: exactitudColor,
                      color: "black",
                      verticalAlign: "middle",
                      textAlign: "center",
                    }}
                  >
                    {producto.exactitud}%
                  </td>
                  <td
                    style={{
                      verticalAlign: "middle",
                      textAlign: "center",
                    }}
                  >
                    {producto.descripcion_csv}
                  </td>
                  <td
                    style={{
                      verticalAlign: "middle",
                      textAlign: "center",
                    }}
                  >
                    {producto.codigo_prediccion}
                  </td>
                  <td
                    style={{
                      verticalAlign: "middle",
                      textAlign: "center",
                    }}
                  >
                    <div className="dropdown-container position-relative">
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                        }}
                      >
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Buscar..."
                          value={busquedas[producto.codigo_prediccion] || ""}
                          onChange={(e) =>
                            manejarInputBusqueda(
                              e.target.value,
                              producto.codigo_prediccion
                            )
                          }
                        />
                        {/* En este caso, no mostramos el botón "Confirmar" */}
                      </div>
                      {isLoadingBusqueda[producto.codigo_prediccion] && (
                        <div>Cargando...</div>
                      )}
                      {opcionesBusqueda[producto.codigo_prediccion]?.length > 0 ? (
                        <ul className="list-group mt-2 dropdown-list">
                          {opcionesBusqueda[producto.codigo_prediccion].map(
                            (item) => (
                              <button
                                key={item.CodArticle || "no-coincidencia"}
                                className="list-group-item list-group-item-action p-4"
                                onClick={() =>
                                  manejarSeleccionChange(
                                    item.CodArticle,
                                    producto.codigo_prediccion,
                                    item.Combined,
                                    producto.descripcion
                                  )
                                }
                              >
                                {item.Combined}
                              </button>
                            )
                          )}
                        </ul>
                      ) : (
                        busquedas[producto.codigo_prediccion]?.trim() && (
                          <div className="mt-2">No hay coincidencias</div>
                        )
                      )}
                    </div>
                  </td>
                  <td
                    style={{
                      verticalAlign: "middle",
                      textAlign: "center",
                    }}
                  >
                    <input
                      title="Cantidad"
                      type="number"
                      className="form-control"
                      value={producto.cantidad}
                      min="0"
                      onKeyDown={(e) => e.preventDefault()}
                      onChange={(e) => {
                        const nuevaCantidad = Number(e.target.value);
                        setProductos((prevProductos) =>
                          prevProductos.map((p) =>
                            p.codigo_prediccion === producto.codigo_prediccion
                              ? { ...p, cantidad: nuevaCantidad }
                              : p
                          )
                        );
                      }}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

Correos.propTypes = {
  setProductosSeleccionados: PropTypes.func.isRequired,
  idBoton: PropTypes.string.isRequired,
};

export default Correos;
