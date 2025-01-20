import {
  MDBFooter,
  MDBContainer,
  MDBRow,
  MDBCol,
  MDBIcon,
} from "mdb-react-ui-kit";
import logo from "../../assets/logo-blanco-novagric-200x146.png";
import "../components_css/Footer.css";

export default function Footer() {
  return (
    <MDBFooter className='nova text-white  mt-4 '>
      <MDBContainer className='p-5'>
        <MDBRow >
          {/* Logo Column */}
          <MDBCol lg='4' md='12' className='mb-1  '>
            <a href='https://novagric.com/' className='text-white me-4'>
            <img 
              src={logo} 
              alt="Logo" 
              style={{ maxHeight: '100px' }}
            />
            </a>
          </MDBCol>

          {/* Social Links Column */}
          <MDBCol lg='4' md='12' className='mb-4 mb-md-0 text-center'>
            <a href='https://twitter.com/novagric' className='text-white me-4'>
              <MDBIcon fab icon='twitter' size='lg'/>
            </a>
            <a href='https://www.google.com/search?q=novagric' className='text-white me-4'>
              <MDBIcon fab icon='google' size='lg'/>
            </a>
            <a href='https://www.instagram.com/novagric/' className='text-white me-4'>
              <MDBIcon fab icon='instagram' size='lg'/>
            </a>
            <a href='https://es.linkedin.com/company/novedades-agricolas-s.a.' className='text-white'>
              <MDBIcon fab icon='linkedin' size='lg'/>
            </a>
          </MDBCol>

          {/* Company Info Column */}
          <MDBCol lg='4' md='11' className='mb-4 mb-md-0 text-center text-lg-end'>
            <h6 className='text-uppercase fw-bold mb-4'>
              <MDBIcon icon='gem' className='me-3' />
              Novedades Agrícolas, S.A.
            </h6>
            <a href='https://novagric.com/documentacion/' className='text-white me-4'>
              Documentación
            </a>
            <a href='https://novagric.com/aviso-legal/' className='text-white me-4'>
              Aviso Legal
            </a>
            <a href='https://novagric.com/politica-privacidad/' className='text-white me-4'>
              Privacidad
            </a>
            <a href='https://novagric.com/politica-de-cookies/' className='text-white me-4'>
              Política de Cookies
            </a>
            <a href='https://novagric.com/canal-etico/' className='text-white'>
              Canal Ético
            </a>
          </MDBCol>
        </MDBRow>
      </MDBContainer>

      <div className='text-center p-3' style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}>
        © 2024 Copyright:
        <a className='text-white' href='https://novagric.com/'>
          {' '}Novagric.com
        </a>
      </div>
    </MDBFooter>
  );
}