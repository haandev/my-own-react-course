import "./mini-react.js";
function Counter() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    document.title = `Count: ${count}`;
  }, [count]);
  console.log('Counter rendered, count:', count);
  console.log(count)
  return f('div', null, 
      f('h1', null, `Count: ${count}`),
      f('button', { onClick: () => setCount(count + 1)}, 'Increment'),
      f('button', { onClick: () => setCount(c => c - 1)}, 'Decrement'),
      f('button', { onClick: () => setCount(0)}, 'Reset')
  );
}

render(f(Counter), document.getElementById('root'));
