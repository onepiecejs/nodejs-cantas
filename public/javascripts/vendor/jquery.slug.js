/*
jQuery Slug 1.0
===============

jQuery Slug is a powerful plugin that makes it easy to transform strings into slugs.

*/
DEBUG = null;
(function($) {
    
    // Default map of accented and special characters to ASCII characters
    // credits: CakePHP
    var transliteration = {
        'ä|æ|ǽ': 'ae',
        'ö|œ': 'oe',
        'ü': 'ue',
        'Ä': 'Ae',
        'Ü': 'Ue',
        'Ö': 'Oe',
        'À|Á|Â|Ã|Ä|Å|Ǻ|Ā|Ă|Ą|Ǎ': 'A',
        'à|á|â|ã|å|ǻ|ā|ă|ą|ǎ|ª': 'a',
        'Ç|Ć|Ĉ|Ċ|Č': 'C',
        'ç|ć|ĉ|ċ|č': 'c',
        'Ð|Ď|Đ': 'D',
        'ð|ď|đ': 'd',
        'È|É|Ê|Ë|Ē|Ĕ|Ė|Ę|Ě': 'E',
        'è|é|ê|ë|ē|ĕ|ė|ę|ě': 'e',
        'Ĝ|Ğ|Ġ|Ģ': 'G',
        'ĝ|ğ|ġ|ģ': 'g',
        'Ĥ|Ħ': 'H',
        'ĥ|ħ': 'h',
        'Ì|Í|Î|Ï|Ĩ|Ī|Ĭ|Ǐ|Į|İ': 'I',
        'ì|í|î|ï|ĩ|ī|ĭ|ǐ|į|ı': 'i',
        'Ĵ': 'J',
        'ĵ': 'j',
        'Ķ': 'K',
        'ķ': 'k',
        'Ĺ|Ļ|Ľ|Ŀ|Ł': 'L',
        'ĺ|ļ|ľ|ŀ|ł': 'l',
        'Ñ|Ń|Ņ|Ň': 'N',
        'ñ|ń|ņ|ň|ŉ': 'n',
        'Ò|Ó|Ô|Õ|Ō|Ŏ|Ǒ|Ő|Ơ|Ø|Ǿ': 'O',
        'ò|ó|ô|õ|ō|ŏ|ǒ|ő|ơ|ø|ǿ|º': 'o',
        'Ŕ|Ŗ|Ř': 'R',
        'ŕ|ŗ|ř': 'r',
        'Ś|Ŝ|Ş|Š': 'S',
        'ś|ŝ|ş|š|ſ': 's',
        'Ţ|Ť|Ŧ': 'T',
        'ţ|ť|ŧ': 't',
        'Ù|Ú|Û|Ũ|Ū|Ŭ|Ů|Ű|Ų|Ư|Ǔ|Ǖ|Ǘ|Ǚ|Ǜ': 'U',
        'ù|ú|û|ũ|ū|ŭ|ů|ű|ų|ư|ǔ|ǖ|ǘ|ǚ|ǜ': 'u',
        'Ý|Ÿ|Ŷ': 'Y',
        'ý|ÿ|ŷ': 'y',
        'Ŵ': 'W',
        'ŵ': 'w',
        'Ź|Ż|Ž': 'Z',
        'ź|ż|ž': 'z',
        'Æ|Ǽ': 'AE',
        'ß': 'ss',
        'Ĳ': 'IJ',
        'ĳ': 'ij',
        'Œ': 'OE',
        'ƒ': 'f'
    };
    
    /**
    * Returns a string with all spaces converted to underscores (by default), accented
    * characters converted to non-accented characters, and non word characters removed.
    * credits: CakePHP
    */
    $.slug = function(string, replacement, map) {
        
        if($.type(replacement) == 'undefined') {
            replacement = '_';
        } else if($.type(replacement) == 'object') {
            map = replacement;
            replacement = '_';
        }
        
        transliteration['[^a-zA-Z0-9]'] = replacement;
        
        if(!map) {
            map = {};
        }
        
        map = $.extend({}, transliteration, map, {
            "\\s+": replacement
        });
        
        var slug = string;
        $.each(map, function(index, value) {
            var re = new RegExp(index, "g");
            slug = slug.replace(re, value);
        });
        
        return slug;
        
    };
    
    
    $.fn.slug = function(options) {
        
        var settings = $.extend({}, {
            'target': null,
            'event': 'keyup',
            'replacement': '-',
            'map': null,
            'callback': null
        }, options);
        
        if($.type(options) == 'function') {
            settings['callback'] = options;
        }
        
        this.each(function() {
            var $this = $(this);
            
            $this.bind(settings['event'] + ' jquery-slug-bind', function() {
                var val = $this.val();
                
                slug = $.slug(val, settings['replacement'], settings['map']);
                if(settings['target']) {
                    _setVal(settings['target'], slug);
                }
                
                if(settings['callback']) {
                    settings['callback'].apply($this, [slug, val]);
                }
            });
            
            $this.trigger('jquery-slug-bind');
            
        });
    }
    
    var _setVal = function(target, value) {
        var $target = $(target);
        if($target.is(':input')) {
            $target.val(value);
        } else {
            $target.text(value);
        }
    }
    
})(jQuery);