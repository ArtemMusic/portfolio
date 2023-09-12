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
    "ru" : "Документация по web-разработке",
    "en" : "Web development documentation"
  },
  "subtitle" :  {
    "en": "This guide is my experience in applying the standards as well as documenting my knowledge.  <br>PHP8, Laravel9, SQL/MySql, Middleware/Police, Docker, MailTrap, Jobs, etc.",
    "ru": "Это руководство - мой опыт в применении стандартов, а также документировании своих знаний. <br>PHP8, Laravel9, SQL/MySql, Middleware/Police, Docker, MailTrap, Jobs, etc.",
  },
  "doc" :  {
    "ru": "Личная документация",
    "en": "Personal documentation",
  },
  "log" :  {
    "ru": "Стандарты и ГОСТЫ",
    "en": "Standards and GOSTs",
  },
  "mail" :  {
    "ru": "Широкий спектр тем",
    "en": "Wide range of topics",
  },
  "sait" :  {
    "ru": "Гайд по написанию сайтов",
    "en": "Website writing guide",
  },
  "job" :  {
    "ru": "Языки программирования",
    "en": "Programming languages",
  },
  "adm" :  {
    "ru": "Панель администратора",
    "en": "Admin panel",
  },
  "crud" :  {
    "ru": "CRUD из бд",
    "en": "CRUD from db",
  },
  "crud" :  {
    "ru": "CRUD из бд",
    "en": "CRUD from db",
  },
  "crud" :  {
    "ru": "CRUD из бд",
    "en": "CRUD from db",
  },
  "crud" :  {
    "ru": "CRUD из бд",
    "en": "CRUD from db",
  },
  "crud" :  {
    "ru": "CRUD из бд",
    "en": "CRUD from db",
  },
  "crud" :  {
    "ru": "CRUD из бд",
    "en": "CRUD from db",
  },
  "crud" :  {
    "ru": "CRUD из бд",
    "en": "CRUD from db",
  },
  "crud" :  {
    "ru": "CRUD из бд",
    "en": "CRUD from db",
  },
  "crud" :  {
    "ru": "CRUD из бд",
    "en": "CRUD from db",
  },
  "crud" :  {
    "ru": "CRUD из бд",
    "en": "CRUD from db",
  },
  "crud" :  {
    "ru": "CRUD из бд",
    "en": "CRUD from db",
  },
  "crud" :  {
    "ru": "CRUD из бд",
    "en": "CRUD from db",
  },
  "crud" :  {
    "ru": "CRUD из бд",
    "en": "CRUD from db",
  },
  "lang" :  {
    "ru": "Ru",
    "en": "En",
  },
  "galery" :  {
    "ru": "Ссылка на скачивание",
    "en": "Download link",
  },
  "cv" :  {
    "ru": "Скачать документацию",
    "en": "Download documentation",
  },
  "purpose" :  {
    "ru": "Цель и описание",
    "en": "Purpose and description",
  },
  "purposetext" :  {
    "ru": "В документе присутствует авторский сленг и возможные неточности. Данная документация предназначена для сбора всех моих знаний в единое целое, чтобы в любой момент можно было все повторить или быстро найти ответ на вопрос. <br><br> Представляет собой учебное пособие по Web разработки. Широко рассматривается язык программирования PHP, паттерн SOLID вместе с “чистым кодом”, фреймворк Larevel и его особенности, а также работа с системой контроля версий GIT. В будущем планируется развивать и дополнять документ. <br><br> <h4>Документация разбита на 5 частей:</h4><br> Язык программирования PHP<br>Git, в частности GitHub<br>Фреймворк Laravel (База)<br>Фреймворк Laravel (Продвинутый)<br>Docker<br><br> В Первой части руководства описывается язык PHP(7-8), его синтаксис, тонкости работы, сильные и слабые стороны. Подробно разобрана работа с функциями, массивами, строками и тд. Вводится понятие ООП, концепции и методы работы, классы, интерфейсы, наследования и другим основные принципы. Разбирается паттерн SOLID и правила написания «Чистого кода». <br><br>  Во второй части рассматривается работа с системой контроля версий Git, основные задачи, создание, клонирование, скачивание репозитория, решение конфликтов и тд. <br><br> В третьей части начинается введение в фреймворк Laravel(8-9), написание сайта(front & back), настройки панели администратора, ознакомление с базовыми понятиями как back-end разработки в целом, так и разработке на Larevel. Большое внимание уделяется правильному написанию кода, концепциям разработке, модели MVC, базам данных и CRUD. <br><br>  В четвертой части продолжается изучение Larevel, но на более глубоком и продвинутом уровне. Предстоит написать продвинутый современный сайт для блогеров. Продвинутая валидация, очереди, сторонние сервисы, взаимодействие с front частью, отправка сложной формы, загрузка изображений на сайт, оптимизация и многое другое будет рассмотрено. <br><br>  В пятой части мы познакомимся с системой контейнеризации docker. Рассмотрим основные термины, концепции, синтаксис, принцип работы. Создадим образы и контейнеры, а также поднимем все это. Много теории и много практики.",
    "en": "The document contains copyright slang and possible inaccuracies. This documentation is intended to collect all my knowledge into a single whole, so that at any time you can repeat everything or quickly find the answer to a question. <br><br> This is a tutorial on Web development. The PHP programming language, the SOLID pattern along with “clean code”, the Larevel framework and its features, as well as working with the GIT version control system are widely considered. In the future, it is planned to develop and supplement the document. <br><br> <h4>The documentation is divided into 5 parts:</h4><br>PHP programming language<br>Git, in particular GitHub<br>Laravel framework (Basic)<br>Laravel framework (Advanced)<br>Docker<br><br> The first part of the manual describes the PHP(7-8) language, its syntax, subtleties of work, strengths and weaknesses. Work with functions, arrays, strings, etc. is analyzed in detail. The concept of OOP, concepts and methods of operation, classes, interfaces, inheritance and other basic principles are introduced. The SOLID pattern and the rules for writing 'Clean Code' are analyzed. <br><br> The second part deals with working with the Git version control system, basic tasks, creating, cloning, downloading a repository, resolving conflicts, and so on. <br><br>In the third part, an introduction to the Laravel framework (8-9), writing a website (front & back), setting up an admin panel, getting acquainted with the basic concepts of both back-end development in general and development on Larevel begins. Much attention is paid to correct coding, development concepts, MVC model, databases and CRUD. <br><br> In the fourth part, the study of Larevel continues, but at a deeper and more advanced level. It is necessary to write an advanced modern site for bloggers. Advanced validation, queues, third party services, frontend interaction, complex form submission, image upload, optimization and more will be covered. <br><br>In the fifth part, we will get acquainted with the docker containerization system. Consider the basic terms, concepts, syntax, principle of operation. Let's create images and containers, and raise it all. Lots of theory and lots of practice.",
  },
  "purpose2" :  {
    "ru": "Ключевые особенности",
    "en": "Key Features",
  },
  "purpose2text2" :  {
    "ru": "GitHub страница: <a href='https://github.com/ArtemMusic/BackEnd-doc.' target='_blank'><i class='fa-brands fa-github'></i></a>",
    "en": "GitHub page: <a href='https://github.com/ArtemMusic/BackEnd-doc.' target='_blank'><i class='fa-brands fa-github'></i></a>",
  },
  "purpose3text2" :  {
    "ru": "<li>- PHP 7/8</li> <li>- Автодеплой и Docker</li><li>- Система верификации по почте</li><li>- JS</li><li>- SQL/MySQL и Отношения один к одному, один ко многим, многие ко многим<li>- Laravel 8/9 и его особенности</li><li>- Composer</li><li>- Npm</li><li>- Паттерны SOLID и MVC</li><li>- Этапы создания и проектирования программного продукта, жизненный цикл программного продукта</li><li>- Bootstrap</li><li>- Валидация форм</li><li>- Деплой на продакшен</li><li>- Реализация панели администратора</li><li>- Ассинхронные запросы</li><li>- RestfulAPI</li> <li>- JWT </li><li>- Git/GitHub </li><li>- CRUD с транзакциями</li><li>- Написал свою документацию</li>",
    "en": "<li>- PHP 7/8</li> <li>- Autodeploy and Docker</li><li>- Email verification system</li><li>- JS</li><li>- SQL/MySQL and one to one relationship, one to many, many to many<li>- Laravel 8/9 and its features</li><li>- Composer</li><li>- Npm</li><li>- Patterns SOLID and MVC</li><li>- Stages of creating and designing a software product, life software product cycle</li><li>- Bootstrap</li><li>- Form validation</li><li>- Deploy to production</li><li>- Implementation of the admin panel</li><li>- Asynchronous requests</li><li>- RestfulAPI</li> <li>- JWT </li><li>- Git/GitHub </li><li>- CRUD with transactions</li><li>- Wrote my documentation</li>",
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
    
    document.querySelector('.lng-crud').innerHTML = langArr['crud'][hash];
    document.querySelector('.lng-galery').innerHTML = langArr['galery'][hash];

    for (let key in langArr) {
        let elem = document.querySelector('.lng-' + key);
        if (elem) {
            elem.innerHTML = langArr[key][hash];
        }

    }
}

changeLanguage();