"use strict";

class ParameterChecker {
  constructor() {
    this._error = null;
  }

  get error() {
    // ----------------------------------
    // Error
    // {
    //   code: 'TYPE_INVALID',
    //   message: 'The `age` must be an integer.'
    //   name: 'age',
    // }
    // ---------------------------------
    return this._error;
  }

  isSpecified(value) {
    return value === void 0 ? false : true;
  }

  /* ------------------------------------------------------------------
   * check(obj, rule, required)
   * - Check if the specified object contains valid values
   *
   * [Arguments]
   * - obj      | Object  | Required | Object including parameters you want to check
   * - rules    | Object  | Required | Object including rules for the parameters
   * - required | Boolean | Optional | Flag whther the `obj` is required or not.
   *            |         |          | The default is `false`
   *
   * [Return value]
   * - If the value is valid, this method will return `true`.
   * - If the value is invalid, this method will return `false` and
   *   an `Error` object will be set to `this._error`.
   *
   * [Usage]
   * let valid = parameterChecker.check(params, {
   *   level: {
   *     required: false,
   *     type: 'integer',
   *     max: 100
   *   },
   *   greeting: {
   *     required: true, // But an empty string is allowed.
   *     type: 'string',
   *     max: 20 // the number of characters must be up to 20.
   *   }
   * });
   * if(!valid) {
   *   let e = parameterChecker.error.message;
   *   throw new Error(message);
   * }
   * ---------------------------------------------------------------- */
  check(obj, rules, required = false) {
    this._error = null;
    if (required) {
      if (!this.isSpecified(obj)) {
        this._error = {
          code: "MISSING_REQUIRED",
          message: "The first argument is missing.",
        };
        return false;
      }
    } else {
      if (!obj) {
        return true;
      }
    }

    if (!this.isObject(obj)) {
      this._error = {
        code: "MISSING_REQUIRED",
        message: "The first argument is missing.",
      };
      return false;
    }

    let result = true;
    let name_list = Object.keys(rules);

    for (let i = 0; i < name_list.length; i++) {
      let name = name_list[i];
      let v = obj[name];
      let rule = rules[name];

      if (!rule) {
        rule = {};
      }
      if (!this.isSpecified(v)) {
        if (rule.required) {
          result = false;
          this._error = {
            code: "MISSING_REQUIRED",
            message: "The `" + name + "` is required.",
          };
          break;
        } else {
          continue;
        }
      }

      if (rule.type === "float") {
        result = this.isFloat(v, rule, name);
      } else if (rule.type === "integer") {
        result = this.isInteger(v, rule, name);
      } else if (rule.type === "boolean") {
        result = this.isBoolean(v, rule, name);
      } else if (rule.type === "array") {
        result = this.isArray(v, rule, name);
      } else if (rule.type === "object") {
        result = this.isObject(v, rule, name);
      } else if (rule.type === "string") {
        result = this.isString(v, rule, name);
      } else {
        result = false;
        this._error = {
          code: "TYPE_UNKNOWN",
          message:
            "The rule specified for the `" +
            name +
            "` includes an unknown type: " +
            rule.type,
        };
      }

      if (result === false) {
        this._error.name = name;
        break;
      }
    }

    return result;
  }

  /* ------------------------------------------------------------------
   * isFloat(value, rule, name)
   * - Check if the value is a float
   *
   * [Arguments]
   * - value      | Any     | Required | The value you want to check
   * - rule       | Object  | Optional |
   *   - required | Boolean | Optional | Required or not. Default is `false`.
   *   - min      | Float   | Optional | Minimum number
   *   - max      | Float   | Optional | Maximum number
   *   - enum     | Array   | Optional | list of possible values
   * - name       | String  | Optional | Parameter name
   *
   * If non-number value is specified to the `min` or `max`,
   * they will be ignored.
   *
   * [Return value]
   * - If the value is valid, this method will return `true`.
   * - If the value is invalid, this method will return `false` and
   *   an `Error` object will be set to `this._error`.
   * ---------------------------------------------------------------- */
  isFloat(value, rule = {}, name = "value") {
    this._error = null;

    if (!rule.required && !this.isSpecified(value)) {
      return true;
    }

    if (typeof value !== "number") {
      this._error = {
        code: "TYPE_INVALID",
        message: "The `" + name + "` must be a number (integer or float).",
      };
      return false;
    }

    if (typeof rule.min === "number") {
      if (value < rule.min) {
        this._error = {
          code: "VALUE_UNDERFLOW",
          message:
            "The `" +
            name +
            "` must be grater than or equal to " +
            rule.min +
            ".",
        };
        return false;
      }
    }
    if (typeof rule.max === "number") {
      if (value > rule.max) {
        this._error = {
          code: "VALUE_OVERFLOW",
          message:
            "The `" +
            name +
            "` must be less than or equal to " +
            rule.max +
            ".",
        };
        return false;
      }
    }
    if (Array.isArray(rule.enum) && rule.enum.length > 0) {
      if (rule.enum.indexOf(value) === -1) {
        this._error = {
          code: "ENUM_UNMATCH",
          message:
            "The `" +
            name +
            "` must be any one of " +
            JSON.stringify(rule.enum) +
            ".",
        };
        return false;
      }
    }

    return true;
  }

  /* ------------------------------------------------------------------
   * isInteger(value, rule)
   * - Check if the value is an integer
   *
   * [Arguments]
   * - value      | Any     | Required | The value you want to check
   * - rule       | Object  | Optional |
   *   - required | Boolean | Optional | Required or not. Default is `false`.|
   *   - min      | Float   | Optional | Minimum number
   *   - max      | Float   | Optional | Maximum number
   *   - enum     | Array   | Optional | list of possible values
   * - name       | String  | Optional | Parameter name
   *
   * If non-number value is specified to the `min` or `max`,
   * they will be ignored.
   *
   * [Return value]
   * - If the value is valid, this method will return `true`.
   * - If the value is invalid, this method will return `false` and
   *   an `Error` object will be set to `this._error`.
   * ---------------------------------------------------------------- */
  isInteger(value, rule = {}, name = "value") {
    this._error = null;

    if (!rule.required && !this.isSpecified(value)) {
      return true;
    }

    if (this.isFloat(value, rule)) {
      if (value % 1 === 0) {
        return true;
      } else {
        this._error = {
          code: "TYPE_INVALID",
          message: "The `" + name + "` must be an integer.",
        };
        return false;
      }
    } else {
      return false;
    }
  }

  /* ------------------------------------------------------------------
   * isBoolean(value, rule, name)
   * - Check if the value is a boolean.
   *
   * [Arguments]
   * - value      | Any     | Required | The value you want to check
   * - rule       | Object  | Optional |
   *   - required | Boolean | Optional | Required or not. Default is `false`.
   * - name       | String  | Optional | Parameter name
   *
   * [Return value]
   * - If the value is valid, this method will return `true`.
   * - If the value is invalid, this method will return `false` and
   *   an `Error` object will be set to `this._error`.
   * ---------------------------------------------------------------- */
  isBoolean(value, rule = {}, name = "value") {
    this._error = null;

    if (!rule.required && !this.isSpecified(value)) {
      return true;
    }

    if (typeof value !== "boolean") {
      this._error = {
        code: "TYPE_INVALID",
        message: "The `" + name + "` must be boolean.",
      };
      return false;
    }
    return true;
  }

  /* ------------------------------------------------------------------
   * isObject(value)
   * - Check if the value is an object
   *
   * [Arguments]
   * - value      | Any     | Required | The value you want to check
   * - rule       | Object  | Optional |
   *   - required | Boolean | Optional | Required or not. Default is `false`.
   * - name       | String  | Optional | Parameter name
   *
   * [Return value]
   * - If the value is valid, this method will return `true`.
   * - If the value is invalid, this method will return `false` and
   *   an `Error` object will be set to `this._error`.
   * ---------------------------------------------------------------- */
  isObject(value, rule = {}, name = "value") {
    this._error = null;
    if (!rule.required && !this.isSpecified(value)) {
      return true;
    }

    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      this._error = {
        code: "TYPE_INVALID",
        message: "The `" + name + "` must be an object.",
      };
      return false;
    }
    return true;
  }

  /* ------------------------------------------------------------------
   * isArray(value, rule, name)
   * - Check if the value is an `Array` object
   *
   * [Arguments]
   * - value      | Any     | Required | The value you want to check
   * - rule       | Object  | Optional |
   *   - required | Boolean | Optional | Required or not. Default is `false`.
   *   - min      | Integer | Optional | Minimum number of elements in the array
   *   - max      | Integer | Optional | Maximum number of elements in the array
   * - name       | String  | Optional | Parameter name
   *
   * If non-number value is specified to the `min` or `max`,
   * they will be ignored.
   *
   * [Return value]
   * - If the value is valid, this method will return `true`.
   * - If the value is invalid, this method will return `false` and
   *   an `Error` object will be set to `this._error`.
   * ---------------------------------------------------------------- */
  isArray(value, rule = {}, name = "value") {
    this._error = null;

    if (!rule.required && !this.isSpecified(value)) {
      return true;
    }

    if (!Array.isArray(value)) {
      this._error = {
        code: "TYPE_INVALID",
        message: "The value must be an array.",
      };
      return false;
    }

    if (typeof rule.min === "number") {
      if (value.length < rule.min) {
        this._error = {
          code: "LENGTH_UNDERFLOW",
          message:
            "The number of characters in the `" +
            name +
            "` must be grater than or equal to " +
            rule.min +
            ".",
        };
        return false;
      }
    }
    if (typeof rule.max === "number") {
      if (value.length > rule.max) {
        this._error = {
          code: "LENGTH_OVERFLOW",
          message:
            "The number of characters in the `" +
            name +
            "` must be less than or equal to " +
            rule.max +
            ".",
        };
        return false;
      }
    }

    return true;
  }

  /* ------------------------------------------------------------------
   * isString(value, rule, name)
   * - Check if the value is an `Array` object
   *
   * [Arguments]
   * - value      | Any     | Required | The value you want to check
   * - rule       | Object  | Optional |
   *   - required | Boolean | Optional | Required or not. Default is `false`.
   *   - min      | Integer | Optional | Minimum number of characters in the string
   *   - max      | Integer | Optional | Maximum number of characters in the string
   *   - minBytes | Integer | Optional | Minimum bytes of the string (UTF-8)
   *   - maxBytes | Integer | Optional | Maximum bytes of the string (UTF-8)
   *   - pattern  | RegExp  | Optional | Pattern of the string
   *   - enum     | Array   | Optional | list of possible values
   * - name       | String  | Optional | Parameter name
   *
   * If non-number value is specified to the `min` or `max`,
   * they will be ignored.
   *
   * [Return value]
   * - If the value is valid, this method will return `true`.
   * - If the value is invalid, this method will return `false` and
   *   an `Error` object will be set to `this._error`.
   * ---------------------------------------------------------------- */
  isString(value, rule = {}, name = "value") {
    this._error = null;

    if (!rule.required && !this.isSpecified(value)) {
      return true;
    }

    if (typeof value !== "string") {
      this._error = {
        code: "TYPE_INVALID",
        message: "The value must be a string.",
      };
      return false;
    }

    if (typeof rule.min === "number") {
      if (value.length < rule.min) {
        this._error = {
          code: "LENGTH_UNDERFLOW",
          message:
            "The number of characters in the `" +
            name +
            "` must be grater than or equal to " +
            rule.min +
            ".",
        };
        return false;
      }
    }
    if (typeof rule.max === "number") {
      if (value.length > rule.max) {
        this._error = {
          code: "LENGTH_OVERFLOW",
          message:
            "The number of characters in the `" +
            name +
            "` must be less than or equal to " +
            rule.max +
            ".",
        };
        return false;
      }
    }
    if (typeof rule.minBytes === "number") {
      let blen = Buffer.from(value, "utf8").length;
      if (blen < rule.minBytes) {
        this._error = {
          code: "LENGTH_UNDERFLOW",
          message:
            "The byte length of the `" +
            name +
            "` (" +
            blen +
            " bytes) must be grater than or equal to " +
            rule.minBytes +
            " bytes.",
        };
        return false;
      }
    }
    if (typeof rule.maxBytes === "number") {
      let blen = Buffer.from(value, "utf8").length;
      if (blen > rule.maxBytes) {
        this._error = {
          code: "LENGTH_OVERFLOW",
          message:
            "The byte length of the `" +
            name +
            "` (" +
            blen +
            " bytes) must be less than or equal to " +
            rule.maxBytes +
            " bytes.",
        };
        return false;
      }
    }
    if (rule.pattern instanceof RegExp) {
      if (!rule.pattern.test(v)) {
        this._error = {
          code: "PATTERN_UNMATCH",
          message: "The `" + name + "` does not conform with the pattern.",
        };
        return false;
      }
    }
    if (Array.isArray(rule.enum) && rule.enum.length > 0) {
      if (rule.enum.indexOf(value) === -1) {
        this._error = {
          code: "ENUM_UNMATCH",
          message:
            "The `" +
            name +
            "` must be any one of " +
            JSON.stringify(rule.enum) +
            ".",
        };
        return false;
      }
    }

    return true;
  }
}

module.exports = new ParameterChecker();
