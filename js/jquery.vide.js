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

// var arrLang = {
//   'en': {
//     'about': 'About',
//     'goods': 'Goods',
//     'benefits': 'Benefits',
//     'contact': 'Contact US',
//   },
//   'ru': {
//     'about': 'О нас',
//     'goods': 'Продукция',
//     'benefits': 'Преимущества',
//     'contact': 'Контакты',
//   }
// }

//   $(function() {
//     $('.translate').click(function() {
//       var lang = $(this).attr('id');

//       $('.lang').each(function(index, item) {
//         $(this).text(arrLang[lang][$(this).attr('key')]);
//       });
//     });
//   });

const langArr = {
  "menu" :  {
    "ru": "Меню",
    "en": "Menu",
  }, 
  "home" : {
    "ru": "Главная",
    "en": "Home",
  },
  "about" :  {
    "ru": "Обо мне",
    "en": "About",
  },
  "skils" :  {
    "ru": "Навыки",
    "en": "Skils",
  },
  "serv" :  {
    "ru": "Сферы",
    "en": "Services",
  },
  "portfolio" :  {
    "ru": "Портфолио",
    "en": "Portfolio",
  },
  // "contact" :  {
  //   "ru": "Связь",
  //   "en": "Contact",
  // },
  "title" :  {
    "ru": "Привет я Артём Музычук",
    "en": "Hello i'm Artem Muzychuk",
  },
  "subtitle" :  {
    "ru": '"Специализируюсь в WEB-разработке и программной инженерии. <br> Студент Санкт-Петербургского государственного университета имени Бонч-Бруевича"',
    "en": '"I specialize in WEB development and software engineering. <br> Student of the Bonch-Bruevich St.Petersburg State University"',
  },
  "wd" :  {
    "ru": "Web разработчик",
    "en": "Web Developer",
  },
  "se" :  {
    "ru": "Программный инженер",
    "en": "Software Engineer",
  },
  "cicd" :  {
    "ru": "CI/CD инженер",
    "en": "CI/CD Engineer",
  },
  "artem" :  {
    "ru": "Обо мне",
    "en": "About Artem",
  },
  "artemtext" :  {
    "ru": "Разработал сайты с использованием современных технологий. Улучшил процесс работы в команде, внедрив современный фреймворк и паттерны проектирования/разработки.",
    "en": "Developed websites using modern technologies. Improved the teamwork process in the team by introducing a modern framework and design/development patterns.",
  },
  "artemtext2" :  {
    "ru": "— Реализовал успешные идеи разработки: паттерны, программная инженерия, Github для слияния разных частей приложения.",
    "en": "— Implemented successful development ideas: apply patterns, software engineering, Git Hub to merge different parts of the application.",
  },
  "artemtext3" :  {
    "ru": "- Применил и внедрил инструменты ci/cd для оптимизации развертывания высоконагруженной системы.",
    "en": "- Applied and implemented ci/cd tools to optimize the deployment of a high-load system.",
  },
  "artemtext4" :  {
    "ru": "— Разработали систему умного дома с телеграм-ботом.",
    "en": "— Developed a smart home system with a telegram bot.",
  },
  "artemtext5" :  {
    "ru": "- Написал собственную базу данных на С++.",
    "en": "- Wrote my own database in С++.",
  },
  "artemtext6" :  {
    "ru": "- Проанализировал и оптимизировал более 20,000 строчек кода.",
    "en": "- Analyzed and optimized more than 20,000 lines of code.",
  },
  "cv" :  {
    "ru": "Скачать резюме (en & ru)",
    "en": "Download CV (en & ru)",
  },
  "mainskilstext" :  {
    "ru": "Моё основное направление BackEnd. Но спектр навыков намного шире.",
    "en": "My main direction is BackEnd. But range of skills is much wider.",
  },
  "mainskils" :  {
    "ru": "Навыки",
    "en": "Skils",
  },
  "mainservtext" :  {
    "ru": "Все эти задачи я могу выполнять на одинаково достойном уровне.",
    "en": "I can perform all these tasks at the same equally worthy level.",
  },
  "mainserv" :  {
    "ru": "Сферы деятельности",
    "en": "Services",
  },
  "servwd" :  {
    "ru": "Web разработка",
    "en": "Web Development",
  },
  "servwdtext" :  {
    "ru": "Разработка происходит в BackEnd: PHP, Laravel, C++ и FrontEnd: VuesJs, HTML5, CSS3. Этот набор является самым популярным и позволяет быстро и эффективно строить сложные и масштабные системы. Для оптимизации использовался C++.",
    "en": "Development takes place in the BackEnd: PHP, Laravel, C++ and FrontEnd: VuesJs, HTML5, CSS3. This set is the most popular and allows you to quickly and efficiently build complex and large-scale systems. Also, in addition to the above tools, C++ will be used to optimize.",
  },
  "servse" :  {
    "ru": "Программная инженерия",
    "en": "Software engineering",
  },
  "servsetext" :  {
    "ru": "Программная инженерия — это набор технологий, который позволяет строить максимально надежные и эффективные системы, отслеживать жизненный цикл продукта от его идеи до реализации. Математические методы построения систем позволят оценить проделанную работу.",
    "en": "Software engineering is a set of technologies that allows you to build the most reliable and efficient systems, monitor the life cycle of a product from its idea to implementation. Mathematical methods for building systems will allow you to evaluate the work done",
  },
  "servcicd" :  {
    "ru": "CI/CD",
    "en": "CI/CD",
  },
  "servcicdtext" :  {
    "ru": "Это сочетание непрерывной интеграции и непрерывного развертывания программного обеспечения во время разработки с помощью Docker. CI/CD объединяет разработку, тестирование и развертывание приложения. Это позволяет вносить любые изменения без остановки работы.",
    "en": "It is a combination of continuous integration and continuous software deployment during development with docker. CI/CD integrates the development, testing and deployment of an application. This allows to make any changes without stopping work.",
  },
  "servidea" :  {
    "ru": "Web креативность",
    "en": "Web Idea",
  },
  "servideatext" :  {
    "ru": "Креативность и внимание к деталям – залог успеха в разработке современных систем. При построении архитектуры я стараюсь внедрять новые и интересные решения, чтобы добиться наилучшего результата как FrontEnd, так и BackEnd. Не стоит бояться пробовать что-то новое.",
    "en": "Creativity and attention to detail is the key to success in the development of modern systems. When building architecture, I try to implement new and interesting solutions in order to achieve the best result both FrontEnd and BackEnd.",
  }, 
  "servsp" :  {
    "ru": "Поддержка",
    "en": "Support",
  },
  "servsptext" :  {
    "ru": "В работе очень важно и нужно уметь поддерживать контакт с коллективом, заказчиком и руководителем, находить общий язык и быть дружелюбным. Я очень общительный человек, который может помочь решить проблему и прийти к лучшему результату, даже если это очень сложно.",
    "en": "In work, it is very important and necessary to be able to maintain contact with the team, customer and manager, find a common language and be friendly. I am a very sociable person who can help solve the problem and come to the best result, even if it is very difficult.",
  },
  "serviot" :  {
    "ru": "IoT",
    "en": "IoT",
  },
  "serviottext" :  {
    "ru": "Помимо разработки веб-сайтов, я также принимал участие в разработке систем умного дома, искусственного интеллекта и телеграм-ботов. Для этого я собрал собственную команду. Это дало мне невероятное количество новых знаний, опыта работы в команде и технических навыков.",
    "en": "In addition to developing websites, I also took part in the design of smart home systems, artificial intelligence, and telegram bots. To do this, I assembled my own team. It gave me an incredible amount of new knowledge, teamwork experience and technical skills.",
  },
  "port" :  {
    "ru": "Портфолио",
    "en": "Portfolio",
  },
  "porttext" :  {
    "ru": "Оцените мою работу и оставьте отзыв. Вы также можете предложить свои идеи по их развитию.",
    "en": "Check out my work and give feedback. You can also offer your ideas for their development.",
  },
  "endcontact" :  {
    "ru": "Связь",
    "en": "Contact",
  },
  "endcontacttext" :  {
    "ru": "Свяжитесь со мной, буду рад новым предложениям и знакомствам.",
    "en": "Contact me, I will be glad to new offers and acquaintances.",
  },
  "lang" :  {
    "ru": "Ru",
    "en": "En",
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
    document.querySelector('.lng-menu').innerHTML = langArr['menu'][hash];
    document.querySelector('.lng-home').innerHTML = langArr['home'][hash];
    document.querySelector('.lng-about').innerHTML = langArr['about'][hash];
    document.querySelector('.lng-skils').innerHTML = langArr['skils'][hash];
    document.querySelector('.lng-serv').innerHTML = langArr['serv'][hash];
    document.querySelector('.lng-portfolio').innerHTML = langArr['portfolio'][hash];
    // document.querySelector('.lng-contact').innerHTML = langArr['contact'][hash];
    document.querySelector('.lng-title').innerHTML = langArr['title'][hash];
    document.querySelector('.lng-subtitle').innerHTML = langArr['subtitle'][hash];
    document.querySelector('.lng-wd').innerHTML = langArr['wd'][hash];
    document.querySelector('.lng-se').innerHTML = langArr['se'][hash];
    document.querySelector('.lng-cicd').innerHTML = langArr['cicd'][hash];
    document.querySelector('.lng-artem').innerHTML = langArr['artem'][hash];
    document.querySelector('.lng-artemtext').innerHTML = langArr['artemtext'][hash];
    document.querySelector('.lng-cv').innerHTML = langArr['cv'][hash];
    document.querySelector('.lng-artemtext2').innerHTML = langArr['artemtext2'][hash];
    document.querySelector('.lng-artemtext3').innerHTML = langArr['artemtext3'][hash];
    document.querySelector('.lng-artemtext4').innerHTML = langArr['artemtext4'][hash];
    document.querySelector('.lng-artemtext5').innerHTML = langArr['artemtext5'][hash];
    document.querySelector('.lng-artemtext6').innerHTML = langArr['artemtext6'][hash];
    document.querySelector('.lng-mainskilstext').innerHTML = langArr['mainskilstext'][hash];
    document.querySelector('.lng-mainskils').innerHTML = langArr['mainskils'][hash];
    document.querySelector('.lng-mainservtext').innerHTML = langArr['mainservtext'][hash];
    document.querySelector('.lng-mainserv').innerHTML = langArr['mainserv'][hash];
    document.querySelector('.lng-servwd').innerHTML = langArr['servwd'][hash];
    document.querySelector('.lng-servwdtext').innerHTML = langArr['servwdtext'][hash];
    document.querySelector('.lng-servse').innerHTML = langArr['servse'][hash];
    document.querySelector('.lng-servsetext').innerHTML = langArr['servsetext'][hash];
    document.querySelector('.lng-servcicd').innerHTML = langArr['servcicd'][hash];
    document.querySelector('.lng-servcicdtext').innerHTML = langArr['servcicdtext'][hash];
    document.querySelector('.lng-servidea').innerHTML = langArr['servidea'][hash];
    document.querySelector('.lng-servideatext').innerHTML = langArr['servideatext'][hash];
    document.querySelector('.lng-servsp').innerHTML = langArr['servsp'][hash];
    document.querySelector('.lng-servsptext').innerHTML = langArr['servsptext'][hash];
    document.querySelector('.lng-serviot').innerHTML = langArr['serviot'][hash];
    document.querySelector('.lng-serviottext').innerHTML = langArr['serviottext'][hash];
    document.querySelector('.lng-port').innerHTML = langArr['port'][hash];
    document.querySelector('.lng-porttext').innerHTML = langArr['porttext'][hash];

    // document.querySelector('.lng-sitetitle').innerHTML = langArr['sitetitle'][hash];

    document.querySelector('.lng-lang').innerHTML = langArr['lang'][hash];

    for (let key in langArr) {
        let elem = document.querySelector('.lng-' + key);
        if (elem) {
            elem.innerHTML = langArr[key][hash];
        }

    }
}

changeLanguage();