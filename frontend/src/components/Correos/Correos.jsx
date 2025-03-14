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

  // Función para crear un identificador único
  const getUniqueId = (producto) => {
    return `${producto.codigo_prediccion}-${producto.descripcion}`;
  };

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
            return Array.isArray(transcriptionData)
              ? transcriptionData.map((transcription) => ({
                correo_id: transcription.correo_id,
                cantidad: Number(transcription.cantidad),
                codigo_prediccion: transcription.codigo_prediccion,
                descripcion: transcription.descripcion || "Sin descripción",
                descripcion_csv: transcription.descripcion_csv || "",
                id_article: transcription.id_article,
                exactitud: transcription.exactitud || 0,
                imagen: transcription.imagen || null,
                seleccionEnviada: false, // Campo para rastrear confirmación
              }))
              : [
                {
                  correo_id: transcriptionData.correo_id,
                  cantidad: Number(transcriptionData.cantidad),
                  codigo_prediccion: transcriptionData.codigo_prediccion,
                  descripcion:
                    transcriptionData.descripcion || "Sin descripción",
                  descripcion_csv: transcriptionData.descripcion_csv || "",
                  id_article: transcriptionData.id_article,
                  exactitud: transcriptionData.exactitud || 0,
                  imagen: transcriptionData.imagen || null,
                  seleccionEnviada: false, // Campo para rastrear confirmación
                },
              ];
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
      const response = await fetch("http://10.83.0.17:5000/api/cargar_csv");
      const data = await response.json();
      if (data && data.data) {
        const datosProcesados = data.data.map((item) => ({
          CodArticle: item.CodArticle,
          Description: item.Description,
          IDArticle: item.IDArticle,
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

  // Función para confirmar automáticamente sin actualizar el input de búsqueda
  const manejarSeleccionChangeAuto = async (
    selectedOption,
    codigoPrediccion,
    combinedValue,
    descripcion
  ) => {
    const descripcionArticulo = combinedValue.split(" - ")[1]?.trim() || "";
    const selectedItem = datosCSV.find((item) => item.CodArticle === selectedOption);
    const productosActualizados = productos.map((producto) =>
      producto.codigo_prediccion === codigoPrediccion
        ? {
          ...producto,
          codigo_prediccion: selectedOption,
          descripcion_csv: descripcionArticulo,
          id_article: selectedItem?.IDArticle || selectedOption,
          seleccionEnviada: true, // Marcamos como confirmado
        }
        : producto
    );
    setProductos(productosActualizados);
    try {
      await sendSeleccion(selectedOption, descripcion);
      console.log(`Producto ${codigoPrediccion} confirmado automáticamente`);
    } catch (error) {
      console.error("Error al manejar la selección automática:", error);
    }
  };

  // Efecto para confirmar automáticamente productos con exactitud > 90%
  useEffect(() => {
    if (!autoSeleccionada && productos.length > 0) {
      productos.forEach((producto) => {
        if (producto.exactitud > 90 && !producto.seleccionEnviada) {
          manejarSeleccionChangeAuto(
            producto.codigo_prediccion,
            producto.codigo_prediccion,
            `${producto.codigo_prediccion} - ${producto.descripcion_csv}`,
            producto.descripcion
          );
        }
      });
      setAutoSeleccionada(true); // Marcamos que la auto-selección ya se realizó
    }
  }, [productos, autoSeleccionada]);

  const manejarSeleccionChange = async (
    selectedOption,
    producto,  // Ahora pasamos el producto completo
    combinedValue,
    descripcion
  ) => {
    const uniqueId = getUniqueId(producto);
    const descripcionArticulo = combinedValue.split(" - ")[1]?.trim() || "";
    const selectedItem = datosCSV.find((item) => item.CodArticle === selectedOption);
    
    // Aquí usamos producto.codigo_prediccion y producto.descripcion para identificar únicamente
    const productosActualizados = productos.map((p) =>
      p.codigo_prediccion === producto.codigo_prediccion && 
      p.descripcion === producto.descripcion
        ? {
          ...p,
          codigo_prediccion: selectedOption,
          descripcion_csv: descripcionArticulo,
          id_article: selectedItem?.IDArticle || selectedOption,
          seleccionEnviada: true, // Marcamos como confirmado
        }
        : p
    );
    
    setProductos(productosActualizados);
    try {
      await sendSeleccion(selectedOption, descripcion);
      setBusquedas((prevState) => ({
        ...prevState,
        [uniqueId]: combinedValue,
      }));
      setOpcionesBusqueda((prevState) => ({
        ...prevState,
        [uniqueId]: [],
      }));
    } catch (error) {
      console.error("Error al manejar la selección manual:", error);
    }
  };

  const manejarBuscar = (valorBusqueda, uniqueId) => {
    if (!valorBusqueda.trim()) {
      setOpcionesBusqueda((prev) => ({
        ...prev,
        [uniqueId]: [],
      }));
      return;
    }

    const busquedaNormalizada = valorBusqueda
      .trim()
      .toLowerCase()
      .replace(/[^\w\s]/gi, "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    const palabrasBusqueda = busquedaNormalizada.split(" ");
    const resultados = datosCSV.filter((item) => {
      const textoObjetivo = `${item.CodArticle} ${item.Description}`
        .toLowerCase()
        .replace(/[^\w\s]/gi, "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      return palabrasBusqueda.every((palabra) => textoObjetivo.includes(palabra));
    });
    setOpcionesBusqueda((prev) => ({
      ...prev,
      [uniqueId]: resultados.length > 0
        ? resultados.slice(0, 10)
        : [{ Combined: "No hay coincidencias", CodArticle: "" }],
    }));
  };

  const manejarInputBusqueda = (valor, producto) => {
    const uniqueId = getUniqueId(producto);
    setBusquedas((prev) => ({
      ...prev,
      [uniqueId]: valor,
    }));
    manejarBuscar(valor, uniqueId, producto);
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
        {/* Inline CSS to override the default inside table borders */}
        <style>
          {`
            .table-bordered th,
            .table-bordered td {
              border: 0.5px solid grey !important;
            }
          `}
        </style>
        <table
          className="table table-secondary table-bordered "
          style={{
            margin: "0 auto",
            textAlign: "center",
            fontSize: "1.1rem",
          }}
        >
          <thead className="thead-dark">
            <tr>
              <th><strong>IMAGEN</strong></th>
              <th><strong>DESCRIPCIÓN TRANSCRITA</strong></th>
              <th><strong>EXACTITUD (%)</strong></th>
              <th><strong>DESCRIPCIÓN PRODUCTO</strong></th>
              <th><strong>CÓDIGO ARTÍCULO</strong></th>
              <th><strong>BUSCAR PRODUCTO</strong></th>
              <th><strong>CANTIDAD</strong></th>
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
                  <td style={{ verticalAlign: "middle", textAlign: "center" }}>
                    {producto.imagen ? (
                      <img
                        src={`data:image/jpeg;base64,${limpiarBase64(producto.imagen)}`}
                        className="img-thumbnail"
                        style={{ width: "70px", height: "70px", objectFit: "contain" }}
                        alt={`Imagen para ${producto.codigo_prediccion}`}
                      />
                    ) : (
                      <img
                        src="https://static.vecteezy.com/system/resources/previews/006/059/989/non_2x/crossed-camera-icon-avoid-taking-photos-image-is-not-available-illustration-free-vector.jpg"
                        className="img-thumbnail"
                        alt={`Imagen no disponible para el producto ${producto.codigo_prediccion}`}
                        style={{ width: "70px", height: "70px", objectFit: "cover" }}
                      />
                    )}
                  </td>
                  <td style={{ verticalAlign: "middle", textAlign: "center" }}>
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
                  <td style={{ verticalAlign: "middle", textAlign: "center" }}>
                    {producto.descripcion_csv}
                  </td>
                  <td style={{ verticalAlign: "middle", textAlign: "center" }}>
                    {producto.codigo_prediccion}
                  </td>
                  <td style={{ verticalAlign: "middle", textAlign: "center" }}>
                    <div className="dropdown-container position-relative">
                      <div style={{ display: "flex", alignItems: "center" }}>
                        <input
                          key={getUniqueId(producto)}
                          type="text"
                          className="form-control"
                          placeholder="Buscar..."
                          value={busquedas[getUniqueId(producto)] || ""}
                          onChange={(e) =>
                            manejarInputBusqueda(e.target.value, producto)
                          }
                        />
                      </div>
                      {isLoadingBusqueda[producto.codigo_prediccion] && (
                        <div>Cargando...</div>
                      )}
                      {opcionesBusqueda[getUniqueId(producto)]?.length > 0 && (
                        <ul className="list-group mt-2 dropdown-list">
                          {opcionesBusqueda[getUniqueId(producto)].map((item) => (
                            <button
                              key={item.CodArticle || "no-coincidencia"}
                              className="list-group-item list-group-item-action p-4"
                              onClick={() =>
                                manejarSeleccionChange(
                                  item.CodArticle,
                                  producto,
                                  item.Combined,
                                  producto.descripcion
                                )
                              }
                            >
                              {item.Combined}
                            </button>
                          ))}
                        </ul>
                      )}
                    </div>
                  </td>
                  <td style={{ verticalAlign: "middle", textAlign: "center" }}>
                    <input
                      title="Cantidad"
                      type="number"
                      step="1"
                      min="0"
                      className="form-control"
                      value={producto.cantidad}
                      onChange={(e) => {
                        let inputValue = e.target.value.replace(",", ".");
                        const regex = /^\d*\.?\d{0,2}$/;
                        if (inputValue === "" || regex.test(inputValue)) {
                          setProductos((prevProductos) =>
                            prevProductos.map((p) =>
                              p.codigo_prediccion === producto.codigo_prediccion && 
                              p.descripcion === producto.descripcion
                                ? { ...p, cantidad: inputValue }
                                : p
                            )
                          );
                        }
                      }}
                      onBlur={(e) => {
                        let value = e.target.value.replace(",", ".");
                        let numericValue = parseFloat(value);
                        if (!isNaN(numericValue)) {
                          numericValue = Math.round(numericValue * 100) / 100;
                          numericValue = numericValue.toFixed(2);
                        } else {
                          numericValue = "0.00";
                        }
                        setProductos((prevProductos) =>
                          prevProductos.map((p) =>
                            p.descripcion === producto.descripcion
                              ? { ...p, cantidad: parseFloat(numericValue) }
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