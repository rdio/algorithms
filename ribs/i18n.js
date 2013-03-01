/*jslint evil: true */
/*globals _ Locale */

/**
 * Locale
 *
 * Specifies properties for I18n and R.Date.
 **/

/**
 * Locale#currency -> Object
 *
 * An object containing currencies with their position (`undefined` or
 * `"end"`) and their symbol (e.g. `"$"`).
 *
 * @example
 *     currency: {
 *       usd: {
 *         position: undefined,
 *         symbol: "$"
 *       }
 *     }
 **/

/**
 * Locale#currencyForCountryCode -> Object
 *
 * An object of country codes with their respective currencies.
 *
 * @example
 *     currencyForCountryCode: {
 *       us: "usd"
 *     }
 **/

/**
 * Locale#defaultCurrencyCode -> String
 *
 * The currency code to default to if one is not found for a country code.
 *
 * @example
 * `defaultCurrencyCode: "usd"`
 **/

/**
 * Locale#longDate -> String
 *
 * Long data format to use for `R.Date.formatLongDate`.
 *
 * @example
 * `longDate: "%B %-d, %Y"`
 **/

/**
 * Locale#number -> Object
 *
 * Properties for number formatting. Properties:
 *   - `decimal`: Decimal character to use.
 *   - `delimiter`: Delimiter character to use.
 *   - `delimiterPos`: The number of digits between delimiters.
 *
 * @example
 *     number: {
 *       decimal: ".",
 *       delimiter: ",",
 *       delimiterPos: 3
 *     }
 **/

/**
 * Locale#percent -> String
 *
 * Suffix for percent strings. For instance, de_DE uses a space
 * between number and % sign so the percent formatting string is:
 *
 * @example
 *     percent: ' %'
 **/

/**
 * Locale#pluralizationRules -> Array
 *
 * Rules for evaluating plural translations.
 *
 * @example
 *     pluralizationRules: [
 *       "num == 1",
 *       "true"
 *     ]
 **/

/**
 * Locale#shortDate -> String
 *
 * Short data format to use for `R.Date.formatShortDate`.
 *
 * @example
 * `shortDate: "%m/%d/%y"`
 **/

/**
 * Locale#strings -> Object
 *
 * Object containing translations. Translations are a key of the original
 * text to translate and a `Function` or `Array` (if plural).
 *
 * @example
 * `strings: {}`
 **/

/**
 * Locale#timeFormat -> String
 *
 * Default format for `"X"` format in strftime.
 *
 * @example
 * `timeFormat: "%I:%M %p"`
 **/

/**
 * I18n
 *
 * Namespace for internationalization functions.
 *
 * Depends on [underscore.js][1] and a `Locale` object (to be documented).
 *
 * [1]: http://documentcloud.github.com/underscore/
 **/
var I18n = function() {
  // Add trim method for IE8 support
  if (!String.prototype.trim) {
    if (typeof $ == 'undefined' || !$.trim) {
      throw new Error("i18n.js must be loaded after jquery.")
    }
    String.prototype.trim = function() {
      return $.trim(this);
    };
  }

  var log = function() {
    if (typeof console !== 'undefined' && console.log) {
      console.log.apply(console, arguments);
    }
  };

  var error = function() {
    if (typeof console !== 'undefined' && console.error) {
      console.error.apply(console, arguments);
    }
  };

  var decimalRegex = /[^0-9]/,

  templateSettings = {
    image: /!\[\[(.+?)\]\]\((.+?)\)/g,
    link: /\[\[(.+?)\]\]\((.+?)\)/g,
    interpolate: /\[(.+?)\]/g,
    bold: /\*(.+?)\*/g
  },
  strings;

  if (!this.Locale) {
    throw Error("Error initializing Locale");
  }

  strings = Locale.strings;

  /* This is taken wholesale from underscore, but adapted to support more tags */

  // JavaScript micro-templating, similar to John Resig's implementation.
  // Underscore templating handles arbitrary delimiters, preserves whitespace,
  // and correctly escapes quotes within interpolated code.
  function template(str, data) {
    var tmpl = 'var __p=[],print=function(){__p.push.apply(__p,arguments);};' +
      'with(obj||{}){__p.push(\'' +
      str.replace(/\\/g, '\\\\')
         .replace(/'/g, "\\'")
         .replace(templateSettings.image, function(match, alt, key) {
           var subkey = "typeof " + key + " === 'undefined' ? '' : " + key;
           return "<img src=\"'," + subkey + ".src ||" + key + ",'\" width=\"'," + subkey + ".width || \"\", '\" height=\"'," + subkey + ".height || \"\",'\" alt=\"" + alt.trim() + "\" />";
         })
         .replace(templateSettings.link, function(match, words, key) {
           var subkey = "typeof " + key + " === 'undefined' ? '' : " + key;
           return "<a href=\"'," + subkey + ".href || " + key + ",'\" target=\"'," + subkey + ".target || \"_self\",'\" id=\"'," + subkey +".id || \"\",'\" class=\"'," + subkey + ".className || '', '\" title=\"'," + subkey +".title || '', '\">" + words.trim() + "</a>";
         })
         .replace(templateSettings.interpolate, function(match, code) {
           return "'," + code.replace(/\\'/g, "'") + ",'";
         })
         .replace(templateSettings.bold, function(match, words) {
           return "<b>" + words + "</b>";
         })
         .replace(/\r/g, '\\r')
         .replace(/\n/g, '\\n')
         .replace(/\t/g, '\\t') +
           "');}return __p.join('');",
    func = new Function('obj', tmpl);
    return data ? func(data) : func;
  }

  /* end of stealing from underscore */

  // precompile templates for extra fastness
  function compileStrings() {
    // console.time('compile strings');
    _.each(Locale.strings, function(translation, english) {
      if (_.isString(translation)) {
        try {
          strings[english] = template(translation);
        } catch(exc1) {
          strings[english] = template(english);
        }
      } else if (_.isArray(translation)) {
        try {
          strings[english] = _.map(translation, function(s) {
            return template(s);
          });
        } catch(exc2) {
          strings[english] = undefined; // we'll fall back to english
        }
      } else {
        _.each(translation, function(t, form) {
          try {
            translation[form] = template(t);
          } catch(e) {
            // we'll fall back to another form or english
            translation[form] = undefined;
          }
        });
        strings[english] = translation;
      }
    });
    // console.timeEnd('compile strings');
  }

  try {
    compileStrings();
  } catch(e) {
    error('Could not compile strings! Site will be english.', e);
  }

  function pluralize(s, data) {
    var len, i, pList, pConditions, pCondition, pForm, num;

    if (!_.isNumber(data.num)) {
      throw new TypeError("must provide number of objects for plurals, for string: " + s);
    }

    num = data.num; // The evaluated conditions below rely on this being in scope
    pList = strings[s.join("::")];
    if (pList) {
      pConditions = Locale.pluralizationRules;
      len = pList.length;
      for (i=0; i < len; i++) {
        pForm = pList[i];
        pCondition = pConditions[i];
        if (eval(pCondition)) {
          try {
            return pForm(data);
          } catch (e) {
            log(e);
            break;
          }
        }
      }
    }

    if (data.num == 1) {
      return template(s[0], data);
    }
    return template(s[1], data);
  }

  function conjugatedTranslation(s, data) {
    var form, forms, formSelector;
    if (!data.form) {
      throw new TypeError("must provide form for conjugated translation");
    }
    if (!s.description) {
      throw new TypeError("conjugated translations must have a description");
    }

    forms = strings[s.description] || {};

    /* This looks a bit complex, but we're really just trying to find
     * something that might work. For a feminine form, we'll use masculine
     * if there is no feminine. For a group of people, we'll use the neutral
     * form even if they are all females if we don't have a vf form, same
     * with the vm form. If we can't find appropriate translations, we use the
     * english form, following much the same rules to figure out which one
     * to use.
     */
    formSelector = data.form;
    form = forms[formSelector];

    if (!form) {
      if (formSelector == 'f') {
        form = forms.m || template(s.f || s.m);
      } else if (formSelector == 'vf') {
        form = forms.v || template(s.vf || s.v);
      } else if (formSelector == 'vm') {
        form = forms.v || template(s.vm || s.v);
      }

      if (!form) {
        if (s[formSelector]) {
          form = template(s[formSelector]);
        } else {
          throw new Error("no form found for " + formSelector);
        }
      }
    }
    try {
      return form(data);
    } catch(err) {
      log(err);
      return '';
    }
  }

  var module = {
    /**
     * I18n.translate(s, data) -> String
     * - s (String | Object): The english string to translate.
     * - data (Object): Parameters to be substituted into the string.
     *
     *  ** This function is aliased to the global `t` **
     *
     *  This function takes a string formatted like
     *  "the [noun] was [adjective]", looks up the translation in
     *  the appropriate locale and replaces it with
     *  the 'noun' and 'adjective' properties of the `data` parameter.
     *
     *  It also supports plurals and multiple conjugations by passing in
     *  english representations of those things. See below for details.
     *
     *  In addition, there is support for embedding links and images in
     *  sentences.
     *
     *  The translated and interpolated string is returned.
     *
     *  Normal Substitution
     *  -------------------
     *
     *  The syntax is `[ keyToBeSubstituted ]`
     *
     *  Example:
     *
     *      t("Visit [ this ] for music!", {
     *        this: "rdio"
     *      });
     *
     *  Plural Substitution
     *  -------------------
     *
     *  The syntax is `["singular string", "plural string"]`
     *
     *  Example:
     *
     *      t(["One song was added", "[num] songs were added"], {
     *        num: 4 // the `num` parameter is required
     *      });
     *
     *  Gender Form Substitution
     *  ------------------------
     *
     *  The syntax is `{
     *    description: "description of string",
     *    m: "masculine",
     *    f: "feminine form"
     *  }`
     *
     *  The possible forms are:
     *
     *    - m - masculine
     *    - f - feminine
     *    - y - yourself
     *    - v - multiple people, mixed gender
     *    - vf - multiple people, all female
     *    - vm - multiple people, all male
     *
     *  Not all languages support all forms, so the api makes a best guess as to
     *  which form should be inserted if the exact form can't be found.
     *
     *  Example:
     *
     *      // description is required
     *      t({
     *        description: "adding songs to a person's playlist",
     *        m: "[name] added songs to his playlist.",
     *        f: "[name] added songs to her playlist.",
     *        y: "You added songs to your playlist."
     *      }, {
     *        name: "Justin",
     *        form: "m" // form is required
     *      });
     *
     *  Link
     *  ----
     *
     *  The syntax is `[[ words to be linked ]](keyForUrlInData)`
     *
     *  Example:
     *
     *      t("Visit [[ this site ]](rdioUrl) for music!", {
     *        rdioUrl: "http://www.rdio.com"
     *      });
     *
     *  Image
     *  -----
     *
     *  The syntax is `![[ alt text ]](keyForUrlInData)`
     *
     *  Example:
     *
     *      t("Click on the ![[ suspenders ]](susUrl) for options", {
     *        susUrl: "/media/suspenders.png"
     *      });
     *
     **/
    translate: function(s, data) {
      var translation, newString;
      data = data || {};
      if (!data.product_name && R && R.serverInfo) {
        data.product_name = R.serverInfo.get('product_name');
      }
      if (_.isString(s)) {
        translation = strings[s];
        try {
          if (!translation) {
            strings[s] = translation = template(s);
          }
          newString = translation(data);
        } catch(e) {
          log(e);
          newString = template(s, data);
        }
        return newString;
      } else if (_.isArray(s)) {
        return pluralize(s, data);
      }
      return conjugatedTranslation(s, data);
    },

    /**
     * I18n.getDefaultCurrency() -> String
     *
     * Returns the default currency for the current region.
     **/
    getDefaultCurrency: function() {
      var country = 'us';
      var currency;

      if (R && R.serverInfo) {
        country = R.serverInfo.get('countryCode').toLowerCase();
      }

      currency = Locale.currencyForCountryCode[country] || 'usd';

      return currency;
    },

    /**
     * I18n.currency(amount, countryOrCurrencyCode) -> String
     * - amount (Number): The amount of money you want to format.
     * - countryOrCurrencyCode (String): A country code or currency code specifying the format to be returned
     *
     *  The localized format of `amount` is returned. Passing an invalid (or non-supported)
     *  country code or currency code will return the USD format.
     **/
    currency: function(amount, countryOrCurrencyCode) {
      var validCountryCodes = _.keys(Locale.currencyForCountryCode);
      var decimalIndex;
      var cents;
      var floatAmount;
      var sign = '';
      var currencyCode;
      var c;

      if (!countryOrCurrencyCode) {
        error("No country or currency code passed to I18n.currency. Defaulting to serverInfo's country_code.");
        countryOrCurrencyCode = I18n.getDefaultCurrency();
      }

      countryOrCurrencyCode = countryOrCurrencyCode.toLowerCase();
      if (_.include(validCountryCodes, countryOrCurrencyCode)){
        currencyCode = Locale.currencyForCountryCode[countryOrCurrencyCode];
      } else {
        currencyCode = countryOrCurrencyCode;
      }
      currencyCode = currencyCode.toLowerCase();

      c = Locale.currency[currencyCode] || Locale.currency['usd'];
      floatAmount = parseFloat(amount);
      if (floatAmount < 0) {
        floatAmount = Math.abs(floatAmount);
        sign = '-';
      }
      amount = module.number(floatAmount);

      // Format cents correctly
      decimalIndex = amount.search(new RegExp('[' + Locale.number.decimal + ']') || /[.]/);
      decimalIndex = (decimalIndex == -1 ? amount.length : decimalIndex);
      cents = amount.slice(decimalIndex + 1, decimalIndex + 3);
      while (cents.length < 2) {
        cents += "0";
      }
      amount = amount.slice(0, decimalIndex) + (Locale.number.decimal || '.') + cents;

      // Put the currency marker in the right place
      if (c.position && c.position == 'end') {
        return sign + amount + c.symbol;
      }
      return sign + (c.symbol || '$') + amount || '';
    },

    /**
     * I18n.currencyData([currencyCode]) -> Object
     * - currencyCode (String): An optional currency code specifying the format to be returned
     *
     *  The formatting data (currency symbol and position) for the locale's currency is returned.  If no currency code is passed,
     *  the default currency code of the current locale will be used.  Passing an invalid
     *  (or non-supported) currency code will return the USD format.
     **/
    currencyData: function(currencyCode) {
      var currencyCode = currencyCode ? currencyCode.toLowerCase() : Locale.defaultCurrencyCode;
      return Locale.currency[currencyCode] || Locale.currency['usd'];
    },

    /**
     * I18n.number(num) -> String
     * - num (Number): The number to format.
     *
     *  The number is formatted for the locale and returned.
     **/
    number: function(num) {
      var i, decimalIndex, decimalLen,
        formatted = num.toString(),
        n = Locale.number,
        len = formatted.length;

      decimalIndex = formatted.search(decimalRegex);
      if (decimalIndex != -1) {
        formatted = formatted.slice(0, decimalIndex) +
          n.decimal +
          formatted.slice(decimalIndex + 1);
      }
      decimalLen = decimalIndex == -1 ? 0 : len - decimalIndex;
      for (i = (decimalIndex == -1 ? len : decimalIndex); i > 0; i-=n.delimiterPos) {
        if (i < len - decimalLen) {
          formatted = formatted.slice(0, i) +
            n.delimiter +
            formatted.slice(i);
        }
      }
      return formatted;
    },

    /**
     * I18n.percent(numStr) -> String
     * - num (Number): A number representing the value of a percent string. Eg: 0.20 for 20%.
     *
     * Returns the formatted percent string like '20%' or '20 %' depending on the locale.
     **/
    percent: function(num) {
      return this.number(Math.round(num * 100)) + Locale.percent;
    },

    /**
     * I18n.parseNumber(numStr) -> Object
     * - numStr (String): A string representing a number
     *
     *  The number string is parsed based on the current locale's number formatting rules.  The parsed value is returned.
     **/
    parseNumber: function(numStr) {
      var parts = numStr.split(Locale.number.decimal);
      if (parts.length > 1) {
        // Throw out any extra decimal parts
        parts = parts.slice(0,2);
      }
      parts = _.map(parts, function(part) {
        return part.replace(/\D/g, '');
      });
      return parseFloat(parts.join('.'));
    },

    _recompile: compileStrings

  };

  if (Object.defineProperty) {
    Object.defineProperty(this, 't', {
      get: function() {
        return module.translate;
      },
      set: function(t) {
        // Defining setter to prevent overriding `t`.
      }
    });
  } else {
    this.t = module.translate;
  }

  return module;
}();
