import React from 'react';

function TestApp() {
  console.log('TestApp component rendered!');

  return (
    <div
      style={{
        padding: '20px',
        backgroundColor: '#f0f0f0',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column'
      }}
    >
      <h1 style={{ color: '#333', fontSize: '2rem' }}>Test App is Working!</h1>
      <p style={{ color: '#666' }}>
        If you can see this, React is rendering correctly.
      </p>
      <button
        onClick={() => alert('Button clicked!')}
        style={{
          marginTop: '20px',
          padding: '10px 20px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Click Me
      </button>
    </div>
  );
}

export default TestApp;
