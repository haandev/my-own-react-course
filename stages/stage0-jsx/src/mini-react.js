// #region engine
function render(element, container) {
    // Eğer element bir string veya sayı ise
    if (typeof element === "string" || typeof element === "number") {
      container.appendChild(document.createTextNode(element));
      return;
    }
  
    // Eğer element bir function component ise
    if (typeof element.type === "function") {
      const componentElement = element.type(element.props || {});
      return render(componentElement, container);
    }
  
    // Normal HTML element
    const dom = document.createElement(element.type);
  
    // burada children propu diğerlerinden ayırdık
    const {children, ...props} = element.props
  
    // Props ekle
    for (const [key, value] of Object.entries(props || {})) {
      dom[key] = value;
    }
  
    // Çocukları render et. children her zaman array.
    // bunu f fonksiyonundan dönerken garanti edeceğiz
    children.forEach(child => render(child, dom));
  
    container.appendChild(dom);
  }
  
  // f fonksiyonu modifiye edilimiş hali
  function f(type, props, ...children){
    props = props || {};
    props.children = children;
    return { type, props }
  }
  // #endregin engine

  window.f = f 
  window.render = render