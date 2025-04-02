module.exports = {
    prefix: '',
    important: '#placeos',
    mode: 'jit',
    content: ['./src/**/*.{html,ts,css,scss,sass,less,styl}'],
    theme: {
        extend: {
            lineClamp: {
                7: '7',
                8: '8',
                9: '9',
                10: '10',
            },
        },
    },
    variants: {
        extend: {},
    },
    plugins: [],
};
