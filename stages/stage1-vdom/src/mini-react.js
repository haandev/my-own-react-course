// #region engine
// VDOM'dan gerçek DOM oluştur
function createDOM(vdom) {
  if (typeof vdom === 'string' || typeof vdom === 'number') {
    return document.createTextNode(String(vdom));
  }

  if (vdom == null || typeof vdom === 'boolean') {
    return document.createTextNode('');
  }

  if (typeof vdom.type === 'function') {
    return createDOM(vdom.type(vdom.props || {}));
  }

  const dom = document.createElement(vdom.type);
  updateDOMProperties(dom, {}, vdom.props || {});

  const children = vdom.props?.children || [];
  children.forEach(child => {
    dom.appendChild(createDOM(child));
  });

  return dom;
}

// Props'ları DOM'a uygula
function updateDOMProperties(dom, oldProps, newProps) {
  Object.keys(oldProps).forEach(name => {
    if (name === 'children') return;
    
    if (name.startsWith('on')) {
      const eventType = name.toLowerCase().substring(2);
      dom.removeEventListener(eventType, oldProps[name]);
    } else if (name === 'style') {
      dom.style.cssText = '';
    } else if (name === 'className') {
      dom.className = '';
    } else {
      dom[name] = '';
    }
  });

  Object.keys(newProps).forEach(name => {
    if (name === 'children') return;
    
    if (name.startsWith('on')) {
      const eventType = name.toLowerCase().substring(2);
      dom.addEventListener(eventType, newProps[name]);
    } else if (name === 'style') {
      if (typeof newProps[name] === 'object') {
        Object.assign(dom.style, newProps[name]);
      } else {
        dom.style.cssText = newProps[name];
      }
    } else if (name === 'className') {
      dom.className = newProps[name];
    } else if (typeof newProps[name] === 'boolean') {
      if (newProps[name]) {
        dom.setAttribute(name, '');
      }
    } else {
      dom[name] = newProps[name];
    }
  });
}

// Ana render fonksiyonu
function render(vdom, container) {
  container.innerHTML = '';
  const dom = createDOM(vdom);
  container.appendChild(dom);
}

// f fonksiyonu modifiye edilimiş hali
function f(type, props, ...children) {
  // Props null olabilir
  const safeProps = props || {};
   
  // Flat array (nested array'leri düzleştir)
  children = children.flat(Infinity);
  
  // False, null, undefined'ı filtrele
  children = children.filter(child => {
    return child != null && child !== false && child !== true;
  });
  
  return {
    type,
    props: {
      ...safeProps,
      children
    }
  };
}
// #endregin engine

window.f = f;
window.render = render;