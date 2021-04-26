
# Sprinkle.js
It's not another JavaScript framework, I swear.
Sprinkle is a tiny (~3KB gzipped) opinionated JavaScript library meant to be used with your server's templating engine.

# Motivation
I've been keeping a really close eye on the awesome work being done at Basecamp towards simplifying the task of creating highly interactive web applications without an over abundance of JavaScript. The Basecamp team argues that the complexity put forth by a JavaScript-heavy front end is, in almost all instances, overkill, and can be covered by a good templating engine with a *sprinkle* of JavaScript.

In my experience, while this is true for 95% of interactions in a typical application, the solutions posed to handle "atypical" interactions (opening a modal, showing / hiding a field after another field is changed) still feel very clunky. The Basecamp team has iterated through many methods to address this gap: server-rendered JavaScript, UJS and remote forms, Turbolinks, StimulusJS and, most recently, Hotwire. While these solutions are all valid, I have the same set of issues with many of them: 

 - They can create a disconnect between the view and view logic.
 - They require you to structure your backend around front-end interactions
 - They require boilerplate JavaScript code to cover simple scenarios.

In thinking about what my ideal complementary JavaScript library would look like, I realized that barebones client-side templating with some common interactions provided by default would bump the above-mentioned 95% of interactions to 99.9%, without ever having to leave an HTML file. Sprinkle is my attempt at making this a reality.

# Installation

```
npm install sprinkle-dom

or

yarn add sprinkle-dom
```

Then import it:

```
// CommonJS
const sprinkle = require('sprinkle-dom');

// ES6 imports
import sprinkle from 'sprinkle-dom';
```

# Usage

### Start

When the page or content loads, call `sprinkle.start()`.

The goal of Sprinkle is to write the least amount of JavaScript possible. Usage is mostly through HTML.

In the body of your HTML code, define a template with a `data-sprinkle-id`. This will be rendered when `start` is called, as well as upon state change. Initial state can optionally be defined in `data-sprinkle-state`.

```
<template data-sprinkle-id="name-renderer" data-sprinkle-state="{ \"name\": \"value\" }">
  <div>
    The current value of name is: {{= self.name }}
  </div>
</template>

// This renders the text "The current name value is: value"
```
The above is rendered when `sprinkle.start()` is called. The template element is replaced by its contents.

Internal state is managed by fletch and uses the same refresh criteria and accessor notation. Summarized, state can be thought of as using paths to access objects. A state updates when its root path is changed with a `commit`.

Templating is managed by doT.js. You can override the options for doT by passing the value `dotTemplateSettings`:

```
sprinkle.start({
  dotTemplateSettings: {
    varname: 'item',
  }
})
```

### Event bindings

You can bind events to actions by using the `data-sprinkle-actions` attribute. Sprinkle provides some common actions by default, and allows you to define more in the `start` method.

```
<template data-sprinkle-id="name-renderer" data-sprinkle-state="{ \"name\": \"value\" }">
  <div>
    The current value of name is: {{= self.name }}
  </div>
</template>
<button data-sprinkle-actions="click:set('name-renderer/name', 'a different value.')">

// When the button is clicked, the text changes to "The current name value is: a different value"
```

Sprinkle has the following actions available by default:

- `set(path, value)`: Sets the item at `path` in the state to a given `value`
- `toggle(path)`: Toggles the value at the given path.
- `get(location, parameters)`: Performs a get request with the given `parameters`. The response is stored at path `location`.
- `post(location, parameters)`: Performs a post request with the given `parameters`. The response is stored at path `location`.
- `put(location, parameters)`: Performs a put request with the given `parameters`. The response is stored at path `location`.
- `delete(location, parameters)`: Performs a delete request with the given `parameters`. The response is stored at path `location`.

You can add your own methods by specifying a `getDefaultMethods` parameter to the `start` method:

```
sprinkle.start({
  getDefaultMethods: (store) => ({
    reset: (path) => {
      return { path, value: {} }
    }
  })
})

// You can now do the below:
<button data-sprinkle-actions="click:reset()">
```

Notice that the getDefaultMethod accepts the `fletch` store as a parameter. This allows you to access the state in your custom methods.

Notice also that the return value is in format `{ path: string, value: object }`. This means that location `path` is updated with `value`. Return null to perform an action that does not update the state.

### Forms

Sprinkle will listen to changes on any `form` with the `data-sprinkle-namespace` attribute set. This is done by listening to the `input` event on the form's `input`, `select`, or `textarea` elements, and adding the corresponding `value` to the location defined in `data-sprinkle-namespace`.

```
<template data-sprinkle-id="renderer" data-sprinkle-state="{ \"response\": \"test\" }">
  <div>
    The response value is: {{= self.response }}
  </div>
</template>
<form data-sprinkle-namespace="renderer">
  <input name="response">
</form>
// On typing "a new response" into the input, the text changes to "The response value is: a new response"
```
