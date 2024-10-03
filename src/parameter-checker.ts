/* Copyright(C) 2024, donavanbecker (https://github.com/donavanbecker). All rights reserved.
 *
 * parameter-checker.ts: Switchbot BLE API registration.
 */
import type { ErrorObject } from './types/types.js'

import { Buffer } from 'node:buffer'

interface Rule {
  required?: boolean
  min?: number
  max?: number
  minBytes?: number
  maxBytes?: number
  pattern?: RegExp
  enum?: unknown[]
  type?: 'float' | 'integer' | 'boolean' | 'array' | 'object' | 'string'
}

export class ParameterChecker {
  private _error: ErrorObject | null = null

  /**
   * Gets the current error object.
   *
   * @returns {ErrorObject | null} - The current error object or null if no error.
   */
  get error(): ErrorObject | null {
    return this._error
  }

  /**
   * Checks if the value is specified (not undefined).
   *
   * @param {unknown} value - The value to check.
   * @returns {boolean} - True if the value is specified, false otherwise.
   */
  isSpecified(value: unknown): boolean {
    return value !== undefined
  }

  /**
   * Checks if the specified object contains valid values based on the provided rules.
   *
   * @param {Record<string, unknown>} obj - Object including parameters you want to check.
   * @param {Record<string, Rule>} rules - Object including rules for the parameters.
   * @param {boolean} [required] - Flag whether the `obj` is required or not.
   * @returns {Promise<boolean>} - Resolves to true if the value is valid, false otherwise.
   */
  async check(obj: Record<string, unknown>, rules: Record<string, Rule>, required = false): Promise<boolean> {
    this._error = null

    if (required && !this.isSpecified(obj)) {
      this._error = { code: 'MISSING_REQUIRED', message: 'The first argument is missing.' }
      return false
    }

    if (!required && !obj) {
      return true
    }

    if (!this.isObject(obj, {})) {
      this._error = { code: 'MISSING_REQUIRED', message: 'The first argument is missing.' }
      return false
    }

    for (const [name, rule] of Object.entries(rules)) {
      const value = obj[name]

      if (!this.isSpecified(value)) {
        if (rule.required) {
          this._error = { code: 'MISSING_REQUIRED', message: `The \`${name}\` is required.` }
          return false
        }
        continue
      }

      const typeCheckers: Record<string, (v: unknown, r: Rule, n: string) => Promise<boolean>> = {
        float: this.isFloat.bind(this),
        integer: this.isInteger.bind(this),
        boolean: this.isBoolean.bind(this),
        array: this.isArray.bind(this),
        object: this.isObject.bind(this),
        string: this.isString.bind(this),
      }

      const checker = rule.type && typeCheckers[rule.type]
      if (checker) {
        if (!(await checker(value, rule, name))) {
          return false
        }
      } else {
        this._error = { code: 'TYPE_UNKNOWN', message: `The rule specified for the \`${name}\` includes an unknown type: ${rule.type}` }
        return false
      }
    }

    return true
  }

  /**
   * Checks if the value is a float.
   *
   * @param {unknown} value - The value to check.
   * @param {Rule} rule - The rule object containing validation criteria.
   * @param {string} [name] - The parameter name.
   * @returns {Promise<boolean>} - Resolves to true if the value is valid, false otherwise.
   */
  async isFloat(value: unknown, rule: Rule, name = 'value'): Promise<boolean> {
    this._error = null

    if (!rule.required && !this.isSpecified(value)) {
      return true
    }

    if (typeof value !== 'number') {
      this._error = { code: 'TYPE_INVALID', message: `The \`${name}\` must be a number (integer or float).` }
      return false
    }

    if (typeof rule.min === 'number' && value < rule.min) {
      this._error = { code: 'VALUE_UNDERFLOW', message: `The \`${name}\` must be greater than or equal to ${rule.min}.` }
      return false
    }

    if (typeof rule.max === 'number' && value > rule.max) {
      this._error = { code: 'VALUE_OVERFLOW', message: `The \`${name}\` must be less than or equal to ${rule.max}.` }
      return false
    }

    if (Array.isArray(rule.enum) && !rule.enum.includes(value)) {
      this._error = { code: 'ENUM_UNMATCH', message: `The \`${name}\` must be any one of ${JSON.stringify(rule.enum)}.` }
      return false
    }

    return true
  }

  /**
   * Checks if the value is an integer.
   *
   * @param {unknown} value - The value to check.
   * @param {Rule} rule - The rule object containing validation criteria.
   * @param {string} [name] - The parameter name.
   * @returns {Promise<boolean>} - Resolves to true if the value is valid, false otherwise.
   */
  async isInteger(value: unknown, rule: Rule, name = 'value'): Promise<boolean> {
    this._error = null

    if (!rule.required && !this.isSpecified(value)) {
      return true
    }

    if (Number.isInteger(value)) {
      return true
    }

    this._error = { code: 'TYPE_INVALID', message: `The \`${name}\` must be an integer.` }
    return false
  }

  /**
   * Checks if the value is a boolean.
   *
   * @param {unknown} value - The value to check.
   * @param {Rule} rule - The rule object containing validation criteria.
   * @param {string} [name] - The parameter name.
   * @returns {Promise<boolean>} - Resolves to true if the value is valid, false otherwise.
   */
  async isBoolean(value: unknown, rule: Rule, name = 'value'): Promise<boolean> {
    this._error = null

    if (!rule.required && !this.isSpecified(value)) {
      return true
    }

    if (typeof value !== 'boolean') {
      this._error = { code: 'TYPE_INVALID', message: `The \`${name}\` must be boolean.` }
      return false
    }

    return true
  }

  /**
   * Checks if the value is an object.
   *
   * @param {unknown} value - The value to check.
   * @param {Rule} rule - The rule object containing validation criteria.
   * @param {string} [name] - The parameter name.
   * @returns {Promise<boolean>} - Resolves to true if the value is valid, false otherwise.
   */
  async isObject(value: unknown, rule: Rule, name = 'value'): Promise<boolean> {
    this._error = null

    if (!rule.required && !this.isSpecified(value)) {
      return true
    }

    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      this._error = { code: 'TYPE_INVALID', message: `The \`${name}\` must be an object.` }
      return false
    }

    return true
  }

  /**
   * Checks if the value is an array.
   *
   * @param {unknown} value - The value to check.
   * @param {Rule} rule - The rule object containing validation criteria.
   * @param {string} [name] - The parameter name.
   * @returns {Promise<boolean>} - Resolves to true if the value is valid, false otherwise.
   */
  async isArray(value: unknown, rule: Rule, name = 'value'): Promise<boolean> {
    this._error = null

    if (!rule.required && !this.isSpecified(value)) {
      return true
    }

    if (!Array.isArray(value)) {
      this._error = { code: 'TYPE_INVALID', message: 'The value must be an array.' }
      return false
    }

    if (typeof rule.min === 'number' && value.length < rule.min) {
      this._error = { code: 'LENGTH_UNDERFLOW', message: `The number of elements in the \`${name}\` must be greater than or equal to ${rule.min}.` }
      return false
    }

    if (typeof rule.max === 'number' && value.length > rule.max) {
      this._error = { code: 'LENGTH_OVERFLOW', message: `The number of elements in the \`${name}\` must be less than or equal to ${rule.max}.` }
      return false
    }

    return true
  }

  /**
   * Checks if the value is a string.
   *
   * @param {unknown} value - The value to check.
   * @param {Rule} rule - The rule object containing validation criteria.
   * @param {string} [name] - The parameter name.
   * @returns {Promise<boolean>} - Resolves to true if the value is valid, false otherwise.
   */
  async isString(value: unknown, rule: Rule, name = 'value'): Promise<boolean> {
    this._error = null

    if (!rule.required && !this.isSpecified(value)) {
      return true
    }

    if (typeof value !== 'string') {
      this._error = { code: 'TYPE_INVALID', message: 'The value must be a string.' }
      return false
    }

    if (typeof rule.min === 'number' && value.length < rule.min) {
      this._error = { code: 'LENGTH_UNDERFLOW', message: `The number of characters in the \`${name}\` must be greater than or equal to ${rule.min}.` }
      return false
    }

    if (typeof rule.max === 'number' && value.length > rule.max) {
      this._error = { code: 'LENGTH_OVERFLOW', message: `The number of characters in the \`${name}\` must be less than or equal to ${rule.max}.` }
      return false
    }

    if (typeof rule.minBytes === 'number') {
      const blen = Buffer.from(value, 'utf8').length
      if (blen < rule.minBytes) {
        this._error = { code: 'LENGTH_UNDERFLOW', message: `The byte length of the \`${name}\` (${blen} bytes) must be greater than or equal to ${rule.minBytes} bytes.` }
        return false
      }
    }

    if (typeof rule.maxBytes === 'number') {
      const blen = Buffer.from(value, 'utf8').length
      if (blen > rule.maxBytes) {
        this._error = { code: 'LENGTH_OVERFLOW', message: `The byte length of the \`${name}\` (${blen} bytes) must be less than or equal to ${rule.maxBytes} bytes.` }
        return false
      }
    }

    if (rule.pattern instanceof RegExp && !rule.pattern.test(value)) {
      this._error = { code: 'PATTERN_UNMATCH', message: `The \`${name}\` does not conform with the pattern.` }
      return false
    }

    if (Array.isArray(rule.enum) && !rule.enum.includes(value)) {
      this._error = { code: 'ENUM_UNMATCH', message: `The \`${name}\` must be any one of ${JSON.stringify(rule.enum)}.` }
      return false
    }

    return true
  }
}

export const parameterChecker = new ParameterChecker()
