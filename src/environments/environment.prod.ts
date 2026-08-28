export const environment = {
    production: true,
    //apiUrl: 'https://abril--backend-dsctbha6g9guf8cm.chilecentral-01.azurewebsites.net/'
    // Ruta RELATIVA a propósito: el SPA siempre habla con el backend de su MISMO dominio.
    // En las dos VPS nginx sirve el frontend desde /var/www/abril y proxea /api y /hubs a
    // 127.0.0.1:8080, así que este mismo build funciona igual en intranet.abril.pe y en
    // demo.abril.pe. Si acá se vuelve a poner una URL absoluta, el frontend de demo termina
    // leyendo y escribiendo en la BD de producción sin que nada lo delate en pantalla.
    apiUrl: '/',
    azure: {
        tenantId: '53ac60b6-9b99-49d3-b52c-5899a07f865f',
        clientId: '877bf256-77a6-418d-b189-e10f6150e7e0'
    }
};
