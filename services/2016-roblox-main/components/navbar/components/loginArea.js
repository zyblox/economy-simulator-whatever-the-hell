import React from "react";
import { createUseStyles } from "react-jss";

const useLoginAreaStyles = createUseStyles({
  text: {
    color: 'white',
    fontWeight: 400,
    fontSize: '16px',
    borderBottom: 0,
    marginTop: '2px',
    marginBottom: 0,
    textAlign: 'right',
    whiteSpace: 'nowrap',
  },
  link: {
    color: 'white',
    textDecoration: 'none',
    padding: '4px 8px',
    '&:hover': {
      color: 'white',
      background: 'rgba(25,25,25,0.1)',
      cursor: 'pointer',
      borderRadius: '4px',
    },
  },
});

// Login/Signup are handled by the backend auth pages, so always do a full
// page load - a client side route push would miss them and 404.
const LoginArea = props => {
  const s = useLoginAreaStyles();

  return <div className='row'>
    <div className='col-6 offset-6'>
      <div className='row'>
        <div className='col-6'>
          <p className={s.text}>
            <a className={s.link} href='/auth/signup'>
              Sign Up
            </a>
          </p>
        </div>
        <div className='col-6'>
          <p className={s.text}>
            <a className={s.link} href='/auth/login'>
              Login
            </a>
          </p>
        </div>
      </div>
    </div>
  </div>
}

export default LoginArea;
