import { createStore, FletchState } from "fletch-state"

type FletchAction = {
  path: string,
  value: any;
}

type MethodDefinitions = {
  [key:string]: (...args: any[]) => FletchAction | Promise<FletchAction>;
}

type Options = {
  getDefaultMethods?: (state: FletchState) => MethodDefinitions,
  openDelimiter: string,
  closeDelimiter: string,
}

type Template = {
  view: HTMLElement,
  model: HTMLTemplateElement,
}

type Templates = {
  [key:string]: Template;
}

type SprinkleDocument = {
  store: FletchState,
  templates: Templates,
}

const defaultOptions = {
  openDelimiter: "{{",
  closeDelimiter: "}}",
}

const getDefaultMethods = (state: FletchState): MethodDefinitions => {
  return {
    get: async (location: string, params: any = {}) => {
      const queryString = Object.keys(params).map(k => `${k}=${params[k]}`).join("&")
      const response = await fetch(location + queryString, {
        method: "GET",
      }).then(r => r.json())

      return { path: location, value: response };
    },
    post: async (location: string, params: any = {}) => {
      const response = await fetch(location, {
        method: "POST",
        body: JSON.stringify(params)
      }).then(r => r.json())

      return { path: location, value: response }
    },
    put: async (location: string, params: any = {}) => {
      const response = await fetch(location, {
        method: "PUT",
        body: JSON.stringify(params)
      }).then(r => r.json())

      return { path: location, value: response }
    },
    set: (path: string, value: any) => {
      return { path, value };
    },
    toggle: (path: string) => {
      const value = state.retrieve(path);
      return { path, value: !value }
    }
  }
}

const getTemplate = (methods: MethodDefinitions, regex: RegExp) => {
  return (state: any, element: HTMLElement) => {
    // Remove anything with IF
    const conditionalElements = element.querySelectorAll("[data-sprinkle-if]");
    for(const conditionalElement of conditionalElements) {
      const isPresent = new Function("$state", `return !!(${conditionalElement.getAttribute("data-sprinkle-if")})`)(state);
      if (!isPresent) {
        conditionalElement.remove();
      }
    }

    // Iterate over anything with FOR
    const repeatedElements = element.querySelectorAll("[data-sprinkle-for]");
    for(const repeatedElement of repeatedElements) {
      const iterator = new Function("$state", `return ${repeatedElement.getAttribute("data-sprinkle-for")}`)(state);
      repeatedElement.removeAttribute("data-sprinkle-for")
      const innerHTML = iterator.map((item: any) => {
        return repeatedElement.outerHTML.replace(regex, (substring: string) => {
          return new Function("$methods", "$state", "$item", `return ${substring.replace(regex, "$1")}`)(methods, state, item);
        });
      }).join("")
      repeatedElement.innerHTML = innerHTML;
    }

    // Render the inside and the else
    return element.innerHTML.replace(/{{(.*?)}}/g, (substring: string) => {
      return new Function("$methods", "$state", `return ${substring.replace(regex, "$1")}`)(methods, state);
    });
  }
}

export const start = (options: Options = defaultOptions): SprinkleDocument => {
  // Get the regex for value interpolation
  const regex = new RegExp(`^${options.openDelimiter}(.*?)${options.closeDelimiter}`, "gi");

  // Define the default state.
  const store = createStore({});

  // Override the default methods with the given methods.
  const methods = options.getDefaultMethods ? { ...getDefaultMethods(store), ...options.getDefaultMethods(store) } : getDefaultMethods(store);

  // Find all templates labelled as having as a sprinkle element.
  const elements = document.querySelectorAll<HTMLTemplateElement>("template[data-sprinkle-id]");

  // Set the default state to point to the values.
  for(const element of elements) {
    const currentState = element.getAttribute("data-sprinkle-state");
    const id = element.getAttribute("data-sprinkle-id");

    if (currentState) {
      store.commit(id, JSON.parse(currentState))
    }
  }

  const templates: Templates = {};

  for(const element of elements) {
    const id = element.getAttribute("data-sprinkle-id");
    const path = element.getAttribute("data-sprinkle-namespace") || id;
    const compiledElement = document.createElement("div")
    compiledElement.innerHTML = element.innerHTML;
    const getHTML = getTemplate(methods, regex);
    compiledElement.innerHTML = getHTML(store.retrieve(path), compiledElement)
    element.replaceWith(compiledElement)

    store.subscribe(path, () => {
      const replacingElement = document.createElement("div")
      replacingElement.innerHTML = element.innerHTML;
      compiledElement.innerHTML = getHTML(store.retrieve(path), replacingElement)
    });

    templates[id] = {
      view: compiledElement,
      model: element
    }
  }

  // Register the actions
  const actionElements = document.querySelectorAll("[data-sprinkle-actions]");
  for(const element of actionElements) {
    const actions = element.getAttribute("data-sprinkle-actions").split(";");
    for(const action of actions) {
      // The action will be in the format event:action1(params)|action2(params);
      const [trigger, event] = action.split(":");
      element.addEventListener(trigger, (e) => {
        const value = new Function("$methods", "$event", `return $methods.${event}`)(methods, e) as FletchAction;
        if (value) {
          store.commit(value.path, value.value);
        }
      })
    }
  }

  // Register the form listeners
  const forms = document.querySelectorAll("form[data-sprinkle-namespace]")
  for(const form of forms) {
    const path = form.getAttribute("data-sprinkle-namespace")
    const inputs = form.querySelectorAll<HTMLInputElement>("input[name],select[name],textarea[name]");

    for(const input of inputs) {
      input.addEventListener("input", (e) => {
        const currentValue = store.retrieve(path)
        store.commit(path, { ...currentValue, [(e.target as any).name]: (e.target as any).value })
      })
    }
  }

  return { store, templates };
}
