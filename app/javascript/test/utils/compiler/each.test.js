import { evaluateEachLoops, parseArrayValues } from "@utils/compiler/each"
import { workshopConstants } from "@stores/editor"
import { disregardWhitespace } from "@test/helpers/text"
import { describe, it, expect, afterEach } from "vitest"

describe("for.js", () => {
  afterEach(() => {
    workshopConstants.set({})
  })

  describe("evaluateEachLoops", () => {
    it("Should evaluate a simple each loop", () => {
      const input = `@each (thing in [one, two, three]) {
        Each.thing;
      }`
      const expectedOutput = `
        one;
        two;
        three;
      `
      expect(disregardWhitespace(evaluateEachLoops(input))).toBe(disregardWhitespace(expectedOutput))
    })

    it("Should include iterator by default", () => {
      const input = `@each (thing in [one, two, three]) {
        Each.thing = Each.i;
      }`
      const expectedOutput = `
        one = 0;
        two = 1;
        three = 2;
      `
      expect(disregardWhitespace(evaluateEachLoops(input))).toBe(disregardWhitespace(expectedOutput))
    })

    it("Should be able to rename iterator", () => {
      const input = `@each (thing, j in [one, two, three]) {
        Each.thing = Each.j;
      }`
      const expectedOutput = `
        one = 0;
        two = 1;
        three = 2;
      `
      expect(disregardWhitespace(evaluateEachLoops(input))).toBe(disregardWhitespace(expectedOutput))
    })

    it("Should be able use constants from store as arrays", () => {
      workshopConstants.set({ Test: { One: { "en-US": "one" }, Two: { "en-US": "two" }, Three: { "en-US": "three" }}})
      const input = `@each (thing in Constant.Test) {
        Each.thing;
      }`
      const expectedOutput = `
        one;
        two;
        three;
      `
      expect(disregardWhitespace(evaluateEachLoops(input))).toBe(disregardWhitespace(expectedOutput))
    })

    it("Should be able use new lines inside array literals", () => {
      const input = `@each (thing in [
        one,
        two,
        three
      ]) {
        Each.thing;
      }`
      const expectedOutput = `
        one;
        two;
        three;
      `
      expect(disregardWhitespace(evaluateEachLoops(input))).toBe(disregardWhitespace(expectedOutput))
    })

    it("Should be able handle each loop individually", () => {
      const input = `
        @each (thing in [loop1]) {
          Each.thing;
        }

        @each (thing in [loop2]) {
          Each.thing;
        }
      `
      const expectedOutput = `
        loop1;

        loop2;
      `
      expect(disregardWhitespace(evaluateEachLoops(input))).toBe(disregardWhitespace(expectedOutput))
    })

    it("Should be able handle inner loops", () => {
      const input = `
        @each (innerArray in [[a, b], [c, d]]) {
          @each (value in Each.innerArray) {
            Each.value;
          }
          ---
        }
      `
      const expectedOutput = `
        a;
        b;
        ---
        c;
        d;
        ---
      `
      expect(disregardWhitespace(evaluateEachLoops(input))).toBe(disregardWhitespace(expectedOutput))
    })
  })

  describe("parseArrayValues", () => {
    it("Should parse array values correctly", () => {
      const input = "1, 2, 3"
      const expected = ["1", "2", "3"]
      expect(parseArrayValues(input)).toEqual(expected)
    })

    it("Should skip values in parenthesis", () => {
      const input = "1, (2, 3), 4"
      const expected = ["1", "(2, 3)", "4"]
      expect(parseArrayValues(input)).toEqual(expected)
    })

    it("Should skip values in brackets", () => {
      const input = "1, [2, 3], 4"
      const expected = ["1", "[2, 3]", "4"]
      expect(parseArrayValues(input)).toEqual(expected)
    })

    it("Should skip values in parenthesis and brackets", () => {
      const input = "1, (2, [3, 4]), 5"
      const expected = ["1", "(2, [3, 4])", "5"]
      expect(parseArrayValues(input)).toEqual(expected)
    })

    it("Should ignore [linemarker]s", () => {
      const input = "\n[linemarker]itemID|2[/linemarker]\t\t1, 2, 3\n[linemarker]itemID|3[/linemarker]\t\t"
      const expected = ["1", "2", "3"]
      expect(parseArrayValues(input)).toEqual(expected)
    })
  })
})
