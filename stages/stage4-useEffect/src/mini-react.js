// mini-react.js - Event listener memory leak fix
// #region engine

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
  
  // Event listener store için
  dom._listeners = {};
  
  updateDOMProperties(dom, {}, vdom.props || {});

  const children = vdom.props?.children || [];
  children.forEach(child => {
    dom.appendChild(createDOM(child));
  });

  return dom;
}

function updateDOMProperties(dom, oldProps, newProps) {
  if (!dom) return;
  
  if (!dom._listeners) {
    dom._listeners = {};
  }
  
  // Remove old properties
  Object.keys(oldProps).forEach(name => {
    if (name === 'children' || name === 'key') return;
    
    if (name.startsWith('on')) {
      const eventType = name.toLowerCase().substring(2);
      
      // bunu her render halinde aynı fonksiyonları tekrar event listenere eklediği için yapıyoruz.
      // eski fonksiyonu sileceğiz. aşağıda yenisini ekleyelim. 
      if (dom._listeners[eventType]) {
        dom.removeEventListener(eventType, dom._listeners[eventType]);
        delete dom._listeners[eventType];
      }
    } else if (!newProps.hasOwnProperty(name)) {
      // Remove attribute if not in new props
      if (name === 'className') {
        dom.className = '';
      } else if (name === 'value') {
        dom.value = '';
      } else if (name === 'checked') {
        dom.checked = false;
      } else {
        dom.removeAttribute(name);
      }
    }
  });

  // yeni props
  Object.keys(newProps).forEach(name => {
    if (name === 'children' || name === 'key') return;
    
    if (name.startsWith('on')) {
      const eventType = name.toLowerCase().substring(2);
      
      if (dom._listeners[eventType]) {
        dom.removeEventListener(eventType, dom._listeners[eventType]);
      }
      
      dom._listeners[eventType] = newProps[name];
      dom.addEventListener(eventType, newProps[name]);
      
    } else {
      if (oldProps[name] === newProps[name]) {
        return;
      }
      
      if (name === 'style') {
        if (typeof newProps[name] === 'object') {
          Object.assign(dom.style, newProps[name]);
        } else {
          dom.style.cssText = newProps[name];
        }
      } else if (name === 'className') {
        dom.className = newProps[name];
      } else if (name === 'value') {
        if (dom.value !== newProps[name]) {
          dom.value = newProps[name];
        }
      } else if (name === 'checked') {
        if (dom.checked !== newProps[name]) {
          dom.checked = newProps[name];
        }
      } else {
        dom.setAttribute(name, String(newProps[name]));
      }
    }
  });
}
function cleanupComponent(componentFunc) {
  const hooks = componentHooks.get(componentFunc);
  
  if (hooks) {
    // Tüm effect cleanup'larını çalıştır
    hooks.forEach(hook => {
      if (hook?.cleanup) {
        hook.cleanup();
      }
    });
    
    // Hook'ları temizle
    componentHooks.delete(componentFunc);
  }
}
function reconcile(parentDOM, oldVdom, newVdom, index = 0) {
  // Durum 1: Yeni element yok → Eski elementi sil
  if (newVdom == null && oldVdom != null) {
    const nodeToRemove = parentDOM.childNodes[index];
    if (nodeToRemove) {
      // Function component ise cleanup'larını çalıştır
      // !! DİKKAT !! burayı şimdi ekledik.
      if (typeof oldVdom.type === 'function') {
        cleanupComponent(oldVdom.type);
      }
      // Event listener'ları sil
      if (nodeToRemove._listeners) {
        Object.keys(nodeToRemove._listeners).forEach(eventType => {
          nodeToRemove.removeEventListener(eventType, nodeToRemove._listeners[eventType]);
        });
      }
      parentDOM.removeChild(nodeToRemove);
    }
    return;
  }

  // Durum 2: Eski element yok → Yeni elementi ekle
  if (oldVdom == null && newVdom != null) {
    const newDOM = createDOM(newVdom);
    if (index >= parentDOM.childNodes.length) {
      parentDOM.appendChild(newDOM);
    } else {
      parentDOM.insertBefore(newDOM, parentDOM.childNodes[index]);
    }
    return;
  }

  // Durum 3: Her iki element de null
  if (oldVdom == null && newVdom == null) {
    return;
  }

  // Durum 4: Tip değişti - replace
  if (typeof oldVdom !== typeof newVdom || 
      (typeof oldVdom === 'object' && oldVdom.type !== newVdom.type)) {
    const newDOM = createDOM(newVdom);
    const oldNode = parentDOM.childNodes[index];
    if (oldNode) {
      // Event listener'ları sil
      if (oldNode._listeners) {
        Object.keys(oldNode._listeners).forEach(eventType => {
          oldNode.removeEventListener(eventType, oldNode._listeners[eventType]);
        });
      }
      parentDOM.replaceChild(newDOM, oldNode);
    } else {
      parentDOM.appendChild(newDOM);
    }
    return;
  }

  // Durum 5: Metin node, sadece içeriği güncelle
  if (typeof newVdom === 'string' || typeof newVdom === 'number') {
    const textNode = parentDOM.childNodes[index];
    if (textNode && textNode.nodeValue !== String(newVdom)) {
      textNode.nodeValue = String(newVdom);
    }
    return;
  }

  // Durum 6: Function component, recursive olarak reconcile et
  if (typeof newVdom.type === 'function') {
    const oldResult = typeof oldVdom.type === 'function' 
      ? oldVdom.type(oldVdom.props || {})
      : null;
    const newResult = newVdom.type(newVdom.props || {});
    reconcile(parentDOM, oldResult, newResult, index);
    return;
  }

  // Durum 7: Regular element - props ve children'ı güncelle
  const dom = parentDOM.childNodes[index];
  if (!dom) {
    parentDOM.appendChild(createDOM(newVdom));
    return;
  }

  //kendi propslarını güncelle
  updateDOMProperties(dom, oldVdom.props || {}, newVdom.props || {});
  
  const oldChildren = oldVdom.props?.children || [];
  const newChildren = newVdom.props?.children || [];
  
  reconcileChildren(dom, oldChildren, newChildren);
}

function reconcileChildren(parentDOM, oldChildren, newChildren) {
  // Key map oluştur
  const oldKeyedChildren = new Map();
  const oldChildrenWithoutKey = [];
  
  oldChildren.forEach((child, index) => {
    if (child?.props?.key != null) {
      oldKeyedChildren.set(child.props.key, { child, index });
    } else {
      oldChildrenWithoutKey.push({ child, index });
    }
  });

  // Yeni children'ı işle
  let oldChildIndex = 0;
  
  newChildren.forEach((newChild, newIndex) => {
    let oldChild = null;
    let oldIndex = newIndex;

    // Key varsa, aynı key'e sahip eski child'ı bul
    if (newChild?.props?.key != null) {
      const found = oldKeyedChildren.get(newChild.props.key);
      if (found) {
        oldChild = found.child;
        oldIndex = found.index;
      }
    } else {
      // Key yoksa, sıradaki key'siz eski child'ı kullan
      if (oldChildIndex < oldChildrenWithoutKey.length) {
        const found = oldChildrenWithoutKey[oldChildIndex];
        oldChild = found.child;
        oldIndex = found.index;
        oldChildIndex++;
      }
    }

    // Reconcile et
    reconcile(parentDOM, oldChild, newChild, newIndex);
    
    // Eğer element yer değiştirdiyse, DOM'da da taşı
    if (oldChild && oldIndex !== newIndex) {
      const currentNode = parentDOM.childNodes[oldIndex];
      const targetNode = parentDOM.childNodes[newIndex];
      
      if (currentNode && targetNode && currentNode !== targetNode) {
        parentDOM.insertBefore(currentNode, targetNode);
      }
    }
  });

  // Fazla kalan eski children'ı sil
  if (oldChildren.length > newChildren.length) {
    for (let i = oldChildren.length - 1; i >= newChildren.length; i--) {
      if (parentDOM.childNodes[i]) {
        parentDOM.removeChild(parentDOM.childNodes[i]);
      }
    }
  }
}

const containerVdomMap = new WeakMap();

let isRendering = false;
let renderCount = 0;
let lastRenderTime = Date.now();

function renderNode(vdom, container) {
  if (isRendering) {
    console.warn('Render tamamlanmadan yeni render çağrıldı');
    return;
  }
  
  isRendering = true;
  
  try {
    const prevVdom = containerVdomMap.get(container);
    
    if (!prevVdom) {
      container.innerHTML = '';
      const dom = createDOM(vdom);
      container.appendChild(dom);
    } else {
      reconcile(container, prevVdom, vdom, 0);
    }
    
    containerVdomMap.set(container, vdom);
    queueMicrotask(flushEffects);
  } finally {
    isRendering = false;
  }
}
let currentRoot = null;
let currentRootVdom = null;
let isRenderScheduled = false;
// Her component instance için hook state'i
let currentComponent = null; // Şu anda render edilen component,
//her "render" çağrısı değiştirir
let hookIndex = 0; // Hangi hook'u çağırıyoruz?

const componentHooks = new WeakMap(); // Component → hooks mapping

function getComponentHooks() {
  if (!componentHooks.has(currentComponent)) {
    componentHooks.set(currentComponent, []);
  }
  return componentHooks.get(currentComponent);
}
function render(vdom, container) {
  // Root VDOM'u sakla (re-render için)
  currentRootVdom = vdom;
  currentRoot = container;
  
  // Function component ise, hook sistemi için currentComponent set et
  if (typeof vdom.type === 'function') {
    currentComponent = vdom.type;
    hookIndex = 0;
  }
  
  renderNode(vdom, container);
  
  currentComponent = null;
}
function scheduleRerender() {
  if (isRenderScheduled) return;
  
  isRenderScheduled = true;
  
  // Micro-task queue kullan (React gerçekte scheduler kullanır)
  queueMicrotask(() => {
    isRenderScheduled = false;
    
    if (currentRootVdom && currentRoot) {
      render(currentRootVdom, currentRoot);
    }
  });
}
function useState(initialValue) {
  const hooks = getComponentHooks();
  const currentHookIndex = hookIndex;
  
  // Bu hook daha önce çağrıldı mı?
  if (hooks[currentHookIndex] === undefined) {
    // İlk çağrı: Initialize
    hooks[currentHookIndex] = {
      value: typeof initialValue === 'function' 
        ? initialValue() 
        : initialValue
    };
  }
  
  const hook = hooks[currentHookIndex];
  hookIndex++; // Sonraki hook için index artır
  
  // setState fonksiyonu
  const setState = (newValue) => {
    // Functional update desteği
    const nextValue = typeof newValue === 'function'
      ? newValue(hook.value)
      : newValue;
    
    // Değer değişmediyse render etme (optimization)
    if (Object.is(hook.value, nextValue)) {
      return;
    }
    
    hook.value = nextValue;
    
    // Re-render tetikle
    scheduleRerender();
  };
  
  return [hook.value, setState];
}
function useEffect(effectFunction, deps) {
  const hooks = getComponentHooks();
  const currentHookIndex = hookIndex;
  
  // Bu effect daha önce çağrıldı mı?
  const oldHook = hooks[currentHookIndex];
  
  // Dependency'leri karşılaştır
  const hasNoDeps = !deps; // deps verilmedi
  const depsChanged = oldHook
    ? !deps || !areDepsEqual(oldHook.deps, deps)
    : true; // İlk render
  
  if (hasNoDeps || depsChanged) {
    // Effect'i schedule et (render sonrası çalışsın)
    scheduleEffect(() => {
      // Eski cleanup varsa çalıştır
      if (oldHook?.cleanup) {
        oldHook.cleanup();
      }
      
      // Yeni effect'i çalıştır ve cleanup'ı sakla
      const cleanup = effectFunction();
      hooks[currentHookIndex] = {
        deps,
        cleanup: typeof cleanup === 'function' ? cleanup : null
      };
    });
  } else {
    // Deps değişmedi, eski hook'u koru
    hooks[currentHookIndex] = oldHook;
  }
  
  hookIndex++;
}

function areDepsEqual(oldDeps, newDeps) {
  // Uzunluklar farklıysa değişmiş
  if (oldDeps.length !== newDeps.length) {
    return false;
  }
  
  // Her bir dependency'yi Object.is ile karşılaştır
  for (let i = 0; i < oldDeps.length; i++) {
    if (!Object.is(oldDeps[i], newDeps[i])) {
      return false;
    }
  }
  
  return true;
}
let effectQueue = [];
let isFlushingEffects = false;

function scheduleEffect(effectFn) {
  effectQueue.push(effectFn);
  
  if (!isFlushingEffects) {
    // Render bitince effect'leri çalıştır
    queueMicrotask(flushEffects);
  }
}

function flushEffects() {
  isFlushingEffects = true;
  
  // Tüm bekleyen effect'leri çalıştır
  while (effectQueue.length > 0) {
    const effect = effectQueue.shift();
    effect();
  }
  
  isFlushingEffects = false;
}
function f(type, props, ...children) {
  const safeProps = props || {};
   
  children = children.flat(Infinity);
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

// #endregion engine

window.f = f;
window.render = render;
window.useState = useState;
window.useEffect = useEffect;