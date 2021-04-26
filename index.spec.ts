import { start } from "./";
import { fireEvent, getByText } from "@testing-library/dom"
import "@testing-library/jest-dom";

const render = (html: string) => {
  const element = document.createElement("div");
  element.innerHTML = html;
  document.body.appendChild(element)
  return element;
}

describe("#start", () => {
  it("renders the default state and updates when things change", () => {
    const element = render(`
      <template data-sprinkle-id="name" data-sprinkle-state='{ "name": "unmutated." }'>
        <div>This is {{= it.name }}</div>
      </template>
      <button data-sprinkle-actions="click:set('name/name', 'now mutated.')">Mutate</button>
    `)
    start()

    expect(getByText(element, "This is unmutated.")).toBeInTheDocument();
    document.querySelector<HTMLInputElement>("button").click()

    expect(getByText(element, "This is now mutated.")).toBeInTheDocument()
  })

  xit("renders the proper namespace", () => {
    const element = render(`
      <template data-sprinkle-namespace="othername" data-sprinkle-id="name" data-sprinkle-state='{ "name": "unmutated." }'>
        <div>This is namespaced and {{= it.name }}</div>
      </template>
      <button data-sprinkle-actions="click:set('othername/name', 'now mutated.')">Mutate</button>
    `)
    start()

    expect(getByText(element, "This is namespaced and unmutated.")).toBeInTheDocument();
    document.querySelector<HTMLInputElement>("button").click()

    expect(getByText(element, "This is namespaced and now mutated.")).toBeInTheDocument()
  })
})

describe("form", () => {
  it("stores the state from form states", () => {
    const element = render(`
      <template data-sprinkle-id="name" data-sprinkle-state='{ "name": "uninput." }'>
        <div>This is {{= it.name }}</div>
      </template>
      <form data-sprinkle-namespace="name">
        <input name="name">
      </form>
    `)
    start()

    expect(getByText(element, "This is uninput.")).toBeInTheDocument();
    fireEvent.input(document.querySelector<HTMLInputElement>("input"), { target: { value: "now input." }})

    expect(getByText(element, "This is now input.")).toBeInTheDocument()
  })
})
