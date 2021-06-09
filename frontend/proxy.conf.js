
const domain = 'localhost:8085';
const secure = false;
const valid_ssl = false;

const PROXY_CONFIG = [
    {
        context: [
            "/control",
            "/auth",
            "/api",
            "/styles",
            "/scripts",
            "/login",
            "/backoffice",
            "/build",
            "/test"
        ],
        target: `http${secure ? 's' : ''}://${domain}`,
        secure: valid_ssl,
        changeOrigin: true
    },
    {
        context: [
            "/control/websocket",
            "/api",
        ],
        target: `ws${secure ? 's' : ''}://${domain}`,
        secure: valid_ssl,
        changeOrigin: true,
        ws: true
    }
];

module.exports = PROXY_CONFIG;
