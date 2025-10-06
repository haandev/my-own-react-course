import "./mini-react.js";

function Welcome(props) {
  return f("h1", null, `Hello, ${props.name}`);
}

const app = (
  <div id="app">
    <Welcome name="John" />
    <p>JSX rendered with vanilla JS</p>
  </div>
)
render(app, document.getElementById("app"));