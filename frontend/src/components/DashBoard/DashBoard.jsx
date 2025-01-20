import { useState } from "react";
import PropTypes from "prop-types";
import "../components_css/DashBoard.css";
import NavBar from "../Navbar/Navbar";
import Footer from "../Footer/Footer";

const DashBoard = ({ onButtonClick }) => {
    const [showOrders, setShowOrders] = useState(false);

    const handleButtonClick = () => {
        setShowOrders(true);
        onButtonClick();
    };

    return (
        <div>
            <div className="row container-fluid">
                <div className="col-12 ">
                    <NavBar />
                </div>
            </div>
            <div className="p-5 mt-3">
                <div className="container-fluid p-3">
                    <div className="row text-center">
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
                        <div className="col-xl-6 col-xxl-6 p-">
                            <div className="card border border-5">
                                <div className="card-header">
                                    <h4 className="card-title mb-0" style={{ color: "#222E3C" }}>
                                        Albaranes Pendientes de Firmar
                                    </h4>
                                </div>
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
                                            <tr>
                                                <td>OT001</td>
                                                <td>Proyecto A</td>
                                            </tr>
                                            <tr>
                                                <td>OT001</td>
                                                <td>Proyecto A</td>
                                            </tr>
                                            <tr>
                                                <td>OT002</td>
                                                <td>Proyecto B</td>
                                            </tr>
                                            <tr>
                                                <td>OT003</td>
                                                <td>Proyecto C</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                        <div className="col-xl-6 col-xxl-6 ">
                            <div className="card flex-fill h-100 border border-5">
                                <div className="card-header">
                                    <h4 className="card-title mb-0" style={{ color: "#222E3C" }}>
                                        SGA: Pendientes de Ubicar/Desubicar
                                    </h4>
                                </div>
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
                                            <tr>
                                                <td>OT001</td>
                                                <td>Proyecto A</td>
                                                <td>Juan Pérez</td>
                                            </tr>
                                            <tr>
                                                <td>OT002</td>
                                                <td>Proyecto B</td>
                                                <td>María López</td>
                                            </tr>
                                            <tr>
                                                <td>OT003</td>
                                                <td>Proyecto C</td>
                                                <td>Carlos Gómez</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
};

DashBoard.propTypes = {
    onButtonClick: PropTypes.func.isRequired,
};

export default DashBoard;
