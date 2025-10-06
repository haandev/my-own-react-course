import "./mini-react.js";


let count = 0;

function Counter() {
  return <div className="counter" style={{
    border: '2px solid #61dafb',
    padding: '20px',
    borderRadius: '8px',
    marginTop: '20px'
  }}>
    <h2>Sayaç: {count}</h2>
    <button onClick={() => {
      count++;
      render(f(App), document.querySelector('#root'));
    }}>➕ Artır</button>
    <button onClick={() => {
      count--;
      render(f(App), document.querySelector('#root'));
    }}>➖ Azalt</button>
    <button onClick={() => {
      count = 0;
      render(f(App), document.querySelector('#root'));
    }}>🔄 Sıfırla</button>
  </div>
}

function App() {
  return <div className="app" style={{ padding: '20px', fontFamily: 'Arial' }}>
    <h1 style={{ color: '#61dafb' }}>🚀 Mini React - Virtual DOM</h1>
    <p>Bu uygulama Virtual DOM kullanıyor!</p>
    <Counter />
  </div>
}

// İlk render
render(f(App), document.getElementById('root'));