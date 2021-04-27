import { createStore, FletchState } from "fletch-state"
import * as dot from 'dot'

type FletchAction = {
  path: string,
  value: any;
}

type MethodDefinitions = {
  [key:string]: (...args: any[]) => FletchAction | Promise<FletchAction>;
}

type Options = {
  getDefaultMethods?: (state: FletchState) => MethodDefinitions,
  dotTemplateSettings?: Partial<dot.TemplateSettings>,
}

type Template = {
  view: HTMLTemplateElement,
  model: HTMLElement,
}

type Templates = {
  [key:string]: Template;
}

type SprinkleDocument = {
  store: FletchState,
  templates: Templates,
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

export const start = (options: Options = {}): SprinkleDocument => {
  dot.templateSettings.varname = "self";
  if (options.dotTemplateSettings) {
    const keys = Object.keys(options.dotTemplateSettings);
    // This was a readonly setting. Assign the values here.
    for(const key of keys) {
      options.dotTemplateSettings[key] = options.dotTemplateSettings[key];
    }
  }

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
    const getHTML = dot.template(element.innerHTML);
    const compiledElement = document.createElement("div")
    compiledElement.innerHTML = getHTML(store.retrieve(path))
    element.replaceWith(compiledElement)

    store.subscribe(path, () => {
      compiledElement.innerHTML = getHTML(store.retrieve(path))
    });

    templates[id] = {
      view: element,
      model: compiledElement
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
