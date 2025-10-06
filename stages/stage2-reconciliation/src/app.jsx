import "./mini-react.js";
let inputValue = '';
let todos = [
  { id: 1, text: 'React öğren'},
  { id: 2, text: 'Blog yaz' }
];

function TodoApp() {

  return <div className="todo-app">
    <h1>📝 Todo App</h1>
    <input type="text" value={inputValue} placeholder="Yeni todo..." onInput={(e) => {
      inputValue = e.target.value;
      console.log(inputValue)
      render(f(TodoApp), document.querySelector('#root'));
    }} />
    <button onClick={(e) => {
      console.log(todos)
      if (inputValue.trim()) {
        todos.push({
          id: Date.now(),
          text: inputValue
        });
        inputValue = '';
        render(f(TodoApp), document.querySelector('#root'));
      }
    }}>Ekle</button>
    <ul>
      {todos.map(todo => (
        <li key={todo.id}>
          <span>{todo.text}</span>
          <button onClick={() => {
            todos = todos.filter(t => t.id !== todo.id);
            render(f(TodoApp), document.querySelector('#root'));
          }
          }>🗑️</button>
        </li>
      ))}
    </ul>
  </div>
}

render(f(TodoApp), document.querySelector('#root'));