import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { fetchCorreos, sendSeleccion } from "../../Services/Api";
import "../components_css/Correos.css";

const Correos = ({ setProductosSeleccionados }) => {
    const [productos, setProductos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busquedas, setBusquedas] = useState({});
    const [opcionesBusqueda, setOpcionesBusqueda] = useState({});
    const [isLoadingBusqueda] = useState({});
    const [datosCSV, setDatosCSV] = useState([]);

    const obtenerProductos = async () => {
        try {
            const data = await fetchCorreos();
            console.log("Datos recibidos desde fetchCorreos:", data);
            if (Array.isArray(data)) {
                const productosConCantidadNumerica = data.map((producto) => ({
                    ...producto,
                    cantidad: Number(producto.cantidad),
                }));
                setProductos(productosConCantidadNumerica);
            } else {
                console.error("Los datos recibidos no son un array:", data);
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
                    Combined: `${item.CodArticle} - ${item.Description}`, // Combina CodArticle y Description
                }));
                console.log("Datos procesados:", datosProcesados);
                setDatosCSV(datosProcesados); // Actualiza el estado con los datos procesados
            } else {
                console.error("Error al cargar el CSV:", data);
            }
        } catch (err) {
            console.error("Error al cargar el CSV:", err);
        }
    };

    useEffect(() => {
        const cargarDatos = async () => {
            await obtenerProductos(); // Esperar a que las predicciones se carguen
            await cargarCSV(); // Luego cargar el CSV
        };

        cargarDatos();
    }, []);

    useEffect(() => {
        // Actualizar el estado en el componente padre solo cuando `productos` cambia
        setProductosSeleccionados(productos);
    }, [productos, setProductosSeleccionados]);

    const manejarSeleccionChange = async (
        selectedOption,
        codigoPrediccion,
        combinedValue,
        descripcion
    ) => {
        // Extrae solo la descripción del artículo del valor combinado
        const descripcionArticulo = combinedValue.split(" - ")[1]?.trim() || "";

        // Actualiza productos localmente
        const productosActualizados = productos.map((producto) =>
            producto.codigo_prediccion === codigoPrediccion
                ? {
                    ...producto,
                    codigo_prediccion: selectedOption, // Actualiza el código del artículo
                    descripcion_csv: descripcionArticulo, // Actualiza la descripción del artículo
                }
                : producto
        );

        // Actualiza el estado para reflejar los cambios
        setProductos(productosActualizados);

        // Ejecuta operaciones de fondo si es necesario
        try {
            await sendSeleccion(selectedOption, descripcion);
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

    // Nueva función de búsqueda mejorada
    const manejarBuscar = (valorBusqueda, productoId) => {
        if (!valorBusqueda.trim()) {
            setOpcionesBusqueda((prev) => ({
                ...prev,
                [productoId]: [],
            }));
            return;
        }

        // Normaliza la búsqueda eliminando espacios adicionales y convirtiendo a minúsculas
        const busquedaNormalizada = valorBusqueda.trim().toLowerCase();

        // Divide la búsqueda en palabras individuales
        const palabrasBusqueda = busquedaNormalizada.split(" ");

        // Filtrar las opciones del CSV
        const resultados = datosCSV.filter((item) => {
            const textoObjetivo = `${item.CodArticle} ${item.Description}`.toLowerCase();

            // Verifica si todas las palabras de búsqueda están en el texto objetivo
            return palabrasBusqueda.every((palabra) => textoObjetivo.includes(palabra));
        });

        // Actualiza las opciones de búsqueda
        setOpcionesBusqueda((prev) => ({
            ...prev,
            [productoId]:
                resultados.length > 0
                    ? resultados.slice(0, 10) // Limitar a las primeras 10 opciones
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
        <div>
            <div className="bg-white">
                <table className="table table-striped table-bordered border border-5">
                    <thead className="thead-dark">
                        <tr>
                            <th>
                                <strong>IMAGEN</strong>
                            </th>
                            <th>
                                <strong>DESCRIPCIÓN TRANSCRITA</strong>
                            </th>
                            <th>
                                <strong>PROBABILIDAD (%)</strong>
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
                                    <td>
                                        {producto.imagen ? (
                                            <img
                                                src={`data:image/jpeg;base64,${producto.imagen}`}
                                                className="img-thumbnail"
                                                style={{ maxWidth: "50px" }}
                                            />
                                        ) : (
                                            <img
                                                src="https://static.vecteezy.com/system/resources/previews/006/059/989/non_2x/crossed-camera-icon-avoid-taking-photos-image-is-not-available-illustration-free-vector.jpg"
                                                className="img-thumbnail"
                                                alt={`Imagen no disponible para el producto ${producto.codigo_prediccion}`}
                                                style={{ maxWidth: "50px" }}
                                            />
                                        )}
                                    </td>
                                    <td>{producto.descripcion}</td>
                                    <td
                                        style={{ backgroundColor: exactitudColor, color: "black" }}
                                    >
                                        {producto.exactitud}%
                                    </td>
                                    <td>{producto.descripcion_csv}</td>
                                    <td>{producto.codigo_prediccion}</td>
                                    <td>
                                        <div className="dropdown-container position-relative">
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="Buscar..."
                                                value={busquedas[producto.codigo_prediccion] || ""}
                                                onChange={(e) =>
                                                    manejarInputBusqueda(e.target.value, producto.codigo_prediccion)
                                                }
                                            />
                                            {isLoadingBusqueda[producto.codigo_prediccion] && <div>Cargando...</div>}

                                            {/* Mostrar las opciones de búsqueda si las hay */}
                                            {opcionesBusqueda[producto.codigo_prediccion]?.length > 0 ? (
                                                <ul className="list-group mt-2 dropdown-list">
                                                    {opcionesBusqueda[producto.codigo_prediccion].map((item) => (
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
                                                    ))}
                                                </ul>
                                            ) : (
                                                // Mostrar el mensaje de "No hay coincidencias" solo si el input no está vacío
                                                busquedas[producto.codigo_prediccion]?.trim() && (
                                                    <div className="mt-2">No hay coincidencias</div>
                                                )
                                            )}
                                        </div>
                                    </td>

                                    <td>
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
};

export default Correos;
