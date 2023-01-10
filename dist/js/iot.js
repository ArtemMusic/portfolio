/*
 *  Vide - v0.5.0
 *  Easy as hell jQuery plugin for video backgrounds.
 *  http://vodkabears.github.io/vide/
 *
 *  Made by Ilya Makarov
 *  Under MIT License
 */
!(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['jquery'], factory);
  } else if (typeof exports === 'object') {
    factory(require('jquery'));
  } else {
    factory(root.jQuery);
  }
})(this, function($) {

  'use strict';

  /**
   * Name of the plugin
   * @private
   * @const
   * @type {String}
   */
  var PLUGIN_NAME = 'vide';

  /**
   * Default settings
   * @private
   * @const
   * @type {Object}
   */
  var DEFAULTS = {
    volume: 1,
    playbackRate: 1,
    muted: true,
    loop: true,
    autoplay: true,
    position: '50% 50%',
    posterType: 'detect',
    resizing: true,
    bgColor: 'transparent',
    className: ''
  };

  /**
   * Not implemented error message
   * @private
   * @const
   * @type {String}
   */
  var NOT_IMPLEMENTED_MSG = 'Not implemented';

  /**
   * Parse a string with options
   * @private
   * @param {String} str
   * @returns {Object|String}
   */
  function parseOptions(str) {
    var obj = {};
    var delimiterIndex;
    var option;
    var prop;
    var val;
    var arr;
    var len;
    var i;

    // Remove spaces around delimiters and split
    arr = str.replace(/\s*:\s*/g, ':').replace(/\s*,\s*/g, ',').split(',');

    // Parse a string
    for (i = 0, len = arr.length; i < len; i++) {
      option = arr[i];

      // Ignore urls and a string without colon delimiters
      if (
        option.search(/^(http|https|ftp):\/\//) !== -1 ||
        option.search(':') === -1
      ) {
        break;
      }

      delimiterIndex = option.indexOf(':');
      prop = option.substring(0, delimiterIndex);
      val = option.substring(delimiterIndex + 1);

      // If val is an empty string, make it undefined
      if (!val) {
        val = undefined;
      }

      // Convert a string value if it is like a boolean
      if (typeof val === 'string') {
        val = val === 'true' || (val === 'false' ? false : val);
      }

      // Convert a string value if it is like a number
      if (typeof val === 'string') {
        val = !isNaN(val) ? +val : val;
      }

      obj[prop] = val;
    }

    // If nothing is parsed
    if (prop == null && val == null) {
      return str;
    }

    return obj;
  }

  /**
   * Parse a position option
   * @private
   * @param {String} str
   * @returns {Object}
   */
  function parsePosition(str) {
    str = '' + str;

    // Default value is a center
    var args = str.split(/\s+/);
    var x = '50%';
    var y = '50%';
    var len;
    var arg;
    var i;

    for (i = 0, len = args.length; i < len; i++) {
      arg = args[i];

      // Convert values
      if (arg === 'left') {
        x = '0%';
      } else if (arg === 'right') {
        x = '100%';
      } else if (arg === 'top') {
        y = '0%';
      } else if (arg === 'bottom') {
        y = '100%';
      } else if (arg === 'center') {
        if (i === 0) {
          x = '50%';
        } else {
          y = '50%';
        }
      } else {
        if (i === 0) {
          x = arg;
        } else {
          y = arg;
        }
      }
    }

    return { x: x, y: y };
  }

  /**
   * Search a poster
   * @private
   * @param {String} path
   * @param {Function} callback
   */
  function findPoster(path, callback) {
    var onLoad = function() {
      callback(this.src);
    };

    $('<img src="' + path + '.gif">').load(onLoad);
    $('<img src="' + path + '.jpg">').load(onLoad);
    $('<img src="' + path + '.jpeg">').load(onLoad);
    $('<img src="' + path + '.png">').load(onLoad);
  }

  /**
   * Vide constructor
   * @param {HTMLElement} element
   * @param {Object|String} path
   * @param {Object|String} options
   * @constructor
   */
  function Vide(element, path, options) {
    this.$element = $(element);

    // Parse path
    if (typeof path === 'string') {
      path = parseOptions(path);
    }

    // Parse options
    if (!options) {
      options = {};
    } else if (typeof options === 'string') {
      options = parseOptions(options);
    }

    // Remove an extension
    if (typeof path === 'string') {
      path = path.replace(/\.\w*$/, '');
    } else if (typeof path === 'object') {
      for (var i in path) {
        if (path.hasOwnProperty(i)) {
          path[i] = path[i].replace(/\.\w*$/, '');
        }
      }
    }

    this.settings = $.extend({}, DEFAULTS, options);
    this.path = path;

    // https://github.com/VodkaBears/Vide/issues/110
    try {
      this.init();
    } catch (e) {
      if (e.message !== NOT_IMPLEMENTED_MSG) {
        throw e;
      }
    }
  }

  /**
   * Initialization
   * @public
   */
  Vide.prototype.init = function() {
    var vide = this;
    var path = vide.path;
    var poster = path;
    var sources = '';
    var $element = vide.$element;
    var settings = vide.settings;
    var position = parsePosition(settings.position);
    var posterType = settings.posterType;
    var $video;
    var $wrapper;

    // Set styles of a video wrapper
    $wrapper = vide.$wrapper = $('<div>')
      .addClass(settings.className)
      .css({
        position: 'absolute',
        'z-index': -1,
        top: 0,
        left: 0,
        bottom: 0,
        right: 0,
        overflow: 'hidden',
        '-webkit-background-size': 'cover',
        '-moz-background-size': 'cover',
        '-o-background-size': 'cover',
        'background-size': 'cover',
        'background-color': settings.bgColor,
        'background-repeat': 'no-repeat',
        'background-position': position.x + ' ' + position.y
      });

    // Get a poster path
    if (typeof path === 'object') {
      if (path.poster) {
        poster = path.poster;
      } else {
        if (path.mp4) {
          poster = path.mp4;
        } else if (path.webm) {
          poster = path.webm;
        } else if (path.ogv) {
          poster = path.ogv;
        }
      }
    }

    // Set a video poster
    if (posterType === 'detect') {
      findPoster(poster, function(url) {
        $wrapper.css('background-image', 'url(' + url + ')');
      });
    } else if (posterType !== 'none') {
      $wrapper.css('background-image', 'url(' + poster + '.' + posterType + ')');
    }

    // If a parent element has a static position, make it relative
    if ($element.css('position') === 'static') {
      $element.css('position', 'relative');
    }

    $element.prepend($wrapper);

    if (typeof path === 'object') {
      if (path.mp4) {
        sources += '<source src="' + path.mp4 + '.mp4" type="video/mp4">';
      }

      if (path.webm) {
        sources += '<source src="' + path.webm + '.webm" type="video/webm">';
      }

      if (path.ogv) {
        sources += '<source src="' + path.ogv + '.ogv" type="video/ogg">';
      }

      $video = vide.$video = $('<video>' + sources + '</video>');
    } else {
      $video = vide.$video = $('<video>' +
        '<source src="' + path + '.mp4" type="video/mp4">' +
        '<source src="' + path + '.webm" type="video/webm">' +
        '<source src="' + path + '.ogv" type="video/ogg">' +
        '</video>');
    }

    // https://github.com/VodkaBears/Vide/issues/110
    try {
      $video

        // Set video properties
        .prop({
          autoplay: settings.autoplay,
          loop: settings.loop,
          volume: settings.volume,
          muted: settings.muted,
          defaultMuted: settings.muted,
          playbackRate: settings.playbackRate,
          defaultPlaybackRate: settings.playbackRate
        });
    } catch (e) {
      throw new Error(NOT_IMPLEMENTED_MSG);
    }

    // Video alignment
    $video.css({
      margin: 'auto',
      position: 'absolute',
      'z-index': -1,
      top: position.y,
      left: position.x,
      '-webkit-transform': 'translate(-' + position.x + ', -' + position.y + ')',
      '-ms-transform': 'translate(-' + position.x + ', -' + position.y + ')',
      '-moz-transform': 'translate(-' + position.x + ', -' + position.y + ')',
      transform: 'translate(-' + position.x + ', -' + position.y + ')',

      // Disable visibility, while loading
      visibility: 'hidden',
      opacity: 0
    })

    // Resize a video, when it's loaded
    .one('canplaythrough.' + PLUGIN_NAME, function() {
      vide.resize();
    })

    // Make it visible, when it's already playing
    .one('playing.' + PLUGIN_NAME, function() {
      $video.css({
        visibility: 'visible',
        opacity: 1
      });
      $wrapper.css('background-image', 'none');
    });

    // Resize event is available only for 'window'
    // Use another code solutions to detect DOM elements resizing
    $element.on('resize.' + PLUGIN_NAME, function() {
      if (settings.resizing) {
        vide.resize();
      }
    });

    // Append a video
    $wrapper.append($video);
  };

  /**
   * Get a video element
   * @public
   * @returns {HTMLVideoElement}
   */
  Vide.prototype.getVideoObject = function() {
    return this.$video[0];
  };

  /**
   * Resize a video background
   * @public
   */
  Vide.prototype.resize = function() {
    if (!this.$video) {
      return;
    }

    var $wrapper = this.$wrapper;
    var $video = this.$video;
    var video = $video[0];

    // Get a native video size
    var videoHeight = video.videoHeight;
    var videoWidth = video.videoWidth;

    // Get a wrapper size
    var wrapperHeight = $wrapper.height();
    var wrapperWidth = $wrapper.width();

    if (wrapperWidth / videoWidth > wrapperHeight / videoHeight) {
      $video.css({

        // +2 pixels to prevent an empty space after transformation
        width: wrapperWidth + 2,
        height: 'auto'
      });
    } else {
      $video.css({
        width: 'auto',

        // +2 pixels to prevent an empty space after transformation
        height: wrapperHeight + 2
      });
    }
  };

  /**
   * Destroy a video background
   * @public
   */
  Vide.prototype.destroy = function() {
    delete $[PLUGIN_NAME].lookup[this.index];
    this.$video && this.$video.off(PLUGIN_NAME);
    this.$element.off(PLUGIN_NAME).removeData(PLUGIN_NAME);
    this.$wrapper.remove();
  };

  /**
   * Special plugin object for instances.
   * @public
   * @type {Object}
   */
  $[PLUGIN_NAME] = {
    lookup: []
  };

  /**
   * Plugin constructor
   * @param {Object|String} path
   * @param {Object|String} options
   * @returns {JQuery}
   * @constructor
   */
  $.fn[PLUGIN_NAME] = function(path, options) {
    var instance;

    this.each(function() {
      instance = $.data(this, PLUGIN_NAME);

      // Destroy the plugin instance if exists
      instance && instance.destroy();

      // Create the plugin instance
      instance = new Vide(this, path, options);
      instance.index = $[PLUGIN_NAME].lookup.push(instance) - 1;
      $.data(this, PLUGIN_NAME, instance);
    });

    return this;
  };

  $(document).ready(function() {
    var $window = $(window);

    // Window resize event listener
    $window.on('resize.' + PLUGIN_NAME, function() {
      for (var len = $[PLUGIN_NAME].lookup.length, i = 0, instance; i < len; i++) {
        instance = $[PLUGIN_NAME].lookup[i];

        if (instance && instance.settings.resizing) {
          instance.resize();
        }
      }
    });

    // https://github.com/VodkaBears/Vide/issues/68
    $window.on('unload.' + PLUGIN_NAME, function() {
      return false;
    });

    // Auto initialization
    // Add 'data-vide-bg' attribute with a path to the video without extension
    // Also you can pass options throw the 'data-vide-options' attribute
    // 'data-vide-options' must be like 'muted: false, volume: 0.5'
    $(document).find('[data-' + PLUGIN_NAME + '-bg]').each(function(i, element) {
      var $element = $(element);
      var options = $element.data(PLUGIN_NAME + '-options');
      var path = $element.data(PLUGIN_NAME + '-bg');

      $element[PLUGIN_NAME](path, options);
    });
  });

});


const langArr = {
  "title" : {
    "ru" : "Интернет вещей 'Умный дом'",
    "en" : "Internet of Things 'Smart home'"
  },
  "subtitle" :  {
    "en": "This project was developed and implemented by a team of 1st year students. <br>The system is capable of performing actions and solving certain everyday tasks without human intervention.",
    "ru": "Данный проект был разработан и реализован командой студентов 1 курса. <br>Система способна выполнять действия и решать определённые повседневные задачи без участия человека.",
  },
  "doc" :  {
    "ru": "Телеграм Бот",
    "en": "Telegram Bot",
  },
  "log" :  {
    "ru": "IoT система",
    "en": "IoT system",
  },
  "mail" :  {
    "ru": "Автоматизация",
    "en": "Activity automation",
  },
  "filt" :  {
    "ru": "надежность и безопастность",
    "en": "reliability and safety",
  },
  "adm" :  {
    "ru": "современные устройства",
    "en": "modern devices",
  },
  "lang" :  {
    "ru": "Ru",
    "en": "En",
  },
  "cv" :  {
    "ru": "Скачать pdf",
    "en": "Download pdf",
  },
  "galery" :  {
    "ru": "Ссылка на скачивание",
    "en": "Download link",
  },
  "galery2" :  {
    "ru": "Галерея",
    "en": "Gallery",
  },
  "purpose" :  {
    "ru": "Цель и описание",
    "en": "Purpose and description",
  },
  "purposetext" :  {
    "ru": "Основной акцент сделан на применении всех полученных в ходе обучения знаний и использования максимального кол-ва лабораторного оборудования. <br><br> Домашняя автоматизация, или умный дом — система домашних устройств, способных выполнять действия и решать определённые повседневные задачи без участия человека.<br><br>Система должна быть удобна в использовании, иметь понятный интерфей и не нагружать приложениями.<br><br>Пользователю должно быть интуитивно понятно как пользоваться умным домом.<br><br>Экосистема автоматизированного управления должна обеспечивать надлежащую и бесперебойную работу.",
    "en": "The main emphasis is placed on the application of all the knowledge gained during the training and the use of the maximum number of laboratory equipment. <br><br> Home automation, or smart home, is a system of home devices capable of performing actions and solving certain everyday tasks without human intervention.<br><br>The system should be easy to use, have a clear interface and not be loaded with applications. <br><br>It should be intuitive for the user to use the smart home.<br><br>The automated control ecosystem should ensure proper and uninterrupted operation.",
  },
  "purpose2" :  {
    "ru": "Ключевые особенности",
    "en": "Key Features",
  },
  "purpose2text3" :  {
    "ru": "- Телеграм бот для управления<br><br>- Современные устройства<br><br>- Разработка в команде<br><br>- Мониторинг Home Assistant<br><br>- Автоматизация через яндекс Алису<br><br>- Комлпекс датчиков и исполнительных приборов: Датчик движения, Датчик температуры, Датчик влажности, Датчик кач-ва воздуха, Датчик дыма, Датчик открытия двери, Настольная лампа, Умная розетка, Кнопка управления, Яндекс Станция Макс, Умная камера, Raspberry Pi 3, SLS ZigBee Gateway<br><br>- Система освещения<br><br>- Система безопастности<br><br>- Климат контроль",
    "en": "- Telegram bot for control<br><br>- Modern devices<br><br>- Team development<br><br>- Home Assistant monitoring<br><br>- Automation via Yandex Alice<br><br >- A set of sensors and actuators: Motion sensor, Temperature sensor, Humidity sensor, Air quality sensor, Smoke sensor, Door open sensor, Table lamp, Smart socket, Control button, Yandex Station Max, Smart camera, Raspberry Pi 3, SLS ZigBee Gateway<br><br>- Lighting system<br><br>- Security system<br><br>- Climate control",
  },
  "purpose3": {
    "ru": "Что было освоено/развито",
    "en": "Mastered/developed"
  },
  "purpose3text": {
    "ru": "В ходе факультатива Умный дом и создания коллективного проекта наша команда освоила навыки:",
    "en": "During the optional Smart Home and the creation of a collective project, our team mastered the following skills:"
  },
  "purpose3text2": {
    "ru": "<ul><li>- Работы с такими протоколами беспроводной передачи данных, как ZigBee и MQTT.</li><br><li>- Установки ПО и прошивки на одноплатный компьютер Raspberry Pi , а также на конфигурационные стики</li><br><li>- Установки дополнительных приложений(Add-on's) в систему интеграций и автоматизаций Home assistant.</li><br><li>- Настройка Home assistant, ZigBee2MQTT, mosquitto, SLS ZigBee Gateway</li><br><li>- Написание и отладка Telegram бота, с его дальнейшей интеграцией в структуру Умного дома.</li><br><li>- Написание сценариев и автоматизаций в Home assistant</li></ul>",
    "en": "<ul><li>- Working with such wireless data transfer protocols as ZigBee and MQTT.</li><br><li>- Installing software and firmware on the Raspberry Pi single-board computer, as well as configuration sticks</li> <br><li>- Installing additional applications (Add-on's) in the Home assistant integration and automation system.</li><br><li>- Setting up Home assistant, ZigBee2MQTT, mosquitto, SLS ZigBee Gateway</li><br><li>- Writing and debugging a Telegram bot, with its further integration into the Smart Home structure.</li><br><li>- Writing scripts and automations in the Home assistant</li></ul>",
  },
}

const maxImg = document.querySelector('.right-panel img');
const select = document.querySelector('select');
const allLang = ['en', 'ru'];

document.querySelectorAll('.left-panel img').forEach(item => item.onmouseenter = (event) => maxImg.src = event.target.src);

select.addEventListener('change', changeURLLanguage);

// перенаправить на url с указанием языка
function changeURLLanguage() {
    let lang = select.value;
    location.href = window.location.pathname + '#' + lang;
    location.reload();
}

function changeLanguage() {
    let hash = window.location.hash;
    hash = hash.substr(1);
    console.log(hash);
    if (!allLang.includes(hash)) {
        location.href = window.location.pathname + '#en';
        location.reload();
    }
    select.value = hash;

    document.querySelector('.lng-title').innerHTML = langArr['title'][hash];
    
    
    document.querySelector('.lng-galery').innerHTML = langArr['galery'][hash];

    for (let key in langArr) {
        let elem = document.querySelector('.lng-' + key);
        if (elem) {
            elem.innerHTML = langArr[key][hash];
        }

    }
}

changeLanguage();