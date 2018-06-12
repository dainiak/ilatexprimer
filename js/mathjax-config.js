MathJax.Ajax.config.path['Contrib'] = '//cdn.mathjax.org/mathjax/contrib';

MathJax.Hub.Config({
    skipStartupTypeset: true,
    messageStyle: 'none',
	showMathMenu: false,
	showMathMenuMSIE: false,
	showProcessingMessages: false,
    extensions: [
    	'tex2jax.js'
    ],
	jax: [
		'input/TeX',
		'output/CommonHTML'
	],
    tex2jax: {
        inlineMath: [['$','$'], ['\\(','\\)']],
        displayMath: [['$$','$$'], ['\\[','\\]']],
        skipTags: ['script','noscript','style','code','pre'],
        ignoreClass: 'latex-source-area',
    	processEnvironments: true,
    	processEscapes: true,
    	processRefs: true,
    	preview: 'none'
    },
    TeX: {
        extensions: [
            'AMSmath.js',
            'AMSsymbols.js',
            'HTML.js',
            'noUndefined.js',
            'begingroup.js',
            '[Contrib]/xyjax/xypic.js',
            '[Contrib]/img/img.js',
            '[Contrib]/counters/counters.js',
            '[Contrib]/forloop/forloop.js',
            '[Contrib]/forminput/forminput.js'
        ],
        equationNumbers: {
            autoNumber: 'AMS',
            useLabelIds: false
        },
        noUndefined: {
            attributes: {
                mathcolor: "red",
                mathbackground: "#FFEEEE",
                mathsize: "90%"
            }
        },
        Macros: {
			par: '',
			showSourceOnClick: '',
			hrf: ['{\\href{#1}{#2}}', 2], // need this to bypass pre-mathjax \href command processing
			ttp: ['{\\href{[tooltip]#1}{#2}}', 2] // display jQuery tooltip for element
		}
	}
});